# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-18

### Added

- 13 MCP tools: `search_legislation`, `get_provision`, `list_sources`, `validate_citation`, `build_legal_stance`, `format_citation`, `check_currency`, `get_eu_basis`, `get_uk_implementations`, `search_eu_implementations`, `get_provision_eu_basis`, `validate_eu_compliance`, `about`
- Dual-transport MCP: stdio (npm) and Streamable HTTP (Vercel)
- SQLite + FTS5 database with BM25 relevance ranking
- EU cross-reference layer: directive/regulation linkage with CELEX numbers
- Golden contract tests (18 test cases) and drift detection (5 hash anchors)
- 6-layer security scanning (CodeQL, Semgrep, Trivy, Gitleaks, Socket Security, OSSF Scorecard)
- Strategy B runtime database download for Vercel serverless deployment
- Health endpoint with keep-warm cron (`*/5 * * * *`)
- Response metadata with data freshness tracking and staleness warnings

### Fixed

- Mixed-content XML parsing: inline `<ref>` elements in Akoma Ntoso XML no longer displace surrounding text (`flattenInlineRefs`)
- EU document titles populated correctly (previously stored as null)
- FTS5 unclosed quote crash: unbalanced double quotes are now auto-closed
- HTTP transport now exposes the `about` tool (was missing `AboutContext`)

### Security

- Upgraded `@vercel/node` to 5.6.4 (fixes tar, esbuild vulnerabilities)
- All database queries use parameterized statements
- FTS5 input sanitised: max query length (1000 chars), smart quote normalisation, dangerous character stripping

### Known Limitations

- Statutory Instruments (secondary legislation) are not yet included
- Provisions with sub-paragraphs store introductory text at subsection level; sub-paragraphs are separate provisions
- EU cross-references are auto-extracted and may miss indirect references
- Case law and preparatory works (Hansard) are not yet included
- Online Safety Act uses `partially_in_force` status not representable in schema (stored as `in_force`)
- 5 moderate/high npm audit findings remain in `@vercel/node` transitive dependencies (ajv, path-to-regexp, undici) — awaiting upstream fix
