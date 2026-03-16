import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { execFile, spawn } from 'node:child_process';
import { chromium } from 'playwright';
import config from '../../playwright.perf.config.mjs';
import { createPerfReport, renderMarkdownReport, serializeBaseline } from './metrics.mjs';

const PERF_MONITOR_INIT = ({ seed }) => {
  let randomState = seed >>> 0;
  const nextRandom = () => {
    randomState = (1664525 * randomState + 1013904223) >>> 0;
    return randomState / 0x100000000;
  };

  Object.defineProperty(Math, 'random', {
    configurable: true,
    value: nextRandom,
    writable: true,
  });

  const perfState = {
    captureStart: 0,
    frameDurations: [],
    lastTimestamp: null,
    longTasks: [],
    running: false,
  };

  const getPercentile = (values, percentileValue) => {
    if (!Array.isArray(values) || values.length === 0) {
      return 0;
    }

    const sortedValues = [...values].sort((left, right) => left - right);
    const index = Math.min(sortedValues.length - 1, Math.max(0, Math.ceil((percentileValue / 100) * sortedValues.length) - 1));

    return sortedValues[index];
  };

  const trackFrame = (timestamp) => {
    if (perfState.running) {
      if (perfState.lastTimestamp !== null) {
        perfState.frameDurations.push(timestamp - perfState.lastTimestamp);
      }
      perfState.lastTimestamp = timestamp;
    }

    requestAnimationFrame(trackFrame);
  };

  requestAnimationFrame(trackFrame);

  if (typeof PerformanceObserver === 'function') {
    try {
      const observer = new PerformanceObserver((entryList) => {
        entryList.getEntries().forEach((entry) => {
          if (perfState.running && entry.startTime >= perfState.captureStart) {
            perfState.longTasks.push({
              duration: entry.duration,
              startTime: entry.startTime,
            });
          }
        });
      });

      observer.observe({ type: 'longtask', buffered: true });
    } catch {}
  }

  window.__miaowPerf = {
    reset() {
      perfState.captureStart = performance.now();
      perfState.frameDurations = [];
      perfState.lastTimestamp = null;
      perfState.longTasks = [];
      perfState.running = true;
    },
    sample() {
      const frameDurations = [...perfState.frameDurations];
      const totalFrameTimeMs = frameDurations.reduce((total, value) => total + value, 0);
      const longTaskDurationMs = perfState.longTasks.reduce((total, entry) => total + entry.duration, 0);

      return {
        approxFps: totalFrameTimeMs > 0 ? frameDurations.length / (totalFrameTimeMs / 1000) : 0,
        frameSampleCount: frameDurations.length,
        longTaskCount: perfState.longTasks.length,
        longTaskDurationMs,
        measurementWindowMs: Math.max(0, performance.now() - perfState.captureStart),
        p95FrameTimeMs: getPercentile(frameDurations, 95),
      };
    },
  };
};

function chromeMetricsToObject(metrics) {
  return metrics.reduce((metricMap, metricEntry) => {
    metricMap[metricEntry.name] = metricEntry.value;
    return metricMap;
  }, {});
}

function toTimestampString(date) {
  return date.toISOString().replace(/[:]/g, '-');
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getGitCommit() {
  try {
    const stdout = await new Promise((resolve, reject) => {
      execFile('git', ['rev-parse', '--short', 'HEAD'], { cwd: process.cwd() }, (error, output) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(output);
      });
    });

    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function waitForServer(baseURL, timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(baseURL);

      if (response.ok) {
        return;
      }
    } catch {}

    await new Promise((resolve) => {
      setTimeout(resolve, 200);
    });
  }

  throw new Error(`Timed out waiting for preview server at ${baseURL}.`);
}

function startPreviewServer() {
  const serverProcess = spawn(config.previewServer.command[0], config.previewServer.command.slice(1), {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'pipe',
  });

  const output = [];
  const handleData = (chunk) => {
    output.push(chunk.toString());
  };

  serverProcess.stdout.on('data', handleData);
  serverProcess.stderr.on('data', handleData);

  return {
    process: serverProcess,
    readOutput() {
      return output.join('');
    },
  };
}

