function HandshakeScreen({ onDone }) {
  const steps = [
    "Opening github.com/login/oauth/authorize…",
    "Awaiting consent from @mehdi…",
    "Receiving authorization code…",
    "POST /auth/github/callback?code=...",
    "Exchanging code for access_token…",
    "GET /user · GET /user/repos?per_page=100",
    "Hydrating workspace…",
  ];
  const [active, setActive] = React.useState(0);

  React.useEffect(() => {
    const timers = [];
    steps.forEach((_, i) => {
      timers.push(setTimeout(() => setActive(i + 1), 180 + i * 230));
    });
    timers.push(setTimeout(() => onDone(), 180 + steps.length * 230 + 400));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div style={hsStyles.root}>
      <div style={hsStyles.grid} />
      <div style={hsStyles.center}>
        <div style={hsStyles.handshakeRow}>
          <div style={hsStyles.brandBox}>
            <IconGitHub size={28} />
          </div>
          <div style={hsStyles.flow}>
            <div style={hsStyles.flowLine} />
            <div style={{ ...hsStyles.flowPulse, animation: "hsPulse 1.4s linear infinite" }} />
          </div>
          <div style={hsStyles.brandBox}>
            <RepoXMark size={20} />
          </div>
        </div>

        <div style={hsStyles.titleRow}>
          <span style={hsStyles.spinner} />
          <span style={hsStyles.title}>Authorizing with GitHub</span>
        </div>

        <div style={hsStyles.terminal}>
          <div style={hsStyles.terminalHeader}>
            <div style={hsStyles.terminalDots}>
              <span style={{ ...hsStyles.dot, background: "#3a3a44" }} />
              <span style={{ ...hsStyles.dot, background: "#3a3a44" }} />
              <span style={{ ...hsStyles.dot, background: "#3a3a44" }} />
            </div>
            <span style={hsStyles.terminalTitle}>oauth · handshake</span>
            <span style={hsStyles.terminalMeta}>localhost:8000</span>
          </div>
          <div style={hsStyles.terminalBody}>
            {steps.map((s, i) => {
              const done = i < active;
              const current = i === active;
              const pending = i > active;
              return (
                <div key={i} style={{
                  ...hsStyles.line,
                  opacity: pending ? 0.3 : 1,
                  color: done ? "var(--fg-2)" : current ? "var(--fg)" : "var(--fg-4)",
                }}>
                  <span style={{ width: 14, display: "inline-flex", justifyContent: "center", color: done ? "var(--accent)" : current ? "var(--accent)" : "var(--fg-4)" }}>
                    {done ? <IconCheck size={12} sw={2.2} /> : current ? <span style={{...hsStyles.miniSpinner }} /> : <span style={hsStyles.bullet}>›</span>}
                  </span>
                  <span style={hsStyles.lineText}>{s}</span>
                  {done && <span style={hsStyles.lineMs}>{180 + i * 7 + "ms"}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes hsPulse {
          0% { transform: translateX(-100%); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }
        @keyframes hsSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const hsStyles = {
  root: {
    position: "relative", width: "100%", height: "100%",
    background: "var(--bg)", color: "var(--fg)",
    display: "flex", flexDirection: "column", overflow: "hidden",
  },
  grid: {
    position: "absolute", inset: 0,
    backgroundImage:
      "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
    backgroundSize: "56px 56px",
    maskImage: "radial-gradient(circle at 50% 50%, black 0%, transparent 70%)",
    WebkitMaskImage: "radial-gradient(circle at 50% 50%, black 0%, transparent 70%)",
    pointerEvents: "none",
  },
  center: {
    position: "relative", zIndex: 2,
    flex: 1, display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", gap: 36,
  },
  handshakeRow: { display: "flex", alignItems: "center", gap: 16 },
  brandBox: {
    width: 76, height: 76, borderRadius: 14,
    border: "1px solid var(--line-2)",
    background: "var(--bg-1)",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
  },
  flow: { position: "relative", width: 90, height: 1, overflow: "hidden" },
  flowLine: { position: "absolute", inset: 0, background: "var(--line-2)" },
  flowPulse: {
    position: "absolute", top: -1, left: 0, width: "40%", height: 3,
    background: "linear-gradient(90deg, transparent, var(--accent), transparent)",
    filter: "blur(0.5px)",
  },
  titleRow: { display: "flex", alignItems: "center", gap: 12 },
  spinner: {
    width: 14, height: 14, borderRadius: 999,
    border: "1.5px solid var(--line-2)",
    borderTopColor: "var(--accent)",
    animation: "hsSpin 0.9s linear infinite",
  },
  title: { fontSize: 14, color: "var(--fg-2)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.02em" },
  terminal: {
    width: 600, maxWidth: "calc(100vw - 64px)",
    border: "1px solid var(--line)", borderRadius: 10,
    background: "var(--bg-1)", overflow: "hidden",
    boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
  },
  terminalHeader: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "10px 14px",
    borderBottom: "1px solid var(--line)",
    background: "var(--bg-2)",
  },
  terminalDots: { display: "inline-flex", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 10, display: "inline-block" },
  terminalTitle: { fontSize: 11, color: "var(--fg-3)", fontFamily: "'JetBrains Mono', monospace", flex: 1, textAlign: "center" },
  terminalMeta: { fontSize: 11, color: "var(--fg-4)", fontFamily: "'JetBrains Mono', monospace" },
  terminalBody: { padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5 },
  line: { display: "flex", alignItems: "center", gap: 10, transition: "color .2s, opacity .2s" },
  bullet: { color: "var(--fg-4)" },
  lineText: { flex: 1 },
  lineMs: { color: "var(--fg-4)", fontSize: 11 },
  miniSpinner: {
    width: 10, height: 10, borderRadius: 999,
    border: "1.5px solid var(--line-2)",
    borderTopColor: "var(--accent)",
    animation: "hsSpin 0.8s linear infinite",
    display: "inline-block",
  },
};

window.HandshakeScreen = HandshakeScreen;
