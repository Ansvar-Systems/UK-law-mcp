import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '@ansvar/mcp-sqlite';
import { validateCitation } from '../../src/citation/validator.js';
import { closeTestDatabase, createTestDatabase } from '../fixtures/test-db.js';

describe('validateCitation', () => {
  let db: Database;

  beforeAll(() => {
    db = createTestDatabase();
  });

  afterAll(() => {
    closeTestDatabase(db);
  });

  it('validates known citation with existing provision', () => {
    const result = validateCitation(db, 'Data Protection Act 2018, s. 3');
    expect(result.document_exists).toBe(true);
    expect(result.provision_exists).toBe(true);
    expect(result.warnings.length).toBe(0);
  });

  it('returns warnings for missing provision', () => {
    const result = validateCitation(db, 'Data Protection Act 2018, s. 999');
    expect(result.document_exists).toBe(true);
    expect(result.provision_exists).toBe(false);
    expect(result.warnings.join(' ')).toContain('Section 999 not found');
  });

  it('returns invalid for unparseable citations', () => {
    const result = validateCitation(db, 'this is not parseable');
    expect(result.document_exists).toBe(false);
    expect(result.provision_exists).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
