// Background sweep job: the single source of truth for desk expiry.
// Runs every SWEEP_INTERVAL_SEC. It auto-expires desks whose check-in
// heartbeat or Away timer has run out, marking them abandoned and freeing them.
const db = require('./db');
const config = require('./config');

async function sweepOnce() {
  const heartbeatDeadlineMs = config.heartbeatIntervalMs + config.heartbeatGraceMs;

  // Expire active sessions that:
  //  (a) are Away and have passed away_until, OR
  //  (b) have not sent a heartbeat within (interval + grace).
  const { rows } = await db.query(
    `UPDATE sessions s
        SET state = 'abandoned', ended_at = now()
      WHERE s.state = 'active'
        AND (
              (s.away_until IS NOT NULL AND s.away_until < now())
           OR (s.away_until IS NULL AND s.last_heartbeat_at < now() - ($1::bigint * interval '1 millisecond'))
        )
      RETURNING s.desk_id`,
    [heartbeatDeadlineMs]
  );

  if (rows.length > 0) {
    const deskIds = rows.map((r) => r.desk_id);
    // Free the desks whose session was just abandoned.
    await db.query(`UPDATE desks SET status = 'free' WHERE id = ANY($1::int[])`, [deskIds]);
    console.log(`[sweep] freed ${rows.length} abandoned desk(s): ${deskIds.join(', ')}`);
  }
}

function startSweep() {
  // Run immediately, then on an interval.
  sweepOnce().catch((e) => console.error('[sweep] error:', e.message));
  return setInterval(() => {
    sweepOnce().catch((e) => console.error('[sweep] error:', e.message));
  }, config.sweepIntervalMs);
}

module.exports = { startSweep, sweepOnce };
