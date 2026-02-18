/**
 * Tool registry for UK Law MCP Server.
 * Shared between stdio (index.ts) and HTTP (api/mcp.ts) entry points.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import Database from '@ansvar/mcp-sqlite';

import { searchLegislation, SearchLegislationInput } from './search-legislation.js';
import { getProvision, GetProvisionInput } from './get-provision.js';
import { listSources } from './list-sources.js';
import { validateCitationTool, ValidateCitationInput } from './validate-citation.js';
import { buildLegalStance, BuildLegalStanceInput } from './build-legal-stance.js';
import { formatCitationTool, FormatCitationInput } from './format-citation.js';
import { checkCurrency, CheckCurrencyInput } from './check-currency.js';
import { getEUBasis, GetEUBasisInput } from './get-eu-basis.js';
import { getUKImplementations, GetUKImplementationsInput } from './get-uk-implementations.js';
import { searchEUImplementations, SearchEUImplementationsInput } from './search-eu-implementations.js';
import { getProvisionEUBasis, GetProvisionEUBasisInput } from './get-provision-eu-basis.js';
import { validateEUCompliance, ValidateEUComplianceInput } from './validate-eu-compliance.js';
import { getAbout, type AboutContext } from './about.js';
export type { AboutContext } from './about.js';

const ABOUT_TOOL: Tool = {
  name: 'about',
  description:
    'Server metadata, dataset statistics, freshness, and provenance. ' +
    'Call this to verify data coverage, currency, and content basis before relying on results.',
  inputSchema: { type: 'object', properties: {} },
};

export const TOOLS: Tool[] = [
  {
    name: 'search_legislation',
    description:
      'Search UK statutes and regulations by keyword. Returns provision-level results with BM25 relevance ranking. ' +
      'Supports natural language queries (e.g., "data protection rights") and FTS5 syntax (AND, OR, NOT, "phrase", prefix*). ' +
      'Results include: document ID, title, provision reference, snippet with >>>highlight<<< markers, and relevance score. ' +
      'Use document_id to filter within a single statute. Use status to filter by in_force/amended/repealed. ' +
      'Default limit is 10 (max 50). For broad legal research, prefer build_legal_stance instead.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query in English. Supports natural language or FTS5 syntax (AND, OR, NOT, "phrase", prefix*). Example: "data protection" OR "personal data"',
        },
        document_id: {
          type: 'string',
          description: 'Filter to a specific statute by ID (e.g., "ukpga-2018-12") or title (e.g., "Data Protection Act 2018")',
        },
        status: {
          type: 'string',
          enum: ['in_force', 'amended', 'repealed'],
          description: 'Filter by legislative status. Omit to search all statuses.',
        },
        limit: {
          type: 'number',
          description: 'Maximum results to return (default: 10, max: 50). Lower values save tokens.',
          default: 10,
          minimum: 1,
          maximum: 50,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_provision',
    description:
      'Retrieve the full text of a specific provision (section) from a UK statute, or all provisions for a statute if no section is specified. ' +
      'UK provisions use section notation: s1, s1(1), s1(2)(a). Pass document_id as either the internal ID (e.g., "ukpga-2018-12") ' +
      'or the human-readable title (e.g., "Data Protection Act 2018"). ' +
      'Returns: document ID, title, status, provision reference, chapter, section, title, and full content text. ' +
      'Note: Provisions with sub-paragraphs (a)(b)(c) store the introductory text at the subsection level; sub-paragraphs are stored as separate provisions. ' +
      'To get a complete section with all sub-paragraphs, omit provision_ref and filter by section number, or use search_legislation. ' +
      'WARNING: Omitting section/provision_ref returns ALL provisions (capped at 200) for the statute.',
    inputSchema: {
      type: 'object',
      properties: {
        document_id: {
          type: 'string',
          description: 'Statute identifier (e.g., "ukpga-2018-12") or title (e.g., "Data Protection Act 2018"). Fuzzy title matching is supported.',
        },
        section: {
          type: 'string',
          description: 'Section number (e.g., "3", "1(1)"). Matched against provision_ref and section columns.',
        },
        provision_ref: {
          type: 'string',
          description: 'Direct provision reference (e.g., "s1(1)", "s3"). Takes precedence over section if both provided.',
        },
      },
      required: ['document_id'],
    },
  },
  {
    name: 'list_sources',
    description:
      'Returns metadata about all data sources backing this server, including jurisdiction, authoritative source details, ' +
      'database tier, schema version, build date, record counts, and known limitations. ' +
      'Call this first to understand data coverage and freshness before relying on other tools.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'validate_citation',
    description:
      'Validate a UK legal citation against the database. Returns whether the cited statute and provision exist. ' +
      'Use this as a zero-hallucination check before presenting legal references to users. ' +
      'Supported formats: "Section 3, Data Protection Act 2018", "Data Protection Act 2018, s. 3", "DPA 2018 s3". ' +
      'Returns: valid (boolean), parsed components, warnings about repealed/amended status.',
    inputSchema: {
      type: 'object',
      properties: {
        citation: {
          type: 'string',
          description: 'UK legal citation to validate. Examples: "Section 3, Data Protection Act 2018", "Computer Misuse Act 1990, s. 1", "DPA 2018 s3"',
        },
      },
      required: ['citation'],
    },
  },
  {
    name: 'build_legal_stance',
    description:
      'Build a comprehensive set of citations for a legal question by searching across all UK statutes simultaneously. ' +
      'Returns aggregated results from legislation search, cross-referenced with EU law where applicable. ' +
      'Best for broad legal research questions like "What UK laws govern data processing?" ' +
      'For targeted lookups of a known provision, use get_provision instead.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Legal question or topic to research (e.g., "personal data processing obligations")',
        },
        document_id: {
          type: 'string',
          description: 'Optionally limit search to one statute by ID or title',
        },
        limit: {
          type: 'number',
          description: 'Max results per category (default: 5, max: 20)',
          default: 5,
          minimum: 1,
          maximum: 20,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'format_citation',
    description:
      'Format a UK legal citation per standard legal conventions. ' +
      'Formats: "full" → "Section 3, Data Protection Act 2018 (c. 12)", ' +
      '"short" → "DPA 2018 s. 3", "pinpoint" → "s. 3". ' +
      'Does NOT validate existence — use validate_citation for that.',
    inputSchema: {
      type: 'object',
      properties: {
        citation: {
          type: 'string',
          description: 'Citation string to format (e.g., "Data Protection Act 2018, s. 3")',
        },
        format: {
          type: 'string',
          enum: ['full', 'short', 'pinpoint'],
          description: 'Output format. "full" (default): formal citation. "short": abbreviated. "pinpoint": section reference only.',
          default: 'full',
        },
      },
      required: ['citation'],
    },
  },
  {
    name: 'check_currency',
    description:
      'Check whether a UK statute or provision is currently in force, amended, or repealed. ' +
      'Returns: is_current (boolean), status, dates (issued, in-force), and warnings. ' +
      'Essential before citing legislation — repealed acts should not be cited as current law.',
    inputSchema: {
      type: 'object',
      properties: {
        document_id: {
          type: 'string',
          description: 'Statute identifier (e.g., "ukpga-2018-12") or title (e.g., "Data Protection Act 2018")',
        },
        provision_ref: {
          type: 'string',
          description: 'Optional provision reference to check a specific section (e.g., "s3")',
        },
      },
      required: ['document_id'],
    },
  },
  {
    name: 'get_eu_basis',
    description:
      'Get EU legal basis (directives and regulations) for a UK statute. Returns all EU instruments that the UK statute ' +
      'implements, supplements, or references, including CELEX numbers and implementation status. ' +
      'Useful for understanding retained EU law in UK context post-Brexit. ' +
      'Example: Data Protection Act 2018 → implements GDPR (Regulation 2016/679).',
    inputSchema: {
      type: 'object',
      properties: {
        document_id: {
          type: 'string',
          description: 'UK statute identifier (e.g., "ukpga-2018-12") or title (e.g., "Data Protection Act 2018")',
        },
        include_articles: {
          type: 'boolean',
          description: 'Include specific EU article references in the response (default: false)',
          default: false,
        },
        reference_types: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['implements', 'supplements', 'applies', 'references', 'complies_with', 'derogates_from', 'amended_by', 'repealed_by', 'cites_article'],
          },
          description: 'Filter by reference type (e.g., ["implements"]). Omit to return all types.',
        },
      },
      required: ['document_id'],
    },
  },
  {
    name: 'get_uk_implementations',
    description:
      'Find UK statutes that implement a specific EU directive or regulation. ' +
      'Input the EU document ID in "type:year/number" format (e.g., "regulation:2016/679" for GDPR, "directive:2016/680" for LED). ' +
      'Returns matching UK statutes with implementation status and whether each is the primary implementing act.',
    inputSchema: {
      type: 'object',
      properties: {
        eu_document_id: {
          type: 'string',
          description: 'EU document ID in format "type:year/number" (e.g., "regulation:2016/679" for GDPR, "directive:2016/680" for Law Enforcement Directive)',
        },
        primary_only: {
          type: 'boolean',
          description: 'Return only primary implementing statutes (default: false)',
          default: false,
        },
        in_force_only: {
          type: 'boolean',
          description: 'Return only statutes currently in force (default: false)',
          default: false,
        },
      },
      required: ['eu_document_id'],
    },
  },
  {
    name: 'search_eu_implementations',
    description:
      'Search for EU directives and regulations that have been implemented or referenced by UK statutes. ' +
      'Search by keyword (e.g., "data protection", "privacy"), filter by type (directive/regulation), ' +
      'or year range. Returns EU documents with counts of UK statutes referencing them.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Keyword search across EU document titles and short names (e.g., "data protection")',
        },
        type: {
          type: 'string',
          enum: ['directive', 'regulation'],
          description: 'Filter by EU document type',
        },
        year_from: { type: 'number', description: 'Filter: EU documents from this year onwards' },
        year_to: { type: 'number', description: 'Filter: EU documents up to this year' },
        has_uk_implementation: {
          type: 'boolean',
          description: 'If true, only return EU documents that have at least one UK implementing statute',
        },
        limit: {
          type: 'number',
          description: 'Max results (default: 20, max: 100)',
          default: 20,
          minimum: 1,
          maximum: 100,
        },
      },
    },
  },
  {
    name: 'get_provision_eu_basis',
    description:
      'Get EU legal basis for a specific provision within a UK statute, with article-level precision. ' +
      'Example: DPA 2018 s3 → references LED (Directive 2016/680). ' +
      'Use this for pinpoint EU compliance checks at the provision level.',
    inputSchema: {
      type: 'object',
      properties: {
        document_id: {
          type: 'string',
          description: 'UK statute identifier (e.g., "ukpga-2018-12") or title',
        },
        provision_ref: {
          type: 'string',
          description: 'Provision reference (e.g., "s3", "s1(1)")',
        },
      },
      required: ['document_id', 'provision_ref'],
    },
  },
  {
    name: 'validate_eu_compliance',
    description:
      'Check EU compliance status for a UK statute or provision. Detects references to repealed EU directives, ' +
      'missing implementations, and outdated references. Returns compliance status: compliant, partial, unclear, or not_applicable. ' +
      'Note: This is Phase 1 validation. Full compliance checking will be expanded in future releases.',
    inputSchema: {
      type: 'object',
      properties: {
        document_id: {
          type: 'string',
          description: 'UK statute identifier (e.g., "ukpga-2018-12") or title',
        },
        provision_ref: {
          type: 'string',
          description: 'Optional: check a specific provision (e.g., "s3")',
        },
        eu_document_id: {
          type: 'string',
          description: 'Optional: check compliance with a specific EU document (e.g., "regulation:2016/679")',
        },
      },
      required: ['document_id'],
    },
  },
];

export function buildTools(context?: AboutContext): Tool[] {
  return context ? [...TOOLS, ABOUT_TOOL] : TOOLS;
}

export function registerTools(
  server: Server,
  db: InstanceType<typeof Database>,
  context?: AboutContext,
): void {
  const allTools = buildTools(context);

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: allTools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result: unknown;

      switch (name) {
        case 'search_legislation':
          result = await searchLegislation(db, args as unknown as SearchLegislationInput);
          break;
        case 'get_provision':
          result = await getProvision(db, args as unknown as GetProvisionInput);
          break;
        case 'list_sources':
          result = await listSources(db);
          break;
        case 'validate_citation':
          result = await validateCitationTool(db, args as unknown as ValidateCitationInput);
          break;
        case 'build_legal_stance':
          result = await buildLegalStance(db, args as unknown as BuildLegalStanceInput);
          break;
        case 'format_citation':
          result = await formatCitationTool(args as unknown as FormatCitationInput);
          break;
        case 'check_currency':
          result = await checkCurrency(db, args as unknown as CheckCurrencyInput);
          break;
        case 'get_eu_basis':
          result = await getEUBasis(db, args as unknown as GetEUBasisInput);
          break;
        case 'get_uk_implementations':
          result = await getUKImplementations(db, args as unknown as GetUKImplementationsInput);
          break;
        case 'search_eu_implementations':
          result = await searchEUImplementations(db, args as unknown as SearchEUImplementationsInput);
          break;
        case 'get_provision_eu_basis':
          result = await getProvisionEUBasis(db, args as unknown as GetProvisionEUBasisInput);
          break;
        case 'validate_eu_compliance':
          result = await validateEUCompliance(db, args as unknown as ValidateEUComplianceInput);
          break;
        case 'about':
          if (context) {
            result = getAbout(db, context);
          } else {
            return {
              content: [{ type: 'text', text: 'About tool not configured.' }],
              isError: true,
            };
          }
          break;
        default:
          return {
            content: [{ type: 'text', text: `Error: Unknown tool "${name}".` }],
            isError: true,
          };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: `Error: ${message}` }],
        isError: true,
      };
    }
  });
}
