import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { APP_API_NAME } from '../appApi';
import { ExperienceDocument } from './ExperienceDocument';

describe('ExperienceDocument', () => {
  let requestSpy;
  let exitSpy;
  let toggleSpy;
  let isActiveSpy;
  let originalCancelAnimationFrame;
  let originalRequestAnimationFrame;

  beforeEach(() => {
    requestSpy = vi.fn().mockResolvedValue(undefined);
    exitSpy = vi.fn().mockResolvedValue(undefined);
    toggleSpy = vi.fn().mockResolvedValue(undefined);
    isActiveSpy = vi.fn().mockReturnValue(false);
    originalRequestAnimationFrame = window.requestAnimationFrame;
    originalCancelAnimationFrame = window.cancelAnimationFrame;

    window[APP_API_NAME] = {
      fullscreen: {
        request: requestSpy,
        exit: exitSpy,
        toggle: toggleSpy,
        isActive: isActiveSpy,
      },
    };
  });

  function installMockAnimationFrame(frameDurationMs) {
    let now = 0;
    let nextFrameId = 1;
    const pendingCallbacks = new Map();

    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: (callback) => {
        const frameId = nextFrameId;
        nextFrameId += 1;
        pendingCallbacks.set(frameId, callback);
        return frameId;
      },
      writable: true,
    });

    Object.defineProperty(window, 'cancelAnimationFrame', {
      configurable: true,
      value: (frameId) => {
        pendingCallbacks.delete(frameId);
      },
      writable: true,
    });

    return {
      flushFrames(frameCount) {
        for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
          if (pendingCallbacks.size < 1) {
            break;
          }

          now += frameDurationMs;
          const callbacks = Array.from(pendingCallbacks.values());
          pendingCallbacks.clear();
          callbacks.forEach((callback) => callback(now));
        }
      },
    };
  }

  it('routes legacy fullscreen document calls through the app fullscreen api', async () => {
    const html = `
      <div>toy</div>
      <script>
        document.documentElement.requestFullscreen();
        document.body.requestFullscreen();
        document.exitFullscreen();
      </script>
    `;

    render(<ExperienceDocument html={html} title="Legacy fullscreen toy" />);

    await waitFor(() => {
      expect(requestSpy).toHaveBeenCalledTimes(2);
      expect(exitSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('exposes the app-level fullscreen api inside the runtime window', async () => {
    const html = `
      <div>toy</div>
      <script>
        window.miaowApp.fullscreen.request();
        window.miaowApp.fullscreen.toggle();
        window.miaowApp.fullscreen.isActive();
      </script>
    `;

    render(<ExperienceDocument html={html} title="App API toy" />);

    await waitFor(() => {
      expect(requestSpy).toHaveBeenCalledTimes(1);
      expect(toggleSpy).toHaveBeenCalledTimes(1);
      expect(isActiveSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('keeps preview runtimes from triggering app fullscreen', async () => {
    const html = `
      <div>preview toy</div>
      <script>
        document.documentElement.requestFullscreen();
        document.body.requestFullscreen();
        window.miaowApp.fullscreen.request();
      </script>
    `;

    render(<ExperienceDocument html={html} mode="preview" title="Preview toy" />);

    await waitFor(() => {
      expect(requestSpy).not.toHaveBeenCalled();
      expect(exitSpy).not.toHaveBeenCalled();
      expect(toggleSpy).not.toHaveBeenCalled();
    });
  });

  it('mutes tracked audio elements and updates them when the mute state changes', async () => {
    const createdAudio = [];
    const OriginalAudio = window.Audio;

    class MockAudio {
      constructor() {
        this.defaultMuted = false;
        this.muted = false;
        this.volume = 0.8;
        createdAudio.push(this);
      }
    }

    Object.defineProperty(window, 'Audio', {
      configurable: true,
      value: MockAudio,
      writable: true,
    });

    const html = `
      <div>audio toy</div>
      <script>
        window.__toyAudio = new Audio();
      </script>
    `;

    try {
      const { rerender } = render(<ExperienceDocument html={html} muted title="Audio toy" />);

      await waitFor(() => {
        expect(createdAudio).toHaveLength(1);
        expect(createdAudio[0].defaultMuted).toBe(true);
        expect(createdAudio[0].muted).toBe(true);
        expect(createdAudio[0].volume).toBe(0);
      });

      rerender(<ExperienceDocument html={html} muted={false} title="Audio toy" />);

      await waitFor(() => {
        expect(createdAudio[0].defaultMuted).toBe(false);
        expect(createdAudio[0].muted).toBe(false);
        expect(createdAudio[0].volume).toBe(0.8);
      });
    } finally {
      Object.defineProperty(window, 'Audio', {
        configurable: true,
        value: OriginalAudio,
        writable: true,
      });
    }
  });

  it('keeps audio contexts muted across user-triggered resume calls until the app unmutes', async () => {
    const createdContexts = [];
    const OriginalAudioContext = window.AudioContext;

    class MockAudioContext {
      constructor() {
        this.state = 'running';
        createdContexts.push(this);
      }

      resume() {
        this.state = 'running';
        return Promise.resolve();
      }

      suspend() {
        this.state = 'suspended';
        return Promise.resolve();
      }

      close() {
        this.state = 'closed';
        return Promise.resolve();
      }
    }

    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      value: MockAudioContext,
      writable: true,
    });

    const html = `
      <div>audio context toy</div>
      <script>
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        window.addEventListener('mousedown', () => {
          audioCtx.resume();
        });
      </script>
    `;

    try {
      const { container, rerender } = render(<ExperienceDocument html={html} muted title="Muted audio context toy" />);
      const runtimeRoot = container.querySelector('.experience-runtime');
      const stage = runtimeRoot?.shadowRoot?.querySelector('.toy-body');

      expect(stage).toBeTruthy();

      await waitFor(() => {
        expect(createdContexts).toHaveLength(1);
        expect(createdContexts[0].state).toBe('suspended');
      });

      stage.dispatchEvent(
        new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
        }),
      );

      await waitFor(() => {
        expect(createdContexts[0].state).toBe('suspended');
      });

      rerender(<ExperienceDocument html={html} muted={false} title="Muted audio context toy" />);

      await waitFor(() => {
        expect(createdContexts[0].state).toBe('running');
      });
    } finally {
      Object.defineProperty(window, 'AudioContext', {
        configurable: true,
        value: OriginalAudioContext,
        writable: true,
      });
    }
  });

  it('executes toys that redeclare AudioContext inside their runtime script', async () => {
    const OriginalAudioContext = window.AudioContext;

    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      value: class MockAudioContext {},
      writable: true,
    });

    const html = `
      <div id="canvas" data-mounted="false" data-responded="false"></div>
      <script>
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        document.getElementById('canvas').dataset.mounted = String(typeof AudioContext === 'function');
        window.addEventListener('mousedown', () => {
          document.getElementById('canvas').dataset.responded = 'true';
        });
      </script>
    `;

    try {
      const { container } = render(<ExperienceDocument html={html} title="AudioContext redeclare toy" />);
      const runtimeRoot = container.querySelector('.experience-runtime');
      const stage = runtimeRoot?.shadowRoot?.querySelector('.toy-body');
      const canvas = runtimeRoot?.shadowRoot?.querySelector('#canvas');

      expect(stage).toBeTruthy();
      expect(canvas).toBeTruthy();

      stage.dispatchEvent(
        new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
        }),
      );

      await waitFor(() => {
        expect(canvas?.dataset.mounted).toBe('true');
        expect(canvas?.dataset.responded).toBe('true');
      });
    } finally {
      Object.defineProperty(window, 'AudioContext', {
        configurable: true,
        value: OriginalAudioContext,
        writable: true,
      });
    }
  });

  it('caps runtime animation frames to a 30 fps budget', async () => {
    const animationFrameDriver = installMockAnimationFrame(10);

    const html = `
      <div id="canvas" data-frames="0"></div>
      <script>
        const canvas = document.getElementById('canvas');

        function loop() {
          canvas.dataset.frames = String(Number(canvas.dataset.frames) + 1);
          requestAnimationFrame(loop);
        }

        requestAnimationFrame(loop);
      </script>
    `;

    try {
      const { container } = render(<ExperienceDocument fpsCap={30} html={html} title="30 fps toy" />);
      const canvas = container.querySelector('.experience-runtime')?.shadowRoot?.querySelector('#canvas');

      expect(canvas).toBeTruthy();

      animationFrameDriver.flushFrames(120);

      const frameCount = Number(canvas?.dataset.frames ?? 0);
      expect(frameCount).toBeGreaterThanOrEqual(29);
      expect(frameCount).toBeLessThanOrEqual(31);
    } finally {
      Object.defineProperty(window, 'requestAnimationFrame', {
        configurable: true,
        value: originalRequestAnimationFrame,
        writable: true,
      });
      Object.defineProperty(window, 'cancelAnimationFrame', {
        configurable: true,
        value: originalCancelAnimationFrame,
        writable: true,
      });
    }
  });

  it('caps runtime animation frames to a 60 fps budget', async () => {
    const animationFrameDriver = installMockAnimationFrame(10);

    const html = `
      <div id="canvas" data-frames="0"></div>
      <script>
        const canvas = document.getElementById('canvas');

        function loop() {
          canvas.dataset.frames = String(Number(canvas.dataset.frames) + 1);
          requestAnimationFrame(loop);
        }

        requestAnimationFrame(loop);
      </script>
    `;

    try {
      const { container } = render(<ExperienceDocument fpsCap={60} html={html} title="60 fps toy" />);
      const canvas = container.querySelector('.experience-runtime')?.shadowRoot?.querySelector('#canvas');

      expect(canvas).toBeTruthy();

      animationFrameDriver.flushFrames(120);

      const frameCount = Number(canvas?.dataset.frames ?? 0);
      expect(frameCount).toBeGreaterThanOrEqual(59);
      expect(frameCount).toBeLessThanOrEqual(61);
    } finally {
      Object.defineProperty(window, 'requestAnimationFrame', {
        configurable: true,
        value: originalRequestAnimationFrame,
        writable: true,
      });
      Object.defineProperty(window, 'cancelAnimationFrame', {
        configurable: true,
        value: originalCancelAnimationFrame,
        writable: true,
      });
    }
  });

  it('preserves cancelAnimationFrame for queued runtime callbacks', async () => {
    const animationFrameDriver = installMockAnimationFrame(10);

    const html = `
      <div id="canvas" data-fired="false" data-live="false"></div>
      <script>
        const canvas = document.getElementById('canvas');
        const cancelledFrameId = requestAnimationFrame(() => {
          canvas.dataset.fired = 'true';
        });

        cancelAnimationFrame(cancelledFrameId);

        requestAnimationFrame(() => {
          canvas.dataset.live = 'true';
        });
      </script>
    `;

    try {
      const { container } = render(<ExperienceDocument fpsCap={60} html={html} title="cancel frame toy" />);
      const canvas = container.querySelector('.experience-runtime')?.shadowRoot?.querySelector('#canvas');

      expect(canvas).toBeTruthy();

      animationFrameDriver.flushFrames(5);

      expect(canvas?.dataset.live).toBe('true');
      expect(canvas?.dataset.fired).toBe('false');
    } finally {
      Object.defineProperty(window, 'requestAnimationFrame', {
        configurable: true,
        value: originalRequestAnimationFrame,
        writable: true,
      });
      Object.defineProperty(window, 'cancelAnimationFrame', {
        configurable: true,
        value: originalCancelAnimationFrame,
        writable: true,
      });
    }
  });
});
