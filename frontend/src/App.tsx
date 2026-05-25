import { Suspense, lazy, type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react'
import {
  analyzeArchitecture,
  analyzeReadme,
  askRepository,
  fetchRepositories,
  generateInsights,
  githubLoginUrl,
  logout as apiLogout,
  runScanner,
  summarizeRepository,
  type Repo,
  type ScanResult,
} from './api'
const VisualizationPanel = lazy(async () => {
  const mod = await import('./components/VisualizationPanel')
  return { default: mod.VisualizationPanel }
})

// ─── Constants ───────────────────────────────────────────────

const LANG_COLOR: Record<string, string> = {
  Python: '#3572A5',
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Go: '#00ADD8',
  Rust: '#dea584',
  Shell: '#89e051',
  'C++': '#f34b7d',
  Ruby: '#701516',
  Java: '#b07219',
  'C#': '#178600',
}

// ─── Helpers ─────────────────────────────────────────────────

function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const delta = (Date.now() - new Date(iso).getTime()) / 1000
  if (delta < 60) return 'just now'
  if (delta < 3600) return `${Math.floor(delta / 60)}m`
  if (delta < 86400) return `${Math.floor(delta / 3600)}h`
  if (delta < 604800) return `${Math.floor(delta / 86400)}d`
  if (delta < 2592000) return `${Math.floor(delta / 604800)}w`
  return `${Math.floor(delta / 2592000)}mo`
}

function pseudoActivity(seed: number): number[] {
  const arr: number[] = []
  let s = seed
  for (let i = 0; i < 16; i++) {
    s = Math.imul(s, 1664525) + 1013904223
    arr.push(Math.abs(s % 14) + 1)
  }
  return arr
}

function MarkdownBlock({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {lines.map((line, idx) => {
        const trimmed = line.trim()
        if (!trimmed) return <div key={idx} style={{ height: 4 }} />
        if (trimmed.startsWith('### ')) return <div key={idx} style={{ fontWeight: 600, color: 'var(--fg)' }}>{trimmed.slice(4)}</div>
        if (trimmed.startsWith('## ')) return <div key={idx} style={{ fontWeight: 600, color: 'var(--fg)' }}>{trimmed.slice(3)}</div>
        if (trimmed.startsWith('# ')) return <div key={idx} style={{ fontWeight: 600, color: 'var(--fg)' }}>{trimmed.slice(2)}</div>
        if (trimmed.startsWith('- ')) return <div key={idx} style={{ color: 'var(--fg-2)' }}>• {trimmed.slice(2)}</div>
        return <div key={idx} style={{ color: 'var(--fg-2)' }}>{trimmed}</div>
      })}
    </div>
  )
}

// ─── Icons ───────────────────────────────────────────────────

type IconProps = { size?: number; sw?: number; style?: CSSProperties }
type IconBaseProps = IconProps & { d?: string; fill?: string; children?: ReactNode }

const Icon = ({ d, size = 16, sw = 1.5, children, fill = 'none', style }: IconBaseProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }}>
    {d ? <path d={d} /> : children}
  </svg>
)

const IconRepo      = (p: IconProps) => <Icon {...p}><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5V4.5Z"/><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20"/></Icon>
const IconStar      = (p: IconProps) => <Icon {...p}><polygon points="12,3 14.5,9 21,9.5 16,14 17.5,20.5 12,17 6.5,20.5 8,14 3,9.5 9.5,9"/></Icon>
const IconFork      = (p: IconProps) => <Icon {...p}><circle cx="6" cy="5" r="2"/><circle cx="18" cy="5" r="2"/><circle cx="12" cy="19" r="2"/><path d="M6 7v3a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7"/><path d="M12 12v5"/></Icon>
const IconEye       = (p: IconProps) => <Icon {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></Icon>
const IconSearch    = (p: IconProps) => <Icon {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></Icon>
const IconChevDown  = (p: IconProps) => <Icon {...p}><polyline points="6,9 12,15 18,9"/></Icon>
const IconChevRight = (p: IconProps) => <Icon {...p}><polyline points="9,6 15,12 9,18"/></Icon>
const IconChevLeft  = (p: IconProps) => <Icon {...p}><polyline points="15,6 9,12 15,18"/></Icon>
const IconArrowUpRight = (p: IconProps) => <Icon {...p}><path d="M7 17 17 7"/><path d="M8 7h9v9"/></Icon>
const IconPlus      = (p: IconProps) => <Icon {...p}><path d="M12 5v14M5 12h14"/></Icon>
const IconCircleDot = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2" fill="currentColor"/></Icon>
const IconBolt      = (p: IconProps) => <Icon {...p}><polygon points="13,2 4,14 11,14 10,22 20,10 13,10"/></Icon>
const IconBrain     = (p: IconProps) => <Icon {...p}><path d="M9 4a3 3 0 0 0-3 3v0a3 3 0 0 0-2 5 3 3 0 0 0 2 5v0a3 3 0 0 0 3 3h.5V4H9Z"/><path d="M15 4a3 3 0 0 1 3 3v0a3 3 0 0 1 2 5 3 3 0 0 1-2 5v0a3 3 0 0 1-3 3h-.5V4H15Z"/></Icon>
const IconGraph     = (p: IconProps) => <Icon {...p}><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></Icon>
const IconSettings  = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8L4.2 7a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></Icon>
const IconKey       = (p: IconProps) => <Icon {...p}><circle cx="8" cy="15" r="4"/><path d="m10.85 12.15 9.15-9.15"/><path d="m18 5 2 2"/><path d="m15 8 2 2"/></Icon>
const IconBell      = (p: IconProps) => <Icon {...p}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 21a2 2 0 0 0 4 0"/></Icon>
const IconBook      = (p: IconProps) => <Icon {...p}><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5V4.5Z"/></Icon>
const IconCommand   = (p: IconProps) => <Icon {...p}><path d="M6 4a2 2 0 1 1 2 2v12a2 2 0 1 1-2-2h12a2 2 0 1 1-2 2V6a2 2 0 1 1 2 2H6Z"/></Icon>
const IconCheck     = (p: IconProps) => <Icon {...p}><polyline points="4,12 10,18 20,6"/></Icon>
const IconLock      = (p: IconProps) => <Icon {...p}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 1 1 8 0v4"/></Icon>
const IconShield    = (p: IconProps) => <Icon {...p}><path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z"/></Icon>
const IconLogout    = (p: IconProps) => <Icon {...p}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17 5 12l5-5"/><path d="M5 12h11"/></Icon>
const IconClock     = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Icon>
const IconGit       = (p: IconProps) => <Icon {...p}><circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="12" r="2.5"/><path d="M6 8.5v7"/><path d="M6 12h7.5a2 2 0 0 1 2 2v0"/></Icon>
const IconSparkle   = (p: IconProps) => <Icon {...p}><path d="M12 3v6"/><path d="M12 15v6"/><path d="M3 12h6"/><path d="M15 12h6"/><path d="m6 6 3 3"/><path d="m15 15 3 3"/><path d="m6 18 3-3"/><path d="m15 9 3-3"/></Icon>

const IconDot = ({ color = 'currentColor', size = 8 }: { color?: string; size?: number }) => (
  <span style={{ display: 'inline-block', width: size, height: size, borderRadius: 999, background: color, boxShadow: `0 0 8px ${color}`, flexShrink: 0 }} />
)

const IconGitHub = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ flexShrink: 0 }}>
    <path fillRule="evenodd" clipRule="evenodd" d="M12 0C5.373 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.387.6.111.82-.26.82-.577 0-.285-.011-1.04-.016-2.04-3.338.726-4.043-1.61-4.043-1.61-.546-1.387-1.333-1.757-1.333-1.757-1.09-.745.083-.73.083-.73 1.205.085 1.84 1.237 1.84 1.237 1.071 1.834 2.81 1.304 3.495.997.108-.775.42-1.305.763-1.605-2.665-.305-5.467-1.334-5.467-5.933 0-1.31.467-2.382 1.236-3.222-.124-.303-.535-1.524.117-3.176 0 0 1.008-.323 3.3 1.23a11.49 11.49 0 0 1 3.003-.404c1.02.005 2.047.138 3.005.404 2.291-1.553 3.297-1.23 3.297-1.23.655 1.652.243 2.873.12 3.176.77.84 1.235 1.912 1.235 3.222 0 4.61-2.806 5.624-5.479 5.922.43.371.815 1.103.815 2.222 0 1.604-.014 2.898-.014 3.293 0 .32.217.694.825.576C20.565 21.796 24 17.3 24 12c0-6.627-5.373-12-12-12Z" />
  </svg>
)

