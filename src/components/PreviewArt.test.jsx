import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PreviewArt } from './PreviewArt';

vi.mock('./ExperienceDocument', () => ({
  ExperienceDocument: ({ fpsCap, title }) => (
    <div data-fps-cap={String(fpsCap)} data-testid="preview-runtime">
      {title}
    </div>
  ),
}));

const theme = {
  accent: '#f00',
  accentAlt: '#0f0',
  panel: '#eee',
};

function createExperience() {
  return {
    id: 'cat-mash-chaos',
    loadPreviewHtml: vi.fn().mockResolvedValue('<div>preview runtime</div>'),
    theme,
    title: 'Cat Mash Chaos',
  };
}

describe('PreviewArt', () => {
  it('does not load preview html or mount the runtime while inactive', () => {
    const experience = createExperience();

    render(<PreviewArt experience={experience} isActive={false} isLive={false} muted={false} />);

    expect(experience.loadPreviewHtml).not.toHaveBeenCalled();
    expect(screen.queryByTestId('preview-runtime')).not.toBeInTheDocument();
  });

  it('loads preview html only once and reuses it when reactivated', async () => {
    const experience = createExperience();
    const { rerender } = render(<PreviewArt experience={experience} isActive isLive muted={false} />);

    await waitFor(() => {
      expect(screen.getByTestId('preview-runtime')).toHaveTextContent('Cat Mash Chaos preview');
    });

    expect(experience.loadPreviewHtml).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('preview-runtime')).toHaveAttribute('data-fps-cap', '30');

    rerender(<PreviewArt experience={experience} isActive={false} isLive={false} muted={false} />);
    expect(screen.queryByTestId('preview-runtime')).not.toBeInTheDocument();

    rerender(<PreviewArt experience={experience} isActive isLive muted={false} />);

    await waitFor(() => {
      expect(screen.getByTestId('preview-runtime')).toBeInTheDocument();
    });

    expect(experience.loadPreviewHtml).toHaveBeenCalledTimes(1);
  });

  it('can render a live sibling preview without marking it as the active card', async () => {
    const experience = createExperience();
    const { container } = render(<PreviewArt experience={experience} isActive={false} isLive muted={false} />);

    await waitFor(() => {
      expect(screen.getByTestId('preview-runtime')).toBeInTheDocument();
    });

    expect(experience.loadPreviewHtml).toHaveBeenCalledTimes(1);
    expect(container.querySelector('.preview-art')).not.toHaveClass('is-active');
  });
});
