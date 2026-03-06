# Privacy & Client Confidentiality

**IMPORTANT READING FOR LEGAL PROFESSIONALS**

This document addresses privacy and confidentiality considerations when using this Tool, with particular attention to professional obligations under UK solicitor and barrister regulatory rules.

---

## Executive Summary

**Key Risks:**
- Queries through Claude API flow via Anthropic cloud infrastructure
- Query content may reveal client matters and privileged information
- UK professional conduct rules (SRA Code of Conduct, BSB Handbook) require strict client confidentiality and appropriate data processing controls

**Safe Use Options:**
1. **General Legal Research**: Use Tool for non-client-specific queries
2. **Local npm Package**: Install `@ansvar/uk-law-mcp` locally — database queries stay on your machine
3. **Remote Endpoint**: Vercel Streamable HTTP endpoint — queries transit Vercel infrastructure
4. **On-Premise Deployment**: Self-host with local LLM for privileged matters

---

## Data Flows and Infrastructure

### MCP (Model Context Protocol) Architecture

This Tool uses the **Model Context Protocol (MCP)** to communicate with AI clients:

```
User Query -> MCP Client (Claude Desktop/Cursor/API) -> Anthropic Cloud -> MCP Server -> Database
```

### Deployment Options

#### 1. Local npm Package (Most Private)

```bash
npx @ansvar/uk-law-mcp
```

- Database is local SQLite file on your machine
- No data transmitted to external servers (except to AI client for LLM processing)
- Full control over data at rest

#### 2. Remote Endpoint (Vercel)

```
Endpoint: https://uk-law-mcp.vercel.app/mcp
```

- Queries transit Vercel infrastructure
- Tool responses return through the same path
- Subject to Vercel's privacy policy

### What Gets Transmitted

When you use this Tool through an AI client:

- **Query Text**: Your search queries and tool parameters
- **Tool Responses**: Statute text, provision content, search results
- **Metadata**: Timestamps, request identifiers

**What Does NOT Get Transmitted:**
- Files on your computer
- Your full conversation history (depends on AI client configuration)

---

## Professional Obligations (United Kingdom)

### Solicitors Regulation Authority (SRA)

Solicitors in England and Wales are bound by the **SRA Code of Conduct for Solicitors, RELs and RFLs**. Key obligations when using AI tools:

#### Duty of Confidentiality

- All client communications are confidential under Principle 6 and Rule 6.3
- Client identity may itself be confidential in sensitive matters
- Case strategy and legal analysis are protected
- Information that could identify clients or matters must be safeguarded
- Breach may result in SRA disciplinary action or referral to the Solicitors Disciplinary Tribunal

### Bar Standards Board (BSB)

Barristers are regulated by the **BSB Handbook**. Key obligations:

- Core Duty 6: Maintain the confidentiality of client affairs
- rC16: Do not disclose confidential information to any third party without client consent
- Consider whether AI tool use constitutes disclosure to a third party requiring client consent

### Law Society of England and Wales

The Law Society has published guidance on AI tool use. Consult the latest guidance at lawsociety.org.uk before deploying AI tools in client work.

### UK GDPR and the Data Protection Act 2018

Under **UK GDPR** (the retained version of EU GDPR) and the **Data Protection Act 2018**:

- You are the **Data Controller** for client personal data
- AI service providers (Anthropic, Vercel) may be **Data Processors**
- A **Data Processing Agreement** may be required before transmitting any personal data to these services
- Ensure adequate technical and organisational measures (TOMs) are in place
- The **Information Commissioner's Office (ICO)** oversees compliance — ico.org.uk
- International transfers of personal data (e.g., to US-based Anthropic) require appropriate safeguards under UK GDPR Chapter V

---

## Risk Assessment by Use Case

### LOW RISK: General Legal Research

**Safe to use through any deployment:**

```
Example: "What does Section 14 of the Consumer Rights Act 2015 say about satisfactory quality?"
```

- No client identity involved
- No case-specific facts
- Publicly available legal information

### MEDIUM RISK: Anonymized Queries

**Use with caution:**

```
Example: "What are the sentencing guidelines for fraud offences under the Fraud Act 2006?"
```

- Query pattern may reveal the nature of a matter you are working on
- Anthropic/Vercel logs may link queries to your API key

### HIGH RISK: Client-Specific Queries

**DO NOT USE through cloud AI services:**

- Remove ALL identifying details
- Use the local npm package with a self-hosted LLM
- Or use commercial legal databases (Westlaw UK, LexisNexis) with proper data processing agreements

---

## Data Collection by This Tool

### What This Tool Collects

**Nothing.** This Tool:

- Does NOT log queries
- Does NOT store user data
- Does NOT track usage
- Does NOT use analytics
- Does NOT set cookies

The database is read-only. No user data is written to disk.

### What Third Parties May Collect

- **Anthropic** (if using Claude): Subject to [Anthropic Privacy Policy](https://www.anthropic.com/legal/privacy)
- **Vercel** (if using remote endpoint): Subject to [Vercel Privacy Policy](https://vercel.com/legal/privacy-policy)

---

## Recommendations

### For Solo Practitioners / Small Firms

1. Use local npm package for maximum privacy
2. General research: Cloud AI is acceptable for non-client queries
3. Client matters: Use commercial legal databases (Westlaw UK, LexisNexis) with proper data processing agreements

### For Large Firms / Corporate Legal

1. Negotiate Data Processing Agreements with AI service providers before any client data is transmitted
2. Consider on-premise deployment with self-hosted LLM
3. Train staff on safe vs. unsafe query patterns
4. Review ICO guidance on AI and data protection

### For Government / Public Sector

1. Use self-hosted deployment, no external APIs
2. Follow NCSC and Cabinet Office guidance on AI tool use in government
3. Air-gapped option available for sensitive matters

---

## Questions and Support

- **Privacy Questions**: Open issue on [GitHub](https://github.com/Ansvar-Systems/UK-law-mcp/issues)
- **Anthropic Privacy**: Contact privacy@anthropic.com
- **SRA Guidance**: Consult the SRA ethics helpline or published AI guidance at sra.org.uk
- **BSB Guidance**: Consult BSB professional practice guidance at barstandardsboard.org.uk
- **ICO Guidance**: Consult ico.org.uk for data protection queries

---

**Last Updated**: 2026-03-06
**Tool Version**: 1.0.0
