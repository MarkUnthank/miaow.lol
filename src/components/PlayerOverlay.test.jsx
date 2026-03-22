import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PlayerOverlay } from './PlayerOverlay';

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

describe('PlayerOverlay', () => {
  it('keeps the full overlay actions visible on desktop-sized screens', () => {
    render(
      <PlayerOverlay
        isFullscreen={false}
        isMuted={false}
        onBack={vi.fn()}
        onPrevious={vi.fn()}
        onRandom={vi.fn()}
        onToggleFullscreen={vi.fn()}
        onToggleMute={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Random next' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fullscreen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mute' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Menu' })).not.toBeInTheDocument();
  });

  it('collapses the experience controls into a mobile menu and closes it after a selection', async () => {
    mockMatchMedia({ '(max-width: 760px)': true });
    const user = userEvent.setup();
    const onBack = vi.fn();

    render(
      <PlayerOverlay
        isFullscreen={false}
        isMuted={false}
        onBack={onBack}
        onPrevious={vi.fn()}
        onRandom={vi.fn()}
        onToggleFullscreen={vi.fn()}
        onToggleMute={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Home' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Random next' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Menu' }));

    expect(screen.getByRole('dialog', { name: 'Experience options' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Random next' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fullscreen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mute' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Home' }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog', { name: 'Experience options' })).not.toBeInTheDocument();
  });

  it('dismisses the mobile menu when clicking outside it', async () => {
    mockMatchMedia({ '(max-width: 760px)': true });
    const user = userEvent.setup();

    render(
      <PlayerOverlay
        isFullscreen={false}
        isMuted={false}
        onBack={vi.fn()}
        onPrevious={vi.fn()}
        onRandom={vi.fn()}
        onToggleFullscreen={vi.fn()}
        onToggleMute={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Menu' }));
    expect(screen.getByRole('dialog', { name: 'Experience options' })).toBeInTheDocument();

    await user.click(document.body);

    expect(screen.queryByRole('dialog', { name: 'Experience options' })).not.toBeInTheDocument();
  });

  it('keeps fullscreen hidden in the mobile menu when the experience is already fullscreen', async () => {
    mockMatchMedia({ '(max-width: 760px)': true });
    const user = userEvent.setup();

    render(
      <PlayerOverlay
        isFullscreen={true}
        isMuted={true}
        onBack={vi.fn()}
        onPrevious={vi.fn()}
        onRandom={vi.fn()}
        onToggleFullscreen={vi.fn()}
        onToggleMute={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Menu' }));

    expect(screen.queryByRole('button', { name: 'Fullscreen' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unmute' })).toBeInTheDocument();
  });
});
