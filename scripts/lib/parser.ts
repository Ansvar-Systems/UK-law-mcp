/**
 * Akoma Ntoso XML parser for UK legislation from legislation.gov.uk
 *
 * Parses the AKN XML format into structured seed JSON.
 * Uses fast-xml-parser with attribute support.
 */

import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  isArray: (name) => {
    // These elements can appear multiple times
    return [
      'entry', 'part', 'chapter', 'section', 'subsection',
      'paragraph', 'subparagraph', 'p', 'block', 'content',
      'hcontainer', 'crossHeading',
    ].includes(name);
  },
  trimValues: true,
  parseAttributeValue: false,
});

// ─────────────────────────────────────────────────────────────────────────────
// Atom Feed Parsing
// ─────────────────────────────────────────────────────────────────────────────

export interface ActIndexEntry {
  title: string;
  year: number;
  number: number;
  url: string;
  updated: string;
}

export interface AtomFeedResult {
  entries: ActIndexEntry[];
  hasNextPage: boolean;
  totalResults?: number;
}

/**
 * Parse an Atom feed page to extract act entries.
 */
export function parseAtomFeed(xml: string): AtomFeedResult {
  const parsed = parser.parse(xml);
  const feed = parsed.feed ?? parsed;

  const entries: ActIndexEntry[] = [];
  const rawEntries = feed.entry ?? [];
  const entryList = Array.isArray(rawEntries) ? rawEntries : [rawEntries];

  for (const entry of entryList) {
    if (!entry) continue;

    const title = extractText(entry.title);
    if (!title) continue;

    // Extract year and number from the ID or link
    const id = extractText(entry.id) ?? '';
    const link = extractLink(entry.link);
    const url = link || id;

    const match = url.match(/\/ukpga\/(\d{4})\/(\d+)/);
    if (!match) continue;

    const year = parseInt(match[1], 10);
    const number = parseInt(match[2], 10);

    entries.push({
      title: title.replace(/\s+/g, ' ').trim(),
      year,
      number,
      url: `https://www.legislation.gov.uk/ukpga/${year}/${number}`,
      updated: extractText(entry.updated) ?? '',
    });
  }

  // Check for next page link
  const links = feed.link;
  let hasNextPage = false;
  if (Array.isArray(links)) {
    hasNextPage = links.some((l: Record<string, string>) => l?.['@_rel'] === 'next');
  }

  // Total results from OpenSearch element
  const totalResults = feed['openSearch:totalResults']
    ? parseInt(extractText(feed['openSearch:totalResults']) ?? '0', 10)
    : undefined;

  // If we got no entries AND no next page link, we're done
  if (entries.length === 0) {
    hasNextPage = false;
  }

  return { entries, hasNextPage, totalResults };
}

// ─────────────────────────────────────────────────────────────────────────────
// AKN XML Parsing
// ─────────────────────────────────────────────────────────────────────────────

export interface ParsedProvision {
  provision_ref: string;
  section: string;
  title: string;
  content: string;
}

export interface ParsedAct {
  id: string;
  type: 'statute';
  title: string;
  short_name: string;
  status: 'in_force';
  issued_date: string;
  url: string;
  provisions: ParsedProvision[];
}

/**
 * Pre-process AKN XML to flatten inline markup elements into plain text.
 *
 * legislation.gov.uk AKN uses inline elements for amendments and cross-references:
 *   <p>Most processing is subject to the <ins ...>UK GDPR</ins>.</p>
 *   <p>Data protection <ref href="...">GDPR</ref> applies.</p>
 *
 * fast-xml-parser cannot preserve mixed-content ordering, so inline elements
 * get displaced (their text prepended/appended to the parent's text).
 * We flatten them to plain text before parsing, preserving only their text content.
 *
 * Inline elements stripped:
 *   - <ref>: cross-reference links
 *   - <ins>: inserted text (amendments)
 *   - <del>: deleted text (amendments)
 *   - <noteRef>: commentary note references (self-closing, stripped entirely)
 *   - <marker>: legislative markers (self-closing, stripped entirely)
 *   - <authorialNote>: editorial notes
 */
function flattenInlineElements(xml: string): string {
  return xml
    // Self-closing elements: strip entirely (no text content)
    .replace(/<(?:noteRef|marker|ref)\b[^>]*\/>/g, '')
    // Paired elements: keep only their text content
    .replace(/<(?:ins|del|ref|authorialNote)\b[^>]*>([\s\S]*?)<\/(?:ins|del|ref|authorialNote)>/g, '$1')
    // Nested noteRef inside ins/del that survived the first pass
    .replace(/<noteRef\b[^>]*\/>/g, '');
}

/**
 * Parse an Akoma Ntoso XML document into a structured act with provisions.
 */
