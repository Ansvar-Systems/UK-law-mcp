import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createTestDatabase, closeTestDatabase } from '../fixtures/test-db.js';
import {
  getProvisionHistory,
  diffProvision,
  getRecentChanges,
} from '../../src/tools/version-tracking.js';
import type Database from '@ansvar/mcp-sqlite';

describe('Version Tracking Tools (Premium)', () => {
  let db: InstanceType<typeof Database>;

  beforeAll(() => {
    db = createTestDatabase();
  });

  afterAll(() => {
    closeTestDatabase(db);
  });

  // --- Premium Gate Tests ---

  describe('premium gating', () => {
    const originalEnv = process.env.PREMIUM_ENABLED;

    afterEach(() => {
      if (originalEnv === undefined) {
        delete process.env.PREMIUM_ENABLED;
      } else {
        process.env.PREMIUM_ENABLED = originalEnv;
      }
    });

    it('get_provision_history returns upgrade message when PREMIUM_ENABLED is not set', async () => {
      delete process.env.PREMIUM_ENABLED;
      const result = await getProvisionHistory(db, { document_id: 'ukpga-2018-12', provision_ref: 's1(1)' });
      expect(result).toHaveProperty('premium', false);
      expect((result as any).message).toContain('Intelligence Portal');
    });

    it('diff_provision returns upgrade message when PREMIUM_ENABLED is not set', async () => {
      delete process.env.PREMIUM_ENABLED;
      const result = await diffProvision(db, {
        document_id: 'ukpga-2018-12',
        provision_ref: 's1(1)',
        from_date: '2018-01-01',
      });
      expect(result).toHaveProperty('premium', false);
      expect((result as any).message).toContain('hello@ansvar.ai');
    });

    it('get_recent_changes returns upgrade message when PREMIUM_ENABLED is not set', async () => {
      delete process.env.PREMIUM_ENABLED;
      const result = await getRecentChanges(db, { since: '2024-01-01' });
      expect(result).toHaveProperty('premium', false);
    });

    it('returns upgrade message when PREMIUM_ENABLED is "false"', async () => {
      process.env.PREMIUM_ENABLED = 'false';
      const result = await getProvisionHistory(db, { document_id: 'ukpga-2018-12', provision_ref: 's1(1)' });
      expect(result).toHaveProperty('premium', false);
    });

    it('returns real data when PREMIUM_ENABLED is "true"', async () => {
      process.env.PREMIUM_ENABLED = 'true';
      const result = await getProvisionHistory(db, { document_id: 'ukpga-2018-12', provision_ref: 's1(1)' });
      expect(result).not.toHaveProperty('premium');
      expect(result).toHaveProperty('versions');
    });
  });

  // --- Functional Tests ---

  describe('getProvisionHistory', () => {
    beforeEach(() => { process.env.PREMIUM_ENABLED = 'true'; });
    afterEach(() => { delete process.env.PREMIUM_ENABLED; });

    it('returns full version timeline for DPA 2018 s1(1)', async () => {
      const result = await getProvisionHistory(db, { document_id: 'ukpga-2018-12', provision_ref: 's1(1)' });
      const history = result as { versions: any[]; current_version: string | null };
      expect(history.versions).toHaveLength(2);
      expect(history.current_version).toBe('2024-06-01');
    });

    it('returns versions in chronological order', async () => {
      const result = await getProvisionHistory(db, { document_id: 'ukpga-2018-12', provision_ref: 's1(1)' });
      const history = result as { versions: Array<{ effective_date: string }> };
      expect(history.versions[0].effective_date).toBe('2018-05-25');
      expect(history.versions[1].effective_date).toBe('2024-06-01');
    });

    it('includes change_summary in version entries', async () => {
      const result = await getProvisionHistory(db, { document_id: 'ukpga-2018-12', provision_ref: 's1(1)' });
      const history = result as { versions: Array<{ change_summary: string | null }> };
      expect(history.versions[0].change_summary).toContain('Initial enactment');
      expect(history.versions[1].change_summary).toContain('editorial amendment');
    });

    it('marks superseded versions correctly', async () => {
      const result = await getProvisionHistory(db, { document_id: 'ukpga-2018-12', provision_ref: 's1(1)' });
      const history = result as { versions: Array<{ superseded_date: string | null }> };
      expect(history.versions[0].superseded_date).toBe('2024-06-01');
      expect(history.versions[1].superseded_date).toBeNull();
    });

    it('returns single version for CMA 1990 s1(1)', async () => {
      const result = await getProvisionHistory(db, { document_id: 'ukpga-1990-18', provision_ref: 's1(1)' });
      const history = result as { versions: any[] };
      expect(history.versions).toHaveLength(1);
      expect(history.versions[0].effective_date).toBe('1990-08-29');
    });

    it('throws for non-existent provision', async () => {
      await expect(
        getProvisionHistory(db, { document_id: 'ukpga-2018-12', provision_ref: 's999' }),
      ).rejects.toThrow('not found');
    });

    it('resolves by statute title', async () => {
      const result = await getProvisionHistory(db, {
        document_id: 'Data Protection Act 2018',
        provision_ref: 's1(1)',
      });
      const history = result as { versions: any[] };
      expect(history.versions).toHaveLength(2);
    });

    it('returns empty versions for provision with no version history', async () => {
      const result = await getProvisionHistory(db, { document_id: 'ukpga-2018-12', provision_ref: 's3' });
      const history = result as { versions: any[]; current_version: string | null };
      expect(history.versions).toHaveLength(0);
      expect(history.current_version).toBeNull();
    });
  });

  describe('diffProvision', () => {
    beforeEach(() => { process.env.PREMIUM_ENABLED = 'true'; });
    afterEach(() => { delete process.env.PREMIUM_ENABLED; });

    it('returns diff for DPA 2018 s1(1) between 2018 and 2025', async () => {
      const result = await diffProvision(db, {
        document_id: 'ukpga-2018-12',
        provision_ref: 's1(1)',
        from_date: '2018-01-01',
        to_date: '2025-01-01',
      });
      const diff = result as { diff: string | null; change_summary: string | null };
      expect(diff.diff).toContain('---');
      expect(diff.diff).toContain('+++');
      expect(diff.change_summary).toContain('editorial amendment');
    });

    it('returns null diff when no changes in date range', async () => {
      const result = await diffProvision(db, {
        document_id: 'ukpga-2018-12',
        provision_ref: 's1(1)',
        from_date: '2025-01-01',
        to_date: '2026-12-31',
      });
      const diff = result as { diff: string | null; change_summary: string | null };
      expect(diff.diff).toBeNull();
      expect(diff.change_summary).toContain('No changes');
    });

    it('defaults to_date to today when not provided', async () => {
      const result = await diffProvision(db, {
        document_id: 'ukpga-2018-12',
        provision_ref: 's1(1)',
        from_date: '2018-01-01',
      });
      const diff = result as { to_date: string };
      const today = new Date().toISOString().slice(0, 10);
      expect(diff.to_date).toBe(today);
    });

    it('throws for non-existent provision', async () => {
      await expect(
        diffProvision(db, {
          document_id: 'ukpga-2018-12',
          provision_ref: 's999',
          from_date: '2018-01-01',
        }),
      ).rejects.toThrow('not found');
    });
  });

  describe('getRecentChanges', () => {
    beforeEach(() => { process.env.PREMIUM_ENABLED = 'true'; });
    afterEach(() => { delete process.env.PREMIUM_ENABLED; });

    it('returns all changes since a given date', async () => {
      const result = await getRecentChanges(db, { since: '2020-01-01' });
      const changes = result as { changes: any[]; total: number };
      expect(changes.total).toBeGreaterThanOrEqual(1);
    });

    it('filters by document_id', async () => {
      const result = await getRecentChanges(db, {
        since: '1980-01-01',
        document_id: 'ukpga-1990-18',
      });
      const changes = result as { changes: Array<{ document_id: string }> };
      expect(changes.changes.length).toBeGreaterThan(0);
      for (const change of changes.changes) {
        expect(change.document_id).toBe('ukpga-1990-18');
      }
    });

    it('returns empty when no changes since date', async () => {
      const result = await getRecentChanges(db, { since: '2030-01-01' });
      const changes = result as { changes: any[]; total: number };
      expect(changes.changes).toHaveLength(0);
      expect(changes.total).toBe(0);
    });

    it('respects limit parameter', async () => {
      const result = await getRecentChanges(db, { since: '1980-01-01', limit: 1 });
      const changes = result as { changes: any[] };
      expect(changes.changes.length).toBeLessThanOrEqual(1);
    });

    it('clamps limit to max 200', async () => {
      const result = await getRecentChanges(db, { since: '1980-01-01', limit: 9999 });
      expect(result).toHaveProperty('changes');
    });

    it('returns changes ordered by effective_date DESC', async () => {
      const result = await getRecentChanges(db, { since: '1980-01-01' });
      const changes = result as { changes: Array<{ effective_date: string }> };
      if (changes.changes.length > 1) {
        for (let i = 0; i < changes.changes.length - 1; i++) {
          expect(changes.changes[i].effective_date >= changes.changes[i + 1].effective_date).toBe(true);
        }
      }
    });

    it('includes document metadata in results', async () => {
      const result = await getRecentChanges(db, { since: '2020-01-01' });
      const changes = result as { changes: Array<{ document_title: string; source_url: string | null }> };
      const withTitle = changes.changes.find(c => c.document_title);
      expect(withTitle).toBeDefined();
      expect(withTitle!.source_url).toContain('legislation.gov.uk');
    });
  });
});
