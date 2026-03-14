import { describe, expect, it } from 'vitest';
import { getCenteredLoopIndex, getLoopRecenterCopyShift, getNearestLoopIndex, LOOP_COPY_COUNT } from './lobbyLoop';

describe('lobby loop helpers', () => {
  it('anchors the active experience in the center copy by default', () => {
    expect(getCenteredLoopIndex(3, 0)).toBe(6);
    expect(getCenteredLoopIndex(3, 2)).toBe(8);
  });

  it('chooses the nearest virtual card when wrapping across the loop seam', () => {
    expect(getNearestLoopIndex(3, 0, 8, LOOP_COPY_COUNT)).toBe(9);
    expect(getNearestLoopIndex(3, 2, 6, LOOP_COPY_COUNT)).toBe(5);
  });

  it('recenters only when the scroll position drifts into the hidden edge copies', () => {
    expect(getLoopRecenterCopyShift(3, 1, LOOP_COPY_COUNT)).toBe(2);
    expect(getLoopRecenterCopyShift(3, 7, LOOP_COPY_COUNT)).toBe(0);
    expect(getLoopRecenterCopyShift(3, 13, LOOP_COPY_COUNT)).toBe(-2);
  });
});
