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
