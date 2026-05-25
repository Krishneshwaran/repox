# Security Policy

## Supported Versions

Security updates are provided for the latest `main` branch.

## Reporting a Vulnerability

Please do not report security vulnerabilities through public GitHub issues.

Report privately by email:

- `maintainers@repox.dev`

Include:

- vulnerability description
- impact and affected components
- proof of concept or reproduction steps
- suggested remediation (if available)

## Response Process

- Initial acknowledgement target: within 72 hours
- Status updates: at least every 7 days until resolved
- Disclosure: coordinated disclosure after fix availability

## Secret Handling

- Never commit API keys, OAuth secrets, or tokens
- Use `.env` for local secrets and keep `.env` out of git
- Use placeholder values in `.env.example`
