import { describe, expect, it } from 'vitest';
import {
  computeScenarioDelta,
  createPerfReport,
  renderMarkdownReport,
  serializeBaseline,
  summarizeScenarioSamples,
} from './metrics.mjs';

function createSample({
  approxFps = 60,
  domNodes = 100,
  heapBytes = 1024,
  livePreviewRuntimeCount = 1,
  longTaskCount = 0,
  longTaskDurationMs = 0,
  p95FrameTimeMs = 16,
  scriptDurationMs = 12,
} = {}) {
  return {
    chrome: {
      jsHeapTotalSizeBytes: heapBytes * 2,
      jsHeapUsedSizeBytes: heapBytes,
      layoutDurationMs: 3,
      nodes: domNodes,
      recalcStyleDurationMs: 4,
      scriptDurationMs,
      taskDurationMs: 18,
    },
    frame: {
      approxFps,
      frameSampleCount: 120,
      longTaskCount,
      longTaskDurationMs,
      measurementWindowMs: 2000,
      p95FrameTimeMs,
    },
    navigation: {
      domContentLoadedMs: 110,
      loadEventMs: 170,
      pageReadyMs: 340,
    },
    structural: {
      domNodeCount: domNodes,
      livePreviewRuntimeCount,
      loadedToyChunkBytes: 2048,
      loadedToyChunkCount: 2,
      loadedToyChunkNames: ['/assets/ToyOne.js', '/assets/ToyTwo.js'],
    },
  };
}

describe('perf metrics helpers', () => {
  it('summarizes scenario samples using medians', () => {
    const summary = summarizeScenarioSamples([
      createSample({ approxFps: 58, domNodes: 140 }),
      createSample({ approxFps: 61, domNodes: 100 }),
      createSample({ approxFps: 56, domNodes: 120 }),
    ]);

    expect(summary.frame.approxFps).toBe(58);
    expect(summary.structural.domNodeCount).toBe(120);
  });

  it('computes numeric deltas against a baseline summary', () => {
    const currentSummary = summarizeScenarioSamples([createSample({ approxFps: 55, p95FrameTimeMs: 18 })]);
    const baselineSummary = summarizeScenarioSamples([createSample({ approxFps: 60, p95FrameTimeMs: 16 })]);
    const delta = computeScenarioDelta(currentSummary, baselineSummary);

    expect(delta.frame.approxFps).toBe(-5);
    expect(delta.frame.p95FrameTimeMs).toBe(2);
  });

  it('renders browser mismatch warnings in the markdown report', () => {
    const perfReport = createPerfReport({
      baseline: {
        browser: {
          name: 'chromium',
          version: '100.0.0.0',
        },
        scenarios: [
          {
            label: 'Lobby carousel',
            name: 'lobby',
            path: '/',
            summary: summarizeScenarioSamples([createSample()]),
          },
        ],
      },
      browser: {
        headless: true,
        name: 'chromium',
        version: '101.0.0.0',
      },
      build: {
        gitCommit: 'abc1234',
      },
      config: {
        deviceScaleFactor: 1,
        measuredRuns: 3,
        scenarios: [
          {
            label: 'Lobby carousel',
            name: 'lobby',
            path: '/',
          },
        ],
        viewport: {
          width: 1440,
          height: 900,
        },
        warmupRuns: 1,
      },
      generatedAt: '2026-03-16T16:00:00.000Z',
      scenarioRuns: {
        lobby: {
          measured: [createSample(), createSample(), createSample()],
          warmup: createSample(),
        },
      },
    });
    const markdownReport = renderMarkdownReport(perfReport);

    expect(markdownReport).toContain('Baseline browser version is 100.0.0.0; current run used 101.0.0.0.');
  });

  it('serializes a compact baseline payload', () => {
    const perfReport = {
      browser: {
        name: 'chromium',
        version: '101.0.0.0',
      },
      build: {
        gitCommit: 'abc1234',
      },
      config: {
        measuredRuns: 3,
        warmupRuns: 1,
      },
      generatedAt: '2026-03-16T16:00:00.000Z',
      scenarios: [
        {
          label: 'Lobby carousel',
          name: 'lobby',
          path: '/',
          summary: summarizeScenarioSamples([createSample()]),
        },
      ],
      viewport: {
        deviceScaleFactor: 1,
        height: 900,
        width: 1440,
      },
    };
    const baseline = serializeBaseline(perfReport);

    expect(baseline.scenarios[0].summary.frame.approxFps).toBe(60);
    expect(baseline.browser.version).toBe('101.0.0.0');
  });
});
