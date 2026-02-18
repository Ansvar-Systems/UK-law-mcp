/**
 * list_sources — Returns metadata about data sources, coverage, and freshness.
 *
 * Required by the Ansvar Law MCP standard tool set.
 */

import type { Database } from '@ansvar/mcp-sqlite';
import { generateResponseMetadata, type ToolResponse } from '../utils/metadata.js';

export interface ListSourcesResult {
  jurisdiction: string;
  sources: Array<{
    name: string;
    authority: string;
    url: string;
    license: string;
    coverage: string;
    languages: string[];
  }>;
  database: {
    tier: string;
    schema_version: string;
    built_at: string;
    document_count: number;
    provision_count: number;
    eu_document_count: number;
  };
  limitations: string[];
}

function safeCount(db: Database, sql: string): number {
  try {
    const row = db.prepare(sql).get() as { count: number } | undefined;
    return row ? Number(row.count) : 0;
  } catch {
    return 0;
  }
}

function safeMetaValue(db: Database, key: string): string {
  try {
    const row = db.prepare('SELECT value FROM db_metadata WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

export async function listSources(db: Database): Promise<ToolResponse<ListSourcesResult>> {
  const documentCount = safeCount(db, 'SELECT COUNT(*) as count FROM legal_documents');
  const provisionCount = safeCount(db, 'SELECT COUNT(*) as count FROM legal_provisions');
  const euDocumentCount = safeCount(db, 'SELECT COUNT(*) as count FROM eu_documents');

  return {
    results: {
      jurisdiction: 'United Kingdom (GB)',
      sources: [
        {
          name: 'legislation.gov.uk',
          authority: 'The National Archives',
          url: 'https://www.legislation.gov.uk',
          license: 'Open Government Licence v3.0',
          coverage: 'UK Acts of Parliament, Statutory Instruments, retained EU law. Initial scope: cybersecurity and data protection legislation.',
          languages: ['en'],
        },
        {
          name: 'EUR-Lex',
          authority: 'Publications Office of the European Union',
          url: 'https://eur-lex.europa.eu',
          license: 'Commission Decision 2011/833/EU (reuse of EU documents)',
          coverage: 'EU directive and regulation references extracted from UK statute text for cross-referencing.',
          languages: ['en'],
        },
      ],
      database: {
        tier: safeMetaValue(db, 'tier'),
        schema_version: safeMetaValue(db, 'schema_version'),
        built_at: safeMetaValue(db, 'built_at'),
        document_count: documentCount,
        provision_count: provisionCount,
        eu_document_count: euDocumentCount,
      },
      limitations: [
        `Covers ${documentCount.toLocaleString()} UK Acts of Parliament. Statutory Instruments (secondary legislation) are not yet included.`,
        'Provisions with sub-paragraphs (e.g., s1(1)(a)(b)) store the introductory text at the subsection level; sub-paragraphs are separate provisions.',
        'EU cross-references are auto-extracted from statute text and may not capture all indirect references.',
        'Case law and preparatory works (Hansard) are not yet included.',
        'Always verify against official legislation.gov.uk publications when legal certainty is required.',
      ],
    },
    _metadata: generateResponseMetadata(db),
  };
}
