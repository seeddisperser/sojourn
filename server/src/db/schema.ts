import Database from 'better-sqlite3'
import { getConfig } from '../config.js'

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!_db) throw new Error('Database not initialized — call initDb() first')
  return _db
}

export function initDb(): Database.Database {
  const config = getConfig()
  _db = new Database(config.db_path)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')
  runMigrations(_db)
  return _db
}

function runMigrations(db: Database.Database): void {
  db.exec(`
    -- Notes (from Obsidian or created in Archive)
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      source_path TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      created_by TEXT NOT NULL DEFAULT 'system',
      updated_by TEXT NOT NULL DEFAULT 'system',
      pruned INTEGER NOT NULL DEFAULT 0
    );

    -- Images
    CREATE TABLE IF NOT EXISTS images (
      id TEXT PRIMARY KEY,
      file_path TEXT NOT NULL,
      thumbnail_path TEXT,
      caption TEXT,
      created_at TEXT NOT NULL,
      created_by TEXT NOT NULL DEFAULT 'system'
    );

    -- Clusters
    CREATE TABLE IF NOT EXISTS clusters (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      canvas_x REAL,
      canvas_y REAL,
      canvas_w REAL,
      canvas_h REAL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      created_by TEXT NOT NULL DEFAULT 'system'
    );

    -- Cluster members (notes or images)
    CREATE TABLE IF NOT EXISTS cluster_members (
      cluster_id TEXT NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
      artifact_id TEXT NOT NULL,
      artifact_type TEXT NOT NULL CHECK(artifact_type IN ('note', 'image')),
      PRIMARY KEY (cluster_id, artifact_id)
    );

    -- Specs
    CREATE TABLE IF NOT EXISTS specs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'Untitled Spec',
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'finalized')),
      body_json TEXT NOT NULL DEFAULT '[]',
      created_by TEXT NOT NULL DEFAULT 'system',
      updated_by TEXT NOT NULL DEFAULT 'system',
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Spec ↔ source clusters
    CREATE TABLE IF NOT EXISTS spec_source_clusters (
      spec_id TEXT NOT NULL REFERENCES specs(id) ON DELETE CASCADE,
      cluster_id TEXT NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
      PRIMARY KEY (spec_id, cluster_id)
    );

    -- Spec ↔ linked builds
    CREATE TABLE IF NOT EXISTS spec_linked_builds (
      spec_id TEXT NOT NULL REFERENCES specs(id) ON DELETE CASCADE,
      build_session_id TEXT NOT NULL,
      PRIMARY KEY (spec_id, build_session_id)
    );

    -- Build sessions
    CREATE TABLE IF NOT EXISTS build_sessions (
      id TEXT PRIMARY KEY,
      spec_id TEXT REFERENCES specs(id) ON DELETE SET NULL,
      command TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'completed', 'failed', 'interrupted')),
      pid INTEGER,
      started_at TEXT,
      updated_at TEXT NOT NULL,
      cost_metrics TEXT,
      preview_url TEXT,
      local_paths TEXT NOT NULL DEFAULT '[]',
      created_by TEXT NOT NULL DEFAULT 'system'
    );

    -- Build logs
    CREATE TABLE IF NOT EXISTS build_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      build_session_id TEXT NOT NULL REFERENCES build_sessions(id) ON DELETE CASCADE,
      stream TEXT NOT NULL CHECK(stream IN ('stdout', 'stderr')),
      line TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );

    -- Hinge points
    CREATE TABLE IF NOT EXISTS hinge_points (
      id TEXT PRIMARY KEY,
      build_session_id TEXT NOT NULL REFERENCES build_sessions(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'acknowledged')),
      source TEXT NOT NULL DEFAULT 'user' CHECK(source IN ('user', 'agent')),
      created_at TEXT NOT NULL,
      acknowledged_at TEXT,
      acknowledged_by TEXT
    );

    -- Events (inbox feed)
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      actor TEXT NOT NULL DEFAULT 'system',
      related_artifact_id TEXT,
      related_artifact_type TEXT,
      message TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      metadata TEXT
    );

    -- Comments
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      parent_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
      artifact_id TEXT NOT NULL,
      artifact_type TEXT NOT NULL,
      author TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- Sessions (auth)
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_name TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    -- Tags
    CREATE TABLE IF NOT EXISTS artifact_tags (
      artifact_id TEXT NOT NULL,
      artifact_type TEXT NOT NULL CHECK(artifact_type IN ('note', 'image', 'cluster', 'spec')),
      tag TEXT NOT NULL,
      PRIMARY KEY (artifact_id, artifact_type, tag)
    );

    -- Card positions on Archive canvas
    CREATE TABLE IF NOT EXISTS card_positions (
      artifact_id TEXT NOT NULL,
      artifact_type TEXT NOT NULL CHECK(artifact_type IN ('note', 'image', 'cluster')),
      canvas_x REAL NOT NULL DEFAULT 0,
      canvas_y REAL NOT NULL DEFAULT 0,
      PRIMARY KEY (artifact_id, artifact_type)
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
    CREATE INDEX IF NOT EXISTS idx_build_logs_session ON build_logs(build_session_id);
    CREATE INDEX IF NOT EXISTS idx_comments_artifact ON comments(artifact_id, artifact_type);
    CREATE INDEX IF NOT EXISTS idx_notes_source_path ON notes(source_path);
    CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
  `)
}
