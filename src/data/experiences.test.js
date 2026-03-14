import { afterEach, describe, expect, it, vi } from 'vitest';
import { experiences, getRandomExperienceIndex, getWrappedIndex } from './experiences';

describe('experience helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('wraps indexes across both ends of the experience rail', () => {
    expect(getWrappedIndex(0)).toBe(0);
    expect(getWrappedIndex(-1)).toBe(experiences.length - 1);
    expect(getWrappedIndex(experiences.length)).toBe(0);
    expect(getWrappedIndex(experiences.length + 2)).toBe(2);
  });

  it('never returns the current experience when choosing a random next experience', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.13);

    const nextIndex = getRandomExperienceIndex(0);

    expect(nextIndex).not.toBe(0);
    expect(nextIndex).toBeGreaterThanOrEqual(0);
    expect(nextIndex).toBeLessThan(experiences.length);
  });

  it('exposes stable metadata and lazy-loading hooks for every experience', () => {
    expect(experiences).toHaveLength(15);

    experiences.forEach((experience, index) => {
      expect(experience.number).toBe(String(index + 1).padStart(2, '0'));
      expect(experience.id).toBeTruthy();
      expect(experience.title).toBeTruthy();
      expect(experience.preload).toBeTypeOf('function');
      expect(experience.loadPreviewHtml).toBeTypeOf('function');
      expect(experience.Component).toBeTruthy();
    });
  });
});
