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
    getRandomExperienceNavigation: vi.fn(() => ({ nextIndex: 2, seenIndices: [2] })),
  };
});

vi.mock('./components/Lobby', async () => {
  const { jsx, jsxs } = await import('react/jsx-runtime');

  return {
    Lobby: ({ activeIndex, isFullscreen, isMuted, onLaunch, onRandom, onToggleFullscreen, onToggleMute }) =>
      jsxs('div', {
        'data-testid': 'lobby',
        children: [
          jsx('div', { 'data-testid': 'lobby-active-index', children: String(activeIndex) }),
          jsx('div', { 'data-testid': 'lobby-fullscreen', children: String(isFullscreen) }),
          jsx('div', { 'data-testid': 'lobby-muted', children: String(isMuted) }),
          jsx('button', { onClick: () => onLaunch(1), type: 'button', children: 'launch-second' }),
          jsx('button', { onClick: () => onLaunch(0), type: 'button', children: 'launch-first' }),
          jsx('button', { onClick: onRandom, type: 'button', children: 'random-toy' }),
          jsx('button', { onClick: onToggleFullscreen, type: 'button', children: 'toggle-lobby-fullscreen' }),
          jsx('button', { onClick: onToggleMute, type: 'button', children: 'toggle-lobby-mute' }),
        ],
      }),
  };
});

vi.mock('./components/Player', async () => {
  const { jsx, jsxs } = await import('react/jsx-runtime');

  return {
    Player: ({ experience, isFullscreen, isMuted, onBack, onPrevious, onRandom, onToggleFullscreen, onToggleMute }) =>
      jsxs('div', {
        'data-testid': 'player',
        children: [
          jsx('div', { 'data-testid': 'player-title', children: experience.title }),
          jsx('div', { 'data-testid': 'player-fullscreen', children: String(isFullscreen) }),
          jsx('div', { 'data-testid': 'player-muted', children: String(isMuted) }),
          jsx('button', { onClick: onBack, type: 'button', children: 'back' }),
          jsx('button', { onClick: onPrevious, type: 'button', children: 'previous' }),
          jsx('button', { onClick: onRandom, type: 'button', children: 'random' }),
          jsx('button', { onClick: onToggleFullscreen, type: 'button', children: 'toggle-player-fullscreen' }),
          jsx('button', { onClick: onToggleMute, type: 'button', children: 'toggle-player-mute' }),
        ],
      }),
  };
});

vi.mock('./data/experiences', () => ({
  experiences: appTestMocks.experiences,
  getRandomExperienceNavigation: appTestMocks.getRandomExperienceNavigation,
  markExperienceSeen: (seenIndices, nextIndex) => {
    const nextSeenIndices = [...seenIndices];

    if (!nextSeenIndices.includes(nextIndex)) {
      nextSeenIndices.push(nextIndex);
    }

    return nextSeenIndices;
  },
  getWrappedIndex: (index) => {
    const length = appTestMocks.experiences.length;
    return (index + length) % length;
  },
}));

