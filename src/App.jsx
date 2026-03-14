import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { Lobby } from './components/Lobby';
import { Player } from './components/Player';
import { experiences, getRandomExperienceIndex, getWrappedIndex } from './data/experiences';

function toThemeStyle(theme) {
  return {
    '--theme-bg': theme.bg,
    '--theme-panel': theme.panel,
    '--theme-ink': theme.ink,
    '--theme-accent': theme.accent,
    '--theme-accent-alt': theme.accentAlt,
    '--theme-accent-soft': theme.accentSoft,
    '--theme-blob-a': theme.blobA,
    '--theme-blob-b': theme.blobB,
    '--theme-blob-c': theme.blobC,
    '--theme-display-font': theme.displayFont,
    '--theme-body-font': theme.bodyFont,
  };
}

export default function App() {
  const appRef = useRef(null);
  const [mode, setMode] = useState('lobby');
  const [activeIndex, setActiveIndex] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const themedExperience = useMemo(
    () => experiences[mode === 'player' ? currentIndex : activeIndex],
    [activeIndex, currentIndex, mode],
  );

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    syncFullscreenState();
    document.addEventListener('fullscreenchange', syncFullscreenState);

    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreenState);
    };
  }, []);

  useEffect(() => {
    experiences[activeIndex].preload();
    experiences[getWrappedIndex(activeIndex + 1)].preload();
    experiences[getWrappedIndex(activeIndex - 1)].preload();
  }, [activeIndex]);

  useEffect(() => {
    experiences[currentIndex].preload();
  }, [currentIndex]);

  async function requestFullscreen() {
    if (document.fullscreenElement || !appRef.current?.requestFullscreen) {
      return;
    }

    try {
      await appRef.current.requestFullscreen();
    } catch (error) {
      console.error('Fullscreen request failed', error);
    }
  }

  async function exitFullscreen() {
    if (!document.fullscreenElement || !document.exitFullscreen) {
      return;
    }

    try {
      await document.exitFullscreen();
    } catch (error) {
      console.error('Exiting fullscreen failed', error);
    }
  }

  async function openExperience(index) {
    const nextIndex = getWrappedIndex(index);
    experiences[nextIndex].preload();

    startTransition(() => {
      setCurrentIndex(nextIndex);
      setActiveIndex(nextIndex);
      setMode('player');
    });
  }

  function goBackToLobby() {
    startTransition(() => {
      setMode('lobby');
      setActiveIndex(currentIndex);
    });
  }

  function showPreviousExperience() {
    const previousIndex = getWrappedIndex(currentIndex - 1);

    startTransition(() => {
      setCurrentIndex(previousIndex);
      setActiveIndex(previousIndex);
    });
  }

  function showRandomExperience() {
    const nextIndex = getRandomExperienceIndex(currentIndex);

    startTransition(() => {
      setCurrentIndex(nextIndex);
      setActiveIndex(nextIndex);
    });
  }

  async function togglePlayerFullscreen() {
    if (isFullscreen) {
      await exitFullscreen();
      return;
    }

    await requestFullscreen();
  }

  return (
    <main ref={appRef} className={`app-shell app-shell--${mode}`} style={toThemeStyle(themedExperience.theme)}>
      <div className="ambient-layer" aria-hidden="true">
        <div className="ambient-blob ambient-blob--a" />
        <div className="ambient-blob ambient-blob--b" />
        <div className="ambient-blob ambient-blob--c" />
        <div className="ambient-grid" />
      </div>

      <section className={`screen-layer lobby-layer ${mode === 'lobby' ? 'is-active' : 'is-hidden'}`}>
        <Lobby
          experiences={experiences}
          activeIndex={activeIndex}
          isFullscreen={isFullscreen}
          onActiveIndexChange={setActiveIndex}
          onLaunch={openExperience}
          onToggleFullscreen={togglePlayerFullscreen}
        />
      </section>

      {mode === 'player' ? (
        <section className="screen-layer player-layer is-active">
          <Player
            experience={experiences[currentIndex]}
            isFullscreen={isFullscreen}
            onBack={goBackToLobby}
            onPrevious={showPreviousExperience}
            onRandom={showRandomExperience}
            onToggleFullscreen={togglePlayerFullscreen}
          />
        </section>
      ) : null}
    </main>
  );
}
