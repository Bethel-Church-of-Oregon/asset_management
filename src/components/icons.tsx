const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export const IconDashboard = () => (
  <svg {...base}>
    <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
  </svg>
);

export const IconList = () => (
  <svg {...base}>
    <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
  </svg>
);

export const IconPlus = () => (
  <svg {...base}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconScan = () => (
  <svg {...base}>
    <path d="M3 8V5.5A2.5 2.5 0 0 1 5.5 3H8M16 3h2.5A2.5 2.5 0 0 1 21 5.5V8M21 16v2.5A2.5 2.5 0 0 1 18.5 21H16M8 21H5.5A2.5 2.5 0 0 1 3 18.5V16M7 8v8M10.5 8v8M14 8v8M17 8v8" />
  </svg>
);

export const IconPrinter = () => (
  <svg {...base}>
    <path d="M6.5 9V3.5h11V9M6.5 17.5H5a2 2 0 0 1-2-2V11a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4.5a2 2 0 0 1-2 2h-1.5" />
    <rect x="6.5" y="14" width="11" height="6.5" rx="1" />
  </svg>
);

export const IconSettings = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.9 19.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3.04V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9v.01c.24.6.79 1.01 1.44 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z" />
  </svg>
);

export const IconLogout = () => (
  <svg {...base}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
  </svg>
);

export const IconSearch = () => (
  <svg {...base}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const IconCamera = () => (
  <svg {...base}>
    <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.2a2 2 0 0 0 1.7-.95l.7-1.1A2 2 0 0 1 10.8 3h2.4a2 2 0 0 1 1.7.95l.7 1.1A2 2 0 0 0 17.3 6h1.2A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);

export const IconDownload = () => (
  <svg {...base}>
    <path d="M12 3v12M7.5 10.5 12 15l4.5-4.5M4 20h16" />
  </svg>
);

export const IconWrench = () => (
  <svg {...base}>
    <path d="M14.7 6.3a4.5 4.5 0 0 0 6 6l-2.6 2.6-6-6zM12.1 8.9 5 16v3h3l7.1-7.1" />
  </svg>
);

export const IconTrash = () => (
  <svg {...base}>
    <path d="M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13M10 11v5M14 11v5" />
  </svg>
);

export const IconEdit = () => (
  <svg {...base}>
    <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
  </svg>
);

export const IconBack = () => (
  <svg {...base}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

export const IconWarning = () => (
  <svg {...base}>
    <path d="M12 3.5 21 19.5H3zM12 9.5v4M12 16.5h.01" />
  </svg>
);
