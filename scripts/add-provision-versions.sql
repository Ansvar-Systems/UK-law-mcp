-- Premium tier: provision version tracking
-- Apply to existing database: sqlite3 data/database.db < scripts/add-provision-versions.sql

CREATE TABLE IF NOT EXISTS provision_versions (
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

CREATE INDEX IF NOT EXISTS idx_pv_provision ON provision_versions(provision_id);
CREATE INDEX IF NOT EXISTS idx_pv_effective ON provision_versions(effective_date);