const RepoXMark = ({ size = 28 }: { size?: number }) => (
  <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 0, color: 'var(--fg)', fontSize: size, lineHeight: 1, letterSpacing: '-0.01em' }}>
    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, fontSize: size * 0.78, transform: 'translateY(-2%)', display: 'inline-block' }}>repo</span>
    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 300, fontSize: size * 0.95, marginLeft: -size * 0.06, color: 'var(--accent)' }}>›</span>
  </div>
)

// ─── Login styles ────────────────────────────────────────────

const loginStyles: Record<string, CSSProperties> = {
  root: {
    position: 'relative', width: '100%', height: '100%',
    background: 'var(--bg)', color: 'var(--fg)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  grid: {
    position: 'absolute', inset: 0,
    backgroundImage:
      'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
    backgroundSize: '56px 56px',
    maskImage: 'radial-gradient(circle at 50% 45%, black 0%, transparent 75%)',
    WebkitMaskImage: 'radial-gradient(circle at 50% 45%, black 0%, transparent 75%)',
    pointerEvents: 'none',
  },
  vignette: {
    position: 'absolute', inset: 0,
    background: 'radial-gradient(circle at 50% 30%, oklch(0.82 0.17 142 / 0.05), transparent 50%)',
    pointerEvents: 'none',
  },
  topbar: {
    position: 'relative', zIndex: 2,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 32px',
    borderBottom: '1px solid var(--line-soft)',
  },
  topbarRight: { display: 'flex', gap: 28, alignItems: 'center' },
  topLink: { color: 'var(--fg-3)', fontSize: 13, fontWeight: 450, transition: 'color .15s', textDecoration: 'none' },
  center: {
    position: 'relative', zIndex: 2,
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '0 32px', textAlign: 'center', gap: 0,
  },
  eyebrowRow: {
    display: 'inline-flex', alignItems: 'center', gap: 10,
    padding: '6px 12px',
    border: '1px solid var(--line)', borderRadius: 999,
    background: 'var(--bg-1)', marginBottom: 32,
  },
  eyebrowDot: {
    width: 6, height: 6, borderRadius: 6,
    background: 'var(--accent)', boxShadow: '0 0 12px var(--accent-glow)',
  },
  eyebrow: { fontSize: 11, color: 'var(--fg-2)', letterSpacing: '0.14em', fontWeight: 500, fontFamily: "'JetBrains Mono', monospace" },
  h1: { margin: 0, fontSize: 64, fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1.02 },
  h1Accent: { color: 'var(--fg-3)', fontWeight: 500 },
  sub: { maxWidth: 560, color: 'var(--fg-3)', fontSize: 15.5, lineHeight: 1.55, marginTop: 28, fontWeight: 400 },
  actions: { marginTop: 40, display: 'flex', gap: 12, alignItems: 'center' },
  cta: {
    display: 'inline-flex', alignItems: 'center', gap: 12,
    padding: '13px 18px 13px 16px',
    background: '#08080c', color: 'var(--fg)',
    border: '1px solid var(--line-2)', borderRadius: 8,
    fontSize: 14, fontWeight: 500, cursor: 'pointer',
    transition: 'all .15s ease',
    boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.5)',
  },
  ctaPressed: { transform: 'scale(0.98)', borderColor: 'var(--accent-dim)' },
  ctaKbd: {
    color: 'var(--fg-4)', display: 'inline-flex', alignItems: 'center',
    marginLeft: 4, paddingLeft: 12, borderLeft: '1px solid var(--line)',
  },
  secondary: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '13px 16px', background: 'transparent',
    color: 'var(--fg-2)', border: '1px solid transparent',
    borderRadius: 8, fontSize: 14, fontWeight: 450, cursor: 'pointer',
  },
  trust: {
    marginTop: 48, display: 'flex', gap: 28, alignItems: 'center',
    color: 'var(--fg-4)', fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
  },
  trustItem: { display: 'inline-flex', alignItems: 'center', gap: 8 },
  footer: {
    position: 'relative', zIndex: 2,
    padding: '18px 32px', borderTop: '1px solid var(--line-soft)',
    display: 'flex', alignItems: 'center', gap: 16,
    color: 'var(--fg-4)', fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
  },
  footMuted: { color: 'var(--fg-4)' },
  footDiv: { color: 'var(--fg-4)' },
  footLink: { color: 'var(--fg-3)', marginLeft: 8, textDecoration: 'none' },
}

// ─── Login Screen ────────────────────────────────────────────

function LoginScreen({ onLogin, error }: { onLogin: () => void; error?: string }) {
  const [pressed, setPressed] = useState(false)
  const [hovered, setHovered] = useState(false)

  const handle = () => {
    if (pressed) return
    setPressed(true)
    setTimeout(() => onLogin(), 350)
  }

  return (
    <div style={loginStyles.root}>
      <div style={loginStyles.grid} />
      <div style={loginStyles.vignette} />

      <div style={loginStyles.topbar}>
        <RepoXMark size={20} />
        <div style={loginStyles.topbarRight}>
          <a style={loginStyles.topLink} href="#">Docs</a>
          <a style={loginStyles.topLink} href="#">Changelog</a>
          <a style={loginStyles.topLink} href="#">
            Status
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: 6, background: 'var(--accent)', marginLeft: 8, transform: 'translateY(-1px)' }} />
          </a>
        </div>
      </div>

      <div style={loginStyles.center}>
        <div style={loginStyles.eyebrowRow}>
          <span style={loginStyles.eyebrowDot} />
          <span style={loginStyles.eyebrow}>PHASE 1 · PUBLIC PREVIEW</span>
        </div>

        <h1 style={loginStyles.h1}>
          Repository intelligence,<br />
          <span style={loginStyles.h1Accent}>without the noise.</span>
        </h1>

        <p style={loginStyles.sub}>
          repoX connects to your GitHub, indexes what matters, and gives you a clean read on every repo you own — architecture, activity, debt, risk. One signal, no dashboards.
        </p>

        {error && (
          <p style={{ color: 'var(--warn)', fontSize: 13, marginTop: 16, fontFamily: "'JetBrains Mono', monospace" }}>
            {error}
          </p>
        )}

        <div style={loginStyles.actions}>
          <button
            onClick={handle}
            style={{ ...loginStyles.cta, ...(pressed ? loginStyles.ctaPressed : {}), background: hovered ? '#0f0f14' : '#08080c' }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <IconGitHub size={18} />
            <span>Continue with GitHub</span>
            <span style={loginStyles.ctaKbd}><IconArrowUpRight size={14} /></span>
          </button>
          <button style={loginStyles.secondary}>
            <IconBook size={14} /> <span>Read the docs</span>
          </button>
        </div>

        <div style={loginStyles.trust}>
          <div style={loginStyles.trustItem}><IconShield size={14} /> <span>Read-only scopes</span></div>
          <div style={loginStyles.trustItem}><IconLock size={14} /> <span>Tokens never persisted to disk</span></div>
          <div style={loginStyles.trustItem}><IconCheck size={14} /> <span>Revoke anytime in GitHub settings</span></div>
        </div>
      </div>

      <div style={loginStyles.footer}>
        <span style={loginStyles.footMuted}>v0.1.0 · phase 1</span>
        <span style={loginStyles.footDiv}>·</span>
        <span style={loginStyles.footMuted}>localhost:8000</span>
        <span style={loginStyles.footDiv}>·</span>
        <a style={loginStyles.footLink} href="#">Privacy</a>
        <a style={loginStyles.footLink} href="#">Terms</a>
      </div>
    </div>
  )
}

