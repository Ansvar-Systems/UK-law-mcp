# UK Law MCP

Production MCP server for UK legislation search, provision retrieval, citation validation, and EU cross-reference support.

## Capabilities

- `search_legislation`: FTS search over UK provisions.
- `get_provision`: Retrieve one provision or all provisions in a statute.
- `validate_citation`: Validate UK citations against the local database.
- `format_citation`: Normalize citation output format.
- `check_currency`: Check in-force status for statutes/provisions.
- `get_eu_basis`, `get_uk_implementations`, `search_eu_implementations`
- `get_provision_eu_basis`, `validate_eu_compliance`

## Branching Strategy

This repository uses a `dev` integration branch. **Do not push directly to `main`.**

```
feature-branch → PR to dev → verify on dev → PR to main → deploy
```

- `main` is production-ready. Only receives merges from `dev` via PR.
- `dev` is the integration branch. All changes land here first.
- Feature branches are created from `dev`.

## Local Development

```bash
npm ci
npm run build
npm test
```

Run stdio server:

```bash
npm run dev
```

Build database from seeds:

```bash
npm run build:db
```

## Golden Contract Tests

Run contract suite:

```bash
npm run test:contract
```

Nightly-mode checks (URL/hash assertions) are gated behind `CONTRACT_MODE=nightly`.

## Data Freshness and Drift

Update checker:

```bash
npm run check-updates
```

- Exit `0`: no updates found
- Exit `1`: updates found
- Exit `2`: checker error

Drift detector:

```bash
npm run drift:detect
```

- Exit `0`: no drift
- Exit `1`: detector/network errors
- Exit `2`: drift detected

## Vercel Deployment

`/mcp` is served by `api/mcp.ts` (Streamable HTTP MCP transport).  
`/health` and `/version` are served by `api/health.ts`.

Required for GitHub Actions deploy workflow:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Deployment workflow file: `.github/workflows/vercel-deploy.yml`.

## Scheduled Automation

- CI + contract tests: `.github/workflows/ci.yml`
- Daily update checks: `.github/workflows/check-updates.yml`
- Daily drift detection: `.github/workflows/drift-detect.yml`
