import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '@ansvar/mcp-sqlite';
import { searchLegislation } from '../../src/tools/search-legislation.js';
import { closeTestDatabase, createTestDatabase } from '../fixtures/test-db.js';

describe('search_legislation', () => {
  let db: Database;

  beforeAll(() => {
    db = createTestDatabase();
  });

  afterAll(() => {
    closeTestDatabase(db);
  });

  it('finds provisions by keyword', async () => {
    const response = await searchLegislation(db, { query: 'unauthorised access' });
    expect(response.results.length).toBeGreaterThan(0);
    expect(response.results[0].document_id).toBe('ukpga-1990-18');
  });

  it('respects document filter', async () => {
    const response = await searchLegislation(db, {
      query: 'data protection',
      document_id: 'ukpga-2018-12',
    });
    expect(response.results.length).toBeGreaterThan(0);
    for (const row of response.results) {
      expect(row.document_id).toBe('ukpga-2018-12');
    }
  });

  it('rejects invalid as_of_date', async () => {
    await expect(
      searchLegislation(db, { query: 'data', as_of_date: '2026/02/16' }),
    ).rejects.toThrow('as_of_date must be an ISO date');
  });

  it('returns empty results for empty query', async () => {
    const response = await searchLegislation(db, { query: '' });
    expect(response.results).toEqual([]);
  });
});
