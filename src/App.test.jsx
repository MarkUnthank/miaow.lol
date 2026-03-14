import { act } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { APP_API_NAME } from './appApi';
import App from './App';

const appTestMocks = vi.hoisted(() => {
  const theme = {
    accent: '#f00',
    accentAlt: '#0f0',
    accentSoft: 'rgba(255, 255, 255, 0.5)',
    bg: '#fff',
    blobA: '#111',
    blobB: '#222',
    blobC: '#333',
    bodyFont: 'sans-serif',
    displayFont: 'sans-serif',
    ink: '#000',
    panel: '#eee',
  };

  const experiences = ['Cat Mash Chaos', 'Box Fort', 'Nap Nebula'].map((title, index) => ({
    id: `experience-${index}`,
    title,
    description: `${title} description`,
    cardSummary: `${title} summary`,
    theme,
    Component: () => null,
    loadPreviewHtml: vi.fn().mockResolvedValue(''),
    preload: vi.fn(),
  }));

  return {
    experiences,
    getRandomExperienceIndex: vi.fn(() => 2),
  };
});

vi.mock('./components/Lobby', async () => {
  const { jsx, jsxs } = await import('react/jsx-runtime');

  return {
    Lobby: ({ activeIndex, isFullscreen, onLaunch, onToggleFullscreen }) =>
      jsxs('div', {
        'data-testid': 'lobby',
        children: [
          jsx('div', { 'data-testid': 'lobby-active-index', children: String(activeIndex) }),
          jsx('div', { 'data-testid': 'lobby-fullscreen', children: String(isFullscreen) }),
          jsx('button', { onClick: () => onLaunch(1), type: 'button', children: 'launch-second' }),
          jsx('button', { onClick: () => onLaunch(0), type: 'button', children: 'launch-first' }),
          jsx('button', { onClick: onToggleFullscreen, type: 'button', children: 'toggle-lobby-fullscreen' }),
        ],
      }),
  };
});

vi.mock('./components/Player', async () => {
  const { jsx, jsxs } = await import('react/jsx-runtime');

  return {
    Player: ({ experience, isFullscreen, onBack, onPrevious, onRandom, onToggleFullscreen }) =>
      jsxs('div', {
        'data-testid': 'player',
        children: [
          jsx('div', { 'data-testid': 'player-title', children: experience.title }),
          jsx('div', { 'data-testid': 'player-fullscreen', children: String(isFullscreen) }),
          jsx('button', { onClick: onBack, type: 'button', children: 'back' }),
          jsx('button', { onClick: onPrevious, type: 'button', children: 'previous' }),
          jsx('button', { onClick: onRandom, type: 'button', children: 'random' }),
          jsx('button', { onClick: onToggleFullscreen, type: 'button', children: 'toggle-player-fullscreen' }),
        ],
      }),
  };
});

vi.mock('./data/experiences', () => ({
  experiences: appTestMocks.experiences,
  getRandomExperienceIndex: appTestMocks.getRandomExperienceIndex,
  getWrappedIndex: (index) => {
    const length = appTestMocks.experiences.length;
    return (index + length) % length;
  },
}));

describe('App', () => {
  let fullscreenElement;
  let requestFullscreenMock;
  let exitFullscreenMock;

  beforeEach(() => {
    fullscreenElement = null;
    requestFullscreenMock = vi.fn().mockImplementation(async function requestFullscreen() {
      fullscreenElement = this;
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    exitFullscreenMock = vi.fn().mockImplementation(async () => {
      fullscreenElement = null;
      document.dispatchEvent(new Event('fullscreenchange'));
    });

    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => fullscreenElement,
    });
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      value: exitFullscreenMock,
      writable: true,
    });
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreenMock,
      writable: true,
    });

    window.history.replaceState(null, '', '/');
    delete window[APP_API_NAME];
    appTestMocks.getRandomExperienceIndex.mockReset().mockReturnValue(2);
    appTestMocks.experiences.forEach((experience) => {
      experience.preload.mockClear();
      experience.loadPreviewHtml.mockClear();
    });
  });

  it('registers the app-level fullscreen API and keeps fullscreen state in sync', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    expect(window[APP_API_NAME]?.fullscreen).toBeDefined();
    expect(window[APP_API_NAME].fullscreen.isActive()).toBe(false);
    expect(screen.getByTestId('lobby-fullscreen')).toHaveTextContent('false');

    await act(async () => {
      await window[APP_API_NAME].fullscreen.request();
    });

    expect(requestFullscreenMock).toHaveBeenCalledTimes(1);
    expect(fullscreenElement).toBe(container.querySelector('main'));
    expect(window[APP_API_NAME].fullscreen.isActive()).toBe(true);
    expect(screen.getByTestId('lobby-fullscreen')).toHaveTextContent('true');

    await user.click(screen.getByRole('button', { name: 'toggle-lobby-fullscreen' }));

    expect(exitFullscreenMock).toHaveBeenCalledTimes(1);
    expect(window[APP_API_NAME].fullscreen.isActive()).toBe(false);
    expect(screen.getByTestId('lobby-fullscreen')).toHaveTextContent('false');
  });

  it('pushes in-app history and restores prior states from popstate', async () => {
    const user = userEvent.setup();
    render(<App />);

    const lobbyState = JSON.parse(JSON.stringify(window.history.state));
    expect(lobbyState).toMatchObject({ mode: 'lobby', step: 0, activeIndex: 0, currentIndex: 0 });

    await user.click(screen.getByRole('button', { name: 'launch-second' }));
    expect(screen.getByTestId('player-title')).toHaveTextContent('Box Fort');

    const firstPlayerState = JSON.parse(JSON.stringify(window.history.state));
    expect(firstPlayerState).toMatchObject({ mode: 'player', step: 1, activeIndex: 1, currentIndex: 1 });

    await user.click(screen.getByRole('button', { name: 'random' }));
    expect(screen.getByTestId('player-title')).toHaveTextContent('Nap Nebula');

    const secondPlayerState = JSON.parse(JSON.stringify(window.history.state));
    expect(secondPlayerState).toMatchObject({ mode: 'player', step: 2, activeIndex: 2, currentIndex: 2 });

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: firstPlayerState }));
    });
    expect(screen.getByTestId('player-title')).toHaveTextContent('Box Fort');

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: lobbyState }));
    });
    expect(screen.getByTestId('lobby')).toBeInTheDocument();
  });

  it('uses browser history for the in-player Back button when an earlier experience exists', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'launch-second' }));
    const previousPlayerState = JSON.parse(JSON.stringify(window.history.state));

    await user.click(screen.getByRole('button', { name: 'random' }));
    expect(screen.getByTestId('player-title')).toHaveTextContent('Nap Nebula');

    const historyBackSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: previousPlayerState }));
    });

    await user.click(screen.getByRole('button', { name: 'back' }));

    expect(historyBackSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('player-title')).toHaveTextContent('Box Fort');
  });
});
