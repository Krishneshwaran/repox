// Mock data — what the backend's /github/repos would return
const REPOS = [
  {
    id: 1, name: "repoX", owner: "mehdi", fullName: "mehdi/repoX", private: false,
    description: "AI-powered repository intelligence. Map, audit and reason about any codebase.",
    language: "Python", stars: 1284, forks: 92, watchers: 41, issues: 7,
    updated: "2h", default_branch: "main", size: 12_840,
    topics: ["fastapi", "react", "llm", "github-app"],
    activity: [3,5,8,4,12,7,9,11,6,14,9,10,12,15,8,11],
    visibility: "public",
  },
  {
    id: 2, name: "shadow-cli", owner: "mehdi", fullName: "mehdi/shadow-cli", private: true,
    description: "Tiny zero-dep CLI for stenciling project templates from spec files.",
    language: "TypeScript", stars: 234, forks: 18, watchers: 9, issues: 2,
    updated: "1d", default_branch: "main", size: 980,
    topics: ["cli", "node", "scaffolding"],
    activity: [1,2,1,3,4,2,5,3,2,4,5,3,2,3,2,4],
    visibility: "private",
  },
  {
    id: 3, name: "lattice-ui", owner: "mehdi", fullName: "mehdi/lattice-ui", private: false,
    description: "Headless component primitives for dashboards. Composable, typed, dark by default.",
    language: "TypeScript", stars: 4621, forks: 312, watchers: 188, issues: 23,
    updated: "5h", default_branch: "main", size: 5_120,
    topics: ["react", "design-system", "headless"],
    activity: [6,9,4,11,7,13,8,10,14,9,7,12,15,11,9,13],
    visibility: "public",
  },
  {
    id: 4, name: "fastapi-boilerplate", owner: "mehdi", fullName: "mehdi/fastapi-boilerplate", private: false,
    description: "Opinionated FastAPI starter with auth, async SQLAlchemy and clean service layers.",
    language: "Python", stars: 812, forks: 144, watchers: 33, issues: 4,
    updated: "3d", default_branch: "main", size: 2_104,
    topics: ["fastapi", "sqlalchemy", "boilerplate"],
    activity: [2,1,3,2,4,1,2,3,2,1,3,4,2,3,2,1],
    visibility: "public",
  },
  {
    id: 5, name: "orbit-sdk", owner: "mehdi", fullName: "mehdi/orbit-sdk", private: true,
    description: "Internal SDK for the Orbit telemetry stack. Streams, sinks, and span enrichers.",
    language: "Go", stars: 89, forks: 4, watchers: 6, issues: 1,
    updated: "1w", default_branch: "trunk", size: 3_472,
    topics: ["telemetry", "go", "internal"],
    activity: [1,0,1,2,1,0,1,1,2,1,0,1,2,1,0,1],
    visibility: "private",
  },
  {
    id: 6, name: "echo-notebook", owner: "mehdi", fullName: "mehdi/echo-notebook", private: false,
    description: "Notebook front-end with live cells, code intel, and pair-programming agents.",
    language: "Rust", stars: 318, forks: 21, watchers: 12, issues: 3,
    updated: "12h", default_branch: "main", size: 8_290,
    topics: ["rust", "wasm", "notebook"],
    activity: [4,3,5,7,6,9,5,8,6,10,7,9,8,6,7,9],
    visibility: "public",
  },
  {
    id: 7, name: "dotfiles", owner: "mehdi", fullName: "mehdi/dotfiles", private: false,
    description: "Personal shell, editor and tmux config. Nothing fancy.",
    language: "Shell", stars: 24, forks: 2, watchers: 1, issues: 0,
    updated: "2w", default_branch: "main", size: 184,
    topics: ["zsh", "neovim"],
    activity: [0,1,0,0,1,0,1,0,0,1,0,0,1,0,0,1],
    visibility: "public",
  },
  {
    id: 8, name: "ledger-py", owner: "mehdi", fullName: "mehdi/ledger-py", private: true,
    description: "Plain-text accounting helpers with idempotent imports.",
    language: "Python", stars: 41, forks: 3, watchers: 2, issues: 0,
    updated: "3w", default_branch: "main", size: 612,
    topics: ["finance", "cli"],
    activity: [0,1,0,1,1,0,1,0,1,0,1,1,0,0,1,0],
    visibility: "private",
  },
];

const LANG_COLOR = {
  "Python": "#3572A5",
  "TypeScript": "#3178c6",
  "JavaScript": "#f1e05a",
  "Go": "#00ADD8",
  "Rust": "#dea584",
  "Shell": "#89e051",
  "C++": "#f34b7d",
  "Ruby": "#701516",
};

const USER = {
  name: "Mehdi A.",
  handle: "mehdi",
  email: "mehdi@repox.dev",
  avatar: "M",
  org: "Personal",
};

Object.assign(window, { REPOS, LANG_COLOR, USER });
