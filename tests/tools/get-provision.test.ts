import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '@ansvar/mcp-sqlite';
import { getProvision } from '../../src/tools/get-provision.js';
import { closeTestDatabase, createTestDatabase } from '../fixtures/test-db.js';

describe('get_provision', () => {
  let db: Database;

  beforeAll(() => {
    db = createTestDatabase();
  });

  afterAll(() => {
    closeTestDatabase(db);
  });

  it('returns a specific provision by reference', async () => {
    const response = await getProvision(db, {
      document_id: 'ukpga-2018-12',
      provision_ref: 's1(1)',
    });

    expect(response.results).not.toBeNull();
    expect(Array.isArray(response.results)).toBe(false);
    const row = response.results as Exclude<typeof response.results, null | unknown[]>;
    expect(row.provision_ref).toBe('s1(1)');
    expect(row.title).toContain('Overview');
  });

  it('returns all provisions when no specific reference is provided', async () => {
    const response = await getProvision(db, { document_id: 'ukpga-2018-12' });
    expect(Array.isArray(response.results)).toBe(true);
    expect((response.results as unknown[]).length).toBe(2);
  });

  it('resolves by title input', async () => {
    const response = await getProvision(db, {
      document_id: 'Computer Misuse Act 1990',
      provision_ref: 's1(1)',
    });
    expect(response.results).not.toBeNull();
    const row = response.results as Exclude<typeof response.results, null | unknown[]>;
    expect(row.document_id).toBe('ukpga-1990-18');
  });

  it('returns null for unknown provision', async () => {
    const response = await getProvision(db, {
      document_id: 'ukpga-2018-12',
      provision_ref: 's404',
    });
    expect(response.results).toBeNull();
  });
});
