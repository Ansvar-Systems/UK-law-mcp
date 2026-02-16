import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import Database from '@ansvar/mcp-sqlite';
import { join } from 'path';
import { existsSync, createWriteStream, rmSync, renameSync } from 'fs';
import { pipeline } from 'stream/promises';
import { createGunzip } from 'zlib';
import https from 'https';
import type { IncomingMessage } from 'http';

import { registerTools } from '../src/tools/registry.js';

// ---------------------------------------------------------------------------
// Server identity
// ---------------------------------------------------------------------------

const SERVER_NAME = 'uk-law-mcp';
const SERVER_VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// Database — downloaded from GitHub Releases on cold start (Strategy B)
// ---------------------------------------------------------------------------

const TMP_DB = '/tmp/database.db';
const TMP_DB_TMP = '/tmp/database.db.tmp';
const TMP_DB_LOCK = '/tmp/database.db.lock';

const GITHUB_REPO = 'Ansvar-Systems/UK-law-mcp';
const RELEASE_TAG = `v${SERVER_VERSION}`;
const ASSET_NAME = 'database.db.gz';

let db: InstanceType<typeof Database> | null = null;
let dbReady = false;

function httpsGet(url: string): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': SERVER_NAME } }, resolve)
      .on('error', reject);
  });
}

async function downloadDatabase(): Promise<void> {
  const url = `https://github.com/${GITHUB_REPO}/releases/download/${RELEASE_TAG}/${ASSET_NAME}`;

  let response = await httpsGet(url);

  // Follow up to 5 redirects (GitHub redirects to S3)
  let redirects = 0;
  while (
    response.statusCode &&
    response.statusCode >= 300 &&
    response.statusCode < 400 &&
    response.headers.location &&
    redirects < 5
  ) {
    response = await httpsGet(response.headers.location);
    redirects++;
  }

  if (response.statusCode !== 200) {
    throw new Error(
      `Failed to download database: HTTP ${response.statusCode} from ${url}`,
    );
  }

  const gunzip = createGunzip();
  const out = createWriteStream(TMP_DB_TMP);
  await pipeline(response, gunzip, out);
  renameSync(TMP_DB_TMP, TMP_DB);
}

async function ensureDatabase(): Promise<void> {
  if (dbReady) return;

  // Clean stale lock files from previous invocations
  if (existsSync(TMP_DB_LOCK)) {
    rmSync(TMP_DB_LOCK, { recursive: true, force: true });
  }

  if (!existsSync(TMP_DB)) {
    const envDb = process.env.UK_LAW_DB_PATH;
    if (envDb && existsSync(envDb)) {
      // Local dev: use env-specified DB directly, no download
      dbReady = true;
      return;
    }

    // Check for bundled DB (local dev fallback)
    const bundledDb = join(process.cwd(), 'data', 'database.db');
    if (existsSync(bundledDb)) {
      const { copyFileSync } = await import('fs');
      copyFileSync(bundledDb, TMP_DB);
    } else {
      console.log('[uk-law-mcp] Downloading database from GitHub Releases...');
      await downloadDatabase();
      console.log('[uk-law-mcp] Database ready');
    }
  }

  dbReady = true;
}

function getDatabase(): InstanceType<typeof Database> {
  if (!db) {
    db = new Database(TMP_DB, { readonly: true });
    db.pragma('foreign_keys = ON');
  }
  return db;
}

// ---------------------------------------------------------------------------
// Vercel handler
// ---------------------------------------------------------------------------

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');
  res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method === 'GET') {
    res.status(200).json({
      name: SERVER_NAME,
      version: SERVER_VERSION,
      protocol: 'mcp-streamable-http',
    });
    return;
  }

  try {
    await ensureDatabase();
    const database = getDatabase();

    const server = new Server(
      { name: SERVER_NAME, version: SERVER_VERSION },
      { capabilities: { tools: {} } }
    );

    registerTools(server, database);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('MCP handler error:', message);
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    }
  }
}
