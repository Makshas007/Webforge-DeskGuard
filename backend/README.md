# DeskGuard backend

Node.js + Express + PostgreSQL. All desk timers are enforced server-side.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/desks` | List all desks with current computed state |
| POST | `/api/desks/:code/checkin` | Check in to a desk via its QR code. Body: `{ studentId }` |
| POST | `/api/desks/:code/away` | Pause the session (Away), up to 20 min |
| POST | `/api/desks/:code/heartbeat` | Respond to a 'Still here?' prompt |
| POST | `/api/desks/:code/checkout` | Free the desk (student leaves) |
| GET | `/api/librarian/abandoned` | List desks flagged Abandoned |
| POST | `/api/librarian/desks/:code/reset` | Manually reset a desk to Free |

## How timers work

State is **derived** from timestamps stored on each session, plus a background sweep:

- On check-in we store `checkin_at` and `last_heartbeat_at`.
- A desk needs a heartbeat every `HEARTBEAT_INTERVAL_MIN`. Once that elapses the desk is in its grace window; if `HEARTBEAT_GRACE_MIN` also elapses with no heartbeat, the sweep marks it **Abandoned** and frees it.
- 'Away' stores `away_until = now + AWAY_MAX_MIN`. If the student does not return (heartbeat/checkin) before `away_until`, the sweep marks the desk **Abandoned** and frees it.
- The sweep job runs every `SWEEP_INTERVAL_SEC` and is the single source of truth for expiry.

The browser does **not** run any timers; it polls `/api/desks` and renders whatever state the server reports.