async function stopProcess(childProcess) {
  if (!childProcess || childProcess.killed) {
    return;
  }

  childProcess.kill('SIGTERM');

  await new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      childProcess.kill('SIGKILL');
      resolve();
    }, 3000);

    childProcess.once('exit', () => {
      clearTimeout(timeoutId);
      resolve();
    });
  });
}

function createScenarioRunsMap() {
  return config.scenarios.reduce((scenarioRuns, scenario) => {
    scenarioRuns[scenario.name] = {
      measured: [],
      warmup: null,
    };
    return scenarioRuns;
  }, {});
}

async function captureChromeMetrics(page) {
  const client = await page.context().newCDPSession(page);
  await client.send('Performance.enable');

  return {
    async snapshot() {
      const { metrics } = await client.send('Performance.getMetrics');
      return chromeMetricsToObject(metrics);
    },
    async dispose() {
      try {
        await client.detach();
      } catch {}
    },
  };
}

function diffChromeMetrics(startMetrics, endMetrics) {
  const getDurationMs = (metricName) =>
    Math.max(0, ((endMetrics[metricName] ?? 0) - (startMetrics[metricName] ?? 0)) * 1000);

  return {
    jsHeapTotalSizeBytes: endMetrics.JSHeapTotalSize ?? 0,
    jsHeapUsedSizeBytes: endMetrics.JSHeapUsedSize ?? 0,
    layoutDurationMs: getDurationMs('LayoutDuration'),
    nodes: endMetrics.Nodes ?? 0,
    recalcStyleDurationMs: getDurationMs('RecalcStyleDuration'),
    scriptDurationMs: getDurationMs('ScriptDuration'),
    taskDurationMs: getDurationMs('TaskDuration'),
  };
}

async function collectScenarioSnapshot(page, scenarioName) {
  return page.evaluate(
    ({ resourcePatternSource, scenarioName: currentScenarioName }) => {
      const loadedToyChunks = performance
        .getEntriesByType('resource')
        .filter((resourceEntry) => new RegExp(resourcePatternSource).test(resourceEntry.name))
        .reduce((chunkMap, resourceEntry) => {
          const chunkUrl = new URL(resourceEntry.name, window.location.href);
          const chunkKey = `${chunkUrl.pathname}${chunkUrl.search}`;

          if (!chunkMap.has(chunkKey)) {
            chunkMap.set(chunkKey, {
              bytes:
                resourceEntry.decodedBodySize ||
                resourceEntry.transferSize ||
                resourceEntry.encodedBodySize ||
                0,
              name: chunkKey,
            });
          }

          return chunkMap;
        }, new Map());

      const previewRuntimeCount = Array.from(document.querySelectorAll('.experience-runtime--preview')).filter(
        (runtimeNode) => runtimeNode.shadowRoot?.childElementCount,
      ).length;

      const domNodeCount = document.getElementsByTagName('*').length;
      const perfSample = window.__miaowPerf?.sample?.() ?? {};

      return {
        chrome: {},
        frame: {
          approxFps: perfSample.approxFps ?? 0,
          frameSampleCount: perfSample.frameSampleCount ?? 0,
          longTaskCount: perfSample.longTaskCount ?? 0,
          longTaskDurationMs: perfSample.longTaskDurationMs ?? 0,
          measurementWindowMs: perfSample.measurementWindowMs ?? 0,
          p95FrameTimeMs: perfSample.p95FrameTimeMs ?? 0,
        },
        scenario: {
          domTitle: document.title,
          name: currentScenarioName,
          url: window.location.href,
        },
        structural: {
          domNodeCount,
          livePreviewRuntimeCount: previewRuntimeCount,
          loadedToyChunkBytes: Array.from(loadedToyChunks.values()).reduce((total, chunk) => total + chunk.bytes, 0),
          loadedToyChunkCount: loadedToyChunks.size,
          loadedToyChunkNames: Array.from(loadedToyChunks.values()).map((chunk) => chunk.name),
        },
      };
    },
    {
      resourcePatternSource: config.resourceToyChunkPattern.source,
      scenarioName,
    },
  );
}