describe('App', () => {
  let fullscreenElement;
  let requestFullscreenMock;
  let exitFullscreenMock;
  let shareMock;
  let clipboardWriteTextMock;

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
    shareMock = vi.fn().mockResolvedValue(undefined);
    clipboardWriteTextMock = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: shareMock,
      writable: true,
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWriteTextMock },
      writable: true,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      configurable: true,
      value: 0,
      writable: true,
    });
    window.matchMedia.mockImplementation((query) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    }));

    window.history.replaceState(null, '', '/');
    delete window[APP_API_NAME];
    appTestMocks.getRandomExperienceNavigation.mockReset().mockReturnValue({ nextIndex: 2, seenIndices: [2] });
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

  it('keeps mute state in sync across the lobby, player, and app api', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(window[APP_API_NAME]?.audio).toBeDefined();
    expect(window[APP_API_NAME].audio.isMuted()).toBe(false);
    expect(screen.getByTestId('lobby-muted')).toHaveTextContent('false');

    await user.click(screen.getByRole('button', { name: 'toggle-lobby-mute' }));

    expect(window[APP_API_NAME].audio.isMuted()).toBe(true);
    expect(screen.getByTestId('lobby-muted')).toHaveTextContent('true');

    await user.click(screen.getByRole('button', { name: 'launch-second' }));

    expect(screen.getByTestId('player-muted')).toHaveTextContent('true');

    await user.click(screen.getByRole('button', { name: 'toggle-player-mute' }));

    expect(window[APP_API_NAME].audio.isMuted()).toBe(false);
    expect(screen.getByTestId('player-muted')).toHaveTextContent('false');
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

  it('uses the Previous button to go to the last experience in the player stack', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'launch-second' }));
    expect(screen.getByTestId('player-title')).toHaveTextContent('Box Fort');

    await user.click(screen.getByRole('button', { name: 'random' }));
    expect(screen.getByTestId('player-title')).toHaveTextContent('Nap Nebula');

    await user.click(screen.getByRole('button', { name: 'previous' }));

    expect(screen.getByTestId('player-title')).toHaveTextContent('Box Fort');
    expect(window.history.state).toMatchObject({ mode: 'player', currentIndex: 1 });
  });

  it('uses the Back button to return to the root lobby state instead of the last experience', async () => {
    const user = userEvent.setup();
    render(<App />);
    const rootLobbyState = JSON.parse(JSON.stringify(window.history.state));

    await user.click(screen.getByRole('button', { name: 'launch-second' }));
    await user.click(screen.getByRole('button', { name: 'random' }));
    expect(screen.getByTestId('player-title')).toHaveTextContent('Nap Nebula');

    const historyGoSpy = vi.spyOn(window.history, 'go').mockImplementation((delta) => {
      if (delta === -2) {
        window.dispatchEvent(new PopStateEvent('popstate', { state: rootLobbyState }));
      }
    });

    await user.click(screen.getByRole('button', { name: 'back' }));

    expect(historyGoSpy).toHaveBeenCalledWith(-2);
    expect(screen.getByTestId('lobby')).toBeInTheDocument();
    expect(screen.getByTestId('lobby-active-index')).toHaveTextContent('0');
  });

  it('opens a multi-option share menu on desktop', async () => {
    const user = userEvent.setup();
    render(<App />);
    const expectedUrl = `${window.location.origin}/?experience=experience-0`;

    await user.click(screen.getByRole('button', { name: 'Share' }));

    expect(screen.getByRole('dialog', { name: 'Share options' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'WhatsApp' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Telegram' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Email' })).toHaveAttribute('href', expect.stringContaining(encodeURIComponent(expectedUrl)));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('uses the native share sheet on mobile-like devices', async () => {
    const user = userEvent.setup();
    const expectedUrl = `${window.location.origin}/?experience=experience-1`;

    Object.defineProperty(navigator, 'maxTouchPoints', {
      configurable: true,
      value: 5,
      writable: true,
    });

    render(<App />);
    await user.click(screen.getByRole('button', { name: 'launch-second' }));
    await user.click(screen.getByRole('button', { name: 'Share' }));

    expect(shareMock).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Box Fort description',
        title: 'Box Fort | miaow.lol',
        url: expectedUrl,
      }),
    );
    expect(screen.queryByRole('dialog', { name: 'Share options' })).not.toBeInTheDocument();
  });

  it('opens a shared experience directly from the query string', () => {
    window.history.replaceState(null, '', '/?experience=experience-1');

    render(<App />);

    expect(screen.getByTestId('player-title')).toHaveTextContent('Box Fort');
    expect(window.history.state).toMatchObject({ mode: 'player', currentIndex: 1, step: 0 });
  });

  it('launches a random experience from the lobby button', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'random-toy' }));

    expect(screen.getByTestId('player-title')).toHaveTextContent('Nap Nebula');
    expect(window.history.state).toMatchObject({ mode: 'player', currentIndex: 2, step: 1 });
  });

  it('tracks seen experiences across random-next selections before repeating', async () => {
    const user = userEvent.setup();
    appTestMocks.getRandomExperienceNavigation
      .mockImplementationOnce(() => ({ nextIndex: 2, seenIndices: [1, 2] }))
      .mockImplementationOnce(() => ({ nextIndex: 0, seenIndices: [1, 2, 0] }));

    render(<App />);

    await user.click(screen.getByRole('button', { name: 'launch-second' }));
    await user.click(screen.getByRole('button', { name: 'random' }));
    await user.click(screen.getByRole('button', { name: 'random' }));

    expect(appTestMocks.getRandomExperienceNavigation).toHaveBeenNthCalledWith(1, 1, [1]);
    expect(appTestMocks.getRandomExperienceNavigation).toHaveBeenNthCalledWith(2, 2, [1, 2]);
    expect(screen.getByTestId('player-title')).toHaveTextContent('Cat Mash Chaos');
  });
});
