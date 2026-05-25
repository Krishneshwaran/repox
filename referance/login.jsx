function LoginScreen({ onLogin }) {
  const [pressed, setPressed] = React.useState(false);

  const handle = () => {
    if (pressed) return;
    setPressed(true);
    setTimeout(() => onLogin(), 350);
  };

  return (
    <div style={loginStyles.root}>
      {/* faint background grid */}
      <div style={loginStyles.grid} />
      <div style={loginStyles.vignette} />

      {/* top bar */}
      <div style={loginStyles.topbar}>
        <RepoXMark size={20} />
        <div style={loginStyles.topbarRight}>
          <a style={loginStyles.topLink} href="#">Docs</a>
          <a style={loginStyles.topLink} href="#">Changelog</a>
          <a style={loginStyles.topLink} href="#">Status<span style={{ display:"inline-block", width:6, height:6, borderRadius:6, background:"var(--accent)", marginLeft:8, transform:"translateY(-1px)"}}/></a>
        </div>
      </div>

      {/* center */}
      <div style={loginStyles.center}>
        <div style={loginStyles.eyebrowRow}>
          <span style={loginStyles.eyebrowDot} />
          <span style={loginStyles.eyebrow}>PHASE 1 · PUBLIC PREVIEW</span>
        </div>

        <h1 style={loginStyles.h1}>
          Repository intelligence,<br/>
          <span style={loginStyles.h1Accent}>without the noise.</span>
        </h1>

        <p style={loginStyles.sub}>
          repoX connects to your GitHub, indexes what matters, and gives you a clean read on every repo you own — architecture, activity, debt, risk. One signal, no dashboards.
        </p>

        <div style={loginStyles.actions}>
          <button
            onClick={handle}
            style={{ ...loginStyles.cta, ...(pressed ? loginStyles.ctaPressed : {}) }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#0f0f14"}
            onMouseLeave={(e) => e.currentTarget.style.background = "#08080c"}
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

      {/* footer */}
      <div style={loginStyles.footer}>
        <span style={loginStyles.footMuted}>v0.1.0 · phase 1</span>
        <span style={loginStyles.footDiv}>·</span>
        <span style={loginStyles.footMuted}>localhost:8000</span>
        <span style={loginStyles.footDiv}>·</span>
        <a style={loginStyles.footLink} href="#">Privacy</a>
        <a style={loginStyles.footLink} href="#">Terms</a>
      </div>
    </div>
  );
}

const loginStyles = {
  root: {
    position: "relative", width: "100%", height: "100%",
    background: "var(--bg)", color: "var(--fg)",
    display: "flex", flexDirection: "column",
    overflow: "hidden",
  },
  grid: {
    position: "absolute", inset: 0,
    backgroundImage:
      "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
    backgroundSize: "56px 56px",
    maskImage: "radial-gradient(circle at 50% 45%, black 0%, transparent 75%)",
    WebkitMaskImage: "radial-gradient(circle at 50% 45%, black 0%, transparent 75%)",
    pointerEvents: "none",
  },
  vignette: {
    position: "absolute", inset: 0,
    background: "radial-gradient(circle at 50% 30%, oklch(0.82 0.17 142 / 0.05), transparent 50%)",
    pointerEvents: "none",
  },
  topbar: {
    position: "relative", zIndex: 2,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "20px 32px",
    borderBottom: "1px solid var(--line-soft)",
  },
  topbarRight: { display: "flex", gap: 28, alignItems: "center" },
  topLink: { color: "var(--fg-3)", fontSize: 13, fontWeight: 450, transition: "color .15s" },
  center: {
    position: "relative", zIndex: 2,
    flex: 1, display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    padding: "0 32px",
    textAlign: "center",
    gap: 0,
  },
  eyebrowRow: {
    display: "inline-flex", alignItems: "center", gap: 10,
    padding: "6px 12px",
    border: "1px solid var(--line)",
    borderRadius: 999,
    background: "var(--bg-1)",
    marginBottom: 32,
  },
  eyebrowDot: {
    width: 6, height: 6, borderRadius: 6,
    background: "var(--accent)",
    boxShadow: "0 0 12px var(--accent-glow)",
  },
  eyebrow: { fontSize: 11, color: "var(--fg-2)", letterSpacing: "0.14em", fontWeight: 500, fontFamily: "'JetBrains Mono', monospace" },
  h1: {
    margin: 0,
    fontSize: 64,
    fontWeight: 600,
    letterSpacing: "-0.035em",
    lineHeight: 1.02,
    textWrap: "balance",
  },
  h1Accent: { color: "var(--fg-3)", fontWeight: 500 },
  sub: {
    maxWidth: 560,
    color: "var(--fg-3)",
    fontSize: 15.5,
    lineHeight: 1.55,
    marginTop: 28,
    fontWeight: 400,
  },
  actions: { marginTop: 40, display: "flex", gap: 12, alignItems: "center" },
  cta: {
    display: "inline-flex", alignItems: "center", gap: 12,
    padding: "13px 18px 13px 16px",
    background: "#08080c",
    color: "var(--fg)",
    border: "1px solid var(--line-2)",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all .15s ease",
    boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.5)",
  },
  ctaPressed: { transform: "scale(0.98)", borderColor: "var(--accent-dim)" },
  ctaKbd: {
    color: "var(--fg-4)", display: "inline-flex", alignItems: "center", marginLeft: 4,
    paddingLeft: 12, borderLeft: "1px solid var(--line)",
  },
  secondary: {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "13px 16px",
    background: "transparent",
    color: "var(--fg-2)",
    border: "1px solid transparent",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 450,
    cursor: "pointer",
  },
  trust: {
    marginTop: 48,
    display: "flex", gap: 28, alignItems: "center",
    color: "var(--fg-4)", fontSize: 12,
    fontFamily: "'JetBrains Mono', monospace",
  },
  trustItem: { display: "inline-flex", alignItems: "center", gap: 8 },
  scopeCard: {
    position: "absolute",
    right: 32, top: "50%", transform: "translateY(-50%)",
    width: 280,
    border: "1px solid var(--line)",
    borderRadius: 10,
    background: "var(--bg-1)",
    padding: 16,
    zIndex: 1,
    display: "none",
  },
  scopeHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  scopeLabel: { fontSize: 10, letterSpacing: "0.12em", color: "var(--fg-3)", fontFamily: "'JetBrains Mono', monospace" },
  scopeBadge: { fontSize: 10, color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "'JetBrains Mono', monospace" },
  scopeList: { display: "flex", flexDirection: "column", gap: 8 },
  scopeRow: { display: "flex", justifyContent: "space-between", alignItems: "baseline" },
  scopeMuted: { color: "var(--fg-4)", fontSize: 11 },
  code: { fontFamily: "'JetBrains Mono', monospace", color: "var(--fg-2)", fontSize: 12, background: "var(--bg-2)", padding: "2px 6px", borderRadius: 4 },
  footer: {
    position: "relative", zIndex: 2,
    padding: "18px 32px",
    borderTop: "1px solid var(--line-soft)",
    display: "flex", alignItems: "center", gap: 16,
    color: "var(--fg-4)", fontSize: 12,
    fontFamily: "'JetBrains Mono', monospace",
  },
  footMuted: { color: "var(--fg-4)" },
  footDiv: { color: "var(--fg-4)" },
  footLink: { color: "var(--fg-3)", marginLeft: 8 },
};

window.LoginScreen = LoginScreen;
