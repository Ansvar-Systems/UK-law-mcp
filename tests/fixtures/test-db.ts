import Database from '@ansvar/mcp-sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SCHEMA = `
CREATE TABLE legal_documents (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('statute', 'bill', 'case_law')),
  title TEXT NOT NULL,
  title_en TEXT,
  short_name TEXT,
  status TEXT NOT NULL DEFAULT 'in_force'
    CHECK(status IN ('in_force', 'amended', 'repealed', 'not_yet_in_force')),
  issued_date TEXT,
  in_force_date TEXT,
  url TEXT,
  description TEXT,
  last_updated TEXT DEFAULT (datetime('now'))
);

CREATE TABLE legal_provisions (
  id INTEGER PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES legal_documents(id),
  provision_ref TEXT NOT NULL,
  chapter TEXT,
  section TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  metadata TEXT,
  UNIQUE(document_id, provision_ref)
);

CREATE INDEX idx_provisions_doc ON legal_provisions(document_id);

CREATE VIRTUAL TABLE provisions_fts USING fts5(
  content, title,
  content='legal_provisions',
  content_rowid='id',
  tokenize='unicode61'
);

CREATE TRIGGER provisions_ai AFTER INSERT ON legal_provisions BEGIN
  INSERT INTO provisions_fts(rowid, content, title)
  VALUES (new.id, new.content, new.title);
END;

CREATE TRIGGER provisions_ad AFTER DELETE ON legal_provisions BEGIN
  INSERT INTO provisions_fts(provisions_fts, rowid, content, title)
  VALUES ('delete', old.id, old.content, old.title);
END;

CREATE TRIGGER provisions_au AFTER UPDATE ON legal_provisions BEGIN
  INSERT INTO provisions_fts(provisions_fts, rowid, content, title)
  VALUES ('delete', old.id, old.content, old.title);
  INSERT INTO provisions_fts(rowid, content, title)
  VALUES (new.id, new.content, new.title);
END;

