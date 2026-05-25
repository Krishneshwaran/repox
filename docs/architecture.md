# repoX Architecture

This document explains the current system architecture of repoX and how data flows between modules.

## High-Level System

repoX is split into two runtime surfaces:

- `frontend/` (React + TypeScript): UI, repository workflows, scanner UX, AI/visualization panels
- `Backend/` (FastAPI + Python): GitHub auth, scanning engine, AI intelligence APIs, visualization graph APIs

## Core Flows

### 1. Authentication and Repository Sync

1. User starts OAuth from frontend.
2. FastAPI handles GitHub callback and stores session token.
3. Frontend fetches repositories from `GET /github/repos`.

### 2. Repository Scan Flow

1. Frontend calls `POST /scanner/scan` with `repo_name` and `clone_url`.
2. Backend scanner:
   - clones repository into `.scanner_cache`
   - detects language/framework/dependency/structure signals
   - stores scan result and history snapshot
3. Frontend reads history from scanner routes and enables snapshot compare.

### 3. AI Intelligence Flow

1. Frontend calls `/ai/*` routes with `scan_id` (preferred) or `scan_result`.
2. `ai_service` builds structured prompts using scanner output.
3. Provider call is made to OpenRouter/OpenAI-compatible endpoint.
4. Response is returned as repository summary/architecture/readme analysis/insight/ask answer.

### 4. Visualization Flow

1. Frontend requests visualization routes under `/visualization/*`.
2. Backend converts scan and repository context into nodes/edges/mermaid text.
3. Frontend renders interactive panels (React Flow + Mermaid).

## Backend Module Map

- `app/api/`: route definitions and request/response boundaries
- `app/scanner/`: repository analysis engine and history/diff handling
- `app/ai/`: AI prompt/context/service logic
- `app/visualization/`: graph and mapping services
- `app/models/`: shared API/domain models
- `app/services/`: support services (token/session handling)

## Data and Storage Model

Current storage is intentionally lightweight for rapid iteration:

- Scanner cache: local filesystem clone cache (`Backend/.scanner_cache`)
- AI memory/cache: local filesystem (`Backend/.ai_memory`, `Backend/.ai_repo_cache`)
- Session store: file-backed session map (`Backend/.session_store.json`)
- Optional browser-side local scan history for live/no-server-storage usage

## Scalability Notes

Current design is modular and ready to evolve:

- Scanner, AI, and visualization are already separated by domain.
- API routes are thin and service-driven.
- Snapshot IDs allow deterministic AI context selection.
- Next step for scale: move file-backed state to database/object storage and queue long-running scans.

## Operational Guardrails

- Never commit real secrets in repo files.
- Use `.env` locally and placeholders in `.env.example`.
- Keep provider/model settings environment-driven.
