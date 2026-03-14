import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftIcon, ArrowRightIcon, ExpandIcon } from './Icons';
import { PreviewArt } from './PreviewArt';
import { getCenteredLoopIndex, getLoopRecenterCopyShift, getNearestLoopIndex, LOOP_COPY_COUNT } from './lobbyLoop';

export function Lobby({ experiences, activeIndex, isFullscreen, onActiveIndexChange, onLaunch, onToggleFullscreen }) {
  const trackRef = useRef(null);
  const cardRefs = useRef([]);
  const scrollFrameRef = useRef(0);
  const activeVirtualIndexRef = useRef(getCenteredLoopIndex(experiences.length, activeIndex));
  const [trackEdgePadding, setTrackEdgePadding] = useState(20);
  const [activeVirtualIndex, setActiveVirtualIndex] = useState(() => getCenteredLoopIndex(experiences.length, activeIndex));

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

    track.scrollLeft += loopSegmentWidth * copyShift;
    return closestVirtualIndex + experiences.length * copyShift;
  }

  function handleScroll() {
    if (scrollFrameRef.current) {
      cancelAnimationFrame(scrollFrameRef.current);
    }

    scrollFrameRef.current = requestAnimationFrame(() => {
      const track = trackRef.current;
      if (!track) {
        return;
      }

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

          <div className="carousel-track" onScroll={handleScroll} ref={trackRef}>
            {loopedExperiences.map(({ copyIndex, experience, logicalIndex, virtualIndex }) => {
              const isActive = virtualIndex === activeVirtualIndex;

              return (
                <button
                  aria-label={experience.title}
                  aria-pressed={isActive}
                  className={`toy-card ${isActive ? 'is-active' : ''}`.trim()}
                  key={`${experience.id}-${copyIndex}`}
                  onClick={() => {
                    if (isActive) {
                      onLaunch(logicalIndex);
                      return;
                    }

                    activateCard(logicalIndex, { virtualIndex });
                  }}
                  onFocus={(event) => {
                    if (!event.currentTarget.matches(':focus-visible')) {
                      return;
                    }

                    activateCard(logicalIndex, { virtualIndex });
                  }}
                  onMouseEnter={() => experiences[logicalIndex].preload()}
                  ref={(node) => {
                    cardRefs.current[virtualIndex] = node;
                  }}
                  type="button"
                >
                  <div className="toy-card__chrome">
                    <span />
                    <span />
                    <span />
                    <strong>Toy {experience.number}</strong>
                  </div>

                  <div className="toy-card__preview">
                    <PreviewArt experience={experience} isActive={isActive} />
                  </div>
                </button>
              );
            })}
          </div>

          <button aria-label="Next toy" className="carousel-arrow carousel-arrow--right" onClick={() => moveSelection(1)} type="button">
            <ArrowRightIcon className="carousel-arrow__icon" />
          </button>
        </div>
      </div>

      <div className="fullscreen-dock">
        <button className={`action-button action-button--dock ${isFullscreen ? 'is-armed' : ''}`.trim()} onClick={onToggleFullscreen} type="button">
          <ExpandIcon className="action-button__icon" />
          <span>{isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}</span>
        </button>
      </div>
    </div>
  );
}
