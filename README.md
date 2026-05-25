# repoX

repoX is an AI-powered repository intelligence platform for GitHub projects.

[![CI](https://github.com/Krishneshwaran/repox/actions/workflows/ci.yml/badge.svg)](https://github.com/Krishneshwaran/repox/actions/workflows/ci.yml)
[![Security Checks](https://github.com/Krishneshwaran/repox/actions/workflows/security.yml/badge.svg)](https://github.com/Krishneshwaran/repox/actions/workflows/security.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

It scans repositories, detects architecture and technologies, generates AI analysis, and provides interactive visualization for technical understanding.

## Highlights

- GitHub OAuth authentication
- Repository sync and selection
- Scanner engine (languages, frameworks, dependencies, structure)
- AI summary, architecture explanation, README analysis, insights, Ask Repo
- Visualization engine for architecture/dependency/API flow/timeline
- Scan history snapshots and compare

## Tech Stack

- Frontend: React, TypeScript, Vite
- Backend: FastAPI, Python
- AI: OpenRouter/OpenAI-compatible providers

## Quick Start

### Backend

```bash
cd Backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Environment

Set these in `Backend/.env`:

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `OPENROUTER_API_KEY` (or compatible provider key)
- `OPENROUTER_MODEL` (example: `deepseek/deepseek-chat-v3-0324`)

## Community

- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Contributing](./CONTRIBUTING.md)
- [Security Policy](./SECURITY.md)
- [MIT License](./LICENSE)

## Documentation

- [Architecture](./docs/architecture.md)
- [Setup](./docs/setup.md)
- [Roadmap](./docs/roadmap.md)
- [Changelog](./CHANGELOG.md)
- [Maintainers Guide](./docs/maintainers.md)
