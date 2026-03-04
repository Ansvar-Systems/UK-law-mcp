# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x.x   | Yes      |
| < 1.0   | No       |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT open a public issue**
2. Email **security@ansvar.ai** with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
3. You will receive acknowledgment within 48 hours
4. We will work with you to understand and address the issue

## Security Scanning

This repository is automatically scanned by:
- **CodeQL** — static analysis (weekly + on PR)
- **Semgrep** — SAST scanning (every push)
- **Trivy** — CVE and dependency scanning (daily)
- **Gitleaks** — secret detection (every push)
- **OSSF Scorecard** — supply chain security (weekly)
- **Dependabot** — automated dependency updates (weekly)

## Data Security

This MCP server contains only publicly available legislation. No authentication credentials, API keys, or personal data are stored in this repository.
