import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { APP_API_NAME } from '../appApi';
import { ExperienceDocument } from './ExperienceDocument';

describe('ExperienceDocument', () => {
  let requestSpy;
  let exitSpy;
  let toggleSpy;
  let isActiveSpy;

  beforeEach(() => {
    requestSpy = vi.fn().mockResolvedValue(undefined);
    exitSpy = vi.fn().mockResolvedValue(undefined);
    toggleSpy = vi.fn().mockResolvedValue(undefined);
    isActiveSpy = vi.fn().mockReturnValue(false);

    window[APP_API_NAME] = {
      fullscreen: {
        request: requestSpy,
        exit: exitSpy,
        toggle: toggleSpy,
        isActive: isActiveSpy,
      },
    };
  });

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
        this.muted = false;
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
        expect(createdAudio[0].muted).toBe(true);
      });

      rerender(<ExperienceDocument html={html} muted={false} title="Audio toy" />);

      await waitFor(() => {
        expect(createdAudio[0].muted).toBe(false);
      });
    } finally {
      Object.defineProperty(window, 'Audio', {
        configurable: true,
        value: OriginalAudio,
        writable: true,
      });
    }
  });
});
