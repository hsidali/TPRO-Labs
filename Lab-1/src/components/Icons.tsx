import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconFirst = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 5v14" />
    <path d="M19 5l-9 7 9 7z" fill="currentColor" />
  </Icon>
);
export const IconPrev = (p: IconProps) => (
  <Icon {...p}>
    <path d="M17 5l-9 7 9 7z" fill="currentColor" />
  </Icon>
);
export const IconPlay = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 5l11 7-11 7z" fill="currentColor" />
  </Icon>
);
export const IconPause = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 5v14M15 5v14" strokeWidth="3.2" />
  </Icon>
);
export const IconNext = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 5l9 7-9 7z" fill="currentColor" />
  </Icon>
);
export const IconLast = (p: IconProps) => (
  <Icon {...p}>
    <path d="M18 5v14" />
    <path d="M5 5l9 7-9 7z" fill="currentColor" />
  </Icon>
);
export const IconDice = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <circle cx="9" cy="9" r="1" fill="currentColor" />
    <circle cx="15" cy="15" r="1" fill="currentColor" />
    <circle cx="15" cy="9" r="1" fill="currentColor" />
    <circle cx="9" cy="15" r="1" fill="currentColor" />
  </Icon>
);
export const IconSun = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
  </Icon>
);
export const IconMoon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />
  </Icon>
);
export const IconAuto = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" />
  </Icon>
);
export const IconReset = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 12a8 8 0 1 0 2.6-5.9" />
    <path d="M4 4v4h4" />
  </Icon>
);

/** Brand mark: a triangle (the smallest cycle) with one highlighted edge. */
export const LogoMark = (p: IconProps) => (
  <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true" focusable="false" {...p}>
    <path d="M16 6L6.5 24h19z" fill="none" stroke="var(--edge-idle-strong)" strokeWidth="2.4" strokeLinejoin="round" />
    <path d="M6.5 24h19" fill="none" stroke="var(--green)" strokeWidth="3.4" strokeLinecap="round" />
    <circle cx="16" cy="6" r="3.6" fill="var(--blue)" />
    <circle cx="6.5" cy="24" r="3.6" fill="var(--orange)" />
    <circle cx="25.5" cy="24" r="3.6" fill="var(--aqua)" />
  </svg>
);
