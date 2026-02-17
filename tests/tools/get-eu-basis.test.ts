import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '@ansvar/mcp-sqlite';
import { getEUBasis } from '../../src/tools/get-eu-basis.js';
import { closeTestDatabase, createTestDatabase } from '../fixtures/test-db.js';

describe('get_eu_basis', () => {
  let db: Database;

  beforeAll(() => {
    db = createTestDatabase();
  });

  afterAll(() => {
    closeTestDatabase(db);
  });

  it('returns EU basis for known statute', async () => {
    const response = await getEUBasis(db, {
      document_id: 'ukpga-2018-12',
      include_articles: true,
    });
    expect(response.results.document_id).toBe('ukpga-2018-12');
    expect(response.results.eu_documents.length).toBeGreaterThan(0);
    expect(response.results.statistics.regulation_count).toBeGreaterThan(0);
  });

  it('supports title-based resolution', async () => {
    const response = await getEUBasis(db, { document_id: 'Data Protection Act 2018' });
    expect(response.results.document_id).toBe('ukpga-2018-12');
  });

  it('throws for unknown statute', async () => {
    await expect(getEUBasis(db, { document_id: 'ukpga-9999-1' })).rejects.toThrow(
      'not found in database',
    );
  });
});
