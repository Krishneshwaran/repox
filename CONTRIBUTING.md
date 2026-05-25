# Contributing to repoX

Thanks for your interest in contributing to repoX. This guide helps you contribute quickly and consistently.

## Table of Contents

- Development setup
- Branching and commits
- Pull request checklist
- Coding standards
- Reporting bugs and requesting features

## Development Setup

### Prerequisites

- Node.js 20+
- Python 3.11+
- Git

### 1. Clone

```bash
git clone https://github.com/<your-org-or-user>/repox.git
cd repox
```

### 2. Backend

```bash
cd Backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

## Branching and Commits

- Create a branch per change: `feat/<topic>`, `fix/<topic>`, or `chore/<topic>`
- Keep commits small and focused
- Use clear commit messages in imperative style

Examples:

- `feat(scans): add run scan action in scans view`
- `fix(ai): handle provider timeout gracefully`

## Pull Request Checklist

- Code compiles and builds locally
- No secrets or tokens committed
- Added/updated tests for behavior changes where possible
- Updated docs when APIs or UX changed
- PR description includes:
  - problem
  - approach
  - screenshots for UI changes
  - testing notes

## Coding Standards

- Keep AI logic modular and prompt-specific
- Keep API routes thin and push logic into services
- Prefer explicit typing in frontend and backend models
- Reuse scanner outputs instead of duplicate parsing
- Avoid dead code and commented-out blocks

## Reporting Bugs and Requesting Features

- Use GitHub Issues with reproduction steps
- Include logs, screenshots, and environment details
- For security issues, do not open a public issue; see `SECURITY.md`