export function parseAknXml(xml: string, year: number, actNumber: number, actTitle: string): ParsedAct {
  const parsed = parser.parse(flattenInlineElements(xml));

  // Navigate to the body — AKN structure: akomaNtoso > act > body
  const akomaNtoso = parsed.akomaNtoso ?? parsed['akomaNtoso'] ?? parsed;
  const act = akomaNtoso?.act ?? akomaNtoso;
  const meta = act?.meta ?? {};
  const body = act?.body;

  // Extract title from meta or use provided title
  const title = extractMetaTitle(meta) || actTitle;

  // Extract date from meta
  const issuedDate = extractMetaDate(meta) || `${year}-01-01`;

  // Build short name
  const shortName = buildShortName(title, year);

  const provisions: ParsedProvision[] = [];

  if (body) {
    extractProvisions(body, provisions, '');
  }

  return {
    id: `ukpga-${year}-${actNumber}`,
    type: 'statute',
    title,
    short_name: shortName,
    status: 'in_force',
    issued_date: issuedDate,
    url: `https://www.legislation.gov.uk/ukpga/${year}/${actNumber}`,
    provisions,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function extractText(node: unknown): string | undefined {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    if ('#text' in obj) return String(obj['#text']);
    // If it has a string value somewhere
    for (const key of Object.keys(obj)) {
      if (!key.startsWith('@_')) {
        const val = extractText(obj[key]);
        if (val) return val;
      }
    }
  }
  return undefined;
}

function extractLink(link: unknown): string {
  if (!link) return '';
  if (Array.isArray(link)) {
    // Prefer 'self' or 'alternate' link
    for (const l of link) {
      if (l?.['@_rel'] === 'self' || l?.['@_rel'] === 'alternate') {
        return l['@_href'] ?? '';
      }
    }
    // Fall back to first link
    return link[0]?.['@_href'] ?? '';
  }
  if (typeof link === 'object') {
    return (link as Record<string, string>)['@_href'] ?? '';
  }
  return '';
}

function extractMetaTitle(meta: Record<string, unknown>): string {
  try {
    const identification = meta?.identification as Record<string, unknown> | undefined;
    const references = identification?.FRBRWork as Record<string, unknown> | undefined;
    const alias = references?.FRBRalias;
    if (alias) {
      const obj = alias as Record<string, string>;
      return obj['@_value'] ?? '';
    }
  } catch {
    // Ignore
  }
  return '';
}

function extractMetaDate(meta: Record<string, unknown>): string {
  try {
    const identification = meta?.identification as Record<string, unknown> | undefined;
    const work = identification?.FRBRWork as Record<string, unknown> | undefined;
    const date = work?.FRBRdate;
    if (date) {
      const obj = date as Record<string, string>;
      return obj['@_date'] ?? '';
    }
  } catch {
    // Ignore
  }
  return '';
}

function buildShortName(title: string, year: number): string {
  // Try to create an abbreviation like "DPA 2018"
  const words = title.replace(/[()]/g, '').split(/\s+/);
  if (words.length <= 3) return `${title} ${year}`;

  // Take significant capitalized words
  const significant = words.filter(w =>
    w.length > 2 &&
    w[0] === w[0].toUpperCase() &&
    !['The', 'And', 'For', 'Act', 'Of', 'In', 'To', 'With'].includes(w)
  );

  if (significant.length >= 2) {
    const initials = significant.slice(0, 4).map(w => w[0]).join('');
    return `${initials} ${year}`;
  }

  return `${title.substring(0, 30).trim()} ${year}`;
}

/**
 * Recursively extract provisions from AKN body elements.
 *
 * Handles hierarchy: part > chapter > section > subsection
 */
function extractProvisions(
  node: Record<string, unknown>,
  provisions: ParsedProvision[],
  parentContext: string,
): void {
  // Process parts
  processElements(node, 'part', provisions, parentContext);

  // Process chapters
  processElements(node, 'chapter', provisions, parentContext);

  // Process sections directly in body
  processSections(node, provisions, parentContext);

  // Process hcontainer elements (used for schedules, etc.)
  processElements(node, 'hcontainer', provisions, parentContext);
}

function processElements(
  node: Record<string, unknown>,
  elementName: string,
  provisions: ParsedProvision[],
  parentContext: string,
): void {
  const elements = node[elementName];
  if (!elements) return;

  const list = Array.isArray(elements) ? elements : [elements];

  for (const element of list) {
    if (!element || typeof element !== 'object') continue;
    const el = element as Record<string, unknown>;

    const eId = (el['@_eId'] as string) ?? '';

    // Extract the element's own content heading
    const num = extractText(el.num);
    const heading = extractText(el.heading);

    // Build context prefix
    const context = parentContext
      ? `${parentContext} > ${elementName} ${num ?? ''}`
      : `${elementName} ${num ?? ''}`;

    // If this is a section-like element, extract its content
    if (elementName === 'section' || elementName === 'hcontainer') {
      const provisionRef = buildProvisionRef(eId, elementName, num);
      const content = extractContentText(el);

      if (content.trim()) {
        provisions.push({
          provision_ref: provisionRef,
          section: num ?? provisionRef,
          title: heading ?? '',
          content: content.trim(),
        });
      }
    }

    // Recurse into child elements
    extractProvisions(el, provisions, context);
  }
}

function processSections(
  node: Record<string, unknown>,
  provisions: ParsedProvision[],
  parentContext: string,
): void {
  const sections = node['section'];
  if (!sections) return;

  const list = Array.isArray(sections) ? sections : [sections];

  for (const section of list) {
    if (!section || typeof section !== 'object') continue;
    const el = section as Record<string, unknown>;

    const eId = (el['@_eId'] as string) ?? '';
    const num = extractText(el.num);
    const heading = extractText(el.heading);

    const provisionRef = buildProvisionRef(eId, 'section', num);
    const content = extractContentText(el);

    if (content.trim()) {
      provisions.push({
        provision_ref: provisionRef,
        section: num ?? provisionRef,
        title: heading ?? '',
        content: content.trim(),
      });
    }

    // Process subsections
    const subsections = el['subsection'];
    if (subsections) {
      const subList = Array.isArray(subsections) ? subsections : [subsections];
      for (const sub of subList) {
        if (!sub || typeof sub !== 'object') continue;
        const subEl = sub as Record<string, unknown>;
        const subEId = (subEl['@_eId'] as string) ?? '';
        const subNum = extractText(subEl.num);
        const subContent = extractContentText(subEl);

        if (subContent.trim()) {
          const subRef = buildProvisionRef(subEId, 'subsection', subNum);
          provisions.push({
            provision_ref: subRef,
            section: `${num ?? ''}(${subNum ?? ''})`,
            title: heading ?? '',
            content: subContent.trim(),
          });
        }
      }
    }
  }
}

function buildProvisionRef(eId: string, elementType: string, num: string | undefined): string {
  // Try to build a clean provision ref like "s1", "s1(2)"
  if (eId) {
    // eId like "section-1" -> "s1"
    const sectionMatch = eId.match(/section-(\d+)$/);
    if (sectionMatch) return `s${sectionMatch[1]}`;

    // eId like "section-1-2" -> "s1(2)"
    const subMatch = eId.match(/section-(\d+)-(\d+)$/);
    if (subMatch) return `s${subMatch[1]}(${subMatch[2]})`;

    // Use eId as-is for other cases
    return eId;
  }

  if (num) {
    const cleaned = num.replace(/[.\s]/g, '');
    if (elementType === 'section') return `s${cleaned}`;
    return cleaned;
  }

  return `${elementType}-unknown`;
}

/**
 * Extract all text content from an element, concatenating <p> text recursively.
 */
function extractContentText(node: Record<string, unknown>): string {
  const parts: string[] = [];

  // Direct text
  const text = node['#text'];
  if (typeof text === 'string') {
    parts.push(text);
  }

  // Content elements
  const content = node['content'];
  if (content) {
    const contentList = Array.isArray(content) ? content : [content];
    for (const c of contentList) {
      if (typeof c === 'string') {
        parts.push(c);
      } else if (c && typeof c === 'object') {
        parts.push(extractContentText(c as Record<string, unknown>));
      }
    }
  }

  // Paragraph elements
  const p = node['p'];
  if (p) {
    const pList = Array.isArray(p) ? p : [p];
    for (const para of pList) {
      if (typeof para === 'string') {
        parts.push(para);
      } else if (para && typeof para === 'object') {
        parts.push(extractAllText(para as Record<string, unknown>));
      }
    }
  }

  // Block elements
  const block = node['block'];
  if (block) {
    const blockList = Array.isArray(block) ? block : [block];
    for (const b of blockList) {
      if (typeof b === 'string') {
        parts.push(b);
      } else if (b && typeof b === 'object') {
        parts.push(extractAllText(b as Record<string, unknown>));
      }
    }
  }

  // Intro element
  const intro = node['intro'];
  if (intro && typeof intro === 'object') {
    parts.push(extractContentText(intro as Record<string, unknown>));
  }

  // Wrap-up element
  const wrapUp = node['wrapUp'];
  if (wrapUp && typeof wrapUp === 'object') {
    parts.push(extractContentText(wrapUp as Record<string, unknown>));
  }

  // Paragraph (numbered) elements inside subsections
  const paragraph = node['paragraph'];
  if (paragraph) {
    const paraList = Array.isArray(paragraph) ? paragraph : [paragraph];
    for (const para of paraList) {
      if (para && typeof para === 'object') {
        const paraObj = para as Record<string, unknown>;
        const paraNum = extractText(paraObj.num);
        const paraContent = extractContentText(paraObj);
        if (paraContent.trim()) {
          parts.push(`${paraNum ? paraNum + ' ' : ''}${paraContent.trim()}`);
        }
      }
    }
  }

  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Extract ALL text from a node, recursively traversing all children.
 */
function extractAllText(node: Record<string, unknown>): string {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('@_')) continue;

    if (key === '#text') {
      if (typeof value === 'string') parts.push(value);
      else if (typeof value === 'number') parts.push(String(value));
      continue;
    }

    if (typeof value === 'string') {
      parts.push(value);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string') parts.push(item);
        else if (item && typeof item === 'object') {
          parts.push(extractAllText(item as Record<string, unknown>));
        }
      }
    } else if (value && typeof value === 'object') {
      parts.push(extractAllText(value as Record<string, unknown>));
    }
  }

  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}
