/**
 * search_preparatory_works — Full-text search across UK Parliament Bills and
 * House of Commons parliamentary debates.
 *
 * Premium-tier tool. Gated behind PREMIUM_ENABLED env var at registration time
 * (see registry.ts). Two row types live in the preparatory_works table,
 * distinguished by the `type` column:
 *
 *   - type='bill' — UK Parliament Bills API
 *     Source: https://bills-api.parliament.uk
 *     Licence: Open Parliament Licence v3.0 (parliamentary copyright, distinct
 *     from OGL-3.0 Crown copyright)
 *
 *   - type='parliamentary_debate' — House of Commons debates
 *     Source: ParlaMint-GB corpus (clarin-pl on HuggingFace, mirroring CLARIN.SI)
 *     Licence: CC-BY-4.0
 *
 * Both upstream sources permit commercial reuse with attribution; see
 * docs/audits/2026-05-12-licensing-fleet/uk-law-mcp.md and
 * infrastructure/policy/source-authority-registry.yml in arch-docs for the
 * full provenance chain.
 */

import type { Database } from '@ansvar/mcp-sqlite';
import { buildFtsQueryVariants } from '../utils/fts-query.js';
import { generateResponseMetadata, type ToolResponse } from '../utils/metadata.js';

export type PreparatoryWorkType = 'bill' | 'parliamentary_debate';

export interface SearchPreparatoryWorksInput {
  query: string;
  type?: PreparatoryWorkType;
  session?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
}

export interface PreparatoryWorkResult {
  document_id: string;
  type: PreparatoryWorkType;
  title: string;
  sponsor: string | null;
  originating_house: string | null;
  session: string | null;
  date_introduced: string | null;
  royal_assent_date: string | null;
  is_act: boolean;
  url: string | null;
  summary_snippet: string;
  relevance: number;
  _meta: {
    source: string;
    attribution: string;
    licence: string;
  };
}

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const ATTRIBUTION: Record<PreparatoryWorkType, PreparatoryWorkResult['_meta']> = {
  bill: {
    source: 'bills-api.parliament.uk',
    attribution: 'Contains Parliamentary information licensed under the Open Parliament Licence v3.0',
    licence: 'Open-Parliament-Licence-v3.0',
  },
  parliamentary_debate: {
    source: 'huggingface.co/datasets/clarin-pl/ParlaMint-GB (mirror of CLARIN.SI)',
    attribution: 'ParlaMint-GB v5.0 © contributors, CC-BY-4.0 (House of Commons debates 2015–2022)',
    licence: 'CC-BY-4.0',
  },
};

export async function searchPreparatoryWorks(
  db: Database,
  input: SearchPreparatoryWorksInput,
): Promise<ToolResponse<PreparatoryWorkResult[]>> {
  if (!input.query || input.query.trim().length === 0) {
    return {
      results: [],
      _metadata: generateResponseMetadata(db),
    };
  }

  const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const queryVariants = buildFtsQueryVariants(input.query);

  let sql = `
    SELECT
      pw.document_id,
      pw.type,
      pw.title,
      pw.sponsor,
      pw.originating_house,
      pw.session,
      pw.date_introduced,
      pw.royal_assent_date,
      pw.is_act,
      pw.url,
      snippet(preparatory_works_fts, 1, '>>>', '<<<', '...', 32) as summary_snippet,
      bm25(preparatory_works_fts) as relevance
    FROM preparatory_works_fts
    JOIN preparatory_works pw ON pw.id = preparatory_works_fts.rowid
    WHERE preparatory_works_fts MATCH ?
  `;

  const params: (string | number)[] = [];

  if (input.type) {
    sql += ` AND pw.type = ?`;
    params.push(input.type);
  }

  if (input.session) {
    sql += ` AND pw.session = ?`;
    params.push(input.session);
  }

  if (input.date_from) {
    sql += ` AND pw.date_introduced >= ?`;
    params.push(input.date_from);
  }

  if (input.date_to) {
    sql += ` AND pw.date_introduced <= ?`;
    params.push(input.date_to);
  }

  sql += ` ORDER BY relevance LIMIT ?`;
  params.push(limit);

  const runQuery = (ftsQuery: string): PreparatoryWorkResult[] => {
    const bound = [ftsQuery, ...params];
    const rows = db
      .prepare(sql)
      .all(...bound) as Array<Omit<PreparatoryWorkResult, '_meta' | 'is_act'> & { is_act: number }>;

    return rows.map((r) => ({
      ...r,
      is_act: r.is_act === 1,
      _meta: ATTRIBUTION[r.type as PreparatoryWorkType] ?? ATTRIBUTION.bill,
    }));
  };

  let results: PreparatoryWorkResult[] = [];
  for (const variant of queryVariants) {
    results = runQuery(variant);
    if (results.length > 0) break;
  }

  return {
    results,
    _metadata: generateResponseMetadata(db),
  };
}
