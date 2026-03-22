import { useEffect, useRef, useState } from 'react';
import { ArrowLeftIcon, ExpandIcon, HomeIcon, MenuIcon, ShuffleIcon, SpeakerIcon } from './Icons';

const COMPACT_PLAYER_CONTROLS_MEDIA_QUERY = '(max-width: 760px)';

function getIsCompactPlayerControls() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia(COMPACT_PLAYER_CONTROLS_MEDIA_QUERY).matches;
}

function OverlayButton({ children, icon, iconProps, label, onClick }) {
  const Icon = icon;

  return (
    <button className="overlay-button" onClick={onClick} type="button">
      <Icon className="overlay-button__icon" {...iconProps} />
      <span>{label}</span>
      {children}
    </button>
  );
}

export function PlayerOverlay({ isFullscreen, isMuted, onBack, onPrevious, onRandom, onToggleFullscreen, onToggleMute }) {
  const menuDockRef = useRef(null);
  const [isCompactPlayerControls, setIsCompactPlayerControls] = useState(() => getIsCompactPlayerControls());
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQueryList = window.matchMedia(COMPACT_PLAYER_CONTROLS_MEDIA_QUERY);
    const syncCompactPlayerControls = () => {
      setIsCompactPlayerControls(mediaQueryList.matches);
    };

    syncCompactPlayerControls();

    if (typeof mediaQueryList.addEventListener === 'function') {
      mediaQueryList.addEventListener('change', syncCompactPlayerControls);

      return () => {
        mediaQueryList.removeEventListener('change', syncCompactPlayerControls);
      };
    }

    mediaQueryList.addListener(syncCompactPlayerControls);

    return () => {
      mediaQueryList.removeListener(syncCompactPlayerControls);
    };
  }, []);

  useEffect(() => {
    if (!isCompactPlayerControls) {
      setIsMenuOpen(false);
    }
  }, [isCompactPlayerControls]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    function handlePointerDown(event) {
      if (!menuDockRef.current?.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  function handleMenuAction(action) {
    action?.();
    setIsMenuOpen(false);
  }

  return (
    <div className="player-overlay">
      {isCompactPlayerControls ? (
        <div className="player-overlay__menu-dock" ref={menuDockRef}>
          <button
            aria-expanded={isMenuOpen}
            aria-haspopup="dialog"
            className="share-dock__button"
            onClick={() => setIsMenuOpen((currentValue) => !currentValue)}
            type="button"
          >
            <MenuIcon className="share-dock__icon" />
            <span>Menu</span>
          </button>

          {isMenuOpen ? (
            <div aria-label="Experience options" className="share-dock__menu" role="dialog">
              <div className="share-dock__menu-header">
                <p className="share-dock__eyebrow">Menu</p>
                <h2 className="share-dock__title">Experience controls</h2>
              </div>

              <div className="share-dock__grid">
                <button className="share-dock__item" onClick={() => handleMenuAction(onBack)} type="button">
                  <HomeIcon className="share-dock__item-icon" />
                  <span>Home</span>
                </button>
                <button className="share-dock__item" onClick={() => handleMenuAction(onPrevious)} type="button">
                  <ArrowLeftIcon className="share-dock__item-icon" />
                  <span>Previous</span>
                </button>
                <button className="share-dock__item" onClick={() => handleMenuAction(onRandom)} type="button">
                  <ShuffleIcon className="share-dock__item-icon" />
                  <span>Random next</span>
                </button>
                {!isFullscreen ? (
                  <button className="share-dock__item" onClick={() => handleMenuAction(onToggleFullscreen)} type="button">
                    <ExpandIcon className="share-dock__item-icon" />
                    <span>Fullscreen</span>
                  </button>
                ) : null}
                <button className="share-dock__item" onClick={() => handleMenuAction(onToggleMute)} type="button">
                  <SpeakerIcon className="share-dock__item-icon" muted={isMuted} />
                  <span>{isMuted ? 'Unmute' : 'Mute'}</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="player-overlay__actions">
          <OverlayButton icon={HomeIcon} label="Home" onClick={onBack} />
          <OverlayButton icon={ArrowLeftIcon} label="Previous" onClick={onPrevious} />
          <OverlayButton icon={ShuffleIcon} label="Random next" onClick={onRandom} />
          <div className="player-overlay__utility">
            {!isFullscreen ? <OverlayButton icon={ExpandIcon} label="Fullscreen" onClick={onToggleFullscreen} /> : null}
            <OverlayButton icon={SpeakerIcon} iconProps={{ muted: isMuted }} label={isMuted ? 'Unmute' : 'Mute'} onClick={onToggleMute} />
          </div>
        </div>
      )}
    </div>
  );
}
