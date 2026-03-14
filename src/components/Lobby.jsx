import { useEffect, useRef, useState } from 'react';
import { ArrowLeftIcon, ArrowRightIcon } from './Icons';
import { PreviewArt } from './PreviewArt';
import { getWrappedIndex } from '../data/experiences';

const BANDIT_SPIN_DURATION_MS = 760;
const BANDIT_REVEAL_DELAY_MS = 240;

export function Lobby({ experiences, activeIndex, onActiveIndexChange, onLaunch }) {
  const trackRef = useRef(null);
  const cardRefs = useRef([]);
  const scrollFrameRef = useRef(0);
  const spinFrameRef = useRef(0);
  const spinTimeoutRef = useRef(0);
  const revealStartTimeoutRef = useRef(0);
  const revealClearTimeoutRef = useRef(0);
  const [trackEdgePadding, setTrackEdgePadding] = useState(20);
  const [isBanditSpinning, setIsBanditSpinning] = useState(false);
  const [revealingIndex, setRevealingIndex] = useState(-1);

  function scrollCardIntoView(index, behavior = 'smooth') {
    const track = trackRef.current;
    const card = cardRefs.current[index];

    if (!track || !card) {
      return;
    }

    const targetLeft = card.offsetLeft - (track.clientWidth - card.clientWidth) / 2;

    track.scrollTo({
      left: Math.max(0, targetLeft),
      behavior,
    });
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

  function clearRailFxTimers() {
    if (spinFrameRef.current) {
      cancelAnimationFrame(spinFrameRef.current);
      spinFrameRef.current = 0;
    }

    window.clearTimeout(spinTimeoutRef.current);
    window.clearTimeout(revealStartTimeoutRef.current);
    window.clearTimeout(revealClearTimeoutRef.current);
  }

  function triggerRailFx(nextIndex) {
    clearRailFxTimers();
    setIsBanditSpinning(false);
    setRevealingIndex(-1);

    spinFrameRef.current = requestAnimationFrame(() => {
      setIsBanditSpinning(true);

      revealStartTimeoutRef.current = window.setTimeout(() => {
        setRevealingIndex(nextIndex);
      }, BANDIT_REVEAL_DELAY_MS);

      spinTimeoutRef.current = window.setTimeout(() => {
        setIsBanditSpinning(false);
      }, BANDIT_SPIN_DURATION_MS);

      revealClearTimeoutRef.current = window.setTimeout(() => {
        setRevealingIndex(-1);
      }, BANDIT_SPIN_DURATION_MS + 140);
    });
  }

  function activateCard(index, { shouldCenter = true, withFx = true } = {}) {
    const nextIndex = getWrappedIndex(index);

    if (nextIndex === activeIndex) {
      if (shouldCenter) {
        scrollCardIntoView(nextIndex, withFx ? 'auto' : 'smooth');
      }
      return;
    }

    experiences[nextIndex].preload();
    onActiveIndexChange(nextIndex);

    if (withFx) {
      triggerRailFx(nextIndex);
    }

    if (shouldCenter) {
      scrollCardIntoView(nextIndex, withFx ? 'auto' : 'smooth');
    }
  }

  function moveSelection(delta) {
    if (isBanditSpinning) {
      return;
    }

    activateCard(activeIndex + delta);
  }

  function handleScroll() {
    if (isBanditSpinning) {
      return;
    }

    if (scrollFrameRef.current) {
      cancelAnimationFrame(scrollFrameRef.current);
    }

    scrollFrameRef.current = requestAnimationFrame(() => {
      const track = trackRef.current;
      if (!track) {
        return;
      }

      const center = track.scrollLeft + track.clientWidth / 2;
      let closestIndex = activeIndex;
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

      if (closestIndex !== activeIndex) {
        onActiveIndexChange(closestIndex);
        experiences[closestIndex].preload();
      }
    });
  }

  useEffect(() => {
    measureTrackPadding();
    scrollCardIntoView(activeIndex, 'auto');

    const resizeObserver = new ResizeObserver(() => {
      measureTrackPadding();
    });

    if (trackRef.current) {
      resizeObserver.observe(trackRef.current);
    }

    return () => {
      if (scrollFrameRef.current) {
        cancelAnimationFrame(scrollFrameRef.current);
      }

      clearRailFxTimers();
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.defaultPrevented || event.altKey || event.metaKey || event.ctrlKey) {
        return;
      }

      if (isBanditSpinning) {
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
        onLaunch(activeIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeIndex, isBanditSpinning, onLaunch]);

  return (
    <div className="lobby-screen">
      <div className="carousel-panel" style={{ '--track-edge-padding': `${trackEdgePadding}px` }}>
        <div className={`carousel-shell ${isBanditSpinning ? 'is-bandit-spinning' : ''}`.trim()}>
          <button aria-label="Previous toy" className="carousel-arrow carousel-arrow--left" onClick={() => moveSelection(-1)} type="button">
            <ArrowLeftIcon className="carousel-arrow__icon" />
          </button>

          <div className="carousel-track" onScroll={handleScroll} ref={trackRef}>
            {experiences.map((experience, index) => {
              const isActive = index === activeIndex;

              return (
                <button
                  aria-pressed={isActive}
                  className={`toy-card ${isActive ? 'is-active' : ''} ${isActive && revealingIndex === index ? 'is-revealing' : ''}`.trim()}
                  key={experience.id}
                  onClick={() => {
                    if (isActive) {
                      onLaunch(index);
                      return;
                    }

                    activateCard(index);
                  }}
                  onFocus={(event) => {
                    if (!event.currentTarget.matches(':focus-visible')) {
                      return;
                    }

                    activateCard(index, { shouldCenter: true, withFx: true });
                  }}
                  onMouseEnter={() => experiences[index].preload()}
                  ref={(node) => {
                    cardRefs.current[index] = node;
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

                  <div className="toy-card__meta">
                    <h3 className="toy-card__title">{experience.title}</h3>
                    <p className="toy-card__description">{experience.cardSummary}</p>
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
    </div>
  );
}
