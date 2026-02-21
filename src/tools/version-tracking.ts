/**
 * Premium version tracking tools for UK Law MCP.
 * Gated by PREMIUM_ENABLED environment variable.
 * Returns upgrade messages when premium is not enabled.
 */

import type Database from '@ansvar/mcp-sqlite';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GetProvisionHistoryInput {
  document_id: string;
  provision_ref: string;
}

export interface DiffProvisionInput {
  document_id: string;
  provision_ref: string;
  from_date: string;
  to_date?: string;
}

export interface GetRecentChangesInput {
  since: string;
  document_id?: string;
  limit?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PREMIUM_UPGRADE_MESSAGE =
  'Version tracking is available in the Ansvar Intelligence Portal. ' +
  'Contact hello@ansvar.ai for access.';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isPremiumEnabled(): boolean {
  return process.env.PREMIUM_ENABLED === 'true' || process.env.PREMIUM_ENABLED === '1';
}

function hasVersionsTable(db: InstanceType<typeof Database>): boolean {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='provision_versions'")
    .get() as { name: string } | undefined;
  return !!row;
}

function resolveProvisionId(
  db: InstanceType<typeof Database>,
  documentId: string,
  provisionRef: string,
): number {
  // Try direct document_id match first
  let row = db
    .prepare(
      'SELECT lp.id FROM legal_provisions lp WHERE lp.document_id = ? AND lp.provision_ref = ?',
    )
    .get(documentId, provisionRef) as { id: number } | undefined;

  if (!row) {
    // Try fuzzy title match on legal_documents
    const doc = db
      .prepare(
        "SELECT id FROM legal_documents WHERE id = ? OR title LIKE ? OR short_name LIKE ?",
      )
      .get(documentId, `%${documentId}%`, `%${documentId}%`) as { id: string } | undefined;

    if (doc) {
      row = db
        .prepare('SELECT id FROM legal_provisions WHERE document_id = ? AND provision_ref = ?')
        .get(doc.id, provisionRef) as { id: number } | undefined;
    }
  }

  if (!row) {
    throw new Error(
      `Provision not found: ${documentId} ${provisionRef}. Use search_legislation to find valid references.`,
    );
  }

  return row.id;
}

// ─── Tool Implementations ─────────────────────────────────────────────────────

export async function getProvisionHistory(
  db: InstanceType<typeof Database>,
  input: GetProvisionHistoryInput,
): Promise<unknown> {
  if (!isPremiumEnabled()) {
    return { premium: false, message: PREMIUM_UPGRADE_MESSAGE };
  }

  if (!hasVersionsTable(db)) {
    throw new Error('Version tracking data not available in this database.');
  }

  const provisionId = resolveProvisionId(db, input.document_id, input.provision_ref);

  const versions = db
    .prepare(
      `SELECT effective_date, superseded_date, change_summary, source_url, body_text
       FROM provision_versions
       WHERE provision_id = ?
       ORDER BY effective_date ASC`,
    )
    .all(provisionId) as Array<{
    effective_date: string | null;
    superseded_date: string | null;
    change_summary: string | null;
    source_url: string | null;
    body_text: string;
  }>;

  const currentVersion =
    versions.length > 0 ? versions[versions.length - 1].effective_date : null;

  return {
    document_id: input.document_id,
    provision_ref: input.provision_ref,
    current_version: currentVersion,
    versions: versions.map((v) => ({
      effective_date: v.effective_date,
      superseded_date: v.superseded_date,
      change_summary: v.change_summary,
      source_url: v.source_url,
    })),
  };
}

export async function diffProvision(
  db: InstanceType<typeof Database>,
  input: DiffProvisionInput,
): Promise<unknown> {
  if (!isPremiumEnabled()) {
    return { premium: false, message: PREMIUM_UPGRADE_MESSAGE };
  }

  if (!hasVersionsTable(db)) {
    throw new Error('Version tracking data not available in this database.');
  }

  const provisionId = resolveProvisionId(db, input.document_id, input.provision_ref);
  const toDate = input.to_date ?? new Date().toISOString().slice(0, 10);

  // Find the version closest to to_date that has a diff
  const version = db
    .prepare(
      `SELECT effective_date, diff_from_previous, change_summary
       FROM provision_versions
       WHERE provision_id = ?
         AND effective_date > ?
         AND effective_date <= ?
       ORDER BY effective_date DESC
       LIMIT 1`,
    )
    .get(provisionId, input.from_date, toDate) as
    | {
        effective_date: string;
        diff_from_previous: string | null;
        change_summary: string | null;
      }
    | undefined;

  return {
    document_id: input.document_id,
    provision_ref: input.provision_ref,
    from_date: input.from_date,
    to_date: toDate,
    diff: version?.diff_from_previous ?? null,
    change_summary: version?.change_summary ?? (version ? null : 'No changes found in this date range.'),
  };
}

export async function getRecentChanges(
  db: InstanceType<typeof Database>,
  input: GetRecentChangesInput,
): Promise<unknown> {
  if (!isPremiumEnabled()) {
    return { premium: false, message: PREMIUM_UPGRADE_MESSAGE };
  }

  if (!hasVersionsTable(db)) {
    throw new Error('Version tracking data not available in this database.');
  }

  const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);

  let query = `
    SELECT pv.effective_date, pv.change_summary, pv.source_url,
           lp.provision_ref, lp.title as provision_title,
           ld.id as document_id, ld.title as document_title, ld.short_name
    FROM provision_versions pv
    JOIN legal_provisions lp ON lp.id = pv.provision_id
    JOIN legal_documents ld ON ld.id = lp.document_id
    WHERE pv.effective_date >= ?
  `;
  const params: unknown[] = [input.since];

  if (input.document_id) {
    query += ' AND (ld.id = ? OR ld.title LIKE ? OR ld.short_name LIKE ?)';
    params.push(input.document_id, `%${input.document_id}%`, `%${input.document_id}%`);
  }

  query += ' ORDER BY pv.effective_date DESC LIMIT ?';
  params.push(limit);

  const changes = db.prepare(query).all(...params) as Array<{
    effective_date: string;
    change_summary: string | null;
    source_url: string | null;
    provision_ref: string;
    provision_title: string | null;
    document_id: string;
    document_title: string;
    short_name: string | null;
  }>;

  return {
    since: input.since,
    total: changes.length,
    changes: changes.map((c) => ({
      document_id: c.document_id,
      document_title: c.document_title,
      short_name: c.short_name,
      provision_ref: c.provision_ref,
      provision_title: c.provision_title,
      effective_date: c.effective_date,
      change_summary: c.change_summary,
      source_url: c.source_url,
    })),
  };
}
