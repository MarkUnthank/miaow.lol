import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { APP_API_NAME, getFullscreenApi } from '../appApi';

const FONT_IMPORT_PATTERN = /@import\s+url\((['"]?)https:\/\/fonts\.googleapis\.com\/[^;]+?\);\s*/gi;
const ROOT_SELECTOR_PATTERN = /:root\b/g;
const HTML_SELECTOR_PATTERN = /\bhtml\b/g;
const BODY_SELECTOR_PATTERN = /\bbody\b/g;
const VIEWPORT_UNIT_PATTERN = /(-?(?:\d*\.\d+|\d+))(vw|vh)\b/g;
const RUNTIME_SCRIPT_PARAMS = [
  'window',
  'document',
  'globalThis',
  'self',
  'top',
  'parent',
  'Audio',
  'AudioContext',
  'webkitAudioContext',
  'addEventListener',
  'removeEventListener',
  'dispatchEvent',
  'setTimeout',
  'clearTimeout',
  'setInterval',
  'clearInterval',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'getComputedStyle',
  'innerWidth',
  'innerHeight',
];
const BASE_RUNTIME_CSS = `
  :host {
    display: block;
    width: 100%;
    height: 100%;
  }

  .toy-document {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    isolation: isolate;
    contain: layout paint style;
    background: #ffffff;
  }

  .toy-body {
    position: relative;
    width: 100%;
    height: 100%;
    margin: 0;
    overflow: hidden;
    outline: none;
  }
`;

function transformCss(css) {
  return css
    .replace(FONT_IMPORT_PATTERN, '')
    .replace(ROOT_SELECTOR_PATTERN, '.toy-document')
    .replace(HTML_SELECTOR_PATTERN, '.toy-document')
    .replace(BODY_SELECTOR_PATTERN, '.toy-body')
    .replace(VIEWPORT_UNIT_PATTERN, (_, value, unit) => `calc(var(--toy-v${unit === 'vw' ? 'w' : 'h'}) * ${value})`);
}

function parseExperienceHtml(html, title) {
  const parser = new DOMParser();
  const parsedDocument = parser.parseFromString(html, 'text/html');

  if (title) {
    parsedDocument.title = title;
  }

  const styles = Array.from(parsedDocument.querySelectorAll('style'))
    .map((styleElement) => transformCss(styleElement.textContent ?? ''))
    .filter(Boolean);
  const scriptText = Array.from(parsedDocument.querySelectorAll('script'))
    .map((scriptElement) => scriptElement.textContent ?? '')
    .filter(Boolean)
    .join('\n;\n');

  return {
    bodyMarkup: parsedDocument.body.innerHTML,
    scriptText,
    styles,
    title: parsedDocument.title || title,
  };
}

function normalizeSelector(selector) {
  return selector
    .replace(ROOT_SELECTOR_PATTERN, '.toy-document')
    .replace(HTML_SELECTOR_PATTERN, '.toy-document')
    .replace(BODY_SELECTOR_PATTERN, '.toy-body');
}

function escapeId(id) {
  if (window.CSS?.escape) {
    return window.CSS.escape(id);
  }

  return id.replace(/([^\w-])/g, '\\$1');
}

function queryScoped(root, selector) {
  return root.querySelector(normalizeSelector(selector));
}

function queryScopedAll(root, selector) {
  return root.querySelectorAll(normalizeSelector(selector));
}

function collectInlineHandlerReferences(root) {
  const names = new Set();

  root.querySelectorAll('*').forEach((element) => {
    element.getAttributeNames().forEach((attributeName) => {
      if (!attributeName.startsWith('on')) {
        return;
      }

      const handlerSource = element.getAttribute(attributeName);

      if (!handlerSource) {
        return;
      }

      const matches = handlerSource.matchAll(/(^|[^\w$.])([A-Za-z_$][\w$]*)\s*\(/g);

      for (const match of matches) {
        names.add(match[2]);
      }
    });
  });

  return Array.from(names);
}

function buildInlineHandlerExportScript(names) {
  return names
    .map((name) => `if (typeof ${name} === 'function') window.${name} = ${name};`)
    .join('\n');
}

function queryFirstAvailable(root, selectors) {
  for (const selector of selectors) {
    const match = root.querySelector(selector);

    if (match) {
      return match;
    }
  }

  return null;
}

function createTrackedConstructor(Ctor, instances, onCreate) {
  if (!Ctor) {
    return undefined;
  }

  return new Proxy(Ctor, {
    apply(target, thisArg, args) {
      const instance = Reflect.apply(target, thisArg, args);
      instances.add(instance);
      onCreate?.(instance);
      return instance;
    },
    construct(target, args, newTarget) {
      const instance = Reflect.construct(target, args, newTarget);
      instances.add(instance);
      onCreate?.(instance);
      return instance;
    },
  });
}

function syncMutedAudioElements(audioElements, nextMuted) {
  audioElements.forEach((audioElement) => {
    if (!audioElement) {
      return;
    }

    audioElement.muted = nextMuted;
  });
}

function syncMutedAudioContexts(audioContexts, mutedAudioContexts, nextMuted) {
  audioContexts.forEach((audioContext) => {
    if (!audioContext || audioContext.state === 'closed') {
      return;
    }

    if (nextMuted) {
      mutedAudioContexts.add(audioContext);

      if (typeof audioContext.suspend === 'function') {
        const suspendResult = audioContext.suspend();
        if (typeof suspendResult?.catch === 'function') {
          suspendResult.catch(() => {});
        }
      }

      return;
    }

    if (!mutedAudioContexts.has(audioContext)) {
      return;
    }

    mutedAudioContexts.delete(audioContext);

    if (typeof audioContext.resume === 'function') {
      const resumeResult = audioContext.resume();
      if (typeof resumeResult?.catch === 'function') {
        resumeResult.catch(() => {});
      }
    }
  });
}

function createNoopAudioParam(initialValue = 0) {
  return {
    value: initialValue,
    cancelScheduledValues() {},
    exponentialRampToValueAtTime() {},
    linearRampToValueAtTime() {},
    setTargetAtTime() {},
    setValueAtTime() {},
  };
}

function createSilentAudioNode() {
  return {
    Q: createNoopAudioParam(),
    buffer: null,
    connect() {
      return this;
    },
    detune: createNoopAudioParam(),
    disconnect() {},
    frequency: createNoopAudioParam(),
    gain: createNoopAudioParam(),
    playbackRate: createNoopAudioParam(1),
    start() {},
    stop() {},
    type: 'sine',
  };
}

class SilentAudioContext {
  constructor() {
    this.currentTime = 0;
    this.destination = createSilentAudioNode();
    this.state = 'running';
  }

  close() {
    this.state = 'closed';
    return Promise.resolve();
  }

  createBiquadFilter() {
    return createSilentAudioNode();
  }

  createBuffer(numberOfChannels = 1, length = 1) {
    return {
      getChannelData() {
        return new Float32Array(Math.max(length, 1));
      },
      length,
      numberOfChannels,
    };
  }

  createBufferSource() {
    return createSilentAudioNode();
  }

  createGain() {
    return createSilentAudioNode();
  }

  createOscillator() {
    return createSilentAudioNode();
  }

  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
}

function readRuntimeSize(hostElement) {
  const { width, height } = hostElement.getBoundingClientRect();

  return {
    width: Math.max(width || hostElement.clientWidth || 1, 1),
    height: Math.max(height || hostElement.clientHeight || 1, 1),
  };
}

function getCaptureOption(options) {
  if (typeof options === 'boolean') {
    return options;
  }

  return options?.capture ?? false;
}

function invokeListener(listener, context, event) {
  if (typeof listener === 'function') {
    listener.call(context, event);
    return;
  }

  if (listener && typeof listener.handleEvent === 'function') {
    listener.handleEvent(event);
  }
}

function assignFullscreenRequest(target, requestFullscreen) {
  if (!target) {
    return;
  }

  target.requestFullscreen = requestFullscreen;
  target.webkitRequestFullscreen = requestFullscreen;
  target.webkitRequestFullScreen = requestFullscreen;
}

function assignFullscreenExit(target, exitFullscreen) {
  if (!target) {
    return;
  }

  target.exitFullscreen = exitFullscreen;
  target.webkitExitFullscreen = exitFullscreen;
}

export function ExperienceDocument({ className = '', html, mode = 'full', muted = false, previewActive = false, title }) {
  const hostRef = useRef(null);
  const audioContextsRef = useRef(new Set());
  const audioElementsRef = useRef(new Set());
  const mutedAudioContextsRef = useRef(new Set());
  const experience = useMemo(() => parseExperienceHtml(html, title), [html, title]);
  const isPreview = mode === 'preview';
  const effectiveMuted = isPreview || muted;
  const effectiveMutedRef = useRef(effectiveMuted);

  useEffect(() => {
    effectiveMutedRef.current = effectiveMuted;
    syncMutedAudioElements(audioElementsRef.current, effectiveMuted);
    syncMutedAudioContexts(audioContextsRef.current, mutedAudioContextsRef.current, effectiveMuted);
  }, [effectiveMuted]);

  useLayoutEffect(() => {
    const hostElement = hostRef.current;

    if (!hostElement) {
      return undefined;
    }

    const ownerDocument = hostElement.ownerDocument;
    const ownerWindow = ownerDocument.defaultView ?? window;
    const shadowRoot = hostElement.shadowRoot ?? hostElement.attachShadow({ mode: 'open' });
    const documentElement = ownerDocument.createElement('div');
    const bodyElement = ownerDocument.createElement('div');
    const baseStyleElement = ownerDocument.createElement('style');
    const sourceStyleElement = ownerDocument.createElement('style');
    const listenerEntries = [];
    const resizeEntries = [];
    const timeoutIds = new Set();
    const intervalIds = new Set();
    const frameIds = new Set();
    const audioContexts = new Set();
    const audioElements = new Set();
    const mutedAudioContexts = new Set();
    const inlineHandlerGlobals = new Map();
    const previewBoundaryEventTypes = ['click', 'dblclick', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'touchend', 'keydown', 'keyup'];
    audioContextsRef.current = audioContexts;
    audioElementsRef.current = audioElements;
    mutedAudioContextsRef.current = mutedAudioContexts;
    const WrappedAudioContext = isPreview
      ? SilentAudioContext
      : createTrackedConstructor(ownerWindow.AudioContext ?? ownerWindow.webkitAudioContext, audioContexts, (audioContext) => {
          syncMutedAudioContexts(new Set([audioContext]), mutedAudioContexts, effectiveMutedRef.current);
        });
    const WrappedWebkitAudioContext = isPreview
      ? SilentAudioContext
      : createTrackedConstructor(ownerWindow.webkitAudioContext, audioContexts, (audioContext) => {
          syncMutedAudioContexts(new Set([audioContext]), mutedAudioContexts, effectiveMutedRef.current);
        });
    const WrappedAudio = createTrackedConstructor(ownerWindow.Audio, audioElements, (audioElement) => {
      syncMutedAudioElements(new Set([audioElement]), effectiveMutedRef.current);
    });
    const fullscreenApi = isPreview ? null : getFullscreenApi(ownerWindow);
    const previewAppApi = {
      audio: {
        isMuted: () => true,
        setMuted: () => {},
        toggle: () => {},
      },
      fullscreen: {
        exit: () => Promise.resolve(undefined),
        isActive: () => false,
        request: () => Promise.resolve(undefined),
        toggle: () => Promise.resolve(undefined),
      },
    };
    const runtimeAppApi = isPreview ? previewAppApi : ownerWindow[APP_API_NAME] ?? null;
    let previewTick = 0;

    bodyElement.className = `toy-body ${isPreview ? 'toy-body--preview' : ''}`.trim();
    bodyElement.tabIndex = isPreview ? -1 : 0;
    bodyElement.innerHTML = experience.bodyMarkup;
    const inlineHandlerNames = collectInlineHandlerReferences(bodyElement);

    documentElement.className = `toy-document ${isPreview ? 'toy-document--preview' : ''}`.trim();
    documentElement.append(bodyElement);

    const requestAppFullscreen = () => fullscreenApi?.request?.() ?? Promise.resolve(undefined);
    const exitAppFullscreen = () => fullscreenApi?.exit?.() ?? Promise.resolve(undefined);

    assignFullscreenRequest(documentElement, isPreview ? () => Promise.resolve(undefined) : requestAppFullscreen);
    assignFullscreenRequest(bodyElement, isPreview ? () => Promise.resolve(undefined) : requestAppFullscreen);

    baseStyleElement.textContent = BASE_RUNTIME_CSS;
    sourceStyleElement.textContent = experience.styles.join('\n\n');

    shadowRoot.replaceChildren(baseStyleElement, sourceStyleElement, documentElement);

    const focusStage = () => {
      if (ownerDocument.activeElement !== bodyElement) {
        bodyElement.focus({ preventScroll: true });
      }
    };

    const addScopedListener = (type, listener, options) => {
      bodyElement.addEventListener(type, listener, options);
      listenerEntries.push({ listener, options, target: bodyElement, type });
    };

    const removeScopedListener = (type, listener, options) => {
      bodyElement.removeEventListener(type, listener, options);

      const capture = getCaptureOption(options);
      const index = listenerEntries.findIndex(
        (entry) =>
          entry.target === bodyElement &&
          entry.type === type &&
          entry.listener === listener &&
          getCaptureOption(entry.options) === capture,
      );

      if (index >= 0) {
        listenerEntries.splice(index, 1);
      }
    };

    const addResizeListener = (listener, options) => {
      resizeEntries.push({
        capture: getCaptureOption(options),
        listener,
        once: typeof options === 'object' && options?.once === true,
      });
    };

    const removeResizeListener = (listener, options) => {
      const capture = getCaptureOption(options);
      const index = resizeEntries.findIndex((entry) => entry.listener === listener && entry.capture === capture);

      if (index >= 0) {
        resizeEntries.splice(index, 1);
      }
    };

    const updateViewportUnits = () => {
      const { width, height } = readRuntimeSize(hostElement);

      documentElement.style.setProperty('--toy-vw', `${width / 100}px`);
      documentElement.style.setProperty('--toy-vh', `${height / 100}px`);
    };

    const dispatchResize = () => {
      const resizeEvent = new ownerWindow.Event('resize');

      resizeEntries.slice().forEach((entry) => {
        invokeListener(entry.listener, runtimeWindow, resizeEvent);

        if (entry.once) {
          removeResizeListener(entry.listener, entry.capture);
        }
      });
    };

    const syncRuntimeSize = () => {
      updateViewportUnits();
      dispatchResize();
    };

    const resizeObserver = new ownerWindow.ResizeObserver(() => {
      updateViewportUnits();
      dispatchResize();
    });

    let runtimeWindow;

    const runtimeDocument = {
      addEventListener(type, listener, options) {
        if (type === 'resize') {
          addResizeListener(listener, options);
          return;
        }

        addScopedListener(type, listener, options);
      },
      removeEventListener(type, listener, options) {
        if (type === 'resize') {
          removeResizeListener(listener, options);
          return;
        }

        removeScopedListener(type, listener, options);
      },
      dispatchEvent(event) {
        if (event.type === 'resize') {
          dispatchResize();
          return true;
        }

        return bodyElement.dispatchEvent(event);
      },
      createComment(text) {
        return ownerDocument.createComment(text);
      },
      createElement(tagName, options) {
        return ownerDocument.createElement(tagName, options);
      },
      createElementNS(namespace, qualifiedName, options) {
        return ownerDocument.createElementNS(namespace, qualifiedName, options);
      },
      createTextNode(text) {
        return ownerDocument.createTextNode(text);
      },
      getElementById(id) {
        return shadowRoot.querySelector(`#${escapeId(id)}`);
      },
      querySelector(selector) {
        return queryScoped(shadowRoot, selector);
      },
      querySelectorAll(selector) {
        return queryScopedAll(shadowRoot, selector);
      },
      exitFullscreen() {
        return exitAppFullscreen();
      },
      fonts: ownerDocument.fonts,
      location: ownerWindow.location,
      onload: null,
      title: experience.title,
    };

    assignFullscreenRequest(runtimeDocument, isPreview ? () => Promise.resolve(undefined) : requestAppFullscreen);

    Object.defineProperties(runtimeDocument, {
      activeElement: {
        get() {
          return shadowRoot.activeElement ?? ownerDocument.activeElement;
        },
      },
      body: {
        get() {
          return bodyElement;
        },
      },
      defaultView: {
        get() {
          return runtimeWindow;
        },
      },
      documentElement: {
        get() {
          return documentElement;
        },
      },
      fullscreenElement: {
        get() {
          return ownerDocument.fullscreenElement;
        },
      },
      head: {
        get() {
          return shadowRoot;
        },
      },
      hidden: {
        get() {
          return ownerDocument.hidden;
        },
      },
      readyState: {
        get() {
          return 'complete';
        },
      },
      visibilityState: {
        get() {
          return ownerDocument.visibilityState;
        },
      },
    });

    const runtimeLoadEvent = new ownerWindow.Event('load');
    runtimeWindow = {
      console: ownerWindow.console,
      CSS: ownerWindow.CSS,
      Event: ownerWindow.Event,
      KeyboardEvent: ownerWindow.KeyboardEvent,
      MouseEvent: ownerWindow.MouseEvent,
      navigator: ownerWindow.navigator,
      location: ownerWindow.location,
      performance: ownerWindow.performance,
      screen: ownerWindow.screen,
      onload: null,
      onerror: null,
    };

    Object.defineProperties(runtimeWindow, {
      Audio: {
        value: WrappedAudio ?? ownerWindow.Audio,
        writable: true,
      },
      AudioContext: {
        value: WrappedAudioContext,
        writable: true,
      },
      webkitAudioContext: {
        value: WrappedWebkitAudioContext,
        writable: true,
      },
      document: {
        value: runtimeDocument,
        writable: true,
      },
      globalThis: {
        value: runtimeWindow,
      },
      innerHeight: {
        get() {
          return readRuntimeSize(hostElement).height;
        },
      },
      innerWidth: {
        get() {
          return readRuntimeSize(hostElement).width;
        },
      },
      parent: {
        value: runtimeWindow,
      },
      self: {
        value: runtimeWindow,
      },
      top: {
        value: runtimeWindow,
      },
      window: {
        value: runtimeWindow,
      },
    });

    runtimeWindow[APP_API_NAME] = runtimeAppApi;
    runtimeWindow.miaowApp = runtimeAppApi;
    runtimeWindow.requestFullscreen = requestAppFullscreen;
    runtimeWindow.webkitRequestFullscreen = requestAppFullscreen;
    runtimeWindow.webkitRequestFullScreen = requestAppFullscreen;
    runtimeWindow.exitFullscreen = exitAppFullscreen;
    runtimeWindow.webkitExitFullscreen = exitAppFullscreen;
    assignFullscreenExit(runtimeDocument, exitAppFullscreen);

    if (ownerWindow.matchMedia) {
      runtimeWindow.matchMedia = ownerWindow.matchMedia.bind(ownerWindow);
    }

    runtimeWindow.addEventListener = (type, listener, options) => {
      if (type === 'resize') {
        addResizeListener(listener, options);
        return;
      }

      addScopedListener(type, listener, options);
    };

    runtimeWindow.removeEventListener = (type, listener, options) => {
      if (type === 'resize') {
        removeResizeListener(listener, options);
        return;
      }

      removeScopedListener(type, listener, options);
    };

    runtimeWindow.dispatchEvent = (event) => {
      if (event.type === 'resize') {
        dispatchResize();
        return true;
      }

      return bodyElement.dispatchEvent(event);
    };

    runtimeWindow.setTimeout = (callback, delay, ...args) => {
      const timeoutId = ownerWindow.setTimeout(() => {
        timeoutIds.delete(timeoutId);
        callback(...args);
      }, delay);

      timeoutIds.add(timeoutId);
      return timeoutId;
    };

    runtimeWindow.clearTimeout = (timeoutId) => {
      timeoutIds.delete(timeoutId);
      ownerWindow.clearTimeout(timeoutId);
    };

    runtimeWindow.setInterval = (callback, delay, ...args) => {
      const intervalId = ownerWindow.setInterval(callback, delay, ...args);
      intervalIds.add(intervalId);
      return intervalId;
    };

    runtimeWindow.clearInterval = (intervalId) => {
      intervalIds.delete(intervalId);
      ownerWindow.clearInterval(intervalId);
    };

    runtimeWindow.requestAnimationFrame = (callback) => {
      const frameId = ownerWindow.requestAnimationFrame((timestamp) => {
        frameIds.delete(frameId);
        callback(timestamp);
      });

      frameIds.add(frameId);
      return frameId;
    };

    runtimeWindow.cancelAnimationFrame = (frameId) => {
      frameIds.delete(frameId);
      ownerWindow.cancelAnimationFrame(frameId);
    };

    runtimeWindow.getComputedStyle = ownerWindow.getComputedStyle.bind(ownerWindow);

    resizeObserver.observe(hostElement);
    syncRuntimeSize();

    const handlePointerFocus = () => {
      focusStage();
    };

    const stopPreviewBoundaryEvent = (event) => {
      event.stopPropagation();
    };

    if (!isPreview) {
      focusStage();
      bodyElement.addEventListener('pointerdown', handlePointerFocus);
    } else {
      previewBoundaryEventTypes.forEach((type) => {
        hostElement.addEventListener(type, stopPreviewBoundaryEvent);
      });
    }

    if (experience.scriptText) {
      try {
        const inlineHandlerExports = buildInlineHandlerExportScript(inlineHandlerNames);
        const runExperience = new Function(
          ...RUNTIME_SCRIPT_PARAMS,
          `${experience.scriptText}\n;\n${inlineHandlerExports}`,
        );

        runExperience.call(
          runtimeWindow,
          runtimeWindow,
          runtimeDocument,
          runtimeWindow,
          runtimeWindow,
          runtimeWindow,
          runtimeWindow,
          WrappedAudio ?? ownerWindow.Audio,
          WrappedAudioContext,
          WrappedWebkitAudioContext,
          runtimeWindow.addEventListener,
          runtimeWindow.removeEventListener,
          runtimeWindow.dispatchEvent,
          runtimeWindow.setTimeout,
          runtimeWindow.clearTimeout,
          runtimeWindow.setInterval,
          runtimeWindow.clearInterval,
          runtimeWindow.requestAnimationFrame,
          runtimeWindow.cancelAnimationFrame,
          runtimeWindow.getComputedStyle,
          runtimeWindow.innerWidth,
          runtimeWindow.innerHeight,
        );

        if (typeof runtimeWindow.onload === 'function') {
          runtimeWindow.onload.call(runtimeWindow, runtimeLoadEvent);
        }

        if (typeof runtimeDocument.onload === 'function') {
          runtimeDocument.onload.call(runtimeDocument, runtimeLoadEvent);
        }

        inlineHandlerNames.forEach((name) => {
          if (typeof runtimeWindow[name] !== 'function') {
            return;
          }

          inlineHandlerGlobals.set(name, ownerWindow[name]);
          ownerWindow[name] = runtimeWindow[name];
        });
      } catch (error) {
        console.error(`Failed to mount toy "${experience.title}".`, error);
      }
    }

    let isDisposed = false;

    const scheduleRuntimeSizeSettle = () => {
      runtimeWindow.requestAnimationFrame(() => {
        syncRuntimeSize();

        runtimeWindow.requestAnimationFrame(() => {
          syncRuntimeSize();
        });
      });

      runtimeWindow.setTimeout(() => {
        syncRuntimeSize();
      }, 120);
    };

    scheduleRuntimeSizeSettle();

    if (ownerDocument.fonts?.ready && typeof ownerDocument.fonts.ready.then === 'function') {
      ownerDocument.fonts.ready
        .then(() => {
          if (!isDisposed) {
            scheduleRuntimeSizeSettle();
          }
        })
        .catch(() => {});
    }

    if (isPreview) {
      const drivePreview = () => {
        const { height, width } = readRuntimeSize(hostElement);
        const x = width * (0.22 + ((previewTick * 19) % 45) / 100);
        const y = height * (0.24 + ((previewTick * 13) % 38) / 100);
        const startSurface =
          shadowRoot.getElementById('start-screen') ??
          queryFirstAvailable(shadowRoot, [
            '#start-btn',
            '.start-btn',
            '#start-screen',
            '.start-screen',
            'button.blob-btn',
            '[id*="start"] button',
            '[class*="start"] button',
            '[id*="start"]',
            '[class*="start"]',
            '#intro',
            '.intro',
            '[id*="intro"] button',
            '[class*="intro"] button',
            '[id*="intro"]',
            '[class*="intro"]',
          ]);

        if (startSurface instanceof HTMLElement) {
          startSurface.click();
        }

        bodyElement.dispatchEvent(
          new ownerWindow.MouseEvent('mousedown', {
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
          }),
        );
        bodyElement.dispatchEvent(
          new ownerWindow.MouseEvent('mousemove', {
            bubbles: true,
            cancelable: true,
            clientX: Math.min(width - 12, x + width * 0.08),
            clientY: Math.min(height - 12, y + height * 0.05),
          }),
        );
        bodyElement.dispatchEvent(
          new ownerWindow.KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            code: 'Space',
            key: ' ',
          }),
        );

        previewTick += 1;
      };

      runtimeWindow.setTimeout(drivePreview, 80);
      runtimeWindow.setTimeout(drivePreview, 240);
      let bootstrapRuns = 0;
      const bootstrapIntervalId = runtimeWindow.setInterval(() => {
        drivePreview();
        bootstrapRuns += 1;

        if (bootstrapRuns >= 4) {
          runtimeWindow.clearInterval(bootstrapIntervalId);
        }
      }, 420);

      if (previewActive) {
        runtimeWindow.setInterval(drivePreview, 1400);
      }
    }

    return () => {
      isDisposed = true;
      audioContextsRef.current = new Set();
      audioElementsRef.current = new Set();
      mutedAudioContextsRef.current = new Set();
      resizeObserver.disconnect();
      if (!isPreview) {
        bodyElement.removeEventListener('pointerdown', handlePointerFocus);
      } else {
        previewBoundaryEventTypes.forEach((type) => {
          hostElement.removeEventListener(type, stopPreviewBoundaryEvent);
        });
      }

      listenerEntries.forEach(({ listener, options, target, type }) => {
        target.removeEventListener(type, listener, options);
      });

      resizeEntries.splice(0, resizeEntries.length);

      timeoutIds.forEach((timeoutId) => ownerWindow.clearTimeout(timeoutId));
      intervalIds.forEach((intervalId) => ownerWindow.clearInterval(intervalId));
      frameIds.forEach((frameId) => ownerWindow.cancelAnimationFrame(frameId));

      audioContexts.forEach((audioContext) => {
        if (audioContext && typeof audioContext.close === 'function' && audioContext.state !== 'closed') {
          audioContext.close().catch(() => {});
        }
      });

      inlineHandlerGlobals.forEach((previousValue, name) => {
        if (typeof previousValue === 'undefined') {
          delete ownerWindow[name];
          return;
        }

        ownerWindow[name] = previousValue;
      });

      shadowRoot.replaceChildren();
    };
  }, [experience, isPreview, previewActive]);

  return <div className={`experience-runtime ${className}`.trim()} ref={hostRef} />;
}
