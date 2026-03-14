import { afterEach, describe, expect, it, vi } from 'vitest';
import { experiences, getRandomExperienceIndex, getRandomExperienceNavigation, getWrappedIndex, markExperienceSeen } from './experiences';

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

  it('prefers unseen experiences before repeating any seen ones', () => {
    const seenIndices = Array.from({ length: experiences.length - 2 }, (_, index) => index + 1);

    expect(getRandomExperienceIndex(0, seenIndices)).toBe(experiences.length - 1);
  });

  it('starts a new seen cycle after every experience has been opened', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const { nextIndex, seenIndices } = getRandomExperienceNavigation(
      0,
      Array.from({ length: experiences.length }, (_, index) => index),
    );

    expect(nextIndex).toBe(1);
    expect(seenIndices).toEqual([1]);
  });

  it('deduplicates seen experience tracking while preserving order', () => {
    expect(markExperienceSeen([2, 2, 4], 2)).toEqual([2, 4]);
    expect(markExperienceSeen([2, 4], 6)).toEqual([2, 4, 6]);
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
