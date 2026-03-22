import { act, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Lobby } from './Lobby';
import { getCenteredLoopIndex, LOOP_COPY_COUNT } from './lobbyLoop';

vi.mock('./PreviewArt', () => ({
  PreviewArt: ({ experience, isActive, isLive }) => (
    <div data-active={String(isActive)} data-live={String(isLive)} data-testid={`preview-${experience.id}`} />
  ),
}));

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

function createExperiences() {
  return ['Alpha Toy', 'Beta Toy', 'Gamma Toy'].map((title, index) => ({
    id: `experience-${index}`,
    title,
    number: index + 1,
    cardSummary: `${title} summary`,
    theme,
    preload: vi.fn(),
  }));
}

function applyTrackGeometry(container) {
  const track = container.querySelector('.carousel-track');
  const cards = Array.from(container.querySelectorAll('.toy-card'));

  Object.defineProperty(track, 'clientWidth', {
    configurable: true,
    value: 600,
  });

  cards.forEach((card, index) => {
    Object.defineProperty(card, 'clientWidth', {
      configurable: true,
      value: 200,
    });
    Object.defineProperty(card, 'offsetLeft', {
      configurable: true,
      value: index * 220,
    });
    Object.defineProperty(card, 'offsetWidth', {
      configurable: true,
      value: 200,
    });
  });

  return { cards, track };
}

function getCenteredScrollLeft(track, card) {
  return card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2;
}

function installMockAnimationFrame() {
  let now = 0;
  let nextFrameId = 1;
  const pendingCallbacks = new Map();
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;

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
    flushFrames(frameCount, frameDurationMs) {
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
    restore() {
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
    },
  };
}

function mockMatchMedia(matchesByQuery = {}) {
  window.matchMedia.mockImplementation((query) => ({
    addEventListener: vi.fn(),
    addListener: vi.fn(),
    dispatchEvent: vi.fn(),
    matches: matchesByQuery[query] ?? false,
    media: query,
    onchange: null,
    removeEventListener: vi.fn(),
    removeListener: vi.fn(),
  }));
}

