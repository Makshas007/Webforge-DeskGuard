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

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and adjust as needed:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4000 | Server port |
| `HEARTBEAT_INTERVAL_MIN` | 120 | Minutes between heartbeat prompts |
| `HEARTBEAT_GRACE_MIN` | 5 | Minutes to respond to heartbeat |
| `AWAY_MAX_MIN` | 20 | Maximum away duration in minutes |
| `SWEEP_INTERVAL_SEC` | 60 | Background sweep runs every N seconds |
| `LIBRARIAN_PASSWORD` | deskguard2024 | Librarian access password |
| `QR_BASE_URL` | http://localhost:3000 | Base URL encoded in QR codes |

## How to Run

### 1. Start the Backend API

```bash
cd backend
npm install
npm start
```
The server will automatically create a local SQLite database (`./data/deskguard.db`), seed the 24 desks, and start the API and sweep job on port 4000.

### 2. Start the Frontend React App

Open a new terminal window:
```bash
cd frontend
npm install
npm start
```
This serves the React application on port 3000 and proxies API calls to the backend.

Open http://localhost:3000 for the live map, and http://localhost:3000/librarian for the librarian dashboard.

## API

See `backend/README.md` for the full endpoint reference.
