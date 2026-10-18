import type { ReactNode } from 'react';
import type { Role } from '@matdraw/shared';

const PATHS: Record<string, string> = {
  home: 'M3 10.5L12 3l9 7.5M5 9v11h14V9M9 20v-7h6v7',
  student: 'M2 9l10-5 10 5-10 5zM6 11v5c3.5 3 8.5 3 12 0v-5M22 9v6',
  tutor: 'M3 20V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v15M3 20h18M8 8h3M8 12h3M15 9a2 2 0 1 0 0 .01M13 15a2 2 0 0 1 4 0',
  logout: 'M10 17l5-5-5-5M15 12H3M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6',
  account: 'M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z',
  select: 'M5 3l13 7-6 1.5L9.5 18z',
  pan: 'M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3',
  pen: 'M4 20l4-1 11-11-3-3L5 16zM14 7l3 3',
  highlighter: 'M9 14l-4 5h6l1.5-1.5M9 14l8-8 3 3-8 8zM9 14l3 3',
  eraser: 'M9 20h11M4.5 15.5l9.5-9.5 5 5-9 9H9z M9 11l5 5',
  shape: 'M3 13h8v8H3zM16.5 3l4.5 8h-9z',
  solid: 'M12 2.5l8.5 4.75v9.5L12 21.5l-8.5-4.75v-9.5zM12 12l8.5-4.75M12 12v9.5M12 12L3.5 7.25',
  text: 'M5 5h14M12 5v14M9 19h6',
  formula: 'M2.5 13.5l2.5-1 3.5 7.5 4.5-16h8.5',
  plot: 'M3 3v18h18M6 17c3-9 6-11 13-12',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 2-2 5 5M15.5 9.5a1.5 1.5 0 1 0 0-.01',
  book: 'M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5zM12 6.5v13',
  recognize: 'M3 20l3.5-1 8-8-2.5-2.5-8 8zM17 2.5v5M14.5 5h5M19 11v3M17.5 12.5h3',
  undo: 'M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-4',
  redo: 'M15 14l5-5-5-5M20 9H9a5 5 0 0 0 0 10h4',
  trash: 'M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3',
  zoomIn: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-5-5M11 8v6M8 11h6',
  zoomOut: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-5-5M8 11h6',
  fit: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',
  train: 'M4 19.5V5a2 2 0 0 1 2-2h14v15H6a2 2 0 0 0-2 2 2 2 0 0 0 2 2h14M8 7h8M8 11h6',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  front: 'M8 8h12v12H8zM4 16V4h12',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M16 3.5a4 4 0 0 1 0 7.5M18 14a6 6 0 0 1 4 6v1',
  back: 'M15 18l-6-6 6-6',
  activity: 'M3 12h4l3-8 4 16 3-8h4',
  hand: 'M7 11V6a1.5 1.5 0 0 1 3 0v5M10 10V4.5a1.5 1.5 0 0 1 3 0V10M13 10V5.5a1.5 1.5 0 0 1 3 0V12M16 9.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1.5a6 6 0 0 1-4.6-2.2L4 15a1.6 1.6 0 0 1 2.4-2L8 14.5V8',
  backgroundBlank: 'M4 3h16v18H4z',
  backgroundGrid: 'M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18',
  backgroundDots: 'M5 5a1 1 0 1 0 0 .01M12 5a1 1 0 1 0 0 .01M19 5a1 1 0 1 0 0 .01M5 12a1 1 0 1 0 0 .01M12 12a1 1 0 1 0 0 .01M19 12a1 1 0 1 0 0 .01M5 19a1 1 0 1 0 0 .01M12 19a1 1 0 1 0 0 .01M19 19a1 1 0 1 0 0 .01',
  penOnly: 'M4 20l4-1 11-11-3-3L5 16zM14 7l3 3M19 3v4M16 6h6',
};

export type IconName = keyof typeof PATHS;

export function RoleBadge({ role, compact = false }: { role: Role; compact?: boolean }) {
  const label = role === 'TUTOR' ? 'Korepetytorka' : 'Uczeń';
  return (
    <span className={`role-badge${compact ? ' compact' : ''}`} title={label} aria-label={label}>
      <Icon name={role === 'TUTOR' ? 'tutor' : 'student'} size={compact ? 16 : 18} />
      {!compact && <span>{label}</span>}
    </span>
  );
}

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

export function IconButton({
  icon,
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  icon: IconName;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick(): void;
  children?: ReactNode;
}) {
  return (
    <button type="button" className={`tool-btn${active ? ' active' : ''}`} title={label} aria-label={label} aria-pressed={active} disabled={disabled} onClick={onClick}>
      <Icon name={icon} />
      {children}
    </button>
  );
}
