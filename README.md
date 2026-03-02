# UK Law MCP Server

**The legislation.gov.uk alternative for the AI age.**

[![npm version](https://badge.fury.io/js/@ansvar%2Fuk-law-mcp.svg)](https://www.npmjs.com/package/@ansvar/uk-law-mcp)
[![MCP Registry](https://img.shields.io/badge/MCP-Registry-blue)](https://registry.modelcontextprotocol.io)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![GitHub stars](https://img.shields.io/github/stars/Ansvar-Systems/UK-law-mcp?style=social)](https://github.com/Ansvar-Systems/UK-law-mcp)
[![CI](https://github.com/Ansvar-Systems/UK-law-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Ansvar-Systems/UK-law-mcp/actions/workflows/ci.yml)
[![Daily Data Check](https://github.com/Ansvar-Systems/UK-law-mcp/actions/workflows/check-updates.yml/badge.svg)](https://github.com/Ansvar-Systems/UK-law-mcp/actions/workflows/check-updates.yml)
[![Database](https://img.shields.io/badge/database-pre--built-green)](docs/EU_INTEGRATION_GUIDE.md)
[![Provisions](https://img.shields.io/badge/provisions-512%2C651-blue)](docs/EU_INTEGRATION_GUIDE.md)

Query **3,241 UK statutes** -- from the UK GDPR and Computer Misuse Act to the Employment Rights Act, Companies Act, and more -- directly from Claude, Cursor, or any MCP-compatible client.

If you're building legal tech, compliance tools, or doing UK legal research, this is your verified reference database.

Built by [Ansvar Systems](https://ansvar.eu) -- Stockholm, Sweden

---

## Why This Exists

UK legal research is scattered across legislation.gov.uk, BAILII, and EUR-Lex retained EU law indexes. Whether you're:
- A **lawyer** validating citations in a brief or contract
- A **compliance officer** checking if a statute is still in force or has been amended post-Brexit
- A **legal tech developer** building tools on UK law
- A **researcher** tracing legislative history from Bill to Act

...you shouldn't need dozens of browser tabs and manual PDF cross-referencing. Ask Claude. Get the exact provision. With context.

This MCP server makes UK law **searchable, cross-referenceable, and AI-readable**.

---

## Quick Start

### Use Remotely (No Install Needed)

> Connect directly to the hosted version -- zero dependencies, nothing to install.

**Endpoint:** `https://uk-law-mcp.vercel.app/mcp`

| Client | How to Connect |
|--------|---------------|
| **Claude.ai** | Settings > Connectors > Add Integration > paste URL |
| **Claude Code** | `claude mcp add uk-law --transport http https://uk-law-mcp.vercel.app/mcp` |
| **Claude Desktop** | Add to config (see below) |
| **GitHub Copilot** | Add to VS Code settings (see below) |

**Claude Desktop** -- add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "uk-law": {
      "type": "url",
      "url": "https://uk-law-mcp.vercel.app/mcp"
    }
  }
}
```

**GitHub Copilot** -- add to VS Code `settings.json`:

```json
{
  "github.copilot.chat.mcp.servers": {
    "uk-law": {
      "type": "http",
      "url": "https://uk-law-mcp.vercel.app/mcp"
    }
  }
}
```

### Use Locally (npm)

```bash
npx @ansvar/uk-law-mcp
```

**Claude Desktop** -- add to `claude_desktop_config.json`:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "uk-law": {
      "command": "npx",
      "args": ["-y", "@ansvar/uk-law-mcp"]
    }
  }
}
```

**Cursor / VS Code:**

```json
{
  "mcp.servers": {
    "uk-law": {
      "command": "npx",
      "args": ["-y", "@ansvar/uk-law-mcp"]
    }
  }
}
```

## Example Queries

Once connected, just ask naturally:

- *"What does the UK GDPR say about data subject rights?"*
- *"Is the Computer Misuse Act still in force?"*
- *"Find provisions about employment rights under the Employment Rights Act 1996"*
- *"What EU adequacy status does the UK hold post-Brexit?"*
- *"Which UK laws implement the equivalent of the NIS2 Directive?"*
- *"Get the text of Section 7 of the Data Protection Act 2018"*
- *"Compare data breach notification requirements across UK GDPR and DPA 2018"*
- *"Validate the citation 'Computer Misuse Act 1990, s.1'"*

---

## What's Included

| Category | Count | Details |
|----------|-------|---------|
| **Statutes** | 3,241 statutes | Acts of Parliament from legislation.gov.uk |
| **Provisions** | 512,651 sections | Full-text searchable with FTS5 |
| **Case Law** | 65,026 judgments | Premium tier -- court decisions and tribunal rulings |
| **Preparatory Works** | 3,838 documents | Explanatory Notes and Hansard references |
| **Database Size** | ~3,606 MB | Comprehensive SQLite, includes full provision text |
| **Daily Updates** | Automated | Freshness checks against legislation.gov.uk |

**Verified data only** -- every citation is validated against official sources (legislation.gov.uk). Zero LLM-generated content.

---

## See It In Action

### Why This Works

**Verbatim Source Text (No LLM Processing):**
- All statute text is ingested from legislation.gov.uk official sources
- Provisions are returned **unchanged** from SQLite FTS5 database rows
- Zero LLM summarization or paraphrasing -- the database contains statute text, not AI interpretations

**Smart Context Management:**
- Search returns ranked provisions with BM25 scoring (safe for context)
- Provision retrieval gives exact text by Act name and section number
- Cross-references help navigate without loading everything at once

**Technical Architecture:**
```
legislation.gov.uk API --> Parse --> SQLite --> FTS5 snippet() --> MCP response
                             ^                        ^
                      Provision parser         Verbatim database query
```

### Traditional Research vs. This MCP

| Traditional Approach | This MCP Server |
|---------------------|-----------------|
| Search legislation.gov.uk by Act name | Search by plain English: *"data subject access request"* |
| Navigate multi-part statutes manually | Get the exact provision with context |
| Manual cross-referencing between Acts | `build_legal_stance` aggregates across sources |
| "Is this statute still in force?" -- check manually | `check_currency` tool -- answer in seconds |
| Find EU alignment -- dig through retained EU law index | `get_eu_basis` -- linked EU instruments instantly |
| Check 5+ sites for amendments | Daily automated freshness checks |
| No API, no integration | MCP protocol -- AI-native |

**Traditional:** Search legislation.gov.uk --> Download PDF --> Ctrl+F --> Cross-reference with Explanatory Notes --> Check for amendments --> Repeat

**This MCP:** *"What does the UK GDPR say about data subject rights and how does it differ from the EU GDPR?"* --> Done.

---

## Available Tools (13)

### Core Legal Research Tools (8)

| Tool | Description |
|------|-------------|
| `search_legislation` | FTS5 search on 512,651 provisions with BM25 ranking |
| `get_provision` | Retrieve specific provision by Act name and section number |
| `validate_citation` | Validate citation against database (zero-hallucination check) |
| `build_legal_stance` | Aggregate citations from statutes, case law, and preparatory works |
| `format_citation` | Format citations per UK conventions (full/short/pinpoint) |
| `check_currency` | Check if statute is in force, amended, or repealed |
| `list_sources` | List all available statutes with metadata and data provenance |
| `about` | Server info, capabilities, dataset statistics, and coverage summary |

### EU/International Law Integration Tools (5)

| Tool | Description |
|------|-------------|
| `get_eu_basis` | Get EU instruments that UK statutes derive from or align with |
| `get_uk_implementations` | Find UK laws implementing or derived from a specific EU act |
| `search_eu_implementations` | Search EU documents with UK implementation and retention counts |
| `get_provision_eu_basis` | Get EU law references for a specific UK provision |
| `validate_eu_compliance` | Check UK implementation or adequacy status against EU directives |

---

## EU Law Integration

The UK left the EU on 31 January 2020. The relationship between UK law and EU law is now one of **adequacy and alignment**, not membership.

| Topic | Status |
|-------|--------|
| **EU Adequacy Decision** | UK holds GDPR Article 45 adequacy decisions for England, Wales, Scotland, Northern Ireland, and Gibraltar (granted June 2021) |
| **Retained EU Law** | Significant body of EU-derived law was retained at exit under the European Union (Withdrawal) Act 2018, now progressively reviewed |
| **UK GDPR** | Near-identical to EU GDPR with UK-specific modifications -- the EU tools show alignment between UK GDPR and EU GDPR |
| **NIS Regulations** | UK implemented NIS before Brexit; UK NIS 2 equivalent under development |

The EU bridge tools in this MCP let you trace which UK statutes derive from EU directives, which provisions align with EU regulatory requirements, and where post-Brexit divergence has occurred.

> **Note:** EU cross-references reflect derivation and alignment relationships. The UK is no longer subject to EU law, but understanding the EU origin of UK statutes is essential for cross-border compliance work.

---

## Data Sources & Freshness

All content is sourced from authoritative UK legal databases:

- **[legislation.gov.uk](https://www.legislation.gov.uk/)** -- The official UK legislation database (National Archives)
- **[BAILII](https://www.bailii.org/)** -- British and Irish Legal Information Institute (case law, premium tier)

### Data Provenance

| Field | Value |
|-------|-------|
| **Authority** | The National Archives / King's Printer |
| **Retrieval method** | legislation.gov.uk API |
| **Language** | English |
| **License** | Open Parliament Licence / Open Government Licence |
| **Coverage** | 3,241 Acts from legislation.gov.uk |

### Automated Freshness Checks (Daily)

A [daily GitHub Actions workflow](.github/workflows/check-updates.yml) monitors legislation.gov.uk for changes:

| Check | Method |
|-------|--------|
| **Statute amendments** | Drift detection against known provision anchors |
| **New statutes** | Comparison against legislation.gov.uk index |
| **Repealed statutes** | Status change detection |

**Verified data only** -- every citation is validated against official sources. Zero LLM-generated content.

---

## Security

This project uses multiple layers of automated security scanning:

| Scanner | What It Does | Schedule |
|---------|-------------|----------|
| **CodeQL** | Static analysis for security vulnerabilities | Weekly + PRs |
| **Semgrep** | SAST scanning (OWASP top 10, secrets, TypeScript) | Every push |
| **Gitleaks** | Secret detection across git history | Every push |
| **Trivy** | CVE scanning on filesystem and npm dependencies | Daily |
| **Docker Security** | Container image scanning + SBOM generation | Daily |
| **Socket.dev** | Supply chain attack detection | PRs |
| **OSSF Scorecard** | OpenSSF best practices scoring | Weekly |
| **Dependabot** | Automated dependency updates | Weekly |

See [SECURITY.md](SECURITY.md) for the full policy and vulnerability reporting.

---

## Important Disclaimers

### Legal Advice

> **THIS TOOL IS NOT LEGAL ADVICE**
>
> Statute text is sourced from legislation.gov.uk (The National Archives). However:
> - This is a **research tool**, not a substitute for professional legal counsel
> - **Court case coverage is in the premium tier** -- do not rely solely on this for case law research without the premium database
> - **Verify critical citations** against primary sources for court filings
> - **EU cross-references** reflect derivation and alignment, not current EU membership
> - **Northern Ireland** has specific post-Brexit legal arrangements (Windsor Framework) that may not be fully reflected

**Before using professionally, read:** [DISCLAIMER.md](DISCLAIMER.md) | [PRIVACY.md](PRIVACY.md)

### Client Confidentiality

Queries go through the Claude API. For privileged or confidential matters, use on-premise deployment. See [PRIVACY.md](PRIVACY.md) for Law Society compliance guidance.

> For guidance from your bar association: **The Law Society** (England & Wales) | **Law Society of Scotland** | **Law Society of Northern Ireland**

---

## Documentation

- **[EU Integration Guide](docs/EU_INTEGRATION_GUIDE.md)** -- Detailed EU cross-reference documentation
- **[EU Usage Examples](docs/EU_USAGE_EXAMPLES.md)** -- Practical EU lookup examples
- **[Security Policy](SECURITY.md)** -- Vulnerability reporting and scanning details
- **[Disclaimer](DISCLAIMER.md)** -- Legal disclaimers and professional use notices
- **[Privacy](PRIVACY.md)** -- Client confidentiality and data handling

---

## Development

### Setup

```bash
git clone https://github.com/Ansvar-Systems/UK-law-mcp
cd UK-law-mcp
npm install
npm run build
npm test
```

### Running Locally

```bash
npm run dev                                       # Start MCP server
npx @anthropic/mcp-inspector node dist/index.js   # Test with MCP Inspector
```

### Data Management

```bash
npm run ingest                    # Ingest statutes from legislation.gov.uk
npm run build:db                  # Rebuild SQLite database
npm run drift:detect              # Run drift detection against anchors
npm run check-updates             # Check for amendments and new Acts
```

### Performance

- **Search Speed:** <100ms for most FTS5 queries
- **Database Size:** ~3,606 MB (comprehensive -- full UK statute corpus)
- **Reliability:** 100% ingestion success rate across 3,241 statutes

---

## Related Projects: Complete Compliance Suite

This server is part of **Ansvar's Compliance Suite** -- MCP servers that work together for end-to-end compliance coverage:

### [@ansvar/eu-regulations-mcp](https://github.com/Ansvar-Systems/EU_compliance_MCP)
**Query 49 EU regulations directly from Claude** -- GDPR, AI Act, DORA, NIS2, MiFID II, eIDAS, and more. Full regulatory text with article-level search. `npx @ansvar/eu-regulations-mcp`

### @ansvar/uk-law-mcp (This Project)
**Query 3,241 UK statutes directly from Claude** -- UK GDPR, DPA 2018, Computer Misuse Act, Employment Rights Act, and more. Full provision text with EU derivation cross-references. `npx @ansvar/uk-law-mcp`

### [@ansvar/us-regulations-mcp](https://github.com/Ansvar-Systems/US_Compliance_MCP)
**Query US federal and state compliance laws** -- HIPAA, CCPA, SOX, GLBA, FERPA, and more. `npx @ansvar/us-regulations-mcp`

### [@ansvar/security-controls-mcp](https://github.com/Ansvar-Systems/security-controls-mcp)
**Query 261 security frameworks** -- ISO 27001, NIST CSF, SOC 2, CIS Controls, SCF, and more. `npx @ansvar/security-controls-mcp`

### [@ansvar/automotive-cybersecurity-mcp](https://github.com/Ansvar-Systems/Automotive-MCP)
**Query UNECE R155/R156 and ISO 21434** -- Automotive cybersecurity compliance. `npx @ansvar/automotive-cybersecurity-mcp`

### [@ansvar/sanctions-mcp](https://github.com/Ansvar-Systems/Sanctions-MCP)
**Offline-capable sanctions screening** -- OFAC, EU, UN sanctions lists. `pip install ansvar-sanctions-mcp`

**70+ national law MCPs** covering Australia, Brazil, Canada, Chile, Denmark, Finland, France, Germany, Ireland, Italy, Japan, Netherlands, Norway, Peru, Sweden, Switzerland, and more.

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Priority areas:
- Court case law expansion (BAILII integration)
- Northern Ireland-specific legal provisions
- Scottish law divergence tracking
- Historical statute versions and amendment tracking

---

## Roadmap

- [x] Core statute database with FTS5 search
- [x] Full corpus ingestion (3,241 statutes, 512,651 provisions)
- [x] EU/international law alignment tools
- [x] Vercel Streamable HTTP deployment
- [x] npm package publication
- [x] Daily freshness checks against legislation.gov.uk
- [x] Premium case law (65,026 judgments)
- [x] Premium preparatory works (3,838 documents)
- [ ] Northern Ireland Windsor Framework annotations
- [ ] Scottish law divergence markers
- [ ] Historical statute versions (amendment tracking)
- [ ] Welsh language provision coverage

---

## Citation

If you use this MCP server in academic research:

```bibtex
@software{uk_law_mcp_2026,
  author = {Ansvar Systems AB},
  title = {UK Law MCP Server: Production-Grade Legal Research Tool},
  year = {2026},
  url = {https://github.com/Ansvar-Systems/UK-law-mcp},
  note = {3,241 UK statutes with 512,651 provisions sourced from legislation.gov.uk}
}
```

---

## License

Apache License 2.0. See [LICENSE](./LICENSE) for details.

### Data Licenses

- **Statutes:** The National Archives (Open Parliament Licence / Open Government Licence)
- **Case Law:** BAILII (used under terms of service, premium tier)
- **EU Metadata:** EUR-Lex (EU public domain)

---

## About Ansvar Systems

We build AI-accelerated compliance and legal research tools for the global market. This MCP server makes 3,241 UK statutes searchable from any AI client -- no browser tabs, no PDFs, no manual cross-referencing.

**[ansvar.eu](https://ansvar.eu)** -- Stockholm, Sweden

---

<p align="center">
  <sub>Built with care in Stockholm, Sweden</sub>
</p>
