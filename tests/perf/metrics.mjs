const FORMATTERS = {
  bytes: (value) => {
    if (!Number.isFinite(value)) {
      return 'n/a';
    }

    if (Math.abs(value) < 1024) {
      return `${Math.round(value)} B`;
    }

    return `${(value / 1024).toFixed(1)} KiB`;
  },
  count: (value) => (Number.isFinite(value) ? String(Math.round(value)) : 'n/a'),
  fps: (value) => (Number.isFinite(value) ? `${value.toFixed(1)} fps` : 'n/a'),
  ms: (value) => (Number.isFinite(value) ? `${value.toFixed(1)} ms` : 'n/a'),
};

export const METRIC_DEFINITIONS = [
  { key: 'approxFps', label: 'Approx FPS', path: ['frame', 'approxFps'], better: 'higher', format: 'fps', epsilon: 0.05 },
  { key: 'p95FrameTimeMs', label: 'p95 frame time', path: ['frame', 'p95FrameTimeMs'], better: 'lower', format: 'ms', epsilon: 0.1 },
  { key: 'longTaskCount', label: 'Long tasks', path: ['frame', 'longTaskCount'], better: 'lower', format: 'count', epsilon: 1 },
  { key: 'longTaskDurationMs', label: 'Long task time', path: ['frame', 'longTaskDurationMs'], better: 'lower', format: 'ms', epsilon: 0.1 },
  { key: 'livePreviewRuntimeCount', label: 'Live preview runtimes', path: ['structural', 'livePreviewRuntimeCount'], better: 'lower', format: 'count', epsilon: 1 },
  { key: 'loadedToyChunkCount', label: 'Loaded toy chunks', path: ['structural', 'loadedToyChunkCount'], better: 'lower', format: 'count', epsilon: 1 },
  { key: 'loadedToyChunkBytes', label: 'Loaded toy chunk bytes', path: ['structural', 'loadedToyChunkBytes'], better: 'lower', format: 'bytes', epsilon: 1 },
  { key: 'domNodeCount', label: 'DOM nodes', path: ['structural', 'domNodeCount'], better: 'lower', format: 'count', epsilon: 1 },
  { key: 'pageReadyMs', label: 'Settled page time', path: ['navigation', 'pageReadyMs'], better: 'lower', format: 'ms', epsilon: 0.1 },
  { key: 'domContentLoadedMs', label: 'DOMContentLoaded', path: ['navigation', 'domContentLoadedMs'], better: 'lower', format: 'ms', epsilon: 0.1 },
  { key: 'loadEventMs', label: 'Load event', path: ['navigation', 'loadEventMs'], better: 'lower', format: 'ms', epsilon: 0.1 },
  { key: 'scriptDurationMs', label: 'Script duration', path: ['chrome', 'scriptDurationMs'], better: 'lower', format: 'ms', epsilon: 0.1 },
  { key: 'layoutDurationMs', label: 'Layout duration', path: ['chrome', 'layoutDurationMs'], better: 'lower', format: 'ms', epsilon: 0.1 },
  { key: 'recalcStyleDurationMs', label: 'Recalc style duration', path: ['chrome', 'recalcStyleDurationMs'], better: 'lower', format: 'ms', epsilon: 0.1 },
  { key: 'taskDurationMs', label: 'Task duration', path: ['chrome', 'taskDurationMs'], better: 'lower', format: 'ms', epsilon: 0.1 },
  { key: 'jsHeapUsedSizeBytes', label: 'JS heap used', path: ['chrome', 'jsHeapUsedSizeBytes'], better: 'lower', format: 'bytes', epsilon: 1 },
  { key: 'jsHeapTotalSizeBytes', label: 'JS heap total', path: ['chrome', 'jsHeapTotalSizeBytes'], better: 'lower', format: 'bytes', epsilon: 1 },
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getValueAtPath(object, path) {
  return path.reduce((currentValue, pathPart) => currentValue?.[pathPart], object);
}

function setValueAtPath(object, path, value) {
  let currentValue = object;

  path.forEach((pathPart, index) => {
    if (index === path.length - 1) {
      currentValue[pathPart] = value;
      return;
    }

    currentValue[pathPart] ??= {};
    currentValue = currentValue[pathPart];
  });
}

export function median(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }

  const sortedValues = [...values].sort((left, right) => left - right);
  const midpoint = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 0) {
    return (sortedValues[midpoint - 1] + sortedValues[midpoint]) / 2;
  }

  return sortedValues[midpoint];
}

