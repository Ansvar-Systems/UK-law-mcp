import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '@ansvar/mcp-sqlite';
import { validateCitationTool } from '../../src/tools/validate-citation.js';
import { closeTestDatabase, createTestDatabase } from '../fixtures/test-db.js';

describe('validate_citation tool', () => {
  let db: Database;

  beforeAll(() => {
    db = createTestDatabase();
  });

  afterAll(() => {
    closeTestDatabase(db);
  });

  it('marks existing citation as valid', async () => {
    const response = await validateCitationTool(db, {
      citation: 'Data Protection Act 2018, s. 3',
    });
    expect(response.results.valid).toBe(true);
    expect(response.results.document_exists).toBe(true);
    expect(response.results.provision_exists).toBe(true);
  });

  it('marks unknown citation as invalid', async () => {
    const response = await validateCitationTool(db, {
      citation: 'Totally Unknown Act 2099, s. 1',
    });
    expect(response.results.valid).toBe(false);
    expect(response.results.document_exists).toBe(false);
  });
});
