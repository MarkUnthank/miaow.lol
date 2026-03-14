import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { Lobby } from './components/Lobby';
import { Player } from './components/Player';
import { experiences, getRandomExperienceIndex, getWrappedIndex } from './data/experiences';
import { APP_API_NAME } from './appApi';

const APP_HISTORY_MARKER = '__miaow';

function buildAppHistoryState({ activeIndex, currentIndex, mode, step }) {
  return {
    [APP_HISTORY_MARKER]: true,
    activeIndex,
    currentIndex,
    mode,
    step,
  };
}

function normalizeAppHistoryState(state) {
  if (!state?.[APP_HISTORY_MARKER]) {
    return null;
  }

  const mode = state.mode === 'player' ? 'player' : 'lobby';
  const activeIndex = getWrappedIndex(Number.isInteger(state.activeIndex) ? state.activeIndex : 0);
  const currentIndex = getWrappedIndex(Number.isInteger(state.currentIndex) ? state.currentIndex : activeIndex);
  const step = Number.isInteger(state.step) ? Math.max(state.step, 0) : 0;

  return {
    activeIndex,
    currentIndex,
    mode,
    step,
  };
}

function getInitialAppState() {
  if (typeof window === 'undefined') {
    return {
      activeIndex: 0,
      currentIndex: 0,
      mode: 'lobby',
      step: 0,
    };
  }

  return (
    normalizeAppHistoryState(window.history.state) ?? {
      activeIndex: 0,
      currentIndex: 0,
      mode: 'lobby',
      step: 0,
    }
  );
}

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
  const historyReadyRef = useRef(false);
  const requestFullscreenRef = useRef(() => Promise.resolve(undefined));
  const exitFullscreenRef = useRef(() => Promise.resolve(undefined));
  const toggleFullscreenRef = useRef(() => Promise.resolve(undefined));
  const initialAppState = useMemo(() => getInitialAppState(), []);
  const historyStepRef = useRef(initialAppState.step);
  const [mode, setMode] = useState(initialAppState.mode);
  const [activeIndex, setActiveIndex] = useState(initialAppState.activeIndex);
  const [currentIndex, setCurrentIndex] = useState(initialAppState.currentIndex);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const themedExperience = useMemo(
    () => experiences[mode === 'player' ? currentIndex : activeIndex],
    [activeIndex, currentIndex, mode],
  );

  function applyAppState(nextState) {
    historyStepRef.current = nextState.step;

    startTransition(() => {
      setMode(nextState.mode);
      setCurrentIndex(nextState.currentIndex);
      setActiveIndex(nextState.mode === 'player' ? nextState.currentIndex : nextState.activeIndex);
    });
  }

  function writeHistoryState(nextState, historyMode = 'push') {
    if (!historyReadyRef.current) {
      return;
    }

    const method = historyMode === 'replace' ? 'replaceState' : 'pushState';
    window.history[method](buildAppHistoryState(nextState), '', window.location.href);
  }

  function navigateToState(nextState, historyMode = 'push') {
    experiences[nextState.currentIndex].preload();
    writeHistoryState(nextState, historyMode);
    applyAppState(nextState);
  }

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
    const initialHistoryState = {
      activeIndex: initialAppState.activeIndex,
      currentIndex: initialAppState.currentIndex,
      mode: initialAppState.mode,
      step: initialAppState.step,
    };

    window.history.replaceState(buildAppHistoryState(initialHistoryState), '', window.location.href);
    historyReadyRef.current = true;

    const handlePopState = (event) => {
      const nextState = normalizeAppHistoryState(event.state);

      if (!nextState) {
        return;
      }

      applyAppState(nextState);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      historyReadyRef.current = false;
      window.removeEventListener('popstate', handlePopState);
    };
  }, [initialAppState]);

  useEffect(() => {
    experiences[activeIndex].preload();
    experiences[getWrappedIndex(activeIndex + 1)].preload();
    experiences[getWrappedIndex(activeIndex - 1)].preload();
  }, [activeIndex]);

  useEffect(() => {
    experiences[currentIndex].preload();
  }, [currentIndex]);

  useEffect(() => {
    if (!historyReadyRef.current || mode !== 'lobby') {
      return;
    }

    const nextState = {
      activeIndex,
      currentIndex,
      mode: 'lobby',
      step: historyStepRef.current,
    };
    const currentHistoryState = normalizeAppHistoryState(window.history.state);

    if (
      currentHistoryState &&
      currentHistoryState.mode === nextState.mode &&
      currentHistoryState.activeIndex === nextState.activeIndex &&
      currentHistoryState.currentIndex === nextState.currentIndex &&
      currentHistoryState.step === nextState.step
    ) {
      return;
    }

    window.history.replaceState(buildAppHistoryState(nextState), '', window.location.href);
  }, [activeIndex, currentIndex, mode]);

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
    navigateToState(
      {
        activeIndex: nextIndex,
        currentIndex: nextIndex,
        mode: 'player',
        step: historyStepRef.current + 1,
      },
      'push',
    );
  }

  function goBackToLobby() {
    if (historyReadyRef.current && historyStepRef.current > 0) {
      window.history.back();
      return;
    }

    navigateToState(
      {
        activeIndex: currentIndex,
        currentIndex,
        mode: 'lobby',
        step: 0,
      },
      'replace',
    );
  }

  function showPreviousExperience() {
    const previousIndex = getWrappedIndex(currentIndex - 1);
    navigateToState(
      {
        activeIndex: previousIndex,
        currentIndex: previousIndex,
        mode: 'player',
        step: historyStepRef.current + 1,
      },
      'push',
    );
  }

  function showRandomExperience() {
    const nextIndex = getRandomExperienceIndex(currentIndex);
    navigateToState(
      {
        activeIndex: nextIndex,
        currentIndex: nextIndex,
        mode: 'player',
        step: historyStepRef.current + 1,
      },
      'push',
    );
  }

  async function togglePlayerFullscreen() {
    if (isFullscreen) {
      await exitFullscreen();
      return;
    }

    await requestFullscreen();
  }

  requestFullscreenRef.current = requestFullscreen;
  exitFullscreenRef.current = exitFullscreen;
  toggleFullscreenRef.current = togglePlayerFullscreen;

  useEffect(() => {
    const appApi = {
      fullscreen: {
        exit: () => exitFullscreenRef.current(),
        isActive: () => Boolean(document.fullscreenElement),
        request: () => requestFullscreenRef.current(),
        toggle: () => toggleFullscreenRef.current(),
      },
    };

    window[APP_API_NAME] = appApi;

    return () => {
      if (window[APP_API_NAME] === appApi) {
        delete window[APP_API_NAME];
      }
    };
  }, []);

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