export function percentile(values, percentileValue) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }

  const sortedValues = [...values].sort((left, right) => left - right);
  const index = Math.min(sortedValues.length - 1, Math.max(0, Math.ceil((percentileValue / 100) * sortedValues.length) - 1));

  return sortedValues[index];
}

export function summarizeScenarioSamples(samples) {
  const summary = {
    chrome: {},
    frame: {},
    navigation: {},
    structural: {},
  };

  METRIC_DEFINITIONS.forEach((metricDefinition) => {
    const metricValues = samples
      .map((sample) => getValueAtPath(sample, metricDefinition.path))
      .filter((value) => Number.isFinite(value));

    setValueAtPath(summary, metricDefinition.path, median(metricValues));
  });

  return summary;
}

export function computeScenarioDelta(summary, baselineSummary) {
  if (!baselineSummary) {
    return null;
  }

  const delta = {
    chrome: {},
    frame: {},
    navigation: {},
    structural: {},
  };

  METRIC_DEFINITIONS.forEach((metricDefinition) => {
    const currentValue = getValueAtPath(summary, metricDefinition.path);
    const baselineValue = getValueAtPath(baselineSummary, metricDefinition.path);

    if (!Number.isFinite(currentValue) || !Number.isFinite(baselineValue)) {
      return;
    }

    const rawDelta = currentValue - baselineValue;
    const normalizedDelta = Math.abs(rawDelta) < (metricDefinition.epsilon ?? 0) ? 0 : rawDelta;

    setValueAtPath(delta, metricDefinition.path, normalizedDelta);
  });

  return delta;
}

export function collectScenarioRegressions(delta) {
  if (!delta) {
    return [];
  }

  return METRIC_DEFINITIONS.reduce((regressions, metricDefinition) => {
    const metricDelta = getValueAtPath(delta, metricDefinition.path);

    if (!Number.isFinite(metricDelta) || metricDelta === 0) {
      return regressions;
    }

    const isRegression =
      metricDefinition.better === 'higher'
        ? metricDelta < 0
        : metricDelta > 0;

    if (!isRegression) {
      return regressions;
    }

    regressions.push({
      ...metricDefinition,
      delta: metricDelta,
    });

    return regressions;
  }, []);
}

export function buildScenarioResult(scenario, measuredSamples, warmupSample, baselineScenario) {
  const summary = summarizeScenarioSamples(measuredSamples);
  const baselineSummary = baselineScenario?.summary ?? null;
  const delta = computeScenarioDelta(summary, baselineSummary);

  return {
    baseline: baselineScenario ? clone(baselineScenario) : null,
    delta,
    label: scenario.label,
    name: scenario.name,
    path: scenario.path,
    regressions: collectScenarioRegressions(delta),
    summary,
    warmup: warmupSample,
    runs: measuredSamples,
  };
}

export function formatMetricValue(metricDefinition, value) {
  const formatter = FORMATTERS[metricDefinition.format] ?? FORMATTERS.count;
  return formatter(value);
}

function formatDeltaValue(metricDefinition, value) {
  if (!Number.isFinite(value)) {
    return 'n/a';
  }

  const normalizedValue = Math.abs(value) < (metricDefinition.epsilon ?? 0) ? 0 : value;
  const sign = normalizedValue > 0 ? '+' : '';
  const formatter = FORMATTERS[metricDefinition.format] ?? FORMATTERS.count;
  return `${sign}${formatter(normalizedValue)}`;
}

