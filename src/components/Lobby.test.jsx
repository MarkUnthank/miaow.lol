import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Lobby } from './Lobby';
import { LOOP_COPY_COUNT } from './lobbyLoop';

vi.mock('./PreviewArt', () => ({
  PreviewArt: ({ experience }) => <div data-testid={`preview-${experience.id}`} />,
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

describe('Lobby', () => {
  it('renders repeated experience copies for a continuous rail', () => {
    render(
      <Lobby
        experiences={createExperiences()}
        activeIndex={0}
        isFullscreen={false}
        onActiveIndexChange={vi.fn()}
        onLaunch={vi.fn()}
        onToggleFullscreen={vi.fn()}
      />,
    );

    expect(screen.getAllByRole('button', { name: 'Alpha Toy' })).toHaveLength(LOOP_COPY_COUNT);
    expect(screen.getAllByRole('button', { name: 'Beta Toy' })).toHaveLength(LOOP_COPY_COUNT);
    expect(screen.getAllByRole('button', { name: 'Gamma Toy' })).toHaveLength(LOOP_COPY_COUNT);
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
            onToggleFullscreen={vi.fn()}
          />
        </>
      );
    }

    render(<ControlledLobby />);

    await user.click(screen.getByRole('button', { name: 'Next toy' }));

    expect(screen.getByTestId('active-index')).toHaveTextContent('0');
  });
});
