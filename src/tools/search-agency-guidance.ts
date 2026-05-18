/**
 * search_agency_guidance — Full-text search across UK regulatory agency
 * enforcement decisions and guidance.
 *
 * Premium-tier tool. Gated behind PREMIUM_ENABLED env var at registration time.
 *
 * Coverage:
 *   - agency='cma' — Competition and Markets Authority enforcement decisions,
 *     market studies, merger inquiries, CA98/civil cartel cases.
 *     Source: https://www.gov.uk/cma (and cma-cases)
 *     Licence: Open Government Licence v3.0 (Crown copyright via Cabinet
 *     Office / GDS)
 *
 *   - agency='ico' — Information Commissioner's Office enforcement notices,
 *     monetary penalties, reprimands, DPIA guidance.
 *     Source: https://ico.org.uk
 *     Licence: Open Government Licence v3.0 (Crown copyright, non-departmental
 *     public body)
 *
 * Both upstream sources permit commercial reuse with attribution under OGL-3.0;
 * see infrastructure/policy/source-authority-registry.yml in arch-docs for the
 * full provenance chain.
 *
 * Note on duplication with sector MCPs: british-competition (CMA decisions and
 * mergers) and british-data-protection (ICO enforcement) cover overlapping
 * data via the sector-MCP fleet. This tool surfaces the same corpus inside the
 * uk-law MCP for the uk-law-shaped search flow where a customer wants
 * agency outputs alongside statutes from the same MCP.
 */

import type { Database } from '@ansvar/mcp-sqlite';
import { buildFtsQueryVariants } from '../utils/fts-query.js';
import { generateResponseMetadata, type ToolResponse } from '../utils/metadata.js';

export type AgencyCode = 'cma' | 'ico';

export interface SearchAgencyGuidanceInput {
  query: string;
  agency?: AgencyCode;
  action_type?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
}

export interface AgencyGuidanceResult {
  document_id: string;
  agency: AgencyCode;
  title: string;
  action_type: string | null;
  organisation_name: string | null;
  legislation_cited: string | null;
  penalty_amount: number | null;
  penalty_currency: string | null;
  issued_date: string | null;
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

const ATTRIBUTION: Record<AgencyCode, AgencyGuidanceResult['_meta']> = {
  cma: {
    source: 'www.gov.uk/cma',
    attribution: 'Contains public sector information licensed under the Open Government Licence v3.0 (CMA enforcement decisions, market studies, merger inquiries)',
    licence: 'OGL-3.0',
  },
  ico: {
    source: 'ico.org.uk',
    attribution: 'Contains public sector information licensed under the Open Government Licence v3.0 (ICO enforcement notices, monetary penalties, reprimands)',
    licence: 'OGL-3.0',
  },
};

export async function searchAgencyGuidance(
  db: Database,
  input: SearchAgencyGuidanceInput,
): Promise<ToolResponse<AgencyGuidanceResult[]>> {
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
      ag.document_id,
      ag.agency,
      ag.title,
      ag.action_type,
      ag.organisation_name,
      ag.legislation_cited,
      ag.penalty_amount,
      ag.penalty_currency,
      ag.issued_date,
      ag.url,
      snippet(agency_guidance_fts, 1, '>>>', '<<<', '...', 32) as summary_snippet,
      bm25(agency_guidance_fts) as relevance
    FROM agency_guidance_fts
    JOIN agency_guidance ag ON ag.id = agency_guidance_fts.rowid
    WHERE agency_guidance_fts MATCH ?
  `;

  const params: (string | number)[] = [];

  if (input.agency) {
    sql += ` AND ag.agency = ?`;
    params.push(input.agency);
  }

  if (input.action_type) {
    sql += ` AND ag.action_type = ?`;
    params.push(input.action_type);
  }

  if (input.date_from) {
    sql += ` AND ag.issued_date >= ?`;
    params.push(input.date_from);
  }

  if (input.date_to) {
    sql += ` AND ag.issued_date <= ?`;
    params.push(input.date_to);
  }

  sql += ` ORDER BY relevance LIMIT ?`;
  params.push(limit);

  const runQuery = (ftsQuery: string): AgencyGuidanceResult[] => {
    const bound = [ftsQuery, ...params];
    const rows = db.prepare(sql).all(...bound) as Omit<AgencyGuidanceResult, '_meta'>[];

    return rows.map((r) => ({
      ...r,
      _meta: ATTRIBUTION[r.agency as AgencyCode] ?? ATTRIBUTION.cma,
    }));
  };

  let results: AgencyGuidanceResult[] = [];
  for (const variant of queryVariants) {
    results = runQuery(variant);
    if (results.length > 0) break;
  }

  return {
    results,
    _metadata: generateResponseMetadata(db),
  };
}
