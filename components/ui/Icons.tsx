type IconProps = {
  size?: number;
  className?: string;
};

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function PlayIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M8 5.5v13l10-6.5-10-6.5Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PauseIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="7" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none" />
      <rect x="13.5" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ResetIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...base} d="M4 10a8 8 0 1 1 2 7" />
      <path {...base} d="M4 4v6h6" />
    </svg>
  );
}

export function BoatIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...base} d="M4 14h16l-2.4 5H6.4L4 14Z" />
      <path {...base} d="M7 14V8h10v6" />
      <path {...base} d="M11 8V4h2v4" />
    </svg>
  );
}

export function ShieldIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...base} d="M12 3 5 6v5c0 4.5 2.9 8 7 10 4.1-2 7-5.5 7-10V6l-7-3Z" />
      <path {...base} d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function RouteIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle {...base} cx="6" cy="18" r="2.2" />
      <circle {...base} cx="18" cy="6" r="2.2" />
      <path {...base} d="M8 18h4a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3" />
    </svg>
  );
}

export function CloseIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...base} d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function ArrowRightIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...base} d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

export function InfoIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle {...base} cx="12" cy="12" r="9" />
      <path {...base} d="M12 11v5M12 7.8v.2" />
    </svg>
  );
}

export function LocateIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle {...base} cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <path {...base} d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}

export function AlertIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...base} d="M12 3 2.5 20h19L12 3Z" />
      <path {...base} d="M12 9v5M12 17v.2" />
    </svg>
  );
}

export function WaterIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...base} d="M3 8c2.2-2 4.3-2 6.5 0S13.8 10 16 8s4.3-2 5 0" />
      <path {...base} d="M3 13c2.2-2 4.3-2 6.5 0s4.3 2 6.5 0 4.3-2 5 0" />
      <path {...base} d="M3 18c2.2-2 4.3-2 6.5 0s4.3 2 6.5 0 4.3-2 5 0" />
    </svg>
  );
}


export function CursorIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="m5 3 14 8.5-6.2 1.4L10.8 19 5 3Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PlusIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...base} d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function MoveIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...base} d="M12 3v18M3 12h18M12 3 9 6M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3" />
    </svg>
  );
}

export function RotateIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...base} d="M20 11a8 8 0 1 0-2.3 5.7" />
      <path {...base} d="M20 4v7h-7" />
    </svg>
  );
}

export function TrashIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...base} d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </svg>
  );
}

export function LayersIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...base} d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path {...base} d="m3 12 9 5 9-5M3 16l9 5 9-5" />
    </svg>
  );
}

export function HistoryIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...base} d="M4 5v5h5" />
      <path {...base} d="M4.5 10a8 8 0 1 1 1.2 7" />
      <path {...base} d="M12 8v5l3 2" />
    </svg>
  );
}

export function ChevronIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...base} d="m8 10 4 4 4-4" />
    </svg>
  );
}

export function Spinner({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={["spinner", className].filter(Boolean).join(" ")}
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="8.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeDasharray="32 22"
      />
    </svg>
  );
}
