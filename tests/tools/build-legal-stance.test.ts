import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '@ansvar/mcp-sqlite';
import { buildLegalStance } from '../../src/tools/build-legal-stance.js';
import { closeTestDatabase, createTestDatabase } from '../fixtures/test-db.js';

describe('build_legal_stance', () => {
  let db: Database;

  beforeAll(() => {
    db = createTestDatabase();
  });

  afterAll(() => {
    closeTestDatabase(db);
  });

  it('aggregates provision hits for a query', async () => {
    const response = await buildLegalStance(db, { query: 'data protection' });
    expect(response.results.provisions.length).toBeGreaterThan(0);
    expect(response.results.total_citations).toBe(response.results.provisions.length);
  });

  it('returns empty result for empty query', async () => {
    const response = await buildLegalStance(db, { query: '' });
    expect(response.results.total_citations).toBe(0);
    expect(response.results.provisions).toEqual([]);
  });
});
