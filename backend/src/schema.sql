-- DeskGuard schema (SQLite)
-- A desk is a physical seat. Its live status is derived from its active session
-- plus the server-side sweep job.

CREATE TABLE IF NOT EXISTS desks (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  label    TEXT NOT NULL UNIQUE,
  zone     TEXT NOT NULL,
  row_num  INTEGER NOT NULL,
  col_num  INTEGER NOT NULL,
  status   TEXT NOT NULL DEFAULT 'free'
);

CREATE TABLE IF NOT EXISTS sessions (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  token                TEXT NOT NULL UNIQUE,
  desk_id              INTEGER NOT NULL,
  student_name         TEXT NOT NULL,
  checked_in_at        TEXT NOT NULL,
  last_heartbeat_at    TEXT NOT NULL,
  heartbeat_pending    INTEGER NOT NULL DEFAULT 0,
  heartbeat_prompted_at TEXT,
  away_since           TEXT,
  ended_at             TEXT,
  end_reason           TEXT,
  FOREIGN KEY (desk_id) REFERENCES desks(id)
);

CREATE TABLE IF NOT EXISTS abandoned_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  desk_id       INTEGER NOT NULL,
  desk_label    TEXT NOT NULL,
  student_name  TEXT NOT NULL,
  reason        TEXT NOT NULL,
  abandoned_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(desk_id) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
