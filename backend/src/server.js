require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const config = require('./config');

// Import db — this creates the data directory and DB file on first load
const db = require('./db');

// ---------------------------------------------------------------------------
// Auto-migrate: run schema + seed on startup (idempotent)
// ---------------------------------------------------------------------------
try {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
  db.exec(schema);
  db.exec(seed);
  console.log('Database schema and seed data applied.');
} catch (err) {
  console.error('Migration error:', err.message);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------
const app = express();
app.use(cors());
app.use(express.json());

// Mount API routes
const routes = require('./routes');
app.use('/api', routes);

// Health check
app.get('/health', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

// ---------------------------------------------------------------------------
// Start sweep job and listen
// ---------------------------------------------------------------------------
const { startSweep } = require('./sweep');

app.listen(config.port, () => {
  console.log(`DeskGuard API listening on :${config.port}`);
  startSweep();
});
