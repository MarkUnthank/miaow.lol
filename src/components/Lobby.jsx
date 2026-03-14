import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftIcon, ArrowRightIcon, ExpandIcon, ShuffleIcon } from './Icons';
import { PreviewArt } from './PreviewArt';
import { getRandomExperienceIndex, getWrappedIndex } from '../data/experiences';

const BANDIT_SPIN_DURATION_MS = 760;
const BANDIT_REVEAL_DELAY_MS = 240;

function ActionButton({ children, className = '', icon: Icon, onClick, type = 'button' }) {
  return (
    <button className={`action-button ${className}`.trim()} onClick={onClick} type={type}>
      {Icon ? <Icon className="action-button__icon" /> : null}
      <span>{children}</span>
    </button>
  );
}

export function Lobby({
  experiences,
  activeIndex,
  isFullscreen,
  launchInFullscreen,
  onActiveIndexChange,
  onLaunch,
  onToggleLaunchFullscreen,
}) {
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

  const activeExperience = experiences[activeIndex];
  const activeTags = useMemo(() => activeExperience.tags.slice(0, 3), [activeExperience]);

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

  function handleSurpriseSelection() {
    if (isBanditSpinning) {
      return;
    }

    activateCard(getRandomExperienceIndex(activeIndex));
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
      <div className="lobby-copy">
        <p className="lobby-copy__eyebrow">Unified React launchpad</p>
        <h1 className="lobby-copy__title">MIAOW.LOL</h1>
        <p className="lobby-copy__subtitle">
          Fifteen browser toys now live behind one shared lobby, one overlay, and one loud carousel.
        </p>

        <div className="lobby-copy__feature">
          <span className="lobby-copy__feature-label">Now focused</span>
          <h2 className="lobby-copy__feature-title">{activeExperience.title}</h2>
          <p className="lobby-copy__feature-text">{activeExperience.description}</p>
        </div>

        <div className="tag-row" aria-label="Selected toy traits">
          {activeTags.map((tag) => (
            <span className="tag-chip" key={tag}>
              {tag}
            </span>
          ))}
        </div>

        <div className="lobby-copy__actions">
          <ActionButton className="action-button--primary" onClick={() => onLaunch(activeIndex)}>
            Play this toy
          </ActionButton>
          <ActionButton className="action-button--secondary" icon={ShuffleIcon} onClick={handleSurpriseSelection}>
            Surprise me
          </ActionButton>
        </div>

        <p className="lobby-copy__hint">Use the left and right arrow keys to move. Press Enter to launch.</p>
      </div>

      <div className="carousel-panel" style={{ '--track-edge-padding': `${trackEdgePadding}px` }}>
        <div className="carousel-panel__header">
          <div>
            <p className="carousel-panel__eyebrow">{activeExperience.eyebrow}</p>
            <h2 className="carousel-panel__title">16:9 focus rail</h2>
          </div>
          <p className="carousel-panel__count">{activeExperience.number} / {String(experiences.length).padStart(2, '0')}</p>
        </div>

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
                    <p className="toy-card__eyebrow">{experience.eyebrow}</p>
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

      <div className="fullscreen-dock">
        <ActionButton
          className={`action-button--dock ${launchInFullscreen || isFullscreen ? 'is-armed' : ''}`}
          icon={ExpandIcon}
          onClick={onToggleLaunchFullscreen}
        >
          {isFullscreen ? 'Exit fullscreen' : launchInFullscreen ? 'Launch fullscreen on' : 'Launch fullscreen off'}
        </ActionButton>
      </div>
    </div>
  );
}