describe('Lobby', () => {
  it('centers the initial loop position without using smooth scroll animation', () => {
    const scrollToSpy = vi.fn();

    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: scrollToSpy,
      writable: true,
    });

    render(
      <Lobby
        experiences={createExperiences()}
        activeIndex={0}
        isFullscreen={false}
        onActiveIndexChange={vi.fn()}
        onLaunch={vi.fn()}
        onRandom={vi.fn()}
        onToggleFullscreen={vi.fn()}
      />,
    );

    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it('ignores mount-time scroll events while the rail is centering itself', () => {
    vi.useFakeTimers();
    const requestAnimationFrameSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0);
    const cancelAnimationFrameSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    try {
      const onActiveIndexChange = vi.fn();
      const { container } = render(
        <Lobby
          experiences={createExperiences()}
          activeIndex={1}
          isFullscreen={false}
          onActiveIndexChange={onActiveIndexChange}
          onLaunch={vi.fn()}
          onRandom={vi.fn()}
          onToggleFullscreen={vi.fn()}
        />,
      );

      fireEvent.scroll(container.querySelector('.carousel-track'));
      vi.runAllTimers();

      expect(onActiveIndexChange).not.toHaveBeenCalled();
    } finally {
      requestAnimationFrameSpy.mockRestore();
      cancelAnimationFrameSpy.mockRestore();
      vi.useRealTimers();
    }
  });

  it('ignores delayed scroll events that were not preceded by user input', () => {
    vi.useFakeTimers();
    const requestAnimationFrameSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0);
    const cancelAnimationFrameSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    try {
      const onActiveIndexChange = vi.fn();
      const experiences = createExperiences();
      const { container } = render(
        <Lobby
          experiences={experiences}
          activeIndex={0}
          isFullscreen={false}
          onActiveIndexChange={onActiveIndexChange}
          onLaunch={vi.fn()}
          onRandom={vi.fn()}
          onToggleFullscreen={vi.fn()}
        />,
      );
      const { cards, track } = applyTrackGeometry(container);
      const betaVirtualIndex = getCenteredLoopIndex(experiences.length, 1);

      act(() => {
        vi.advanceTimersByTime(100);
      });

      track.scrollLeft = getCenteredScrollLeft(track, cards[betaVirtualIndex]);
      fireEvent.scroll(track);

      act(() => {
        vi.advanceTimersByTime(1);
      });

      expect(onActiveIndexChange).not.toHaveBeenCalled();
    } finally {
      requestAnimationFrameSpy.mockRestore();
      cancelAnimationFrameSpy.mockRestore();
      vi.useRealTimers();
    }
  });

  it('renders repeated experience copies for a continuous rail', () => {
    const { container } = render(
      <Lobby
        experiences={createExperiences()}
        activeIndex={0}
        isFullscreen={false}
        onActiveIndexChange={vi.fn()}
        onLaunch={vi.fn()}
        onRandom={vi.fn()}
        onToggleFullscreen={vi.fn()}
      />,
    );

    expect(screen.getAllByRole('button', { name: 'Alpha Toy' })).toHaveLength(LOOP_COPY_COUNT);
    expect(screen.getAllByRole('button', { name: 'Beta Toy' })).toHaveLength(LOOP_COPY_COUNT);
    expect(screen.getAllByRole('button', { name: 'Gamma Toy' })).toHaveLength(LOOP_COPY_COUNT);
    expect(container.querySelectorAll('[data-active="true"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-live="true"]')).toHaveLength(1);
  });

  it('promotes sibling previews after sustained healthy fps and disables them again after sustained low fps', () => {
    const animationFrame = installMockAnimationFrame();

    try {
      const { container } = render(
        <Lobby
          experiences={createExperiences()}
          activeIndex={1}
          isFullscreen={false}
          onActiveIndexChange={vi.fn()}
          onLaunch={vi.fn()}
          onRandom={vi.fn()}
          onToggleFullscreen={vi.fn()}
        />,
      );

      expect(container.querySelectorAll('[data-live="true"]')).toHaveLength(1);

      act(() => {
        animationFrame.flushFrames(220, 16);
      });

      expect(container.querySelectorAll('[data-live="true"]')).toHaveLength(3);

      act(() => {
        animationFrame.flushFrames(60, 100);
      });

      expect(container.querySelectorAll('[data-live="true"]')).toHaveLength(1);
    } finally {
      animationFrame.restore();
    }
  });

  it('wraps from the last experience back to the first when advancing', async () => {
    const user = userEvent.setup();
    const experiences = createExperiences();

    function ControlledLobby() {
      const [activeIndex, setActiveIndex] = useState(experiences.length - 1);

      return (
        <>
          <div data-testid="active-index">{activeIndex}</div>
          <Lobby
            experiences={experiences}
            activeIndex={activeIndex}
            isFullscreen={false}
            onActiveIndexChange={setActiveIndex}
            onLaunch={vi.fn()}
            onRandom={vi.fn()}
            onToggleFullscreen={vi.fn()}
          />
        </>
      );
    }

    render(<ControlledLobby />);

    await user.click(screen.getByRole('button', { name: 'Next toy' }));

    expect(screen.getByTestId('active-index')).toHaveTextContent('0');
  });

  it('opens an experience directly from the preview overlay button', async () => {
    const user = userEvent.setup();
    const onLaunch = vi.fn();

    render(
      <Lobby
        experiences={createExperiences()}
        activeIndex={2}
        isFullscreen={false}
        onActiveIndexChange={vi.fn()}
        onLaunch={onLaunch}
        onRandom={vi.fn()}
        onToggleFullscreen={vi.fn()}
      />,
    );

    await user.click(screen.getAllByRole('button', { name: 'Open Alpha Toy' })[0]);

    expect(onLaunch).toHaveBeenCalledWith(0);
  });

  it('renders a bottom random toy button', () => {
    render(
      <Lobby
        experiences={createExperiences()}
        activeIndex={0}
        isFullscreen={false}
        onActiveIndexChange={vi.fn()}
        onLaunch={vi.fn()}
        onRandom={vi.fn()}
        onToggleFullscreen={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Random toy' })).toBeInTheDocument();
  });

  it('keeps fullscreen and mute as inline top controls on desktop-sized screens', () => {
    render(
      <Lobby
        experiences={createExperiences()}
        activeIndex={0}
        isFullscreen={false}
        isMuted={false}
        onActiveIndexChange={vi.fn()}
        onLaunch={vi.fn()}
        onRandom={vi.fn()}
        onToggleFullscreen={vi.fn()}
        onToggleMute={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Fullscreen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mute' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Menu' })).not.toBeInTheDocument();
  });

  it('collapses the top controls into a mobile menu and closes it after selection', async () => {
    mockMatchMedia({ '(max-width: 760px)': true });
    const user = userEvent.setup();
    const onToggleMute = vi.fn();

    render(
      <Lobby
        experiences={createExperiences()}
        activeIndex={0}
        isFullscreen={false}
        isMuted={false}
        onActiveIndexChange={vi.fn()}
        onLaunch={vi.fn()}
        onRandom={vi.fn()}
        onToggleFullscreen={vi.fn()}
        onToggleMute={onToggleMute}
      />,
    );

    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fullscreen' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mute' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Menu' }));

    expect(screen.getByRole('dialog', { name: 'Lobby options' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fullscreen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mute' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mute' }));

    expect(onToggleMute).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog', { name: 'Lobby options' })).not.toBeInTheDocument();
  });

  it('closes the mobile controls menu when clicking outside it', async () => {
    mockMatchMedia({ '(max-width: 760px)': true });
    const user = userEvent.setup();

    render(
      <Lobby
        experiences={createExperiences()}
        activeIndex={0}
        isFullscreen={false}
        isMuted={false}
        onActiveIndexChange={vi.fn()}
        onLaunch={vi.fn()}
        onRandom={vi.fn()}
        onToggleFullscreen={vi.fn()}
        onToggleMute={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Menu' }));
    expect(screen.getByRole('dialog', { name: 'Lobby options' })).toBeInTheDocument();

    await user.click(document.body);

    expect(screen.queryByRole('dialog', { name: 'Lobby options' })).not.toBeInTheDocument();
  });
});
