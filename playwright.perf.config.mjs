const previewPort = 4173;
const previewHost = '127.0.0.1';

export default {
  baseURL: `http://${previewHost}:${previewPort}`,
  browserName: 'chromium',
  browserChannel: null,
  deviceScaleFactor: 1,
  headless: true,
  measuredRuns: 3,
  previewServer: {
    command: ['npx', 'vite', 'preview', '--host', previewHost, '--port', String(previewPort), '--strictPort'],
    host: previewHost,
    port: previewPort,
    readyTimeoutMs: 15000,
  },
  resourceToyChunkPattern: /\/assets\/Toy[^/]+\.js(?:\?|$)/,
  settleAfterNavigationMs: 1200,
  viewport: {
    width: 1440,
    height: 900,
  },
  warmupRuns: 1,
  scenarios: [
    {
      name: 'lobby',
      label: 'Lobby carousel',
      path: '/',
      seed: 1337,
      nextClicks: 6,
      clickPauseMs: 220,
      wheelDeltas: [650, 650, -350, 500],
      wheelPauseMs: 200,
      cooldownMs: 1000,
    },
    {
      name: 'cat-mash-chaos',
      label: 'Cat Mash Chaos',
      path: '/cat-mash-chaos/',
      seed: 424242,
      startDelayMs: 250,
      dragPoints: [
        [0.18, 0.28],
        [0.78, 0.22],
        [0.32, 0.68],
        [0.74, 0.58],
        [0.46, 0.36],
        [0.64, 0.76],
        [0.22, 0.52],
        [0.82, 0.44],
      ],
      dragStepCount: 6,
      inputPauseMs: 90,
      keyboardSequence: ['A', 'S', 'D', 'F', 'J', 'K', 'L', 'Space'],
      cooldownMs: 1200,
    },
  ],
};
