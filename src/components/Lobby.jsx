import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftIcon, ArrowRightIcon, DieIcon, ExpandIcon, SpeakerIcon } from './Icons';
import { PreviewArt } from './PreviewArt';
import { getCenteredLoopIndex, getLoopRecenterCopyShift, getNearestLoopIndex, LOOP_COPY_COUNT } from './lobbyLoop';

export function Lobby({ experiences, activeIndex, isFullscreen, isMuted, onActiveIndexChange, onLaunch, onRandom, onToggleFullscreen, onToggleMute }) {
  const trackRef = useRef(null);
  const cardRefs = useRef([]);
  const scrollFrameRef = useRef(0);
  const scrollSyncIgnoreUntilRef = useRef(0);
  const scrollSyncResetFrameRef = useRef(0);
  const scrollSyncResetTimerRef = useRef(0);
  const userScrollIntentUntilRef = useRef(0);
  const userScrollIntentResetTimerRef = useRef(0);
  const activeVirtualIndexRef = useRef(getCenteredLoopIndex(experiences.length, activeIndex));
  const [trackEdgePadding, setTrackEdgePadding] = useState(20);
  const [activeVirtualIndex, setActiveVirtualIndex] = useState(() => getCenteredLoopIndex(experiences.length, activeIndex));

  function clearScrollSyncIgnore() {
    if (scrollSyncResetFrameRef.current) {
      cancelAnimationFrame(scrollSyncResetFrameRef.current);
      scrollSyncResetFrameRef.current = 0;
    }

    if (scrollSyncResetTimerRef.current) {
      window.clearTimeout(scrollSyncResetTimerRef.current);
      scrollSyncResetTimerRef.current = 0;
    }

    scrollSyncIgnoreUntilRef.current = 0;
  }

  function clearUserScrollIntent() {
    if (userScrollIntentResetTimerRef.current) {
      window.clearTimeout(userScrollIntentResetTimerRef.current);
      userScrollIntentResetTimerRef.current = 0;
    }

    userScrollIntentUntilRef.current = 0;
  }

  function markUserScrollIntent(duration = 700) {
    clearUserScrollIntent();

    userScrollIntentUntilRef.current = Date.now() + duration;
    userScrollIntentResetTimerRef.current = window.setTimeout(() => {
      userScrollIntentUntilRef.current = 0;
      userScrollIntentResetTimerRef.current = 0;
    }, duration);
  }

  function suppressScrollSync(behavior = 'auto') {
    clearScrollSyncIgnore();

    if (behavior === 'smooth') {
      scrollSyncIgnoreUntilRef.current = Date.now() + 450;
      scrollSyncResetTimerRef.current = window.setTimeout(() => {
        scrollSyncIgnoreUntilRef.current = 0;
        scrollSyncResetTimerRef.current = 0;
      }, 450);
      return;
    }

    scrollSyncIgnoreUntilRef.current = Date.now() + 34;
    scrollSyncResetFrameRef.current = requestAnimationFrame(() => {
      scrollSyncResetFrameRef.current = requestAnimationFrame(() => {
        scrollSyncIgnoreUntilRef.current = 0;
        scrollSyncResetFrameRef.current = 0;
      });
    });
  }

  function shouldIgnoreScrollSync() {
    return scrollSyncIgnoreUntilRef.current > Date.now();
  }

  function hasUserScrollIntent() {
    return userScrollIntentUntilRef.current > Date.now();
  }

  function wrapIndex(index) {
    if (experiences.length < 1) {
      return 0;
    }

    return ((index % experiences.length) + experiences.length) % experiences.length;
  }

  const loopedExperiences = useMemo(
    () =>
      Array.from({ length: LOOP_COPY_COUNT }, (_, copyIndex) =>
        experiences.map((experience, logicalIndex) => ({
          copyIndex,
          experience,
          logicalIndex,
          virtualIndex: copyIndex * experiences.length + logicalIndex,
        })),
      ).flat(),
    [experiences],
  );

  function setTrackScrollLeft(track, left, behavior = 'auto') {
    if (!track) {
      return;
    }
    suppressScrollSync(behavior);

    if (behavior === 'auto' || behavior === 'instant') {
      track.scrollLeft = left;
      return;
    }

    if (typeof track.scrollTo === 'function') {
      track.scrollTo({ left, behavior });
      return;
    }

    track.scrollLeft = left;
  }

  function getLoopSegmentWidth() {
    if (experiences.length < 1) {
      return 0;
    }

    const firstCard = cardRefs.current[0];
    const nextCopyFirstCard = cardRefs.current[experiences.length];

    if (!firstCard || !nextCopyFirstCard) {
      return 0;
    }

    return nextCopyFirstCard.offsetLeft - firstCard.offsetLeft;
  }

  function scrollCardIntoView(virtualIndex, behavior = 'smooth') {
    const track = trackRef.current;
    const card = cardRefs.current[virtualIndex];

    if (!track || !card) {
      return;
    }

    const targetLeft = card.offsetLeft - (track.clientWidth - card.clientWidth) / 2;

    setTrackScrollLeft(track, Math.max(0, targetLeft), behavior);
  }

  function measureTrackPadding() {
    const track = trackRef.current;
    const firstCard = cardRefs.current[0];

    if (!track || !firstCard) {
      return;
    }

    const nextPadding = Math.max(20, (track.clientWidth - firstCard.clientWidth) / 2);
    setTrackEdgePadding(nextPadding);
  }

  function syncActiveVirtualIndex(nextVirtualIndex) {
    activeVirtualIndexRef.current = nextVirtualIndex;
    setActiveVirtualIndex(nextVirtualIndex);
  }

  function activateCard(index, { behavior = 'smooth', shouldCenter = true, virtualIndex } = {}) {
    const nextIndex = wrapIndex(index);
    const nextVirtualIndex =
      virtualIndex ?? getNearestLoopIndex(experiences.length, nextIndex, activeVirtualIndexRef.current, LOOP_COPY_COUNT);

    if (nextIndex === activeIndex && nextVirtualIndex === activeVirtualIndexRef.current) {
      if (shouldCenter) {
        scrollCardIntoView(nextVirtualIndex, behavior);
      }
      return;
    }

    experiences[nextIndex].preload();
    syncActiveVirtualIndex(nextVirtualIndex);
    onActiveIndexChange(nextIndex);

    if (shouldCenter) {
      scrollCardIntoView(nextVirtualIndex, behavior);
    }
  }

  function moveSelection(delta) {
    activateCard(activeIndex + delta);
  }

  function handleCardSurfaceAction(logicalIndex, virtualIndex) {
    if (logicalIndex === activeIndex && virtualIndex === activeVirtualIndexRef.current) {
      onLaunch(logicalIndex);
      return;
    }

    activateCard(logicalIndex, { virtualIndex });
  }

  function findClosestVirtualIndex(track) {
    const center = track.scrollLeft + track.clientWidth / 2;
    let closestIndex = activeVirtualIndexRef.current;
    let closestDistance = Number.POSITIVE_INFINITY;

    cardRefs.current.forEach((card, index) => {
      if (!card) {
        return;
      }

      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(center - cardCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    return closestIndex;
  }

  function recenterLoopIfNeeded(track, closestVirtualIndex) {
    const copyShift = getLoopRecenterCopyShift(experiences.length, closestVirtualIndex, LOOP_COPY_COUNT);

    if (!copyShift) {
      return closestVirtualIndex;
    }

    const loopSegmentWidth = getLoopSegmentWidth();

    if (!loopSegmentWidth) {
      return closestVirtualIndex;
    }

    setTrackScrollLeft(track, track.scrollLeft + loopSegmentWidth * copyShift, 'instant');
    return closestVirtualIndex + experiences.length * copyShift;
  }

  function handleScroll() {
    if (scrollFrameRef.current) {
      cancelAnimationFrame(scrollFrameRef.current);
    }

    scrollFrameRef.current = requestAnimationFrame(() => {
      const track = trackRef.current;
      if (!track || shouldIgnoreScrollSync()) {
        return;
      }

      if (!hasUserScrollIntent()) {
        return;
      }

      // Keep the manual-scroll window alive while momentum scrolling is still producing events.
      markUserScrollIntent(160);

      const rawClosestVirtualIndex = findClosestVirtualIndex(track);
      const centeredVirtualIndex = recenterLoopIfNeeded(track, rawClosestVirtualIndex);
      const nextLogicalIndex = wrapIndex(centeredVirtualIndex);

      if (centeredVirtualIndex !== activeVirtualIndexRef.current) {
        syncActiveVirtualIndex(centeredVirtualIndex);
      }

      if (nextLogicalIndex !== activeIndex) {
        onActiveIndexChange(nextLogicalIndex);
        experiences[nextLogicalIndex].preload();
      }
    });
  }

  useEffect(() => {
    measureTrackPadding();
    const initialVirtualIndex = getCenteredLoopIndex(experiences.length, activeIndex, LOOP_COPY_COUNT);
    syncActiveVirtualIndex(initialVirtualIndex);
    scrollCardIntoView(initialVirtualIndex, 'auto');

    const resizeObserver = new ResizeObserver(() => {
      measureTrackPadding();
      scrollCardIntoView(activeVirtualIndexRef.current, 'auto');
    });

    if (trackRef.current) {
      resizeObserver.observe(trackRef.current);
    }

    return () => {
      if (scrollFrameRef.current) {
        cancelAnimationFrame(scrollFrameRef.current);
      }
      clearScrollSyncIgnore();
      clearUserScrollIntent();
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const nextVirtualIndex = getNearestLoopIndex(experiences.length, activeIndex, activeVirtualIndexRef.current, LOOP_COPY_COUNT);

    if (nextVirtualIndex === activeVirtualIndexRef.current) {
      return;
    }

    syncActiveVirtualIndex(nextVirtualIndex);
    scrollCardIntoView(nextVirtualIndex, 'auto');
  }, [activeIndex, experiences.length]);

  useEffect(() => {
    if (!trackRef.current) {
      return;
    }

    scrollCardIntoView(activeVirtualIndexRef.current, 'auto');
  }, [trackEdgePadding]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.defaultPrevented || event.altKey || event.metaKey || event.ctrlKey) {
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        moveSelection(1);
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        moveSelection(-1);
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onLaunch(wrapIndex(activeVirtualIndexRef.current));
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeIndex, onLaunch]);

  return (
    <div className="lobby-screen">
      <div className="carousel-panel" style={{ '--track-edge-padding': `${trackEdgePadding}px` }}>
        <div className="carousel-shell">
          <button aria-label="Previous toy" className="carousel-arrow carousel-arrow--left" onClick={() => moveSelection(-1)} type="button">
            <ArrowLeftIcon className="carousel-arrow__icon" />
          </button>

          <div
            className="carousel-track"
            onScroll={handleScroll}
            onTouchStart={() => markUserScrollIntent(1600)}
            onWheel={() => markUserScrollIntent(700)}
            ref={trackRef}
          >
            {loopedExperiences.map(({ copyIndex, experience, logicalIndex, virtualIndex }) => {
              const isActive = virtualIndex === activeVirtualIndex;

              return (
                <article
                  className={`toy-card ${isActive ? 'is-active' : ''}`.trim()}
                  key={`${experience.id}-${copyIndex}`}
                  onClick={() => handleCardSurfaceAction(logicalIndex, virtualIndex)}
                  onMouseEnter={() => experiences[logicalIndex].preload()}
                  ref={(node) => {
                    cardRefs.current[virtualIndex] = node;
                  }}
                >
                  <button
                    aria-label={experience.title}
                    aria-pressed={isActive}
                    className="toy-card__surface"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleCardSurfaceAction(logicalIndex, virtualIndex);
                    }}
                    onFocus={(event) => {
                      if (!event.currentTarget.matches(':focus-visible')) {
                        return;
                      }

                      activateCard(logicalIndex, { virtualIndex });
                    }}
                    type="button"
                  />

                  <div className="toy-card__content">
                    <div className="toy-card__chrome">
                      <span />
                      <span />
                      <span />
                    </div>

                    <div className="toy-card__preview">
                      <PreviewArt experience={experience} isActive={isActive} muted={isMuted} />

                      <button
                        aria-label={`Open ${experience.title}`}
                        className="toy-card__launch"
                        onClick={(event) => {
                          event.stopPropagation();
                          onLaunch(logicalIndex);
                        }}
                        type="button"
                      >
                        <ArrowRightIcon className="toy-card__launch-icon" />
                        <span>Open</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <button aria-label="Next toy" className="carousel-arrow carousel-arrow--right" onClick={() => moveSelection(1)} type="button">
            <ArrowRightIcon className="carousel-arrow__icon" />
          </button>
        </div>
      </div>

      <div className="fullscreen-dock">
        <div className="fullscreen-dock__controls">
          <button className={`action-button action-button--dock ${isFullscreen ? 'is-armed' : ''}`.trim()} onClick={onToggleFullscreen} type="button">
            <ExpandIcon className="action-button__icon" />
            <span>{isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}</span>
          </button>

          <button className="action-button action-button--dock" onClick={onToggleMute} type="button">
            <SpeakerIcon className="action-button__icon" muted={isMuted} />
            <span>{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>
        </div>
      </div>

      <div className="random-dock">
        <button className="action-button action-button--dock action-button--random" onClick={onRandom} type="button">
          <DieIcon className="action-button__icon" />
          <span>Random toy</span>
        </button>
      </div>
    </div>
  );
}