// ─── Handshake styles ────────────────────────────────────────

const hsStyles: Record<string, CSSProperties> = {
  root: {
    position: 'relative', width: '100%', height: '100%',
    background: 'var(--bg)', color: 'var(--fg)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  grid: {
    position: 'absolute', inset: 0,
    backgroundImage:
      'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
    backgroundSize: '56px 56px',
    maskImage: 'radial-gradient(circle at 50% 50%, black 0%, transparent 70%)',
    WebkitMaskImage: 'radial-gradient(circle at 50% 50%, black 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  center: {
    position: 'relative', zIndex: 2,
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 36,
  },
  handshakeRow: { display: 'flex', alignItems: 'center', gap: 16 },
  brandBox: {
    width: 76, height: 76, borderRadius: 14,
    border: '1px solid var(--line-2)', background: 'var(--bg-1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  },
  flow: { position: 'relative', width: 90, height: 1, overflow: 'hidden' },
  flowLine: { position: 'absolute', inset: 0, background: 'var(--line-2)' },
  flowPulse: {
    position: 'absolute', top: -1, left: 0, width: '40%', height: 3,
    background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
    filter: 'blur(0.5px)',
  },
  titleRow: { display: 'flex', alignItems: 'center', gap: 12 },
  spinner: {
    width: 14, height: 14, borderRadius: 999,
    border: '1.5px solid var(--line-2)', borderTopColor: 'var(--accent)',
    animation: 'hsSpin 0.9s linear infinite', display: 'inline-block',
  },
  title: { fontSize: 14, color: 'var(--fg-2)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.02em' },
  terminal: {
    width: 600, maxWidth: 'calc(100vw - 64px)',
    border: '1px solid var(--line)', borderRadius: 10,
    background: 'var(--bg-1)', overflow: 'hidden',
    boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
  },
  terminalHeader: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 14px', borderBottom: '1px solid var(--line)',
    background: 'var(--bg-2)',
  },
  terminalDots: { display: 'inline-flex', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 10, display: 'inline-block' },
  terminalTitle: { fontSize: 11, color: 'var(--fg-3)', fontFamily: "'JetBrains Mono', monospace", flex: 1, textAlign: 'center' },
  terminalMeta: { fontSize: 11, color: 'var(--fg-4)', fontFamily: "'JetBrains Mono', monospace" },
  terminalBody: { padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5 },
  line: { display: 'flex', alignItems: 'center', gap: 10, transition: 'color .2s, opacity .2s' },
  bullet: { color: 'var(--fg-4)' },
  lineText: { flex: 1 },
  lineMs: { color: 'var(--fg-4)', fontSize: 11 },
  miniSpinner: {
    width: 10, height: 10, borderRadius: 999,
    border: '1.5px solid var(--line-2)', borderTopColor: 'var(--accent)',
    animation: 'hsSpin 0.8s linear infinite', display: 'inline-block',
  },
}

// ─── Handshake Screen ────────────────────────────────────────

