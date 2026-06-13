// Background sweep job: the single source of truth for desk expiry.
// Runs every minute via node-cron. It handles three scenarios:
//   1. Away sessions that have exceeded awayMaxMs → abandoned
//   2. Occupied sessions that need a heartbeat prompt → set heartbeat_pending
//   3. Heartbeat prompts that exceeded graceMs → abandoned
const cron = require('node-cron');
const db = require('./db');
const config = require('./config');

/**
 * Run one sweep cycle. All work is done inside a transaction for atomicity.
 */
function sweepOnce() {
  const now = Date.now();
  const nowStr = new Date(now).toISOString();

  const doSweep = db.transaction(() => {
    let awayExpired = 0;
    let heartbeatPrompted = 0;
    let heartbeatExpired = 0;

    // -----------------------------------------------------------------------
    // 1. Expire away sessions: away_since + awayMaxMs < now
    // -----------------------------------------------------------------------
    const awaySessions = db.prepare(`
      SELECT s.id AS session_id, s.student_name, s.desk_id, d.label AS desk_label
        FROM sessions s
        JOIN desks d ON d.id = s.desk_id
       WHERE s.ended_at IS NULL
         AND d.status = 'away'
         AND s.away_since IS NOT NULL
    `).all();

    for (const sess of awaySessions) {
      // Re-fetch away_since for the specific session
      const fullSess = db.prepare('SELECT away_since FROM sessions WHERE id = ?').get(sess.session_id);
      const awaySince = new Date(fullSess.away_since).getTime();
      if (awaySince + config.awayMaxMs < now) {
        db.prepare('UPDATE sessions SET ended_at = ?, end_reason = ? WHERE id = ?')
          .run(nowStr, 'away_expired', sess.session_id);
        db.prepare("UPDATE desks SET status = 'free' WHERE id = ?")
          .run(sess.desk_id);
        db.prepare(`
          INSERT INTO abandoned_log (desk_id, desk_label, student_name, reason, abandoned_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(sess.desk_id, sess.desk_label, sess.student_name, 'away_expired', nowStr);
        awayExpired++;
      }
    }

    // -----------------------------------------------------------------------
    // 2. Prompt heartbeat: last_heartbeat_at + heartbeatIntervalMs < now
    //    AND heartbeat_pending = 0 (not already prompted)
    // -----------------------------------------------------------------------
    const needPrompt = db.prepare(`
      SELECT s.id AS session_id, s.last_heartbeat_at
        FROM sessions s
        JOIN desks d ON d.id = s.desk_id
       WHERE s.ended_at IS NULL
         AND d.status = 'occupied'
         AND s.heartbeat_pending = 0
    `).all();

    for (const sess of needPrompt) {
      const lastHb = new Date(sess.last_heartbeat_at).getTime();
      if (lastHb + config.heartbeatIntervalMs < now) {
        db.prepare('UPDATE sessions SET heartbeat_pending = 1, heartbeat_prompted_at = ? WHERE id = ?')
          .run(nowStr, sess.session_id);
        heartbeatPrompted++;
      }
    }

    // -----------------------------------------------------------------------
    // 3. Expire heartbeat grace: heartbeat_pending = 1 AND
    //    heartbeat_prompted_at + heartbeatGraceMs < now
    // -----------------------------------------------------------------------
    const pendingHeartbeats = db.prepare(`
      SELECT s.id AS session_id, s.student_name, s.desk_id, s.heartbeat_prompted_at,
             d.label AS desk_label
        FROM sessions s
        JOIN desks d ON d.id = s.desk_id
       WHERE s.ended_at IS NULL
         AND s.heartbeat_pending = 1
         AND s.heartbeat_prompted_at IS NOT NULL
    `).all();

    for (const sess of pendingHeartbeats) {
      const promptedAt = new Date(sess.heartbeat_prompted_at).getTime();
      if (promptedAt + config.heartbeatGraceMs < now) {
        db.prepare('UPDATE sessions SET ended_at = ?, end_reason = ? WHERE id = ?')
          .run(nowStr, 'heartbeat_expired', sess.session_id);
        db.prepare("UPDATE desks SET status = 'free' WHERE id = ?")
          .run(sess.desk_id);
        db.prepare(`
          INSERT INTO abandoned_log (desk_id, desk_label, student_name, reason, abandoned_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(sess.desk_id, sess.desk_label, sess.student_name, 'heartbeat_expired', nowStr);
        heartbeatExpired++;
      }
    }

    return { awayExpired, heartbeatPrompted, heartbeatExpired };
  });

  const result = doSweep();

  if (result.awayExpired || result.heartbeatPrompted || result.heartbeatExpired) {
    console.log(
      `[sweep] away_expired=${result.awayExpired} hb_prompted=${result.heartbeatPrompted} hb_expired=${result.heartbeatExpired}`
    );
  }

  return result;
}

/**
 * Start the recurring sweep job using node-cron (every minute).
 */
function startSweep() {
  // Run once immediately at startup
  try {
    sweepOnce();
  } catch (e) {
    console.error('[sweep] startup error:', e.message);
  }

  // Schedule to run every minute
  cron.schedule('* * * * *', () => {
    try {
      sweepOnce();
    } catch (e) {
      console.error('[sweep] error:', e.message);
    }
  });

  console.log('[sweep] Cron job scheduled (every 60s)');
}

module.exports = { startSweep, sweepOnce };
