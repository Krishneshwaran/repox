// Minimal stroke icons — 1.5px, currentColor
const Icon = ({ d, size = 16, sw = 1.5, children, fill = "none", style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style}>
    {d ? <path d={d} /> : children}
  </svg>
);

const IconRepo = (p) => <Icon {...p}><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5V4.5Z"/><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20"/></Icon>;
const IconStar = (p) => <Icon {...p}><polygon points="12,3 14.5,9 21,9.5 16,14 17.5,20.5 12,17 6.5,20.5 8,14 3,9.5 9.5,9"/></Icon>;
const IconFork = (p) => <Icon {...p}><circle cx="6" cy="5" r="2"/><circle cx="18" cy="5" r="2"/><circle cx="12" cy="19" r="2"/><path d="M6 7v3a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7"/><path d="M12 12v5"/></Icon>;
const IconEye = (p) => <Icon {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></Icon>;
const IconSearch = (p) => <Icon {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></Icon>;
const IconChevDown = (p) => <Icon {...p}><polyline points="6,9 12,15 18,9"/></Icon>;
const IconChevRight = (p) => <Icon {...p}><polyline points="9,6 15,12 9,18"/></Icon>;
const IconChevLeft = (p) => <Icon {...p}><polyline points="15,6 9,12 15,18"/></Icon>;
const IconArrowUpRight = (p) => <Icon {...p}><path d="M7 17 17 7"/><path d="M8 7h9v9"/></Icon>;
const IconPlus = (p) => <Icon {...p}><path d="M12 5v14M5 12h14"/></Icon>;
const IconCircleDot = (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2" fill="currentColor"/></Icon>;
const IconBolt = (p) => <Icon {...p}><polygon points="13,2 4,14 11,14 10,22 20,10 13,10"/></Icon>;
const IconBrain = (p) => <Icon {...p}><path d="M9 4a3 3 0 0 0-3 3v0a3 3 0 0 0-2 5 3 3 0 0 0 2 5v0a3 3 0 0 0 3 3h.5V4H9Z"/><path d="M15 4a3 3 0 0 1 3 3v0a3 3 0 0 1 2 5 3 3 0 0 1-2 5v0a3 3 0 0 1-3 3h-.5V4H15Z"/></Icon>;
const IconGraph = (p) => <Icon {...p}><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></Icon>;
const IconSettings = (p) => <Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8L4.2 7a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></Icon>;
const IconKey = (p) => <Icon {...p}><circle cx="8" cy="15" r="4"/><path d="m10.85 12.15 9.15-9.15"/><path d="m18 5 2 2"/><path d="m15 8 2 2"/></Icon>;
const IconBell = (p) => <Icon {...p}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 21a2 2 0 0 0 4 0"/></Icon>;
const IconBook = (p) => <Icon {...p}><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5V4.5Z"/></Icon>;
const IconCommand = (p) => <Icon {...p}><path d="M6 4a2 2 0 1 1 2 2v12a2 2 0 1 1-2-2h12a2 2 0 1 1-2 2V6a2 2 0 1 1 2 2H6Z"/></Icon>;
const IconCheck = (p) => <Icon {...p}><polyline points="4,12 10,18 20,6"/></Icon>;
const IconLock = (p) => <Icon {...p}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 1 1 8 0v4"/></Icon>;
const IconShield = (p) => <Icon {...p}><path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z"/></Icon>;
const IconLogout = (p) => <Icon {...p}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17 5 12l5-5"/><path d="M5 12h11"/></Icon>;
const IconClock = (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Icon>;
const IconGit = (p) => <Icon {...p}><circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="12" r="2.5"/><path d="M6 8.5v7"/><path d="M6 12h7.5a2 2 0 0 1 2 2v0"/></Icon>;
const IconSparkle = (p) => <Icon {...p}><path d="M12 3v6"/><path d="M12 15v6"/><path d="M3 12h6"/><path d="M15 12h6"/><path d="m6 6 3 3"/><path d="m15 15 3 3"/><path d="m6 18 3-3"/><path d="m15 9 3-3"/></Icon>;
const IconDot = ({ color = "currentColor", size = 8 }) => (
  <span style={{ display:"inline-block", width:size, height:size, borderRadius:999, background:color, boxShadow:`0 0 8px ${color}` }} />
);

// GitHub mark
const IconGitHub = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 0C5.373 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.387.6.111.82-.26.82-.577 0-.285-.011-1.04-.016-2.04-3.338.726-4.043-1.61-4.043-1.61-.546-1.387-1.333-1.757-1.333-1.757-1.09-.745.083-.73.083-.73 1.205.085 1.84 1.237 1.84 1.237 1.071 1.834 2.81 1.304 3.495.997.108-.775.42-1.305.763-1.605-2.665-.305-5.467-1.334-5.467-5.933 0-1.31.467-2.382 1.236-3.222-.124-.303-.535-1.524.117-3.176 0 0 1.008-.323 3.3 1.23a11.49 11.49 0 0 1 3.003-.404c1.02.005 2.047.138 3.005.404 2.291-1.553 3.297-1.23 3.297-1.23.655 1.652.243 2.873.12 3.176.77.84 1.235 1.912 1.235 3.222 0 4.61-2.806 5.624-5.479 5.922.43.371.815 1.103.815 2.222 0 1.604-.014 2.898-.014 3.293 0 .32.217.694.825.576C20.565 21.796 24 17.3 24 12c0-6.627-5.373-12-12-12Z"/>
  </svg>
);

// repoX wordmark — built from text, no SVG drawing
const RepoXMark = ({ size = 28, full = false, dim = false }) => (
  <div style={{ display:"inline-flex", alignItems:"baseline", gap: 0, color: dim ? "var(--fg-2)" : "var(--fg)", fontSize: size, lineHeight: 1, letterSpacing: "-0.01em" }}>
    <span style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight: 500, fontSize: size * 0.78, transform:"translateY(-2%)", display:"inline-block" }}>repo</span>
    <span style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight: 300, fontSize: size * 0.95, marginLeft: -size * 0.06, marginRight: full ? size * 0.18 : 0, color: dim ? "var(--fg-3)" : "var(--accent)" }}>&rang;</span>
    {full && <span style={{ fontFamily:"'Inter', sans-serif", fontWeight: 700, letterSpacing:"-0.04em" }}>repoX</span>}
  </div>
);

Object.assign(window, {
  Icon, IconRepo, IconStar, IconFork, IconEye, IconSearch, IconChevDown, IconChevRight, IconChevLeft,
  IconArrowUpRight, IconPlus, IconCircleDot, IconBolt, IconBrain, IconGraph, IconSettings, IconKey,
  IconBell, IconBook, IconCommand, IconCheck, IconLock, IconShield, IconLogout, IconClock, IconGit,
  IconSparkle, IconDot, IconGitHub, RepoXMark
});
