import type { ReactNode, SVGProps } from 'react';

export type IconName =
  | 'search'
  | 'inbox'
  | 'close'
  | 'check'
  | 'plus'
  | 'chevron-right'
  | 'chevron-down'
  | 'alert'
  | 'info'
  | 'empty'
  | 'lock'
  | 'user'
  | 'calendar'
  | 'external'
  | 'folder'
  | 'task'
  | 'progress'
  | 'users'
  | 'event'
  | 'pulse'
  | 'systems'
  | 'chart'
  | 'program';

const PATHS: Record<IconName, ReactNode> = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  inbox: (
    <>
      <path d="M4 8h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" />
      <path d="M4 8 9.5 13h5L20 8" />
    </>
  ),
  close: (
    <>
      <path d="M7 7l10 10M17 7 7 17" />
    </>
  ),
  check: <path d="M5.5 12.5 10 17l8.5-9" />,
  plus: (
    <>
      <path d="M12 6v12M6 12h12" />
    </>
  ),
  'chevron-right': <path d="m9 6 6 6-6 6" />,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  alert: (
    <>
      <path d="M12 4 3.5 19h17L12 4Z" />
      <path d="M12 10v4M12 16.5v.5" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  empty: (
    <>
      <rect x="4" y="6" width="16" height="13" rx="2" />
      <path d="M8 11h8M8 15h5" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19.5c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="6" width="16" height="14" rx="2" />
      <path d="M8 4v4M16 4v4M4 11h16" />
    </>
  ),
  external: (
    <>
      <path d="M14 5h5v5" />
      <path d="M10 14 19 5" />
      <path d="M17 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4" />
    </>
  ),
  folder: (
    <>
      <path d="M4 8h5l2 2h9v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8Z" />
      <path d="M4 8V7a1 1 0 0 1 1-1h3.5" />
    </>
  ),
  task: (
    <>
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <path d="M9 9h6M9 13h6M9 17h4" />
    </>
  ),
  progress: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 1 8 8" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3.5 19c1.2-3 3.2-4.5 5.5-4.5S13.3 16 14.5 19" />
      <path d="M14 14.2c1.4-.4 2.8 0 4.2 1.8" />
    </>
  ),
  event: (
    <>
      <rect x="4" y="6" width="16" height="14" rx="2" />
      <path d="M8 4v4M16 4v4M4 11h16M10 15h4" />
    </>
  ),
  pulse: (
    <>
      <path d="M3 12h4l2.5-6 3 12 2.5-6H21" />
    </>
  ),
  systems: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </>
  ),
  chart: (
    <>
      <path d="M4 19h16" />
      <path d="M7 16V10M12 16V7M17 16v-4" />
    </>
  ),
  program: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
};

export function Icon({
  name,
  size = 16,
  className,
  label,
  ...rest
}: {
  name: IconName;
  size?: number;
  /** Accessible name — omit when decorative beside visible text. */
  label?: string;
  className?: string;
} & Omit<SVGProps<SVGSVGElement>, 'name'>) {
  return (
    <svg
      className={`icon${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
