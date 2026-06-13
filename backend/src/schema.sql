-- DeskGuard schema
-- A desk is a physical seat. Its live status is derived from its active session
-- plus the server-side sweep job.

CREATE TABLE IF NOT EXISTS desks (
  id          SERIAL PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,        -- value encoded in the desk QR code
  label       TEXT NOT NULL,               -- human label, e.g. 'A1'
  x           INTEGER NOT NULL,            -- SVG map coordinates
  y           INTEGER NOT NULL,
  -- status: free | occupied | away | abandoned
  status      TEXT NOT NULL DEFAULT 'free'
);

CREATE TABLE IF NOT EXISTS sessions (
  id                SERIAL PRIMARY KEY,
  desk_id           INTEGER NOT NULL REFERENCES desks(id),
  student_id        TEXT NOT NULL,
  checkin_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  away_until        TIMESTAMPTZ,           -- set while Away; NULL otherwise
  -- active | ended | abandoned
  state             TEXT NOT NULL DEFAULT 'active',
  ended_at          TIMESTAMPTZ
);

-- At most one active session per desk.
CREATE UNIQUE INDEX IF NOT EXISTS one_active_session_per_desk
  ON sessions (desk_id) WHERE state = 'active';
