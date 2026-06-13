require('dotenv').config();

const minToMs = (m) => Number(m) * 60 * 1000;

module.exports = {
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/deskguard',
  // Stored as milliseconds for easy date math.
  heartbeatIntervalMs: minToMs(process.env.HEARTBEAT_INTERVAL_MIN || 120),
  heartbeatGraceMs: minToMs(process.env.HEARTBEAT_GRACE_MIN || 5),
  awayMaxMs: minToMs(process.env.AWAY_MAX_MIN || 20),
  sweepIntervalMs: Number(process.env.SWEEP_INTERVAL_SEC || 60) * 1000,
};