CREATE TABLE eu_documents (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('directive', 'regulation')),
  year INTEGER NOT NULL,
  number INTEGER NOT NULL,
  community TEXT CHECK (community IN ('EU', 'EC', 'EEC', 'Euratom')),
  celex_number TEXT,
  title TEXT,
  title_en TEXT,
  short_name TEXT,
  adoption_date TEXT,
  entry_into_force_date TEXT,
  in_force BOOLEAN DEFAULT 1,
  amended_by TEXT,
  repeals TEXT,
  url_eur_lex TEXT,
  description TEXT,
  last_updated TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE eu_references (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_type TEXT NOT NULL CHECK (source_type IN ('provision', 'document', 'case_law')),
  source_id TEXT NOT NULL,
  document_id TEXT NOT NULL REFERENCES legal_documents(id),
  provision_id INTEGER REFERENCES legal_provisions(id),
  eu_document_id TEXT NOT NULL REFERENCES eu_documents(id),
  eu_article TEXT,
  reference_type TEXT NOT NULL CHECK (reference_type IN (
    'implements', 'supplements', 'applies', 'references', 'complies_with',
    'derogates_from', 'amended_by', 'repealed_by', 'cites_article'
  )),
  reference_context TEXT,
  full_citation TEXT,
  is_primary_implementation BOOLEAN DEFAULT 0,
  implementation_status TEXT CHECK (implementation_status IN ('complete', 'partial', 'pending', 'unknown')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_verified TEXT,
  UNIQUE(source_id, eu_document_id, eu_article)
);

CREATE TABLE db_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Premium tier: provision version tracking
CREATE TABLE provision_versions (
  id INTEGER PRIMARY KEY,
  provision_id INTEGER NOT NULL,
  body_text TEXT NOT NULL,
  effective_date TEXT,
  superseded_date TEXT,
  scraped_at TEXT NOT NULL,
  change_summary TEXT,
  diff_from_previous TEXT,
  source_url TEXT,
  FOREIGN KEY (provision_id) REFERENCES legal_provisions(id)
);

CREATE INDEX idx_pv_provision ON provision_versions(provision_id);
CREATE INDEX idx_pv_effective ON provision_versions(effective_date);
`;

interface TempDbMeta {
  tempDir: string;
}

const tempDbMeta = new WeakMap<InstanceType<typeof Database>, TempDbMeta>();

export function createTestDatabase(): InstanceType<typeof Database> {
  const tempDir = mkdtempSync(join(tmpdir(), 'uk-law-mcp-test-'));
  const dbPath = join(tempDir, 'database.db');
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);

  const insertDocument = db.prepare(`
    INSERT INTO legal_documents (id, type, title, short_name, status, issued_date, in_force_date, url, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertProvision = db.prepare(`
    INSERT INTO legal_provisions (document_id, provision_ref, chapter, section, title, content)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertEuDocument = db.prepare(`
    INSERT INTO eu_documents (id, type, year, number, community, title, short_name, url_eur_lex)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertEuReference = db.prepare(`
    INSERT INTO eu_references (
      source_type, source_id, document_id, provision_id, eu_document_id, eu_article,
      reference_type, reference_context, full_citation, is_primary_implementation, implementation_status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMeta = db.prepare(`INSERT INTO db_metadata (key, value) VALUES (?, ?)`);

  db.transaction(() => {
    insertDocument.run(
      'ukpga-2018-12',
      'statute',
      'Data Protection Act 2018',
      'DPA 2018',
      'in_force',
      '2018-05-23',
      '2018-05-25',
      'https://www.legislation.gov.uk/ukpga/2018/12/contents',
      'UK data protection framework',
    );
    insertDocument.run(
      'ukpga-1990-18',
      'statute',
      'Computer Misuse Act 1990',
      'CMA 1990',
      'in_force',
      '1990-06-29',
      '1990-08-29',
      'https://www.legislation.gov.uk/ukpga/1990/18/contents',
      'Computer offences legislation',
    );
    insertDocument.run(
      'ukpga-1998-29',
      'statute',
      'Data Protection Act 1998',
      'DPA 1998',
      'repealed',
      '1998-07-16',
      '2000-03-01',
      'https://www.legislation.gov.uk/ukpga/1998/29/contents',
      'Legacy UK data protection law',
    );
    insertDocument.run(
      'ukpga-2023-50',
      'statute',
      'Online Safety Act 2023',
      'OSA 2023',
      'in_force',
      '2023-10-26',
      null,
      'https://www.legislation.gov.uk/ukpga/2023/50/contents',
      'Online harms regulation',
    );

    insertProvision.run(
      'ukpga-2018-12',
      's1(1)',
      '1',
      '1',
      'Overview',
      'This Act provides an overview of data protection law and supplements the GDPR.',
    );
    insertProvision.run(
      'ukpga-2018-12',
      's3',
      '1',
      '3',
      'Definitions',
      'Processing means any operation performed on personal data by a controller or processor.',
    );
    insertProvision.run(
      'ukpga-1990-18',
      's1(1)',
      '1',
      '1',
      'Unauthorised access',
      'A person is guilty if they cause a computer to perform a function with intent to secure unauthorised access.',
    );
    insertProvision.run(
      'ukpga-1998-29',
      's1',
      null,
      '1',
      'Basic interpretative provision',
      'This Act is repealed and replaced by the Data Protection Act 2018.',
    );
    insertProvision.run(
      'ukpga-2023-50',
      's1(1)',
      '1',
      '1',
      'Introduction',
      'This Act introduces duties of care for online services and user safety.',
    );

    insertEuDocument.run(
      'regulation:2016/679',
      'regulation',
      2016,
      679,
      'EU',
      'General Data Protection Regulation',
      'GDPR',
      'https://eur-lex.europa.eu/eli/reg/2016/679/oj',
    );
    insertEuDocument.run(
      'directive:2016/680',
      'directive',
      2016,
      680,
      'EU',
      'Law Enforcement Data Protection Directive',
      'LED',
      'https://eur-lex.europa.eu/eli/dir/2016/680/oj',
    );

    const s3 = db.prepare(
      `SELECT id FROM legal_provisions WHERE document_id = 'ukpga-2018-12' AND provision_ref = 's3'`,
    ).get() as { id: number };

    insertEuReference.run(
      'document',
      'ukpga-2018-12',
      'ukpga-2018-12',
      null,
      'regulation:2016/679',
      null,
      'implements',
      'Act-level implementation of GDPR',
      'Data Protection Act 2018 implements GDPR',
      1,
      'complete',
    );
    insertEuReference.run(
      'provision',
      'ukpga-2018-12:s3',
      'ukpga-2018-12',
      s3.id,
      'directive:2016/680',
      'Article 1',
      'references',
      'Provision references LED concepts',
      'Section 3 references Directive (EU) 2016/680',
      0,
      'partial',
    );

    const builtAt = new Date().toISOString();
    insertMeta.run('tier', 'free');
    insertMeta.run('schema_version', '2');
    insertMeta.run('built_at', builtAt);
    insertMeta.run('builder', 'tests/fixtures/test-db.ts');
    insertMeta.run('jurisdiction', 'GB');
    insertMeta.run('source', 'legislation.gov.uk');

    // Premium: sample provision version history
    const insertVersion = db.prepare(`
      INSERT INTO provision_versions
      (provision_id, body_text, effective_date, superseded_date, scraped_at, change_summary, diff_from_previous, source_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // DPA 2018 s1(1) — two versions (original + amendment)
    const s1_1 = db
      .prepare("SELECT id FROM legal_provisions WHERE document_id = 'ukpga-2018-12' AND provision_ref = 's1(1)'")
      .get() as { id: number };

    insertVersion.run(
      s1_1.id,
      'Original overview text from 2018 enactment.',
      '2018-05-25',
      '2024-06-01',
      '2026-01-01T00:00:00Z',
      'Initial enactment of DPA 2018',
      null,
      'https://www.legislation.gov.uk/ukpga/2018/12/section/1/enacted',
    );
    insertVersion.run(
      s1_1.id,
      'This Act provides an overview of data protection law and supplements the GDPR.',
      '2024-06-01',
      null,
      '2026-02-01T00:00:00Z',
      'Minor editorial amendment to align with retained EU law terminology',
      '--- a/DPA_2018_s1_1\n+++ b/DPA_2018_s1_1\n@@ -1,1 +1,1 @@\n-Original overview text from 2018 enactment.\n+This Act provides an overview of data protection law and supplements the GDPR.',
      'https://www.legislation.gov.uk/ukpga/2018/12/section/1',
    );

    // CMA 1990 s1(1) — single version (no amendments)
    const cma_s1 = db
      .prepare("SELECT id FROM legal_provisions WHERE document_id = 'ukpga-1990-18' AND provision_ref = 's1(1)'")
      .get() as { id: number };

    insertVersion.run(
      cma_s1.id,
      'A person is guilty if they cause a computer to perform a function with intent to secure unauthorised access.',
      '1990-08-29',
      null,
      '2026-01-15T00:00:00Z',
      'Initial enactment',
      null,
      'https://www.legislation.gov.uk/ukpga/1990/18/section/1',
    );
  })();

  tempDbMeta.set(db, { tempDir });
  return db;
}

export function closeTestDatabase(db: InstanceType<typeof Database>): void {
  const meta = tempDbMeta.get(db);
  db.close();
  if (meta) {
    rmSync(meta.tempDir, { recursive: true, force: true });
    tempDbMeta.delete(db);
  }
}