export function renderMarkdownReport(report) {
  const lines = [
    '# Chromium Performance Profile',
    '',
    `Generated: ${report.generatedAt}`,
    `Browser: ${report.browser.name} ${report.browser.version}`,
    `Headless: ${report.browser.headless ? 'yes' : 'no'}`,
    `Viewport: ${report.viewport.width}x${report.viewport.height} @ ${report.viewport.deviceScaleFactor}x`,
    `Commit: ${report.build.gitCommit ?? 'unknown'}`,
    '',
  ];

  if (report.warnings.length > 0) {
    lines.push('## Warnings', '');
    report.warnings.forEach((warning) => {
      lines.push(`- ${warning}`);
    });
    lines.push('');
  }

  lines.push('## Scenarios', '');

  report.scenarios.forEach((scenarioResult) => {
    lines.push(`### ${scenarioResult.label}`, '');
    lines.push(`Path: \`${scenarioResult.path}\``);
    lines.push(`Measured runs: ${scenarioResult.runs.length} (plus 1 warmup)`);
    lines.push('');
    lines.push('| Metric | Current | Baseline | Delta |');
    lines.push('| --- | ---: | ---: | ---: |');

    METRIC_DEFINITIONS.forEach((metricDefinition) => {
      const currentValue = getValueAtPath(scenarioResult.summary, metricDefinition.path);
      const baselineValue = getValueAtPath(scenarioResult.baseline?.summary, metricDefinition.path);
      const deltaValue = getValueAtPath(scenarioResult.delta, metricDefinition.path);

      lines.push(
        `| ${metricDefinition.label} | ${formatMetricValue(metricDefinition, currentValue)} | ${formatMetricValue(metricDefinition, baselineValue)} | ${formatDeltaValue(metricDefinition, deltaValue)} |`,
      );
    });

    lines.push('');

    if (scenarioResult.regressions.length > 0) {
      lines.push('Regressions detected:');
      scenarioResult.regressions.forEach((regression) => {
        lines.push(`- ${regression.label}: ${formatDeltaValue(regression, regression.delta)}`);
      });
      lines.push('');
    } else {
      lines.push('No numeric regressions detected versus baseline.', '');
    }
  });

  return `${lines.join('\n').trim()}\n`;
}

export function createPerfReport({
  baseline,
  browser,
  build,
  config,
  generatedAt,
  scenarioRuns,
}) {
  const warnings = [];

  if (baseline?.browser?.version && baseline.browser.version !== browser.version) {
    warnings.push(`Baseline browser version is ${baseline.browser.version}; current run used ${browser.version}.`);
  }

  if (baseline?.browser?.name && baseline.browser.name !== browser.name) {
    warnings.push(`Baseline browser name is ${baseline.browser.name}; current run used ${browser.name}.`);
  }

  const scenarioResults = config.scenarios.map((scenario) =>
    buildScenarioResult(
      scenario,
      scenarioRuns[scenario.name].measured,
      scenarioRuns[scenario.name].warmup,
      baseline?.scenarios?.find((baselineScenario) => baselineScenario.name === scenario.name),
    ),
  );

  return {
    baselineFile: baseline?.baselineFile ?? null,
    browser,
    build,
    config: {
      measuredRuns: config.measuredRuns,
      warmupRuns: config.warmupRuns,
    },
    generatedAt,
    scenarios: scenarioResults,
    viewport: {
      deviceScaleFactor: config.deviceScaleFactor,
      height: config.viewport.height,
      width: config.viewport.width,
    },
    warnings,
  };
}

export function serializeBaseline(report) {
  return {
    browser: report.browser,
    build: report.build,
    config: report.config,
    generatedAt: report.generatedAt,
    scenarios: report.scenarios.map((scenarioResult) => ({
      label: scenarioResult.label,
      name: scenarioResult.name,
      path: scenarioResult.path,
      summary: clone(scenarioResult.summary),
    })),
    viewport: report.viewport,
  };
}
