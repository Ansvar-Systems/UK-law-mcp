import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '@ansvar/mcp-sqlite';
import { validateEUCompliance } from '../../src/tools/validate-eu-compliance.js';
import { closeTestDatabase, createTestDatabase } from '../fixtures/test-db.js';

describe('validate_eu_compliance', () => {
  let db: Database;

  beforeAll(() => {
    db = createTestDatabase();
  });

  afterAll(() => {
    closeTestDatabase(db);
  });

  it('returns compliant when primary EU implementation exists', async () => {
    const response = await validateEUCompliance(db, { document_id: 'ukpga-2018-12' });
    expect(response.results.compliance_status).toBe('compliant');
    expect(response.results.eu_references_found).toBeGreaterThan(0);
  });

  it('filters by provision and marks partial when only non-primary references exist', async () => {
    const response = await validateEUCompliance(db, {
      document_id: 'ukpga-2018-12',
      provision_ref: 's3',
    });
    expect(response.results.compliance_status).toBe('partial');
    expect(response.results.eu_references_found).toBe(1);
    expect(response.results.warnings.join(' ')).toContain('none are marked as primary');
  });

  it('throws for missing provision when a provision_ref is requested', async () => {
    await expect(
      validateEUCompliance(db, {
        document_id: 'ukpga-2018-12',
        provision_ref: 'missing',
      }),
    ).rejects.toThrow('Provision "missing" not found');
  });

  it('returns not_applicable for statutes with no EU references', async () => {
    const response = await validateEUCompliance(db, { document_id: 'ukpga-1990-18' });
    expect(response.results.compliance_status).toBe('not_applicable');
    expect(response.results.eu_references_found).toBe(0);
  });
});
