// Minimalist white line icons for the sidebar nav — hand-drawn, no icon
// library dependency (kept consistent with this project's zero-extra-
// dependency footprint). Each takes a className so size/color are set by
// the caller; default stroke/fill styling lives here.

type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconDashboard({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </svg>
  );
}

export function IconCustomers({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M4 21V6a1 1 0 011-1h6a1 1 0 011 1v15" />
      <path d="M14 21V10a1 1 0 011-1h4a1 1 0 011 1v11" />
      <path d="M2 21h20" />
      <path d="M7.5 8h0M7.5 11.5h0M7.5 15h0M17 13h0M17 16.5h0" strokeWidth={2.4} />
    </svg>
  );
}

export function IconQuotations({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M7 3h7l5 5v12a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" />
      <path d="M14 3v5h5" />
      <path d="M9 13.5h6M9 17h6" />
    </svg>
  );
}

export function IconProjects({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M3 19a9 9 0 0118 0" />
      <path d="M2 19h20" />
      <path d="M12 5v4" />
    </svg>
  );
}

export function IconProjectManagement({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9.5h18" />
      <path d="M8 2.5v4M16 2.5v4" />
      <path d="M7 13.5h3M7 17h6" />
    </svg>
  );
}

export function IconEquipment({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94z" />
    </svg>
  );
}

export function IconBomTemplates({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M8 8h3M8 12h3M8 16h3" />
      <rect x="14" y="7" width="3" height="3" rx="0.5" />
      <rect x="14" y="14" width="3" height="3" rx="0.5" />
    </svg>
  );
}

export function IconMountingTypes({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M3 20h18" />
      <path d="M5 20l4-11h6l4 11" />
      <path d="M8.5 14h7" />
      <path d="M12 3v6" />
    </svg>
  );
}

export function IconAncillaryServices({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <rect x="3" y="10" width="18" height="9" rx="1.5" />
      <path d="M7 10V7a5 5 0 0110 0v3" />
      <path d="M12 13.5v2.5" />
    </svg>
  );
}

export function IconUsers({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <circle cx="9" cy="8" r="3.25" />
      <path d="M2.5 21a6.5 6.5 0 0113 0" />
      <circle cx="17.5" cy="9.5" r="2.5" />
      <path d="M15.5 21a5.5 5.5 0 016.5-4.7" />
    </svg>
  );
}

export function IconSettings({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <circle cx="12" cy="12" r="4.2" />
      <line x1="20.00" y1="12.00" x2="22.30" y2="12.00" />
      <line x1="17.66" y1="17.66" x2="19.28" y2="19.28" />
      <line x1="12.00" y1="20.00" x2="12.00" y2="22.30" />
      <line x1="6.34" y1="17.66" x2="4.72" y2="19.28" />
      <line x1="4.00" y1="12.00" x2="1.70" y2="12.00" />
      <line x1="6.34" y1="6.34" x2="4.72" y2="4.72" />
      <line x1="12.00" y1="4.00" x2="12.00" y2="1.70" />
      <line x1="17.66" y1="6.34" x2="19.28" y2="4.72" />
    </svg>
  );
}

export function IconAuditLog({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <rect x="5" y="3.5" width="14" height="18" rx="2" />
      <path d="M9 2.5h6a1 1 0 011 1V5H8V3.5a1 1 0 011-1z" />
      <path d="M8.5 11h7M8.5 14.5h7M8.5 18h4.5" />
    </svg>
  );
}

export function IconSignOut({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M9 21H5a1 1 0 01-1-1V4a1 1 0 011-1h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}