function HandshakeScreen({ onDone }: { onDone: () => void }) {
  const steps = [
    'Opening github.com/login/oauth/authorize…',
    'Awaiting consent from GitHub…',
    'Receiving authorization code…',
    'POST /auth/github/callback?code=...',
    'Exchanging code for access_token…',
    'GET /user · GET /user/repos?per_page=100',
    'Hydrating workspace…',
  ]
  const [active, setActive] = useState(0)
  const doneFired = useRef(false)

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    steps.forEach((_, i) => {
      timers.push(setTimeout(() => setActive(i + 1), 180 + i * 230))
    })
    timers.push(
      setTimeout(() => {
        if (!doneFired.current) {
          doneFired.current = true
          onDone()
        }
      }, 180 + steps.length * 230 + 400),
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div style={hsStyles.root}>
      <div style={hsStyles.grid} />
      <div style={hsStyles.center}>
        <div style={hsStyles.handshakeRow}>
          <div style={hsStyles.brandBox}><IconGitHub size={28} /></div>
          <div style={hsStyles.flow}>
            <div style={hsStyles.flowLine} />
            <div style={{ ...hsStyles.flowPulse, animation: 'hsPulse 1.4s linear infinite' }} />
          </div>
          <div style={hsStyles.brandBox}><RepoXMark size={20} /></div>
        </div>

        <div style={hsStyles.titleRow}>
          <span style={hsStyles.spinner} />
          <span style={hsStyles.title}>Authorizing with GitHub</span>
        </div>

        <div style={hsStyles.terminal}>
          <div style={hsStyles.terminalHeader}>
            <div style={hsStyles.terminalDots}>
              <span style={{ ...hsStyles.dot, background: '#3a3a44' }} />
              <span style={{ ...hsStyles.dot, background: '#3a3a44' }} />
              <span style={{ ...hsStyles.dot, background: '#3a3a44' }} />
            </div>
            <span style={hsStyles.terminalTitle}>oauth · handshake</span>
            <span style={hsStyles.terminalMeta}>localhost:8000</span>
          </div>
          <div style={hsStyles.terminalBody}>
            {steps.map((s, i) => {
              const done = i < active
              const current = i === active
              const pending = i > active
              return (
                <div key={i} style={{ ...hsStyles.line, opacity: pending ? 0.3 : 1, color: done ? 'var(--fg-2)' : current ? 'var(--fg)' : 'var(--fg-4)' }}>
                  <span style={{ width: 14, display: 'inline-flex', justifyContent: 'center', color: done || current ? 'var(--accent)' : 'var(--fg-4)' }}>
                    {done ? <IconCheck size={12} sw={2.2} /> : current ? <span style={hsStyles.miniSpinner} /> : <span style={hsStyles.bullet}>›</span>}
                  </span>
                  <span style={hsStyles.lineText}>{s}</span>
                  {done && <span style={hsStyles.lineMs}>{180 + i * 7}ms</span>}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes hsPulse { 0%{transform:translateX(-100%);opacity:0} 15%{opacity:1} 85%{opacity:1} 100%{transform:translateX(100%);opacity:0} }
        @keyframes hsSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

// ─── Dashboard styles ────────────────────────────────────────

const dStyles: Record<string, CSSProperties> = {
  root: { display: 'flex', width: '100%', height: '100%', background: 'var(--bg)' },
  sidebar: {
    width: 248, flexShrink: 0,
    borderRight: '1px solid var(--line-soft)', background: 'var(--bg)',
    display: 'flex', flexDirection: 'column', padding: '18px 12px 14px', overflow: 'hidden',
  },
  brand: {
    display: 'flex', flexDirection: 'column', gap: 14,
    padding: '0 8px 16px', borderBottom: '1px solid var(--line-soft)', marginBottom: 16,
  },
  workspaceSel: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 8px', background: 'var(--bg-1)',
    border: '1px solid var(--line)', borderRadius: 6,
    color: 'var(--fg-2)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
  },
  avatar: {
    width: 18, height: 18, borderRadius: 4, background: 'var(--accent)',
    color: '#070707', fontWeight: 700, fontSize: 11,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'JetBrains Mono', monospace",
  },
  workspaceName: { flex: 1, textAlign: 'left' },
  navWrap: { display: 'flex', flexDirection: 'column', gap: 18, flex: 1, overflowY: 'auto' },
  navSection: {
    padding: '0 8px 6px', fontSize: 10, letterSpacing: '0.14em',
    color: 'var(--fg-4)', fontFamily: "'JetBrains Mono', monospace", marginTop: 4,
  },
  navItem: {
    position: 'relative', display: 'flex', alignItems: 'center', gap: 10,
    padding: '7px 10px', background: 'transparent', border: 'none',
    color: 'var(--fg-2)', fontSize: 13, fontWeight: 450,
    borderRadius: 6, cursor: 'pointer', textAlign: 'left', width: '100%',
  },
  navItemActive: { background: 'var(--bg-2)', color: 'var(--fg)' },
  activeBar: {
    position: 'absolute', left: -12, top: 8, bottom: 8, width: 2,
    background: 'var(--accent)', boxShadow: '0 0 8px var(--accent-glow)', borderRadius: 2,
  },
  navCount: {
    fontSize: 11, color: 'var(--fg-4)', fontFamily: "'JetBrains Mono', monospace",
    background: 'var(--bg-2)', padding: '1px 6px', borderRadius: 4,
  },
  soonTag: {
    fontSize: 9, letterSpacing: '0.12em', color: 'var(--fg-4)',
    fontFamily: "'JetBrains Mono', monospace",
    border: '1px solid var(--line)', padding: '1px 5px', borderRadius: 3,
  },
  sidebarFoot: { display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 12, borderTop: '1px solid var(--line-soft)' },
  phaseCard: {
    border: '1px solid var(--line)', borderRadius: 8, background: 'var(--bg-1)',
    padding: 12, display: 'flex', flexDirection: 'column', gap: 8,
  },
  phaseHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  phaseLabel: { fontSize: 10, letterSpacing: '0.14em', color: 'var(--fg-3)', fontFamily: "'JetBrains Mono', monospace" },
  phasePct: { fontSize: 11, color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace" },
  phaseBar: { height: 3, background: 'var(--bg-3)', borderRadius: 2, overflow: 'hidden' },
  phaseBarFill: { height: '100%', background: 'var(--accent)', boxShadow: '0 0 8px var(--accent-glow)' },
  phaseList: { display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 },
  phaseRow: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--fg-2)', fontFamily: "'JetBrains Mono', monospace" },
  phaseDot: { width: 8, height: 8, border: '1px solid var(--line-2)', borderRadius: 999, display: 'inline-block' },
  logoutBtn: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 10px', background: 'transparent', border: 'none',
    color: 'var(--fg-3)', fontSize: 12, cursor: 'pointer', borderRadius: 6,
    textAlign: 'left', width: '100%',
  },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  topbar: {
    display: 'flex', alignItems: 'center', gap: 16,
    padding: '12px 24px', borderBottom: '1px solid var(--line-soft)', flexShrink: 0,
  },
  crumbs: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 },
  crumb: { color: 'var(--fg-3)' },
  searchBox: {
    flex: 1, maxWidth: 480, display: 'flex', alignItems: 'center', gap: 10,
    padding: '7px 12px', background: 'var(--bg-1)',
    border: '1px solid var(--line)', borderRadius: 6, margin: '0 auto',
  },
  searchInput: { flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--fg)', fontSize: 13, fontFamily: 'inherit' },
  kbd: {
    fontSize: 10, color: 'var(--fg-4)', fontFamily: "'JetBrains Mono', monospace",
    border: '1px solid var(--line)', padding: '1px 5px', borderRadius: 3,
  },
  topActions: { display: 'flex', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 30, height: 30, borderRadius: 6, background: 'transparent',
    border: '1px solid transparent', color: 'var(--fg-3)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  },
  userPill: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: 2, borderRadius: 999, background: 'var(--bg-1)', border: '1px solid var(--line)',
  },
  avatarSm: {
    width: 26, height: 26, borderRadius: 999, background: 'var(--accent)',
    color: '#070707', fontWeight: 700, fontSize: 12,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'JetBrains Mono', monospace",
  },
  page: { flex: 1, overflowY: 'auto', padding: '28px 32px 40px' },
  pageHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 },
  pageTitle: { margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em' },
  pageSub: { marginTop: 8, color: 'var(--fg-3)', fontSize: 13, display: 'flex', gap: 16 },
  pageActions: { display: 'flex', gap: 8 },
  toolbar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16, padding: '10px 0', borderBottom: '1px solid var(--line-soft)',
  },
  chipRow: { display: 'flex', gap: 4 },
  chip: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '6px 12px', background: 'transparent', color: 'var(--fg-3)',
    border: '1px solid transparent', borderRadius: 6, fontSize: 13, fontWeight: 450,
    cursor: 'pointer', transition: 'all .12s ease',
  },
  chipActive: { background: 'var(--bg-2)', color: 'var(--fg)', border: '1px solid var(--line)' },
  chipCount: { fontSize: 11, color: 'var(--fg-4)', fontFamily: "'JetBrains Mono', monospace", padding: '0 4px' },
  chipCountActive: { color: 'var(--fg-2)' },
  toolRight: { display: 'flex', gap: 8, alignItems: 'center' },
  localSearch: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 10px', background: 'var(--bg-1)',
    border: '1px solid var(--line)', borderRadius: 6, width: 220,
  },
  localSearchInput: { flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--fg)', fontSize: 13, fontFamily: 'inherit' },
  sortBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '6px 10px', background: 'var(--bg-1)',
    border: '1px solid var(--line)', color: 'var(--fg-2)', borderRadius: 6, fontSize: 13, cursor: 'pointer',
  },
  repoList: {
    display: 'flex', flexDirection: 'column',
    border: '1px solid var(--line-soft)', borderRadius: 10, overflow: 'hidden', background: 'var(--bg-1)',
  },
  repoRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24,
    padding: '18px 20px', borderBottom: '1px solid var(--line-soft)',
    cursor: 'pointer', transition: 'background .12s ease', background: 'var(--bg-1)',
  },
  repoRowSelected: { background: 'var(--bg-2)' },
  repoRowMain: { flex: 1, minWidth: 0 },
  repoNameLine: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  repoOwner: { color: 'var(--fg-3)', fontSize: 14.5, fontFamily: "'JetBrains Mono', monospace" },
  repoName: { color: 'var(--fg)', fontSize: 14.5, fontWeight: 500, fontFamily: "'JetBrains Mono', monospace" },
  visBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: 10.5, letterSpacing: '0.06em', fontFamily: "'JetBrains Mono', monospace",
    border: '1px solid var(--line)', padding: '2px 6px', borderRadius: 3,
    color: 'var(--fg-3)', marginLeft: 4,
  },
  topicTag: {
    fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
    color: 'var(--fg-3)', background: 'var(--bg-2)', padding: '2px 7px', borderRadius: 3,
  },
  repoDesc: { color: 'var(--fg-3)', fontSize: 13, marginTop: 8, lineHeight: 1.45, maxWidth: 720 },
  repoMeta: { display: 'flex', gap: 18, color: 'var(--fg-3)', fontSize: 12, marginTop: 12, fontFamily: "'JetBrains Mono', monospace" },
  metaItem: { display: 'inline-flex', alignItems: 'center', gap: 6 },
  repoRowRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 14, flexShrink: 0 },
  repoActions: { display: 'flex', gap: 6 },
  ghostBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '6px 10px', background: 'transparent',
    border: '1px solid var(--line)', color: 'var(--fg-2)', borderRadius: 6, fontSize: 12.5, cursor: 'pointer',
  },
  primaryBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '6px 12px', background: 'var(--fg)',
    border: '1px solid var(--fg)', color: '#0a0a0e',
    borderRadius: 6, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
  },
  empty: {
    padding: '60px 20px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  },
  emptyIcon: {
    width: 44, height: 44, borderRadius: 999, border: '1px solid var(--line)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-3)',
  },
  footnote: {
    marginTop: 14, display: 'flex', gap: 14, alignItems: 'center',
    fontSize: 11, color: 'var(--fg-4)', fontFamily: "'JetBrains Mono', monospace",
  },
  flyoutBackdrop: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(2px)', zIndex: 30, display: 'flex', justifyContent: 'flex-end',
  },
  flyout: {
    width: 'min(640px, 92vw)', height: '100%', background: 'var(--bg)',
    borderLeft: '1px solid var(--line)', display: 'flex', flexDirection: 'column',
    boxShadow: '-40px 0 80px rgba(0,0,0,0.5)', animation: 'flyIn .25s ease',
  },
  flyoutHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
    padding: '14px 18px', borderBottom: '1px solid var(--line)', flexShrink: 0,
  },
  flyoutBody: { flex: 1, overflowY: 'auto', padding: '18px 22px 40px' },
  statsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 1, background: 'var(--line-soft)',
    border: '1px solid var(--line-soft)', borderRadius: 8, overflow: 'hidden', marginBottom: 24,
  },
  stat: { padding: '14px 16px', background: 'var(--bg-1)', display: 'flex', flexDirection: 'column', gap: 6 },
  statLabel: { fontSize: 10, letterSpacing: '0.12em', color: 'var(--fg-4)', fontFamily: "'JetBrains Mono', monospace", display: 'inline-flex', alignItems: 'center', gap: 6 },
  statValue: { fontSize: 18, color: 'var(--fg)', fontWeight: 500 },
  section: { padding: '16px 0', borderTop: '1px solid var(--line-soft)' },
  sectionHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  sectionTitle: { fontSize: 10, letterSpacing: '0.14em', color: 'var(--fg-3)', fontFamily: "'JetBrains Mono', monospace" },
  sectionHint: { fontSize: 11, color: 'var(--fg-4)', fontFamily: "'JetBrains Mono', monospace" },
  descText: { color: 'var(--fg-2)', fontSize: 14, lineHeight: 1.55, margin: 0 },
  langBar: { display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', background: 'var(--bg-2)' },
  langLegend: { display: 'flex', gap: 16, marginTop: 10, color: 'var(--fg-3)', fontSize: 12, fontFamily: "'JetBrains Mono', monospace" },
  legendDot: { display: 'inline-block', width: 8, height: 8, borderRadius: 8, marginRight: 6, transform: 'translateY(1px)' },
  actChart: { display: 'flex', gap: 4, height: 80, alignItems: 'flex-end' },
  actBar: { flex: 1, borderRadius: 2 },
  readout: { border: '1px solid var(--line-soft)', borderRadius: 8, background: 'var(--bg-1)', overflow: 'hidden' },
  readoutRow: {
    display: 'flex', justifyContent: 'space-between', padding: '10px 14px',
    borderBottom: '1px solid var(--line-soft)',
    fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5,
  },
  readoutKey: { color: 'var(--fg-3)' },
  readoutVal: { color: 'var(--fg)', display: 'inline-flex', alignItems: 'center', gap: 8 },
}

