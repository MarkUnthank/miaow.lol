import { useEffect, useRef, useState } from 'react';
import { buildShareLinks, buildSharePayload, shouldUseNativeShare } from '../share';
import {
  EmailIcon,
  FacebookIcon,
  LinkIcon,
  RedditIcon,
  ShareIcon,
  TelegramIcon,
  WhatsAppIcon,
  XLogoIcon,
} from './Icons';

const NUDGE_DELAY = 15_000;
const NUDGE_DURATION = 1_150;
const DEFAULT_SHARE_RANDOM = () => 0;

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
  const [payload, setPayload] = useState(() => buildSharePayload(experience, window.location, DEFAULT_SHARE_RANDOM));
  const links = buildShareLinks(payload);

  useEffect(() => {
    setIsOpen(false);
    setPayload(buildSharePayload(experience, window.location, DEFAULT_SHARE_RANDOM));
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
      }, NUDGE_DELAY);
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
    setIsNudging(false);
    const nextPayload = buildSharePayload(experience, window.location);

    if (shouldUseNativeShare()) {
      try {
        await navigator.share(nextPayload);
      } catch (error) {
        if (error?.name !== 'AbortError') {
          setPayload(nextPayload);
          setIsOpen(true);
        }
      }
      return;
    }

    if (isOpen) {
      setIsOpen(false);
      return;
    }

    setPayload(nextPayload);
    setIsOpen(true);
  }

  async function handleCopyLink() {
    await copyText(payload.url);
  }

  const shareItems = [
    { href: links.email, icon: EmailIcon, label: 'Email' },
    { href: links.whatsapp, icon: WhatsAppIcon, label: 'WhatsApp' },
    { href: links.telegram, icon: TelegramIcon, label: 'Telegram' },
    { href: links.x, icon: XLogoIcon, label: 'X' },
    { href: links.facebook, icon: FacebookIcon, label: 'Facebook' },
    { href: links.reddit, icon: RedditIcon, label: 'Reddit' },
  ];

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
              <LinkIcon className="share-dock__item-icon" />
              <span>Copy link</span>
            </button>
            {shareItems.map(({ href, icon: Icon, label }) => (
              <a className="share-dock__item" href={href} key={label} onClick={() => setIsOpen(false)} rel="noreferrer" target="_blank">
                <Icon className="share-dock__item-icon" />
                <span>{label}</span>
              </a>
            ))}
          </div>
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
