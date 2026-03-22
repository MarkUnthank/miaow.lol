function IconBase({ children, className = '' }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.9"
      viewBox="0 0 24 24"
    >
      {children}
    </svg>
  );
}

function GlyphIconBase({ children, className = '', viewBox = '0 0 24 24' }) {
  return (
    <svg aria-hidden="true" className={className} fill="currentColor" viewBox={viewBox}>
      {children}
    </svg>
  );
}

export function ArrowLeftIcon({ className }) {
  return (
    <IconBase className={className}>
      <path d="M15 18 9 12l6-6" />
    </IconBase>
  );
}

export function ArrowRightIcon({ className }) {
  return (
    <IconBase className={className}>
      <path d="m9 18 6-6-6-6" />
    </IconBase>
  );
}

export function HomeIcon({ className }) {
  return (
    <IconBase className={className}>
      <path d="M4 11.5 12 5l8 6.5" />
      <path d="M6.5 10.5V19h11v-8.5" />
    </IconBase>
  );
}

export function ShuffleIcon({ className }) {
  return (
    <IconBase className={className}>
      <path d="M16 4h4v4" />
      <path d="m20 4-6.75 6.75" />
      <path d="M9 7H5a2 2 0 0 0-2 2v0" />
      <path d="M16 20h4v-4" />
      <path d="m20 20-6.75-6.75" />
      <path d="M9 17H5a2 2 0 0 1-2-2v0" />
    </IconBase>
  );
}

export function ExpandIcon({ className }) {
  return (
    <IconBase className={className}>
      <path d="M9 4H4v5" />
      <path d="M4 4l6 6" />
      <path d="M15 20h5v-5" />
      <path d="m20 20-6-6" />
      <path d="M20 9V4h-5" />
      <path d="m20 4-6 6" />
      <path d="M4 15v5h5" />
      <path d="m4 20 6-6" />
    </IconBase>
  );
}

export function SpeakerIcon({ className, muted = false }) {
  return (
    <IconBase className={className}>
      <path d="M5 10v4h4l5 4V6l-5 4H5Z" />
      <path d="M17 9.5a3.5 3.5 0 0 1 0 5" />
      <path d="M19.5 7a7 7 0 0 1 0 10" />
      {muted ? <path d="M5 19 19 5" stroke="#d93025" strokeWidth="2.4" /> : null}
    </IconBase>
  );
}

export function ShareIcon({ className }) {
  return (
    <IconBase className={className}>
      <path d="M15 8a3 3 0 1 0-.01-6.01A3 3 0 0 0 15 8Z" />
      <path d="M6 15a3 3 0 1 0-.01-6.01A3 3 0 0 0 6 15Z" />
      <path d="M15 22a3 3 0 1 0-.01-6.01A3 3 0 0 0 15 22Z" />
      <path d="m8.6 10.8 3.8-2.6" />
      <path d="m8.6 13.2 3.8 2.6" />
    </IconBase>
  );
}

export function MenuIcon({ className }) {
  return (
    <IconBase className={className}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </IconBase>
  );
}

export function DieIcon({ className }) {
  return (
    <IconBase className={className}>
      <rect height="16" rx="3.5" width="16" x="4" y="4" />
      <circle cx="9" cy="9" fill="currentColor" r="0.9" stroke="none" />
      <circle cx="15" cy="15" fill="currentColor" r="0.9" stroke="none" />
      <circle cx="15" cy="9" fill="currentColor" r="0.9" stroke="none" />
      <circle cx="9" cy="15" fill="currentColor" r="0.9" stroke="none" />
    </IconBase>
  );
}

export function LinkIcon({ className }) {
  return (
    <IconBase className={className}>
      <path d="M10 7H7a4 4 0 1 0 0 8h3" />
      <path d="M14 17h3a4 4 0 1 0 0-8h-3" />
      <path d="M8 12h8" />
    </IconBase>
  );
}

export function EmailIcon({ className }) {
  return (
    <IconBase className={className}>
      <rect height="14" rx="2.6" width="18" x="3" y="5" />
      <path d="m4.5 7 7.5 6 7.5-6" />
    </IconBase>
  );
}

export function WhatsAppIcon({ className }) {
  return (
    <IconBase className={className}>
      <path d="M20 11.5A8.5 8.5 0 0 1 7.4 18.9L3.5 20l1.1-3.9A8.5 8.5 0 1 1 20 11.5Z" />
      <path d="M9.4 8.8c.3-.4.8-.5 1.2-.2l.9.7c.3.2.4.7.2 1.1l-.5.9c.8 1.3 1.9 2.4 3.2 3.2l.9-.5c.4-.2.8-.1 1.1.2l.7.9c.3.4.2.9-.2 1.2-.8.6-1.8.7-2.7.4-2.5-.8-4.6-2.9-5.4-5.4-.3-.9-.2-1.9.4-2.7Z" />
    </IconBase>
  );
}

export function TelegramIcon({ className }) {
  return (
    <IconBase className={className}>
      <path d="m3.5 11.7 15.8-7c.8-.4 1.7.3 1.5 1.2l-2.3 12.2c-.1.8-1.1 1.1-1.7.6l-4.5-3.7-2.3 2.3c-.4.4-1 .2-1.1-.4l-.8-3.2-4-1.4c-.9-.3-.9-1.5 0-1.9Z" />
      <path d="m8 13.2 10.3-7.1" />
    </IconBase>
  );
}

export function XLogoIcon({ className }) {
  return (
    <GlyphIconBase className={className}>
      <path d="M4 4h3.3l4.6 6.1L17 4h3l-6.5 7.4L20.5 20h-3.4l-4.9-6.3L6.7 20H4l6.7-7.7L4 4Z" />
    </GlyphIconBase>
  );
}

export function FacebookIcon({ className }) {
  return (
    <GlyphIconBase className={className}>
      <path d="M13.6 20v-5.7h2.5l.4-3h-2.9V9.4c0-.9.2-1.5 1.5-1.5h1.6V5.2c-.3-.1-1.1-.2-2-.2-2.1 0-3.6 1.3-3.6 3.8v2.5H9v3h2.1V20h2.5Z" />
    </GlyphIconBase>
  );
}

export function RedditIcon({ className }) {
  return (
    <IconBase className={className}>
      <path d="m14.7 8.8 1.3-3.1 2.8.7" />
      <circle cx="19.3" cy="6.6" r="1.2" />
      <path d="M7 15c0 2.2 2.2 4 5 4s5-1.8 5-4-2.2-4-5-4-5 1.8-5 4Z" />
      <circle cx="10" cy="14.1" fill="currentColor" r="0.9" stroke="none" />
      <circle cx="14" cy="14.1" fill="currentColor" r="0.9" stroke="none" />
      <path d="M9.4 16.5c.7.6 1.6.9 2.6.9s1.9-.3 2.6-.9" />
    </IconBase>
  );
}
