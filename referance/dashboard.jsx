// ─── Sparkline ──────────────────────────────────────────────
function Sparkline({ data, width = 80, height = 22, color = "var(--fg-3)" }) {
  const max = Math.max(...data, 1);
  const step = width / (data.length - 1);
  const points = data.map((v, i) => `${i * step},${height - (v / max) * (height - 2) - 1}`).join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline fill="none" stroke={color} strokeWidth="1.2" points={points} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ─── Sidebar ───────────────────────────────────────────────
function Sidebar({ active, onLogout }) {
  const sections = [
    {
      label: null,
      items: [
        { id: "repos", icon: IconRepo, label: "Repositories", count: 8 },
        { id: "overview", icon: IconGraph, label: "Overview" },
        { id: "activity", icon: IconBolt, label: "Activity" },
      ]
    },
    {
      label: "INTELLIGENCE",
      items: [
        { id: "insights", icon: IconBrain, label: "Insights", soon: true },
        { id: "scans", icon: IconShield, label: "Scans", soon: true },
        { id: "agents", icon: IconSparkle, label: "Agents", soon: true },
      ]
    },
    {
      label: "WORKSPACE",
      items: [
        { id: "integrations", icon: IconGit, label: "Integrations" },
        { id: "tokens", icon: IconKey, label: "Tokens" },
        { id: "settings", icon: IconSettings, label: "Settings" },
      ]
    },
  ];

  return (
    <aside style={dStyles.sidebar}>
      <div style={dStyles.brand}>
        <RepoXMark size={20} />
        <button style={dStyles.workspaceSel}>
          <span style={dStyles.avatar}>{USER.avatar}</span>
          <span style={dStyles.workspaceName}>{USER.handle}</span>
          <IconChevDown size={12} style={{ color: "var(--fg-3)" }} />
        </button>
      </div>

      <div style={dStyles.navWrap}>
        {sections.map((sec, si) => (
          <div key={si} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {sec.label && <div style={dStyles.navSection}>{sec.label}</div>}
            {sec.items.map((it) => {
              const isActive = it.id === active;
              const Icon = it.icon;
              return (
                <button key={it.id} style={{
                  ...dStyles.navItem,
                  ...(isActive ? dStyles.navItemActive : {}),
                  opacity: it.soon ? 0.6 : 1,
                  cursor: it.soon ? "default" : "pointer",
                }}>
                  {isActive && <span style={dStyles.activeBar} />}
                  <Icon size={15} />
                  <span style={{ flex: 1, textAlign: "left" }}>{it.label}</span>
                  {typeof it.count === "number" && <span style={dStyles.navCount}>{it.count}</span>}
                  {it.soon && <span style={dStyles.soonTag}>SOON</span>}
                </button>
              );
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
            <div style={{ ...dStyles.phaseBarFill, width: "50%" }} />
          </div>
          <div style={dStyles.phaseList}>
            <div style={dStyles.phaseRow}><IconCheck size={11} sw={2.4} style={{ color: "var(--accent)" }}/><span>OAuth</span></div>
            <div style={dStyles.phaseRow}><IconCheck size={11} sw={2.4} style={{ color: "var(--accent)" }}/><span>Repos sync</span></div>
            <div style={dStyles.phaseRow}><span style={dStyles.phaseDot}/><span style={{ color: "var(--fg-3)" }}>Insights engine</span></div>
            <div style={dStyles.phaseRow}><span style={dStyles.phaseDot}/><span style={{ color: "var(--fg-3)" }}>Agent runtime</span></div>
          </div>
        </div>
        <button style={dStyles.logoutBtn} onClick={onLogout}>
          <IconLogout size={14} /> <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}

// ─── Topbar ────────────────────────────────────────────────
function Topbar() {
  return (
    <div style={dStyles.topbar}>
      <div style={dStyles.crumbs}>
        <span style={dStyles.crumb}>{USER.handle}</span>
        <IconChevRight size={12} style={{ color: "var(--fg-4)" }} />
        <span style={{ ...dStyles.crumb, color: "var(--fg)" }}>Repositories</span>
      </div>

      <div style={dStyles.searchBox}>
        <IconSearch size={14} style={{ color: "var(--fg-4)" }} />
        <input placeholder="Search repos, commits, files…" style={dStyles.searchInput} />
        <span style={dStyles.kbd}>⌘K</span>
      </div>

      <div style={dStyles.topActions}>
        <button style={dStyles.iconBtn}><IconBell size={15} /></button>
        <button style={dStyles.iconBtn}><IconCommand size={15} /></button>
        <div style={dStyles.userPill}>
          <span style={dStyles.avatarSm}>{USER.avatar}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Filter chip ───────────────────────────────────────────
function Chip({ active, onClick, children, count }) {
  return (
    <button onClick={onClick} style={{ ...dStyles.chip, ...(active ? dStyles.chipActive : {}) }}>
      <span>{children}</span>
      {typeof count === "number" && <span style={{ ...dStyles.chipCount, ...(active ? dStyles.chipCountActive : {}) }}>{count}</span>}
    </button>
  );
}

// ─── Repo row ──────────────────────────────────────────────
function RepoRow({ repo, onOpen, selected }) {
  const langColor = LANG_COLOR[repo.language] || "var(--fg-3)";
  return (
    <div onClick={onOpen} style={{ ...dStyles.repoRow, ...(selected ? dStyles.repoRowSelected : {}) }}>
      <div style={dStyles.repoRowMain}>
        <div style={dStyles.repoNameLine}>
          <span style={dStyles.repoOwner}>{repo.owner}<span style={{ color: "var(--fg-4)" }}>/</span></span>
          <span style={dStyles.repoName}>{repo.name}</span>
          <span style={{ ...dStyles.visBadge, color: repo.private ? "var(--fg-3)" : "var(--fg-2)" }}>
            {repo.private ? <><IconLock size={10} /> private</> : <>public</>}
          </span>
          {repo.topics.slice(0, 2).map(t => (
            <span key={t} style={dStyles.topicTag}>{t}</span>
          ))}
        </div>
        <div style={dStyles.repoDesc}>{repo.description}</div>
        <div style={dStyles.repoMeta}>
          <span style={dStyles.metaItem}>
            <span style={{ width:8, height:8, borderRadius:8, background: langColor, display:"inline-block" }} />
            {repo.language}
          </span>
          <span style={dStyles.metaItem}><IconStar size={12} /> {repo.stars.toLocaleString()}</span>
          <span style={dStyles.metaItem}><IconFork size={12} /> {repo.forks}</span>
          <span style={dStyles.metaItem}><IconCircleDot size={12} /> {repo.issues} open</span>
          <span style={dStyles.metaItem}><IconClock size={12} /> updated {repo.updated} ago</span>
        </div>
      </div>

      <div style={dStyles.repoRowRight}>
        <Sparkline data={repo.activity} color="var(--fg-3)" />
        <div style={dStyles.repoActions}>
          <button style={dStyles.ghostBtn} onClick={(e) => e.stopPropagation()}>
            <IconArrowUpRight size={13} />
          </button>
          <button style={dStyles.primaryBtn} onClick={(e) => { e.stopPropagation(); onOpen(); }}>
            Analyze
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail flyout ─────────────────────────────────────────
function RepoFlyout({ repo, onClose }) {
  const langColor = LANG_COLOR[repo.language] || "var(--fg-3)";
  return (
    <div style={dStyles.flyoutBackdrop} onClick={onClose}>
      <div style={dStyles.flyout} onClick={(e) => e.stopPropagation()}>
        <div style={dStyles.flyoutHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button style={dStyles.iconBtn} onClick={onClose}><IconChevLeft size={15} /></button>
            <div style={dStyles.repoNameLine}>
              <span style={dStyles.repoOwner}>{repo.owner}<span style={{ color: "var(--fg-4)" }}>/</span></span>
              <span style={{ ...dStyles.repoName, fontSize: 17 }}>{repo.name}</span>
              <span style={{ ...dStyles.visBadge, color: repo.private ? "var(--fg-3)" : "var(--fg-2)" }}>
                {repo.private ? <><IconLock size={10} /> private</> : <>public</>}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={dStyles.ghostBtn}>View on GitHub <IconArrowUpRight size={12} /></button>
            <button style={dStyles.primaryBtn}><IconBolt size={12} /> Run analysis</button>
          </div>
        </div>

        <div style={dStyles.flyoutBody}>
          <div style={dStyles.statsGrid}>
            <Stat label="STARS" value={repo.stars.toLocaleString()} icon={<IconStar size={12}/>} />
            <Stat label="FORKS" value={repo.forks} icon={<IconFork size={12}/>} />
            <Stat label="WATCHERS" value={repo.watchers} icon={<IconEye size={12}/>} />
            <Stat label="OPEN ISSUES" value={repo.issues} icon={<IconCircleDot size={12}/>} />
            <Stat label="SIZE" value={(repo.size/1024).toFixed(1) + " MB"} icon={<IconBook size={12}/>} />
            <Stat label="BRANCH" value={repo.default_branch} icon={<IconGit size={12}/>} mono />
          </div>

          <Section title="DESCRIPTION">
            <p style={dStyles.descText}>{repo.description}</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
              {repo.topics.map(t => <span key={t} style={dStyles.topicTag}>{t}</span>)}
            </div>
          </Section>

          <Section title="LANGUAGE COMPOSITION">
            <div style={dStyles.langBar}>
              <span style={{ background: langColor, width: "72%" }} />
              <span style={{ background: "#3a3a44", width: "18%" }} />
              <span style={{ background: "#2a2a32", width: "10%" }} />
            </div>
            <div style={dStyles.langLegend}>
              <span><span style={{ background: langColor, ...dStyles.legendDot }}/>{repo.language} 72%</span>
              <span><span style={{ background: "#3a3a44", ...dStyles.legendDot }}/>Shell 18%</span>
              <span><span style={{ background: "#2a2a32", ...dStyles.legendDot }}/>Other 10%</span>
            </div>
          </Section>

          <Section title="COMMIT ACTIVITY · 16 WEEKS">
            <div style={dStyles.actChart}>
              {repo.activity.map((v, i) => (
                <div key={i} style={{
                  ...dStyles.actBar,
                  height: `${Math.max(4, (v / Math.max(...repo.activity)) * 100)}%`,
                  background: i === repo.activity.length - 1 ? "var(--accent)" : "var(--line-2)",
                }} />
              ))}
            </div>
          </Section>

          <Section title="repoX READOUT" hint="Generated locally · phase 2">
            <div style={dStyles.readout}>
              <div style={dStyles.readoutRow}>
                <span style={dStyles.readoutKey}>Architecture</span>
                <span style={dStyles.readoutVal}>Layered · API → Service → Adapter</span>
              </div>
              <div style={dStyles.readoutRow}>
                <span style={dStyles.readoutKey}>Test coverage</span>
                <span style={dStyles.readoutVal}>—</span>
              </div>
              <div style={dStyles.readoutRow}>
                <span style={dStyles.readoutKey}>Risk surface</span>
                <span style={dStyles.readoutVal}><IconDot color="var(--warn)" size={6}/> moderate · 2 outdated deps</span>
              </div>
              <div style={dStyles.readoutRow}>
                <span style={dStyles.readoutKey}>Last indexed</span>
                <span style={dStyles.readoutVal} className="mono">never · queue on analyze</span>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon, mono }) {
  return (
    <div style={dStyles.stat}>
      <div style={dStyles.statLabel}>{icon} {label}</div>
      <div style={{ ...dStyles.statValue, fontFamily: mono ? "'JetBrains Mono', monospace" : undefined }}>{value}</div>
    </div>
  );
}

function Section({ title, hint, children }) {
  return (
    <div style={dStyles.section}>
      <div style={dStyles.sectionHead}>
        <span style={dStyles.sectionTitle}>{title}</span>
        {hint && <span style={dStyles.sectionHint}>{hint}</span>}
      </div>
      <div>{children}</div>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────
function Dashboard({ onLogout }) {
  const [filter, setFilter] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState(null);
  const [sort, setSort] = React.useState("updated");

  const counts = {
    all: REPOS.length,
    public: REPOS.filter(r => !r.private).length,
    private: REPOS.filter(r => r.private).length,
    sources: REPOS.filter(r => r.forks > 0).length,
  };

  const filtered = REPOS.filter(r => {
    if (filter === "public" && r.private) return false;
    if (filter === "private" && !r.private) return false;
    if (query && !r.name.toLowerCase().includes(query.toLowerCase()) && !r.description.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={dStyles.root}>
      <Sidebar active="repos" onLogout={onLogout} />

      <main style={dStyles.main}>
        <Topbar />

        <div style={dStyles.page}>
          {/* Header */}
          <div style={dStyles.pageHead}>
            <div>
              <h1 style={dStyles.pageTitle}>Repositories</h1>
              <div style={dStyles.pageSub}>
                <span><IconDot color="var(--accent)" size={6} /> Synced 2 minutes ago · {REPOS.length} repositories</span>
              </div>
            </div>
            <div style={dStyles.pageActions}>
              <button style={dStyles.ghostBtn}><IconBolt size={13} /> Re-sync</button>
              <button style={dStyles.primaryBtn}><IconPlus size={13} /> Import repository</button>
            </div>
          </div>

          {/* Toolbar */}
          <div style={dStyles.toolbar}>
            <div style={dStyles.chipRow}>
              <Chip active={filter === "all"} onClick={() => setFilter("all")} count={counts.all}>All</Chip>
              <Chip active={filter === "public"} onClick={() => setFilter("public")} count={counts.public}>Public</Chip>
              <Chip active={filter === "private"} onClick={() => setFilter("private")} count={counts.private}>Private</Chip>
              <Chip active={filter === "sources"} onClick={() => setFilter("sources")} count={counts.sources}>Sources</Chip>
            </div>
            <div style={dStyles.toolRight}>
              <div style={dStyles.localSearch}>
                <IconSearch size={13} style={{ color: "var(--fg-4)" }} />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter list…" style={dStyles.localSearchInput} />
              </div>
              <button style={dStyles.sortBtn}>
                <span style={{ color: "var(--fg-4)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>SORT</span>
                <span>Last updated</span>
                <IconChevDown size={11} />
              </button>
            </div>
          </div>

          {/* Repo list */}
          <div style={dStyles.repoList}>
            {filtered.length === 0 ? (
              <div style={dStyles.empty}>
                <div style={dStyles.emptyIcon}><IconSearch size={20} /></div>
                <div style={{ color: "var(--fg-2)", fontSize: 14, marginTop: 14 }}>No repositories match “{query}”</div>
                <div style={{ color: "var(--fg-4)", fontSize: 12, marginTop: 4 }}>Try a different keyword or clear the filter.</div>
              </div>
            ) : filtered.map(r => (
              <RepoRow key={r.id} repo={r} onOpen={() => setSelected(r)} selected={selected?.id === r.id} />
            ))}
          </div>

          <div style={dStyles.footnote}>
            <span><IconShield size={11} /> Read-only access · token in memory only</span>
            <span style={{ flex: 1 }} />
            <span>GET /github/repos · 200 OK · 184ms</span>
          </div>
        </div>
      </main>

      {selected && <RepoFlyout repo={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────
const dStyles = {
  root: { display: "flex", width: "100%", height: "100%", background: "var(--bg)" },

  /* sidebar */
  sidebar: {
    width: 248, flexShrink: 0,
    borderRight: "1px solid var(--line-soft)",
    background: "var(--bg)",
    display: "flex", flexDirection: "column",
    padding: "18px 12px 14px",
  },
  brand: {
    display: "flex", flexDirection: "column", gap: 14,
    padding: "0 8px 16px",
    borderBottom: "1px solid var(--line-soft)",
    marginBottom: 16,
  },
  workspaceSel: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "6px 8px",
    background: "var(--bg-1)",
    border: "1px solid var(--line)",
    borderRadius: 6,
    color: "var(--fg-2)",
    fontSize: 13, fontWeight: 500,
    cursor: "pointer",
  },
  avatar: {
    width: 18, height: 18, borderRadius: 4,
    background: "var(--accent)",
    color: "#070707", fontWeight: 700, fontSize: 11,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'JetBrains Mono', monospace",
  },
  workspaceName: { flex: 1, textAlign: "left" },
  navWrap: { display: "flex", flexDirection: "column", gap: 18, flex: 1, overflowY: "auto" },
  navSection: {
    padding: "0 8px 6px",
    fontSize: 10, letterSpacing: "0.14em",
    color: "var(--fg-4)",
    fontFamily: "'JetBrains Mono', monospace",
    marginTop: 4,
  },
  navItem: {
    position: "relative",
    display: "flex", alignItems: "center", gap: 10,
    padding: "7px 10px",
    background: "transparent",
    border: "none",
    color: "var(--fg-2)",
    fontSize: 13, fontWeight: 450,
    borderRadius: 6,
    cursor: "pointer",
    textAlign: "left",
  },
  navItemActive: {
    background: "var(--bg-2)",
    color: "var(--fg)",
  },
  activeBar: {
    position: "absolute", left: -12, top: 8, bottom: 8, width: 2,
    background: "var(--accent)",
    boxShadow: "0 0 8px var(--accent-glow)",
    borderRadius: 2,
  },
  navCount: {
    fontSize: 11, color: "var(--fg-4)",
    fontFamily: "'JetBrains Mono', monospace",
    background: "var(--bg-2)",
    padding: "1px 6px", borderRadius: 4,
  },
  soonTag: {
    fontSize: 9, letterSpacing: "0.12em",
    color: "var(--fg-4)",
    fontFamily: "'JetBrains Mono', monospace",
    border: "1px solid var(--line)",
    padding: "1px 5px", borderRadius: 3,
  },
  sidebarFoot: { display: "flex", flexDirection: "column", gap: 10, paddingTop: 12, borderTop: "1px solid var(--line-soft)" },
  phaseCard: {
    border: "1px solid var(--line)",
    borderRadius: 8,
    background: "var(--bg-1)",
    padding: 12,
    display: "flex", flexDirection: "column", gap: 8,
  },
  phaseHead: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  phaseLabel: { fontSize: 10, letterSpacing: "0.14em", color: "var(--fg-3)", fontFamily: "'JetBrains Mono', monospace" },
  phasePct: { fontSize: 11, color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace" },
  phaseBar: { height: 3, background: "var(--bg-3)", borderRadius: 2, overflow: "hidden" },
  phaseBarFill: { height: "100%", background: "var(--accent)", boxShadow: "0 0 8px var(--accent-glow)" },
  phaseList: { display: "flex", flexDirection: "column", gap: 4, marginTop: 4 },
  phaseRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--fg-2)", fontFamily: "'JetBrains Mono', monospace" },
  phaseDot: { width: 8, height: 8, border: "1px solid var(--line-2)", borderRadius: 999, display: "inline-block" },
  logoutBtn: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "8px 10px",
    background: "transparent",
    border: "none",
    color: "var(--fg-3)",
    fontSize: 12,
    cursor: "pointer",
    borderRadius: 6,
    textAlign: "left",
  },

  /* main */
  main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },

  /* topbar */
  topbar: {
    display: "flex", alignItems: "center", gap: 16,
    padding: "12px 24px",
    borderBottom: "1px solid var(--line-soft)",
    flexShrink: 0,
  },
  crumbs: { display: "flex", alignItems: "center", gap: 8, fontSize: 13 },
  crumb: { color: "var(--fg-3)" },
  searchBox: {
    flex: 1, maxWidth: 480,
    display: "flex", alignItems: "center", gap: 10,
    padding: "7px 12px",
    background: "var(--bg-1)",
    border: "1px solid var(--line)",
    borderRadius: 6,
    margin: "0 auto",
  },
  searchInput: {
    flex: 1, background: "transparent", border: "none", outline: "none",
    color: "var(--fg)", fontSize: 13, fontFamily: "inherit",
  },
  kbd: {
    fontSize: 10, color: "var(--fg-4)",
    fontFamily: "'JetBrains Mono', monospace",
    border: "1px solid var(--line)",
    padding: "1px 5px", borderRadius: 3,
  },
  topActions: { display: "flex", alignItems: "center", gap: 8 },
  iconBtn: {
    width: 30, height: 30, borderRadius: 6,
    background: "transparent",
    border: "1px solid transparent",
    color: "var(--fg-3)",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer",
  },
  userPill: {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: 2, borderRadius: 999,
    background: "var(--bg-1)", border: "1px solid var(--line)",
  },
  avatarSm: {
    width: 26, height: 26, borderRadius: 999,
    background: "var(--accent)",
    color: "#070707", fontWeight: 700, fontSize: 12,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'JetBrains Mono', monospace",
  },

  /* page */
  page: { flex: 1, overflowY: "auto", padding: "28px 32px 40px" },
  pageHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 },
  pageTitle: { margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" },
  pageSub: { marginTop: 8, color: "var(--fg-3)", fontSize: 13, display: "flex", gap: 16 },
  pageActions: { display: "flex", gap: 8 },

  /* toolbar */
  toolbar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 16,
    padding: "10px 0",
    borderBottom: "1px solid var(--line-soft)",
  },
  chipRow: { display: "flex", gap: 4 },
  chip: {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "6px 12px",
    background: "transparent",
    color: "var(--fg-3)",
    border: "1px solid transparent",
    borderRadius: 6,
    fontSize: 13, fontWeight: 450,
    cursor: "pointer",
    transition: "all .12s ease",
  },
  chipActive: {
    background: "var(--bg-2)",
    color: "var(--fg)",
    border: "1px solid var(--line)",
  },
  chipCount: {
    fontSize: 11, color: "var(--fg-4)",
    fontFamily: "'JetBrains Mono', monospace",
    padding: "0 4px",
  },
  chipCountActive: { color: "var(--fg-2)" },
  toolRight: { display: "flex", gap: 8, alignItems: "center" },
  localSearch: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "6px 10px",
    background: "var(--bg-1)",
    border: "1px solid var(--line)",
    borderRadius: 6,
    width: 220,
  },
  localSearchInput: {
    flex: 1, background: "transparent", border: "none", outline: "none",
    color: "var(--fg)", fontSize: 13, fontFamily: "inherit",
  },
  sortBtn: {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "6px 10px",
    background: "var(--bg-1)",
    border: "1px solid var(--line)",
    color: "var(--fg-2)",
    borderRadius: 6,
    fontSize: 13, cursor: "pointer",
  },

  /* repo rows */
  repoList: { display: "flex", flexDirection: "column", border: "1px solid var(--line-soft)", borderRadius: 10, overflow: "hidden", background: "var(--bg-1)" },
  repoRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24,
    padding: "18px 20px",
    borderBottom: "1px solid var(--line-soft)",
    cursor: "pointer",
    transition: "background .12s ease",
    background: "var(--bg-1)",
  },
  repoRowSelected: { background: "var(--bg-2)" },
  repoRowMain: { flex: 1, minWidth: 0 },
  repoNameLine: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  repoOwner: { color: "var(--fg-3)", fontSize: 14.5, fontFamily: "'JetBrains Mono', monospace" },
  repoName: { color: "var(--fg)", fontSize: 14.5, fontWeight: 500, fontFamily: "'JetBrains Mono', monospace" },
  visBadge: {
    display: "inline-flex", alignItems: "center", gap: 4,
    fontSize: 10.5, letterSpacing: "0.06em",
    fontFamily: "'JetBrains Mono', monospace",
    border: "1px solid var(--line)", padding: "2px 6px", borderRadius: 3,
    color: "var(--fg-3)",
    marginLeft: 4,
  },
  topicTag: {
    fontSize: 11,
    fontFamily: "'JetBrains Mono', monospace",
    color: "var(--fg-3)",
    background: "var(--bg-2)",
    padding: "2px 7px", borderRadius: 3,
  },
  repoDesc: { color: "var(--fg-3)", fontSize: 13, marginTop: 8, lineHeight: 1.45, maxWidth: 720 },
  repoMeta: { display: "flex", gap: 18, color: "var(--fg-3)", fontSize: 12, marginTop: 12, fontFamily: "'JetBrains Mono', monospace" },
  metaItem: { display: "inline-flex", alignItems: "center", gap: 6 },
  repoRowRight: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 14, flexShrink: 0 },
  repoActions: { display: "flex", gap: 6 },
  ghostBtn: {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "6px 10px",
    background: "transparent",
    border: "1px solid var(--line)",
    color: "var(--fg-2)",
    borderRadius: 6,
    fontSize: 12.5, cursor: "pointer",
  },
  primaryBtn: {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "6px 12px",
    background: "var(--fg)",
    border: "1px solid var(--fg)",
    color: "#0a0a0e",
    borderRadius: 6,
    fontSize: 12.5, fontWeight: 600, cursor: "pointer",
  },

  empty: {
    padding: "60px 20px",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
  },
  emptyIcon: {
    width: 44, height: 44, borderRadius: 999,
    border: "1px solid var(--line)",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    color: "var(--fg-3)",
  },

  footnote: {
    marginTop: 14,
    display: "flex", gap: 14, alignItems: "center",
    fontSize: 11, color: "var(--fg-4)",
    fontFamily: "'JetBrains Mono', monospace",
  },

  /* flyout */
  flyoutBackdrop: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.5)",
    backdropFilter: "blur(2px)",
    zIndex: 30,
    display: "flex", justifyContent: "flex-end",
  },
  flyout: {
    width: "min(640px, 92vw)",
    height: "100%",
    background: "var(--bg)",
    borderLeft: "1px solid var(--line)",
    display: "flex", flexDirection: "column",
    boxShadow: "-40px 0 80px rgba(0,0,0,0.5)",
    animation: "flyIn .25s ease",
  },
  flyoutHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
    padding: "14px 18px",
    borderBottom: "1px solid var(--line)",
  },
  flyoutBody: { flex: 1, overflowY: "auto", padding: "18px 22px 40px" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "var(--line-soft)", border: "1px solid var(--line-soft)", borderRadius: 8, overflow: "hidden", marginBottom: 24 },
  stat: { padding: "14px 16px", background: "var(--bg-1)", display: "flex", flexDirection: "column", gap: 6 },
  statLabel: { fontSize: 10, letterSpacing: "0.12em", color: "var(--fg-4)", fontFamily: "'JetBrains Mono', monospace", display: "inline-flex", alignItems: "center", gap: 6 },
  statValue: { fontSize: 18, color: "var(--fg)", fontWeight: 500 },
  section: { padding: "16px 0", borderTop: "1px solid var(--line-soft)" },
  sectionHead: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 },
  sectionTitle: { fontSize: 10, letterSpacing: "0.14em", color: "var(--fg-3)", fontFamily: "'JetBrains Mono', monospace" },
  sectionHint: { fontSize: 11, color: "var(--fg-4)", fontFamily: "'JetBrains Mono', monospace" },
  descText: { color: "var(--fg-2)", fontSize: 14, lineHeight: 1.55, margin: 0 },
  langBar: {
    display: "flex", height: 6, borderRadius: 3, overflow: "hidden", background: "var(--bg-2)",
  },
  langLegend: { display: "flex", gap: 16, marginTop: 10, color: "var(--fg-3)", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" },
  legendDot: { display: "inline-block", width: 8, height: 8, borderRadius: 8, marginRight: 6, transform: "translateY(1px)" },
  actChart: { display: "flex", gap: 4, height: 80, alignItems: "flex-end" },
  actBar: { flex: 1, borderRadius: 2 },
  readout: {
    border: "1px solid var(--line-soft)",
    borderRadius: 8,
    background: "var(--bg-1)",
    overflow: "hidden",
  },
  readoutRow: {
    display: "flex", justifyContent: "space-between", padding: "10px 14px",
    borderBottom: "1px solid var(--line-soft)",
    fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5,
  },
  readoutKey: { color: "var(--fg-3)" },
  readoutVal: { color: "var(--fg)", display: "inline-flex", alignItems: "center", gap: 8 },
};

// inject animation
if (!document.getElementById("dash-anim-style")) {
  const s = document.createElement("style");
  s.id = "dash-anim-style";
  s.textContent = `
    @keyframes flyIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    button:hover { filter: brightness(1.15); }
  `;
  document.head.appendChild(s);
}

// strip trailing border from last readout row programmatically? Not necessary visually. Keep.

Object.assign(window, { Dashboard, Sidebar, Topbar });