async function collectNavigationSnapshot(page) {
  return page.evaluate(() => {
    const navigationEntry = performance.getEntriesByType('navigation')[0];

    return {
      domContentLoadedMs: navigationEntry?.domContentLoadedEventEnd ?? 0,
      loadEventMs: navigationEntry?.loadEventEnd ?? 0,
      pageReadyMs: performance.now(),
    };
  });
}

async function beginMeasurement(page, chromeMetrics) {
  const startMetrics = await chromeMetrics.snapshot();
  const navigationSnapshot = await collectNavigationSnapshot(page);
  await page.evaluate(() => {
    window.__miaowPerf?.reset?.();
  });
  return {
    navigationSnapshot,
    startMetrics,
  };
}

async function finishMeasurement(page, chromeMetrics, scenarioName, measurementState) {
  const scenarioSnapshot = await collectScenarioSnapshot(page, scenarioName);
  const endMetrics = await chromeMetrics.snapshot();

  return {
    ...scenarioSnapshot,
    chrome: diffChromeMetrics(measurementState.startMetrics, endMetrics),
    navigation: measurementState.navigationSnapshot,
  };
}

async function runLobbyScenario(page, chromeMetrics, scenario) {
  await page.goto(new URL(scenario.path, config.baseURL).toString(), { waitUntil: 'load' });
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('.carousel-track');
  await page.waitForTimeout(config.settleAfterNavigationMs);

  const nextButton = page.getByRole('button', { name: 'Next toy' });
  const track = page.locator('.carousel-track');
  const measurementState = await beginMeasurement(page, chromeMetrics);

  for (let clickIndex = 0; clickIndex < scenario.nextClicks; clickIndex += 1) {
    await nextButton.click();
    await page.waitForTimeout(scenario.clickPauseMs);
  }

  const trackBox = await track.boundingBox();

  if (trackBox) {
    await page.mouse.move(trackBox.x + trackBox.width / 2, trackBox.y + trackBox.height / 2);

    for (const wheelDelta of scenario.wheelDeltas) {
      await page.mouse.wheel(wheelDelta, 0);
      await page.waitForTimeout(scenario.wheelPauseMs);
    }
  }

  await page.waitForTimeout(scenario.cooldownMs);
  return finishMeasurement(page, chromeMetrics, scenario.name, measurementState);
}

async function runCatMashChaosScenario(page, chromeMetrics, scenario) {
  await page.goto(new URL(scenario.path, config.baseURL).toString(), { waitUntil: 'load' });
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('.experience-runtime');
  await page.waitForTimeout(config.settleAfterNavigationMs);

  const stage = page.locator('.player-layer .experience-runtime').locator('.toy-body');
  await stage.waitFor();

  const stageBox = await stage.boundingBox();

  if (!stageBox) {
    throw new Error('Could not resolve Cat Mash Chaos stage bounds.');
  }

  await stage.click({
    position: {
      x: stageBox.width * 0.5,
      y: stageBox.height * 0.5,
    },
  });
  await page.waitForTimeout(scenario.startDelayMs);

  const measurementState = await beginMeasurement(page, chromeMetrics);

  for (let pointIndex = 0; pointIndex < scenario.dragPoints.length; pointIndex += 1) {
    const [xRatio, yRatio] = scenario.dragPoints[pointIndex];
    const absoluteX = stageBox.x + stageBox.width * xRatio;
    const absoluteY = stageBox.y + stageBox.height * yRatio;

    await page.mouse.move(absoluteX, absoluteY, {
      steps: scenario.dragStepCount,
    });
    await page.mouse.down();
    await page.mouse.up();
    await page.keyboard.press(scenario.keyboardSequence[pointIndex % scenario.keyboardSequence.length]);
    await page.waitForTimeout(scenario.inputPauseMs);
  }

  await page.waitForTimeout(scenario.cooldownMs);
  return finishMeasurement(page, chromeMetrics, scenario.name, measurementState);
}

