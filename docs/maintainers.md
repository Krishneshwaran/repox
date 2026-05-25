# Maintainers Guide

This guide is for project maintainers operating repoX in day-to-day open source workflows.

## Core Responsibilities

- Review and merge pull requests
- Keep CI/security pipelines green
- Triage issues and label accurately
- Coordinate releases and changelog quality
- Protect secrets and ensure no credential leaks

## PR Review Standard

- Confirm scope is clear and focused
- Validate tests/build pass in CI
- Check for API and UI regression risk
- Ensure docs updated for behavior changes
- Block merges that include secrets or unsafe defaults

## Issue Triage

- `bug`: reproducible defect
- `enhancement`: feature improvement
- `question`: usage/help request
- `good first issue`: beginner-friendly scoped task

## Release Process

1. Ensure `main` is stable and CI passing.
2. Update `CHANGELOG.md` under `Unreleased`.
3. Create semantic tag:
   - `git tag vX.Y.Z`
   - `git push origin vX.Y.Z`
4. Verify GitHub Release workflow output.
5. Announce release notes in repository/discussions.

## Security Process

- Vulnerabilities are reported via `SECURITY.md`.
- Do not discuss active vulnerabilities in public issues before fix.
- Patch, test, release, and then disclose details responsibly.
