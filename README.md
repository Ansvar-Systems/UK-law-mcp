# UK Law MCP

MCP server for UK Law — 3,241 statutes from www.legislation.gov.uk

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-spec--compliant-green.svg)](https://modelcontextprotocol.io)
[![Jurisdiction](https://img.shields.io/badge/Jurisdiction-GB-informational.svg)](#coverage)

## What this is

Self-hostable MCP server providing search and retrieval over UK Law — 3,241 statutes and 512,651 provisions, indexed from www.legislation.gov.uk via the included ingestion script.

Part of the Ansvar MCP fleet — source-available servers published for self-hosting.

## Coverage

- **Corpus:** UK Law — 3,241 statutes, 512,651 provisions
- **Jurisdiction code:** `GB`
- **Corpus snapshot:** 2026-02-22

The corpus is rebuilt from the upstream sources by the included ingestion
script; re-run periodically to refresh. See **Sources** below for source URLs,
terms, and reuse conditions.

## Two ways to use it

**Self-host (free, Apache 2.0)** — clone this repo, run the ingestion script
to build your local database from the listed upstream sources, point your MCP
client at the local server. Instructions below.

**Trial the hosted gateway (paid pilot, B2B)** — for production use against
the curated, kept-fresh corpus across the full Ansvar MCP fleet at once, with
citation enrichment, multi-jurisdiction fan-out, and audit-ledgered query
logs, see [ansvar.eu](https://ansvar.eu).

## Self-hosting

### Install

```bash
git clone https://github.com/Ansvar-Systems/UK-law-mcp.git
cd UK-law-mcp
npm install
```

### Build the database

```bash
npm run ingest
```

Ingestion fetches from the upstream source(s) listed under **Sources** below and builds a local SQLite database. Re-run periodically to refresh. Inspect the ingestion script (`scripts/ingest-*.ts` or `scripts/ingest-*.py`) for the actual access method (open API, bulk download, HTML scrape, or feed) and review the source's published terms before running it in a commercial deployment.

### Configure your MCP client

```json
{
  "mcpServers": {
    "uk-law-mcp": {
      "command": "node",
      "args": ["dist/index.js"]
    }
  }
}
```

## Sources

| Source | Source URL | Terms / license URL | License basis | Attribution required | Commercial use | Redistribution / caching | Notes |
|---|---|---|---|---|---|---|---|
| [legislation.gov.uk](https://www.legislation.gov.uk) | https://www.legislation.gov.uk | [Terms](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/) | Open Government Licence v3.0 | Yes | Yes | Yes | Free to copy, publish, distribute, and adapt with attribution |

## What this repository does not provide

This repository's source — the MCP server code, schema, and ingestion script
— is licensed under Apache 2.0. The license below covers the code in this
repository only; it does not extend to the upstream legal materials that
the ingestion script downloads.{{TRANSITIONAL_DATA_NOTE}}

Running ingestion may download, cache, transform, and index materials from the
listed upstream sources. You are responsible for confirming that your use of
those materials complies with the source terms, attribution requirements,
robots/rate limits, database rights, copyright rules, and any commercial-use
or redistribution limits that apply in your jurisdiction.

## License

Apache 2.0 — see [LICENSE](LICENSE). Commercial use, modification, and
redistribution of **the source code in this repository** are permitted under
that license. The license does not extend to upstream legal materials
downloaded by the ingestion script; those remain governed by the source
jurisdictions' own publishing terms (see Sources above).

## The Ansvar gateway

If you'd rather not self-host, [ansvar.eu](https://ansvar.eu) provides this
MCP plus the full Ansvar fleet through a single OAuth-authenticated endpoint,
with the curated production corpus, multi-MCP query orchestration, citation
enrichment, and (on the company tier) a per-tenant cryptographic audit
ledger. Pilot mode, B2B only.
