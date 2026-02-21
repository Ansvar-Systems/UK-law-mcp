import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '@ansvar/mcp-sqlite';
import { listSources } from '../../src/tools/list-sources.js';
import { closeTestDatabase, createTestDatabase } from '../fixtures/test-db.js';

describe('list_sources', () => {
  let db: Database;

  beforeAll(() => {
    db = createTestDatabase();
  });

  afterAll(() => {
    closeTestDatabase(db);
  });

  it('returns jurisdiction and source information', async () => {
    const response = await listSources(db);
    expect(response.results.jurisdiction).toBe('United Kingdom (GB)');
    expect(response.results.sources).toHaveLength(2);
    expect(response.results.sources[0].name).toBe('legislation.gov.uk');
    expect(response.results.sources[0].authority).toBe('The National Archives');
  });

  it('includes database metadata', async () => {
    const response = await listSources(db);
    expect(response.results.database.tier).toBeDefined();
    expect(response.results.database.schema_version).toBeDefined();
    expect(response.results.database.document_count).toBeGreaterThanOrEqual(0);
    expect(response.results.database.provision_count).toBeGreaterThanOrEqual(0);
  });

  it('includes known limitations', async () => {
    const response = await listSources(db);
    expect(response.results.limitations.length).toBeGreaterThan(0);
    expect(response.results.limitations.some(l => l.includes('legislation.gov.uk'))).toBe(true);
  });

  it('includes response metadata', async () => {
    const response = await listSources(db);
    expect(response._metadata).toBeDefined();
    expect(response._metadata.source_authority).toContain('legislation.gov.uk');
  });
});
