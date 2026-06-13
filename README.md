# DeskGuard

Library Seat Booking & Anti-Hoarding App.

Students check in to a library desk by scanning its QR code. A live, color-coded SVG map shows desk state:

- **Green** = Free
- **Red** = Occupied
- **Yellow** = Away
- **Abandoned** desks are auto-freed and surfaced to librarians.

## Engineering principles

- **All timers run server-side.** The browser never enforces a timer; it only polls and renders state returned by the API.
- A **background sweep job** runs every minute and auto-expires desks whose check-in heartbeat or Away timer has run out.
- Librarians get a dashboard to view abandoned desks and manually reset them.

## Architecture

```
backend/   Node.js + Express API, PostgreSQL, 60s sweep job
frontend/  React app with SVG library map (polls server every 5s)
```

## Timer rules (configurable via env)

| Rule | Default | Env var |
|------|---------|---------|
| 'Still here?' heartbeat interval | 2 hours | `HEARTBEAT_INTERVAL_MIN` |
| 'Still here?' response window | 5 minutes | `HEARTBEAT_GRACE_MIN` |
| Max Away duration | 20 minutes | `AWAY_MAX_MIN` |
| Sweep interval | 1 minute | `SWEEP_INTERVAL_SEC` |

## Quick start

### 1. Backend

```bash
cd backend
cp .env.example .env   # edit DATABASE_URL
npm install
npm run migrate        # creates tables + seed desks
npm start              # starts API + sweep job on :4000
```

### 2. Frontend

```bash
cd frontend
npm install
npm start              # serves React app on :3000, proxies API to :4000
```

Open http://localhost:3000 for the live map, and http://localhost:3000/librarian for the librarian dashboard.

## API

See `backend/README.md` for the full endpoint reference.