async function runScenario(browser, scenario, isWarmupRun) {
  const context = await browser.newContext({
    deviceScaleFactor: config.deviceScaleFactor,
    viewport: config.viewport,
  });
  const page = await context.newPage();

  await page.addInitScript(PERF_MONITOR_INIT, { seed: scenario.seed });

  const chromeMetrics = await captureChromeMetrics(page);

  try {
    const snapshot =
      scenario.name === 'lobby'
        ? await runLobbyScenario(page, chromeMetrics, scenario)
        : await runCatMashChaosScenario(page, chromeMetrics, scenario);

    return {
      ...snapshot,
      meta: {
        seed: scenario.seed,
        warmup: isWarmupRun,
      },
    };
  } finally {
    await chromeMetrics.dispose();
    await context.close();
  }
}

async function loadBaseline(baselineFilePath) {
  if (!(await fileExists(baselineFilePath))) {
    return null;
  }

  const baselineContents = await fs.readFile(baselineFilePath, 'utf8');
  const baseline = JSON.parse(baselineContents);

  return {
    ...baseline,
    baselineFile: baselineFilePath,
  };
}

async function writeArtifacts(report, markdownReport) {
  const outputDirectory = path.join(process.cwd(), 'output', 'playwright', 'perf');
  await fs.mkdir(outputDirectory, { recursive: true });

  const timestamp = toTimestampString(new Date(report.generatedAt));
  const timestampedJsonFile = path.join(outputDirectory, `profile-${timestamp}.json`);
  const timestampedMarkdownFile = path.join(outputDirectory, `profile-${timestamp}.md`);
  const latestJsonFile = path.join(outputDirectory, 'latest.json');
  const latestMarkdownFile = path.join(outputDirectory, 'latest.md');

  const jsonContents = JSON.stringify(report, null, 2);

  await fs.writeFile(timestampedJsonFile, jsonContents);
  await fs.writeFile(timestampedMarkdownFile, markdownReport);
  await fs.writeFile(latestJsonFile, jsonContents);
  await fs.writeFile(latestMarkdownFile, markdownReport);

  return {
    latestJsonFile,
    latestMarkdownFile,
    timestampedJsonFile,
    timestampedMarkdownFile,
  };
}

async function main() {
  const updateBaseline = process.argv.includes('--update-baseline');
  const baselineFilePath = path.join(process.cwd(), 'tests', 'perf', 'baseline.chromium.json');
  const baseline = await loadBaseline(baselineFilePath);
  const previewServer = startPreviewServer();

  try {
    await waitForServer(config.baseURL, config.previewServer.readyTimeoutMs);

    const browser = await chromium.launch({
      channel: config.browserChannel ?? undefined,
      headless: config.headless,
    });
    const scenarioRuns = createScenarioRunsMap();

    try {
      for (const scenario of config.scenarios) {
        for (let warmupIndex = 0; warmupIndex < config.warmupRuns; warmupIndex += 1) {
          scenarioRuns[scenario.name].warmup = await runScenario(browser, scenario, true);
        }

        for (let measuredIndex = 0; measuredIndex < config.measuredRuns; measuredIndex += 1) {
          scenarioRuns[scenario.name].measured.push(await runScenario(browser, scenario, false));
        }
      }

      const report = createPerfReport({
        baseline,
        browser: {
          headless: config.headless,
          name: config.browserName,
          version: browser.version(),
        },
        build: {
          gitCommit: await getGitCommit(),
        },
        config,
        generatedAt: new Date().toISOString(),
        scenarioRuns,
      });
      const markdownReport = renderMarkdownReport(report);
      const artifactFiles = await writeArtifacts(report, markdownReport);

      if (updateBaseline) {
        await fs.writeFile(baselineFilePath, `${JSON.stringify(serializeBaseline(report), null, 2)}\n`);
      }

      console.log(markdownReport);
      console.log(`JSON report: ${artifactFiles.latestJsonFile}`);
      console.log(`Markdown report: ${artifactFiles.latestMarkdownFile}`);

      if (updateBaseline) {
        console.log(`Baseline updated: ${baselineFilePath}`);
      }
    } finally {
      await browser.close();
    }
  } catch (error) {
    const previewOutput = previewServer.readOutput().trim();

    if (previewOutput) {
      console.error(previewOutput);
    }

    throw error;
  } finally {
    await stopProcess(previewServer.process);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
