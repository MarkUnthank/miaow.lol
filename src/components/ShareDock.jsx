import { useEffect, useMemo, useRef, useState } from 'react';
import { buildShareLinks, buildSharePayload, shouldUseNativeShare } from '../share';
import { ShareIcon } from './Icons';

const NUDGE_MIN_DELAY = 20_000;
const NUDGE_DELAY_RANGE = 10_000;
const NUDGE_DURATION = 1_150;

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  if (typeof document === 'undefined') {
    return false;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'absolute';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.append(textarea);
  textarea.select();

  let copied = false;

  try {
    copied = document.execCommand?.('copy') ?? false;
  } finally {
    textarea.remove();
  }

  return copied;
}

export function ShareDock({ experience }) {
  const dockRef = useRef(null);
  const nudgeTimerRef = useRef(0);
  const nudgeReleaseRef = useRef(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isNudging, setIsNudging] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const payload = useMemo(() => buildSharePayload(experience, window.location), [experience]);
  const links = useMemo(() => buildShareLinks(payload), [payload]);

  useEffect(() => {
    setIsOpen(false);
    setStatusMessage('');
  }, [experience.id]);

  useEffect(() => {
    function scheduleNudge() {
      window.clearTimeout(nudgeTimerRef.current);
      window.clearTimeout(nudgeReleaseRef.current);

      nudgeTimerRef.current = window.setTimeout(() => {
        setIsNudging(true);

        nudgeReleaseRef.current = window.setTimeout(() => {
          setIsNudging(false);
          scheduleNudge();
        }, NUDGE_DURATION);
      }, NUDGE_MIN_DELAY + Math.random() * NUDGE_DELAY_RANGE);
    }

    scheduleNudge();

    return () => {
      window.clearTimeout(nudgeTimerRef.current);
      window.clearTimeout(nudgeReleaseRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event) {
      if (!dockRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  async function handlePrimaryClick() {
    setStatusMessage('');
    setIsNudging(false);

    if (shouldUseNativeShare()) {
      try {
        await navigator.share(payload);
      } catch (error) {
        if (error?.name !== 'AbortError') {
          setIsOpen(true);
        }
      }
      return;
    }

    setIsOpen((currentValue) => !currentValue);
  }

  async function handleCopyLink() {
    const didCopy = await copyText(payload.url);
    setStatusMessage(didCopy ? 'Link copied.' : 'Copy failed.');
  }

  async function handleCopyBlurb() {
    const didCopy = await copyText(`${payload.title}\n\n${payload.text}\n\n${payload.url}`);
    setStatusMessage(didCopy ? 'Blurb copied.' : 'Copy failed.');
  }

  return (
    <div className="share-dock" ref={dockRef}>
      {isOpen ? (
        <div aria-label="Share options" className="share-dock__menu" role="dialog">
          <div className="share-dock__menu-header">
            <p className="share-dock__eyebrow">Share</p>
            <h2 className="share-dock__title">{experience.title}</h2>
          </div>

          <div className="share-dock__grid">
            <button className="share-dock__item" onClick={handleCopyLink} type="button">
              Copy link
            </button>
            <button className="share-dock__item" onClick={handleCopyBlurb} type="button">
              Copy blurb
            </button>
            <a className="share-dock__item" href={links.email} onClick={() => setIsOpen(false)}>
              Email
            </a>
            <a className="share-dock__item" href={links.whatsapp} onClick={() => setIsOpen(false)} rel="noreferrer" target="_blank">
              WhatsApp
            </a>
            <a className="share-dock__item" href={links.telegram} onClick={() => setIsOpen(false)} rel="noreferrer" target="_blank">
              Telegram
            </a>
            <a className="share-dock__item" href={links.x} onClick={() => setIsOpen(false)} rel="noreferrer" target="_blank">
              X
            </a>
            <a className="share-dock__item" href={links.facebook} onClick={() => setIsOpen(false)} rel="noreferrer" target="_blank">
              Facebook
            </a>
            <a className="share-dock__item" href={links.reddit} onClick={() => setIsOpen(false)} rel="noreferrer" target="_blank">
              Reddit
            </a>
          </div>

          <p className="share-dock__status" role="status">
            {statusMessage || 'Share the exact toy link or copy a blurb with the URL attached.'}
          </p>
        </div>
      ) : null}

      <button
        aria-expanded={isOpen}
        aria-haspopup={shouldUseNativeShare() ? undefined : 'dialog'}
        className={`share-dock__button ${isNudging ? 'is-nudging' : ''}`.trim()}
        onClick={handlePrimaryClick}
        type="button"
      >
        <ShareIcon className="share-dock__icon" />
        <span>Share</span>
      </button>
    </div>
  );
}
