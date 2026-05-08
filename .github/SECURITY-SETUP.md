# Security Setup for GitHub Actions

This document describes the secrets and configuration required for the UK Law MCP GitHub Actions workflows.

## Required Secrets

| Secret | Used By | Description |
|--------|---------|-------------|
| `NPM_TOKEN` | `publish.yml` | npm automation token for publishing `@ansvar/uk-law-mcp` |

## Workflow Permissions

All workflows follow the principle of least privilege.

## GitHub Repository Settings

Ensure the following are enabled in **Settings** > **Code security and analysis**:

- **Dependency graph**: Enabled
- **Dependabot alerts**: Enabled
- **Code scanning**: Enabled
- **Secret scanning**: Enabled
