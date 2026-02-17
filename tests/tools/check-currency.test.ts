import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '@ansvar/mcp-sqlite';
import { checkCurrency } from '../../src/tools/check-currency.js';
import { closeTestDatabase, createTestDatabase } from '../fixtures/test-db.js';

describe('check_currency', () => {
  let db: Database;

  beforeAll(() => {
    db = createTestDatabase();
  });

  afterAll(() => {
    closeTestDatabase(db);
  });

  it('returns current status for an in-force statute', async () => {
    const response = await checkCurrency(db, { document_id: 'ukpga-2018-12' });
    expect(response.results).not.toBeNull();
    const result = response.results as NonNullable<typeof response.results>;
    expect(result.is_current).toBe(true);
    expect(result.type).toBe('statute');
  });

  it('returns warning for repealed statute', async () => {
    const response = await checkCurrency(db, { document_id: 'ukpga-1998-29' });
    expect(response.results).not.toBeNull();
    const result = response.results as NonNullable<typeof response.results>;
    expect(result.is_current).toBe(false);
    expect(result.warnings.join(' ')).toContain('repealed');
  });

  it('reports missing provision', async () => {
    const response = await checkCurrency(db, {
      document_id: 'ukpga-2018-12',
      provision_ref: 'missing-ref',
    });
    expect(response.results).not.toBeNull();
    const result = response.results as NonNullable<typeof response.results>;
    expect(result.provision_exists).toBe(false);
  });
});
