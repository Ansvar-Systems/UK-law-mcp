#!/usr/bin/env tsx
/**
 * Check legislation.gov.uk for newly published or updated UK Acts.
 *
 * Exits:
 *   0 = no updates
 *   1 = updates found
 *   2 = check failed (network/parse/database error)
 */

import Database from 'better-sqlite3';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseAtomFeed, type ActIndexEntry } from './lib/parser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, '../data/database.db');
const INDEX_PATH = resolve(__dirname, '../data/source/act-index.json');

const USER_AGENT = 'UK-Law-MCP/1.0';
const PAGE_LIMIT = 3;
const REQUEST_TIMEOUT_MS = 15_000;

interface LocalIndexEntry {
  title: string;
  year: number;
  number: number;
  url: string;
  updated: string;
}

interface UpdateHit {
  document_id: string;
  title: string;
  remote_updated: string;
  local_updated?: string;
}

function toDocumentId(entry: Pick<ActIndexEntry, 'year' | 'number'>): string {
  return `ukpga-${entry.year}-${entry.number}`;
}

function parseJsonFile<T>(filePath: string): T | null {
  if (!existsSync(filePath)) {
    return null;
  }
  return JSON.parse(readFileSync(filePath, 'utf-8')) as T;
}

async function fetchFeedPage(page: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`https://www.legislation.gov.uk/ukpga/data.feed?page=${page}`, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/atom+xml, application/xml, text/xml',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} on page ${page}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchRecentFeedEntries(pageLimit: number): Promise<ActIndexEntry[]> {
  const entries: ActIndexEntry[] = [];

  for (let page = 1; page <= pageLimit; page++) {
    const xml = await fetchFeedPage(page);
    const parsed = parseAtomFeed(xml);
    entries.push(...parsed.entries);
    if (!parsed.hasNextPage) {
      break;
    }
  }

  return entries;
}

function mainSummary(updates: UpdateHit[], newActs: UpdateHit[]): void {
  console.log('');
  console.log(`Updated acts: ${updates.length}`);
  console.log(`New acts:     ${newActs.length}`);

  if (updates.length > 0) {
    console.log('');
    console.log('Updated upstream acts detected:');
    for (const hit of updates.slice(0, 20)) {
      console.log(`  - ${hit.document_id} (${hit.remote_updated})`);
    }
  }

  if (newActs.length > 0) {
    console.log('');
    console.log('New upstream acts missing locally:');
    for (const hit of newActs.slice(0, 20)) {
      console.log(`  - ${hit.document_id} (${hit.title})`);
    }
  }
}

async function main(): Promise<void> {
  console.log('UK Law MCP - Update checker');
  console.log('');

  if (!existsSync(DB_PATH)) {
    console.error(`Database not found: ${DB_PATH}`);
    process.exit(2);
  }

  const db = new Database(DB_PATH, { readonly: true });
  const localDocs = new Set<string>(
    (db.prepare("SELECT id FROM legal_documents WHERE type = 'statute'").all() as { id: string }[])
      .map((row) => row.id),
  );
  db.close();

  const localIndex = parseJsonFile<LocalIndexEntry[]>(INDEX_PATH) ?? [];
  const localIndexById = new Map<string, LocalIndexEntry>();
  for (const entry of localIndex) {
    localIndexById.set(toDocumentId(entry), entry);
  }

  const recentEntries = await fetchRecentFeedEntries(PAGE_LIMIT);
  console.log(`Checked ${recentEntries.length} upstream entries from ${PAGE_LIMIT} page(s).`);

  const updatedActs: UpdateHit[] = [];
  const newActs: UpdateHit[] = [];

  for (const entry of recentEntries) {
    const documentId = toDocumentId(entry);
    const localIndexEntry = localIndexById.get(documentId);

    if (!localDocs.has(documentId)) {
      newActs.push({
        document_id: documentId,
        title: entry.title,
        remote_updated: entry.updated,
      });
      continue;
    }

    if (localIndexEntry?.updated && entry.updated > localIndexEntry.updated) {
      updatedActs.push({
        document_id: documentId,
        title: entry.title,
        local_updated: localIndexEntry.updated,
        remote_updated: entry.updated,
      });
    }
  }

  mainSummary(updatedActs, newActs);

  if (updatedActs.length > 0 || newActs.length > 0) {
    process.exit(1);
  }

  console.log('');
  console.log('No recent upstream changes detected in the checked window.');
}

main().catch((error) => {
  console.error(`Update check failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(2);
});