// ─── Sparkline ───────────────────────────────────────────────

function Sparkline({ data, width = 80, height = 22, color = 'var(--fg-3)' }: { data: number[]; width?: number; height?: number; color?: string }) {
  const max = Math.max(...data, 1)
  const step = width / (data.length - 1)
  const points = data.map((v, i) => `${i * step},${height - (v / max) * (height - 2) - 1}`).join(' ')
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline fill="none" stroke={color} strokeWidth="1.2" points={points} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

// ─── Chip ────────────────────────────────────────────────────

function Chip({ active, onClick, children, count }: { active: boolean; onClick: () => void; children: ReactNode; count?: number }) {
  return (
    <button onClick={onClick} style={{ ...dStyles.chip, ...(active ? dStyles.chipActive : {}) }}>
      <span>{children}</span>
      {typeof count === 'number' && <span style={{ ...dStyles.chipCount, ...(active ? dStyles.chipCountActive : {}) }}>{count}</span>}
    </button>
  )
}

// ─── Stat & Section ──────────────────────────────────────────

function Stat({ label, value, icon, mono }: { label: string; value: string | number; icon?: ReactNode; mono?: boolean }) {
  return (
    <div style={dStyles.stat}>
      <div style={dStyles.statLabel}>{icon} {label}</div>
      <div style={{ ...dStyles.statValue, fontFamily: mono ? "'JetBrains Mono', monospace" : undefined }}>{value}</div>
    </div>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div style={dStyles.section}>
      <div style={dStyles.sectionHead}>
        <span style={dStyles.sectionTitle}>{title}</span>
        {hint && <span style={dStyles.sectionHint}>{hint}</span>}
      </div>
      <div>{children}</div>
    </div>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────

type NavItem = { id: string; icon: (p: IconProps) => ReactNode; label: string; count?: number; soon?: boolean }
type NavSection = { label: string | null; items: NavItem[] }

function Sidebar({ repoCount, handle, avatar, onLogout }: { repoCount: number; handle: string; avatar: string; onLogout: () => void }) {
  const sections: NavSection[] = [
    {
      label: null,
      items: [
        { id: 'repos', icon: IconRepo, label: 'Repositories', count: repoCount },
        { id: 'overview', icon: IconGraph, label: 'Overview' },
        { id: 'activity', icon: IconBolt, label: 'Activity' },
      ],
    },
    {
      label: 'INTELLIGENCE',
      items: [
        { id: 'insights', icon: IconBrain, label: 'Insights', soon: true },
        { id: 'scans', icon: IconShield, label: 'Scans', soon: true },
        { id: 'agents', icon: IconSparkle, label: 'Agents', soon: true },
      ],
    },
    {
      label: 'WORKSPACE',
      items: [
        { id: 'integrations', icon: IconGit, label: 'Integrations' },
        { id: 'tokens', icon: IconKey, label: 'Tokens' },
        { id: 'settings', icon: IconSettings, label: 'Settings' },
      ],
    },
  ]

  return (
    <aside style={dStyles.sidebar}>
      <div style={dStyles.brand}>
        <RepoXMark size={20} />
        <button style={dStyles.workspaceSel}>
          <span style={dStyles.avatar}>{avatar}</span>
          <span style={dStyles.workspaceName}>{handle}</span>
          <IconChevDown size={12} style={{ color: 'var(--fg-3)' }} />
        </button>
      </div>

      <div style={dStyles.navWrap}>
        {sections.map((sec, si) => (
          <div key={si} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {sec.label && <div style={dStyles.navSection}>{sec.label}</div>}
            {sec.items.map((it) => {
              const isActive = it.id === 'repos'
              const NavIcon = it.icon
              return (
                <button
                  key={it.id}
                  style={{
                    ...dStyles.navItem,
                    ...(isActive ? dStyles.navItemActive : {}),
                    opacity: it.soon ? 0.6 : 1,
                    cursor: it.soon ? 'default' : 'pointer',
                  }}
                >
                  {isActive && <span style={dStyles.activeBar} />}
                  <NavIcon size={15} />
                  <span style={{ flex: 1, textAlign: 'left' }}>{it.label}</span>
                  {typeof it.count === 'number' && <span style={dStyles.navCount}>{it.count}</span>}
                  {it.soon && <span style={dStyles.soonTag}>SOON</span>}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <div style={dStyles.sidebarFoot}>
        <div style={dStyles.phaseCard}>
          <div style={dStyles.phaseHead}>
            <span style={dStyles.phaseLabel}>PHASE 1</span>
            <span style={dStyles.phasePct}>50%</span>
          </div>
          <div style={dStyles.phaseBar}>
            <div style={{ ...dStyles.phaseBarFill, width: '50%' }} />
          </div>
          <div style={dStyles.phaseList}>
            <div style={dStyles.phaseRow}><IconCheck size={11} sw={2.4} style={{ color: 'var(--accent)' }} /><span>OAuth</span></div>
            <div style={dStyles.phaseRow}><IconCheck size={11} sw={2.4} style={{ color: 'var(--accent)' }} /><span>Repos sync</span></div>
            <div style={dStyles.phaseRow}><span style={dStyles.phaseDot} /><span style={{ color: 'var(--fg-3)' }}>Insights engine</span></div>
            <div style={dStyles.phaseRow}><span style={dStyles.phaseDot} /><span style={{ color: 'var(--fg-3)' }}>Agent runtime</span></div>
          </div>
        </div>
        <button style={dStyles.logoutBtn} onClick={onLogout}>
          <IconLogout size={14} /> <span>Sign out</span>
        </button>
      </div>
    </aside>
  )
}

// ─── Topbar ──────────────────────────────────────────────────

function Topbar({ handle, avatar }: { handle: string; avatar: string }) {
  return (
    <div style={dStyles.topbar}>
      <div style={dStyles.crumbs}>
        <span style={dStyles.crumb}>{handle}</span>
        <IconChevRight size={12} style={{ color: 'var(--fg-4)' }} />
        <span style={{ ...dStyles.crumb, color: 'var(--fg)' }}>Repositories</span>
      </div>
      <div style={dStyles.searchBox}>
        <IconSearch size={14} style={{ color: 'var(--fg-4)' }} />
        <input placeholder="Search repos, commits, files…" style={dStyles.searchInput} readOnly />
        <span style={dStyles.kbd}>⌘K</span>
      </div>
      <div style={dStyles.topActions}>
        <button style={dStyles.iconBtn}><IconBell size={15} /></button>
        <button style={dStyles.iconBtn}><IconCommand size={15} /></button>
        <div style={dStyles.userPill}>
          <span style={dStyles.avatarSm}>{avatar}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Repo Row ────────────────────────────────────────────────

function RepoRow({ repo, onOpen, selected }: { repo: Repo; onOpen: () => void; selected: boolean }) {
  const [owner, name] = repo.full_name.split('/')
  const langColor = LANG_COLOR[repo.language ?? ''] ?? 'var(--fg-3)'
  const activity = pseudoActivity(repo.id)

  return (
    <div onClick={onOpen} style={{ ...dStyles.repoRow, ...(selected ? dStyles.repoRowSelected : {}) }}>
      <div style={dStyles.repoRowMain}>
        <div style={dStyles.repoNameLine}>
          <span style={dStyles.repoOwner}>{owner}<span style={{ color: 'var(--fg-4)' }}>/</span></span>
          <span style={dStyles.repoName}>{name}</span>
          <span style={dStyles.visBadge}>
            {repo.private ? <><IconLock size={10} /> private</> : <>public</>}
          </span>
          {(repo.topics ?? []).slice(0, 2).map(t => (
            <span key={t} style={dStyles.topicTag}>{t}</span>
          ))}
        </div>
        <div style={dStyles.repoDesc}>{repo.description ?? 'No description provided.'}</div>
        <div style={dStyles.repoMeta}>
          {repo.language && (
            <span style={dStyles.metaItem}>
              <span style={{ width: 8, height: 8, borderRadius: 8, background: langColor, display: 'inline-block' }} />
              {repo.language}
            </span>
          )}
          <span style={dStyles.metaItem}><IconStar size={12} /> {repo.stargazers_count.toLocaleString()}</span>
          <span style={dStyles.metaItem}><IconFork size={12} /> {repo.forks_count}</span>
          <span style={dStyles.metaItem}><IconCircleDot size={12} /> {repo.open_issues_count} open</span>
          <span style={dStyles.metaItem}><IconClock size={12} /> updated {timeAgo(repo.updated_at)} ago</span>
        </div>
      </div>
      <div style={dStyles.repoRowRight}>
        <Sparkline data={activity} color="var(--fg-3)" />
        <div style={dStyles.repoActions}>
          <a
            href={repo.html_url}
            target="_blank"
            rel="noreferrer"
            style={{ ...dStyles.ghostBtn, textDecoration: 'none' }}
            onClick={(e) => e.stopPropagation()}
          >
            <IconArrowUpRight size={13} />
          </a>
          <button
            style={dStyles.primaryBtn}
            onClick={(e) => { e.stopPropagation(); onOpen() }}
          >
            Analyze
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Repo Flyout ─────────────────────────────────────────────

type ScanState = 'idle' | 'scanning' | 'done' | 'error'

function RepoFlyout({
  repo, onClose, scanState, scanResult, scanError, onAnalyze,
}: {
  repo: Repo
  onClose: () => void
  scanState: ScanState
  scanResult: ScanResult | null
  scanError: string
  onAnalyze: () => void
}) {
  const [owner, name] = repo.full_name.split('/')
  const langColor = LANG_COLOR[repo.language ?? ''] ?? 'var(--fg-3)'
  const activity = pseudoActivity(repo.id)
  const [summary, setSummary] = useState('')
  const [architecture, setArchitecture] = useState('')
  const [readmeAnalysis, setReadmeAnalysis] = useState('')
  const [readmeScores, setReadmeScores] = useState<{ readme: number; readability: number; completeness: number } | null>(null)
  const [insights, setInsights] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [question, setQuestion] = useState('')
  const [askLoading, setAskLoading] = useState(false)
  const [chat, setChat] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])

  const readoutEntries = scanResult ? [
    { key: 'Frontend', val: scanResult.frontend_framework || '—' },
    { key: 'Backend', val: scanResult.backend_framework || '—' },
    { key: 'Languages', val: scanResult.languages.join(', ') || '—' },
    { key: 'Pkg managers', val: scanResult.package_managers.join(', ') || '—' },
    { key: 'Docker', val: scanResult.docker ? 'Yes' : 'No' },
    { key: 'GitHub Actions', val: scanResult.github_actions ? 'Yes' : 'No' },
    { key: 'README', val: scanResult.documentation.readme ? 'Present' : 'Missing' },
    {
      key: 'Structure',
      val: Object.entries(scanResult.structure).filter(([, v]) => v).map(([k]) => k).join(', ') || '—',
    },
  ] : []

  const hintMap: Record<ScanState, string> = {
    idle: 'Click "Run analysis" to scan',
    scanning: 'Scanning…',
    done: 'Scan complete',
    error: scanError,
  }

  useEffect(() => {
    setSummary('')
    setArchitecture('')
    setReadmeAnalysis('')
    setReadmeScores(null)
    setInsights('')
    setAiLoading(false)
    setAiError('')
    setQuestion('')
    setAskLoading(false)
    setChat([])
  }, [repo.id])

  useEffect(() => {
    async function loadAI() {
      if (scanState !== 'done' || !scanResult) return
      setAiLoading(true)
      setAiError('')
      try {
        const payload = { repo_name: repo.full_name, clone_url: repo.clone_url, scan_result: scanResult }
        const [s, a, r, i] = await Promise.all([
          summarizeRepository(payload),
          analyzeArchitecture(payload),
          analyzeReadme(payload),
          generateInsights(payload),
        ])
        setSummary(s.summary)
        setArchitecture(a.architecture)
        setReadmeAnalysis(r.analysis)
        setReadmeScores({
          readme: r.scores.readme_score,
          readability: r.scores.readability_score,
          completeness: r.scores.completeness_score,
        })
        setInsights(i.insights)
      } catch (err) {
        setAiError(err instanceof Error ? err.message : 'AI analysis failed')
      } finally {
        setAiLoading(false)
      }
    }
    void loadAI()
  }, [scanState, scanResult, repo.full_name, repo.clone_url])

  async function handleAskRepo() {
    if (!question.trim()) return
    const q = question.trim()
    setQuestion('')
    setChat((prev) => [...prev, { role: 'user', content: q }])
    setAskLoading(true)
    try {
      const response = await askRepository({
        repo_name: repo.full_name,
        clone_url: repo.clone_url,
        scan_result: scanResult ?? undefined,
        question: q,
      })
      setChat((prev) => [...prev, { role: 'assistant', content: response.answer }])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ask repo failed'
      setChat((prev) => [...prev, { role: 'assistant', content: message }])
    } finally {
      setAskLoading(false)
    }
  }

  return (
    <div style={dStyles.flyoutBackdrop} onClick={onClose}>
      <div style={dStyles.flyout} onClick={(e) => e.stopPropagation()}>
        <div style={dStyles.flyoutHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button style={dStyles.iconBtn} onClick={onClose}><IconChevLeft size={15} /></button>
            <div style={dStyles.repoNameLine}>
              <span style={dStyles.repoOwner}>{owner}<span style={{ color: 'var(--fg-4)' }}>/</span></span>
              <span style={{ ...dStyles.repoName, fontSize: 17 }}>{name}</span>
              <span style={dStyles.visBadge}>
                {repo.private ? <><IconLock size={10} /> private</> : <>public</>}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href={repo.html_url} target="_blank" rel="noreferrer" style={{ ...dStyles.ghostBtn, textDecoration: 'none' }}>
              View on GitHub <IconArrowUpRight size={12} />
            </a>
            <button
              style={{ ...dStyles.primaryBtn, opacity: scanState === 'scanning' ? 0.6 : 1 }}
              onClick={onAnalyze}
              disabled={scanState === 'scanning'}
            >
              <IconBolt size={12} />
              {scanState === 'scanning' ? 'Analyzing…' : 'Run analysis'}
            </button>
          </div>
        </div>

        <div style={dStyles.flyoutBody}>
          <div style={dStyles.statsGrid}>
            <Stat label="STARS" value={repo.stargazers_count.toLocaleString()} icon={<IconStar size={12} />} />
            <Stat label="FORKS" value={repo.forks_count} icon={<IconFork size={12} />} />
            <Stat label="WATCHERS" value={repo.watchers_count} icon={<IconEye size={12} />} />
            <Stat label="OPEN ISSUES" value={repo.open_issues_count} icon={<IconCircleDot size={12} />} />
            <Stat label="SIZE" value={repo.size ? `${(repo.size / 1024).toFixed(1)} MB` : '—'} icon={<IconBook size={12} />} />
            <Stat label="BRANCH" value={repo.default_branch ?? 'main'} icon={<IconGit size={12} />} mono />
          </div>

          <Section title="DESCRIPTION">
            <p style={dStyles.descText}>{repo.description ?? 'No description provided.'}</p>
            {(repo.topics ?? []).length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                {(repo.topics ?? []).map(t => <span key={t} style={dStyles.topicTag}>{t}</span>)}
              </div>
            )}
          </Section>

          {repo.language && (
            <Section title="LANGUAGE COMPOSITION">
              <div style={dStyles.langBar}>
                <span style={{ background: langColor, width: '72%', display: 'block' }} />
                <span style={{ background: '#3a3a44', width: '18%', display: 'block' }} />
                <span style={{ background: '#2a2a32', width: '10%', display: 'block' }} />
              </div>
              <div style={dStyles.langLegend}>
                <span>
                  <span style={{ ...dStyles.legendDot, background: langColor }} />
                  {repo.language} 72%
                </span>
                <span>
                  <span style={{ ...dStyles.legendDot, background: '#3a3a44' }} />
                  Other 28%
                </span>
              </div>
            </Section>
          )}

          <Section title="COMMIT ACTIVITY · 16 WEEKS">
            <div style={dStyles.actChart}>
              {activity.map((v, i) => (
                <div
                  key={i}
                  style={{
                    ...dStyles.actBar,
                    height: `${Math.max(4, (v / Math.max(...activity)) * 100)}%`,
                    background: i === activity.length - 1 ? 'var(--accent)' : 'var(--line-2)',
                  }}
                />
              ))}
            </div>
          </Section>

          <Section title="repoX READOUT" hint={hintMap[scanState]}>
            <div style={dStyles.readout}>
              {scanState === 'idle' && (
                <div style={{ ...dStyles.readoutRow, color: 'var(--fg-4)', justifyContent: 'center', padding: '20px 14px' }}>
                  Run an analysis to see architecture insights.
                </div>
              )}
              {scanState === 'scanning' && (
                <div style={{ ...dStyles.readoutRow, justifyContent: 'center', gap: 10, padding: '20px 14px' }}>
                  <span style={hsStyles.miniSpinner} />
                  <span style={{ color: 'var(--fg-3)', fontSize: 12.5, fontFamily: "'JetBrains Mono', monospace" }}>
                    Cloning and analyzing repository…
                  </span>
                </div>
              )}
              {scanState === 'error' && (
                <div style={{ ...dStyles.readoutRow, color: 'var(--warn)', padding: '16px 14px' }}>
                  {scanError}
                </div>
              )}
              {scanState === 'done' && readoutEntries.map(({ key, val }) => (
                <div key={key} style={dStyles.readoutRow}>
                  <span style={dStyles.readoutKey}>{key}</span>
                  <span style={dStyles.readoutVal}>{val}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="AI SUMMARY">
            <div style={dStyles.readout}>
              <div style={{ ...dStyles.readoutRow, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
                {aiLoading ? 'Generating summary...' : <MarkdownBlock text={summary || 'Run analysis to generate AI summary.'} />}
              </div>
            </div>
          </Section>

          <Section title="ARCHITECTURE OVERVIEW">
            <div style={dStyles.readout}>
              <div style={{ ...dStyles.readoutRow, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
                {aiLoading ? 'Analyzing architecture...' : <MarkdownBlock text={architecture || 'Architecture overview will appear here.'} />}
              </div>
            </div>
          </Section>

          <Section title="README ANALYSIS">
            <div style={dStyles.readout}>
              {readmeScores && (
                <div style={{ ...dStyles.readoutRow, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 8 }}>
                  <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', background: 'var(--bg-1)' }}>
                    <div style={{ color: 'var(--fg-4)', fontSize: 11 }}>README</div>
                    <div style={{ color: 'var(--fg)', fontSize: 16, fontWeight: 600 }}>{readmeScores.readme}</div>
                  </div>
                  <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', background: 'var(--bg-1)' }}>
                    <div style={{ color: 'var(--fg-4)', fontSize: 11 }}>READABILITY</div>
                    <div style={{ color: 'var(--fg)', fontSize: 16, fontWeight: 600 }}>{readmeScores.readability}</div>
                  </div>
                  <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', background: 'var(--bg-1)' }}>
                    <div style={{ color: 'var(--fg-4)', fontSize: 11 }}>COMPLETENESS</div>
                    <div style={{ color: 'var(--fg)', fontSize: 16, fontWeight: 600 }}>{readmeScores.completeness}</div>
                  </div>
                </div>
              )}
              <div style={{ ...dStyles.readoutRow, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
                {aiLoading ? 'Reviewing README...' : <MarkdownBlock text={readmeAnalysis || 'README quality analysis will appear here.'} />}
              </div>
            </div>
          </Section>

          <Section title="REPOSITORY INSIGHTS">
            <div style={dStyles.readout}>
              <div style={{ ...dStyles.readoutRow, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
                {aiLoading ? 'Generating insights...' : <MarkdownBlock text={insights || 'Repository strengths and risks will appear here.'} />}
              </div>
              {aiError && <div style={{ ...dStyles.readoutRow, color: 'var(--warn)' }}>{aiError}</div>}
            </div>
          </Section>

          <Section title="ASK REPO">
            <div style={{ border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden', background: 'var(--bg-1)' }}>
              <div style={{ maxHeight: 260, overflowY: 'auto', padding: 10, display: 'grid', gap: 8 }}>
                {chat.length === 0 && (
                  <div style={{ color: 'var(--fg-4)', fontSize: 12.5, fontFamily: "'JetBrains Mono', monospace" }}>
                    Ask: How authentication works? What backend framework is used? How APIs are structured?
                  </div>
                )}
                {chat.map((m, idx) => (
                  <div
                    key={idx}
                    style={{
                      fontSize: 12.5,
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid var(--line)',
                      background: m.role === 'user' ? 'var(--bg-2)' : '#0c0f14',
                      color: m.role === 'user' ? 'var(--fg-2)' : 'var(--fg)',
                    }}
                  >
                    <MarkdownBlock text={m.content} />
                  </div>
                ))}
                {askLoading && (
                  <div style={{ color: 'var(--fg-4)', fontSize: 12.5, fontFamily: "'JetBrains Mono', monospace" }}>
                    Thinking...
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, padding: 10, borderTop: '1px solid var(--line)' }}>
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleAskRepo()
                  }}
                  placeholder="Ask about this repository..."
                  style={{
                    flex: 1,
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                    color: 'var(--fg)',
                    borderRadius: 8,
                    padding: '8px 10px',
                    fontSize: 12.5,
                  }}
                />
                <button style={{ ...dStyles.primaryBtn, opacity: askLoading ? 0.6 : 1 }} onClick={() => void handleAskRepo()} disabled={askLoading}>
                  {askLoading ? 'Asking...' : 'Ask'}
                </button>
              </div>
            </div>
          </Section>

          <Section title="VISUALIZATION ENGINE">
            <Suspense fallback={<div style={{ color: 'var(--fg-4)', fontSize: 12 }}>Loading visualization engine...</div>}>
              <VisualizationPanel repoName={repo.full_name} cloneUrl={repo.clone_url} scanResult={scanResult} />
            </Suspense>
          </Section>
        </div>
      </div>

      <style>{`
        @keyframes flyIn { from { transform: translateX(20px); opacity: 0; } to { transform: none; opacity: 1; } }
        @keyframes hsSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

// ─── Dashboard ───────────────────────────────────────────────

function Dashboard({
  repos, handle, avatar, onLogout, onResync,
}: {
  repos: Repo[]
  handle: string
  avatar: string
  onLogout: () => void
  onResync: () => void
}) {
  const [filter, setFilter] = useState<'all' | 'public' | 'private' | 'sources'>('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Repo | null>(null)
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [scanError, setScanError] = useState('')

  useEffect(() => {
    setScanState('idle')
    setScanResult(null)
    setScanError('')
  }, [selected?.id])

  const counts = {
    all: repos.length,
    public: repos.filter(r => !r.private).length,
    private: repos.filter(r => r.private).length,
    sources: repos.filter(r => r.forks_count > 0).length,
  }

  const filtered = repos.filter(r => {
    if (filter === 'public' && r.private) return false
    if (filter === 'private' && !r.private) return false
    if (filter === 'sources' && !r.forks_count) return false
    if (query) {
      const q = query.toLowerCase()
      if (!r.name.toLowerCase().includes(q) && !(r.description ?? '').toLowerCase().includes(q)) return false
    }
    return true
  })

  async function handleAnalyze() {
    if (!selected || scanState === 'scanning') return
    setScanState('scanning')
    setScanError('')
    setScanResult(null)
    try {
      const run = await runScanner(selected.full_name, selected.clone_url)
      setScanResult(run.result)
      setScanState('done')
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Scan failed')
      setScanState('error')
    }
  }

  return (
    <div style={dStyles.root}>
      <Sidebar repoCount={repos.length} handle={handle} avatar={avatar} onLogout={onLogout} />

      <main style={dStyles.main}>
        <Topbar handle={handle} avatar={avatar} />

        <div style={dStyles.page}>
          <div style={dStyles.pageHead}>
            <div>
              <h1 style={dStyles.pageTitle}>Repositories</h1>
              <div style={dStyles.pageSub}>
                <span><IconDot color="var(--accent)" size={6} /> Synced just now · {repos.length} repositories</span>
              </div>
            </div>
            <div style={dStyles.pageActions}>
              <button style={dStyles.ghostBtn} onClick={onResync}><IconBolt size={13} /> Re-sync</button>
              <button style={dStyles.primaryBtn}><IconPlus size={13} /> Import repository</button>
            </div>
          </div>

          <div style={dStyles.toolbar}>
            <div style={dStyles.chipRow}>
              <Chip active={filter === 'all'} onClick={() => setFilter('all')} count={counts.all}>All</Chip>
              <Chip active={filter === 'public'} onClick={() => setFilter('public')} count={counts.public}>Public</Chip>
              <Chip active={filter === 'private'} onClick={() => setFilter('private')} count={counts.private}>Private</Chip>
              <Chip active={filter === 'sources'} onClick={() => setFilter('sources')} count={counts.sources}>Sources</Chip>
            </div>
            <div style={dStyles.toolRight}>
              <div style={dStyles.localSearch}>
                <IconSearch size={13} style={{ color: 'var(--fg-4)' }} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter list…"
                  style={dStyles.localSearchInput}
                />
              </div>
              <button style={dStyles.sortBtn}>
                <span style={{ color: 'var(--fg-4)', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>SORT</span>
                <span>Last updated</span>
                <IconChevDown size={11} />
              </button>
            </div>
          </div>

          <div style={dStyles.repoList}>
            {filtered.length === 0 ? (
              <div style={dStyles.empty}>
                <div style={dStyles.emptyIcon}><IconSearch size={20} /></div>
                <div style={{ color: 'var(--fg-2)', fontSize: 14, marginTop: 14 }}>
                  {query ? `No repositories match "${query}"` : 'No repositories found.'}
                </div>
                <div style={{ color: 'var(--fg-4)', fontSize: 12, marginTop: 4 }}>
                  {query ? 'Try a different keyword or clear the filter.' : 'Connect your GitHub account to see repositories.'}
                </div>
              </div>
            ) : filtered.map(r => (
              <RepoRow key={r.id} repo={r} onOpen={() => setSelected(r)} selected={selected?.id === r.id} />
            ))}
          </div>

          <div style={dStyles.footnote}>
            <span><IconShield size={11} /> Read-only access · token in memory only</span>
            <span style={{ flex: 1 }} />
            <span>GET /github/repos · 200 OK</span>
          </div>
        </div>
      </main>

      {selected && (
        <RepoFlyout
          repo={selected}
          onClose={() => setSelected(null)}
          scanState={scanState}
          scanResult={scanResult}
          scanError={scanError}
          onAnalyze={handleAnalyze}
        />
      )}
    </div>
  )
}

// ─── App ─────────────────────────────────────────────────────

type AppView = 'login' | 'handshake' | 'dashboard'

function App() {
  const [view, setView] = useState<AppView>('login')
  const [repos, setRepos] = useState<Repo[]>([])
  const [loginError, setLoginError] = useState('')
  const [handshakeDone, setHandshakeDone] = useState(false)
  const [reposReady, setReposReady] = useState(false)
  const fromOAuth = useRef(false)

  const handle = repos.length > 0 ? repos[0].full_name.split('/')[0] : 'user'
  const avatar = handle.charAt(0).toUpperCase()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const auth = params.get('auth')

    if (auth) {
      window.history.replaceState({}, document.title, window.location.pathname)
    }

    if (auth === 'error') {
      setLoginError('Authentication failed. Please try again.')
      setView('login')
      return
    }

    if (auth === 'success') {
      fromOAuth.current = true
      setView('handshake')
    }

    void loadRepos()
  }, [])

  useEffect(() => {
    if (handshakeDone && reposReady) {
      setView('dashboard')
    }
  }, [handshakeDone, reposReady])

  async function loadRepos() {
    try {
      const data = await fetchRepositories()
      setRepos(data)
      if (fromOAuth.current) {
        setReposReady(true)
      } else {
        setView('dashboard')
      }
    } catch {
      if (fromOAuth.current) {
        setView('login')
        setLoginError('Failed to load repositories. Please try again.')
      } else {
        setView('login')
      }
    }
  }

  function handleLogin() {
    window.location.href = githubLoginUrl()
  }

  function handleLogout() {
    void apiLogout().finally(() => {
      setView('login')
      setRepos([])
      setLoginError('')
      setHandshakeDone(false)
      setReposReady(false)
      fromOAuth.current = false
    })
  }

  return (
    <>
      {view === 'login' && <LoginScreen onLogin={handleLogin} error={loginError} />}
      {view === 'handshake' && <HandshakeScreen onDone={() => setHandshakeDone(true)} />}
      {view === 'dashboard' && (
        <Dashboard
          repos={repos}
          handle={handle}
          avatar={avatar}
          onLogout={handleLogout}
          onResync={() => void loadRepos()}
        />
      )}
    </>
  )
}

export default App
