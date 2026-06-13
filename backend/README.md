# DeskGuard Backend

Node.js + Express + SQLite (better-sqlite3). All desk timers are enforced server-side.

## Quick Start

```bash
npm install
npm run dev      # starts with --watch for auto-reload
# or
npm start        # production
```

The server auto-creates `./data/deskguard.db`, applies the schema, and seeds 24 desks on first run.

## Manual Migration

```bash
npm run migrate
```

## Environment Variables

Copy `.env.example` to `.env` and adjust as needed:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4000 | Server port |
| `HEARTBEAT_INTERVAL_MIN` | 120 | Minutes between heartbeat prompts |
| `HEARTBEAT_GRACE_MIN` | 5 | Minutes to respond to heartbeat |
| `AWAY_MAX_MIN` | 20 | Maximum away duration in minutes |
| `SWEEP_INTERVAL_SEC` | 60 | Background sweep runs every N seconds |
| `LIBRARIAN_PASSWORD` | deskguard2024 | Librarian access password |
| `QR_BASE_URL` | http://localhost:3000 | Base URL encoded in QR codes |

## API Endpoints

All endpoints are prefixed with `/api`.

### Desk Endpoints

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/api/desks` | — | List all desks with active session state and computed timers |
| GET | `/api/desks/:id` | — | Get a single desk with full state |
| GET | `/api/desks/:id/qr` | — | Generate a QR code data URI for the desk (query: `?baseUrl=...`) |
| POST | `/api/desks/:id/checkin` | `{ studentName }` | Check in to a desk. Returns `{ sessionToken, desk }` |

### Session Endpoints

| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/api/session/checkout` | `{ sessionToken }` | Check out (student leaves) |
| POST | `/api/session/away` | `{ sessionToken }` | Go away (starts away timer, max 20 min) |
| POST | `/api/session/return` | `{ sessionToken }` | Return from away |
| POST | `/api/session/heartbeat` | `{ sessionToken }` | Respond to heartbeat prompt (also clears away) |
| GET | `/api/session/:token` | — | Get session info with computed timers |

### Librarian Endpoints

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/api/librarian/abandoned` | — | List all abandoned desk events |
| POST | `/api/librarian/release/:deskId` | — | Force-release a desk (ends session, logs abandonment) |
| GET | `/api/librarian/stats` | — | Get stats: `{ total, occupied, free, away, abandonedToday }` |

### Health Check

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Returns `{ ok: true, uptime }` |

## Desk Layout

24 desks arranged in 3 zones (A, B, C), each with 2 rows × 4 columns:

```
Zone A (rows 1-2):  A-1  A-2  A-3  A-4
                    A-5  A-6  A-7  A-8

Zone B (rows 3-4):  B-1  B-2  B-3  B-4
                    B-5  B-6  B-7  B-8

Zone C (rows 5-6):  C-1  C-2  C-3  C-4
                    C-5  C-6  C-7  C-8
```

## How Timers Work

State is **derived** from timestamps stored on each session, plus a background sweep:

1. **Check-in** stores `checked_in_at` and `last_heartbeat_at`. A UUID `sessionToken` is returned to the student.
2. **Heartbeat interval**: After `HEARTBEAT_INTERVAL_MIN` minutes, the sweep sets `heartbeat_pending = 1`. The student has `HEARTBEAT_GRACE_MIN` minutes to respond.
3. **Away**: When a student goes away, `away_since` is set. If they don't return within `AWAY_MAX_MIN` minutes, the sweep marks the desk abandoned and frees it.
4. **Sweep job** runs every minute via `node-cron` and is the single source of truth for expiry.

The browser does **not** run any timers; it polls `/api/desks` and renders whatever state the server reports.

## Response Format

Each desk object includes computed timer fields:

```json
{
  "id": 1,
  "label": "A-1",
  "zone": "A",
  "row_num": 1,
  "col_num": 1,
  "status": "occupied",
  "student_name": "Alice",
  "checked_in_at": "2024-01-15T10:30:00.000Z",
  "away_since": null,
  "heartbeat_pending": 0,
  "away_remaining_sec": null,
  "heartbeat_remaining_sec": null,
  "next_heartbeat_sec": 7140.5,
  "session_token": "uuid-here"
}
```
