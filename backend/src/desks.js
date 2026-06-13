// Desk/session domain logic. All state transitions are server-side.
// Uses better-sqlite3 synchronous API throughout.
const db = require('./db');
const config = require('./config');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

function nowISO() {
  return new Date().toISOString();
}

/**
 * Given a raw row from the desks LEFT JOIN sessions query,
 * compute the derived timer fields that the frontend needs.
 */
function enrichDesk(row) {
  const now = Date.now();

  const result = {
    id: row.id,
    label: row.label,
    zone: row.zone,
    row_num: row.row_num,
    col_num: row.col_num,
    status: row.status,
    student_name: row.student_name || null,
    checked_in_at: row.checked_in_at || null,
    away_since: row.away_since || null,
    heartbeat_pending: row.heartbeat_pending || 0,
    away_remaining_sec: null,
    heartbeat_remaining_sec: null,
    next_heartbeat_sec: null,
    session_token: row.token || null,
  };

  // Away countdown
  if (row.away_since) {
    const elapsed = now - new Date(row.away_since).getTime();
    const remaining = (config.awayMaxMs - elapsed) / 1000;
    result.away_remaining_sec = Math.max(0, Math.round(remaining * 10) / 10);
  }

  // Heartbeat grace countdown (when a heartbeat prompt is active)
  if (row.heartbeat_pending && row.heartbeat_prompted_at) {
    const elapsed = now - new Date(row.heartbeat_prompted_at).getTime();
    const remaining = (config.heartbeatGraceMs - elapsed) / 1000;
    result.heartbeat_remaining_sec = Math.max(0, Math.round(remaining * 10) / 10);
  }

  // Next heartbeat prompt countdown (when occupied, no prompt active)
  if (row.student_name && !row.heartbeat_pending && row.last_heartbeat_at) {
    const elapsed = now - new Date(row.last_heartbeat_at).getTime();
    const remaining = (config.heartbeatIntervalMs - elapsed) / 1000;
    result.next_heartbeat_sec = Math.max(0, Math.round(remaining * 10) / 10);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Prepared statements (lazy-initialized on first use)
// ---------------------------------------------------------------------------

const stmts = {};

function getStmt(key, sql) {
  if (!stmts[key]) {
    stmts[key] = db.prepare(sql);
  }
  return stmts[key];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * List all desks with their active session data and computed timers.
 */
function getAllDesks() {
  const stmt = getStmt('getAllDesks', `
    SELECT d.id, d.label, d.zone, d.row_num, d.col_num, d.status,
           s.token, s.student_name, s.checked_in_at, s.last_heartbeat_at,
           s.heartbeat_pending, s.heartbeat_prompted_at, s.away_since
      FROM desks d
      LEFT JOIN sessions s ON s.desk_id = d.id AND s.ended_at IS NULL
     ORDER BY d.zone, d.row_num, d.col_num
  `);
  const rows = stmt.all();
  return rows.map(enrichDesk);
}

/**
 * Get a single desk by ID with its active session data and computed timers.
 */
function getDesk(id) {
  const stmt = getStmt('getDesk', `
    SELECT d.id, d.label, d.zone, d.row_num, d.col_num, d.status,
           s.token, s.student_name, s.checked_in_at, s.last_heartbeat_at,
           s.heartbeat_pending, s.heartbeat_prompted_at, s.away_since
      FROM desks d
      LEFT JOIN sessions s ON s.desk_id = d.id AND s.ended_at IS NULL
     WHERE d.id = ?
  `);
  const row = stmt.get(id);
  if (!row) throw httpError(404, 'Desk not found');
  return enrichDesk(row);
}

/**
 * Check in a student to a desk. Creates a session with a UUID token.
 */
function checkIn(deskId, studentName) {
  if (!studentName || !studentName.trim()) {
    throw httpError(400, 'studentName is required');
  }

  const desk = getStmt('getDeskRaw', 'SELECT * FROM desks WHERE id = ?').get(deskId);
  if (!desk) throw httpError(404, 'Desk not found');
  if (desk.status !== 'free') throw httpError(409, 'Desk is not free');

  const token = uuidv4();
  const now = nowISO();

  const doCheckIn = db.transaction(() => {
    getStmt('insertSession', `
      INSERT INTO sessions (token, desk_id, student_name, checked_in_at, last_heartbeat_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(token, deskId, studentName.trim(), now, now);

    getStmt('setDeskStatus', `UPDATE desks SET status = ? WHERE id = ?`)
      .run('occupied', deskId);
  });

  doCheckIn();

  return { sessionToken: token, desk: getDesk(deskId) };
}

/**
 * Check out (student leaves voluntarily).
 */
function checkOut(sessionToken) {
  if (!sessionToken) throw httpError(400, 'sessionToken is required');

  const session = getStmt('getActiveSession', `
    SELECT * FROM sessions WHERE token = ? AND ended_at IS NULL
  `).get(sessionToken);
  if (!session) throw httpError(404, 'No active session with this token');

  const now = nowISO();

  const doCheckOut = db.transaction(() => {
    getStmt('endSession', `
      UPDATE sessions SET ended_at = ?, end_reason = ? WHERE id = ?
    `).run(now, 'checkout', session.id);

    getStmt('setDeskStatus', `UPDATE desks SET status = ? WHERE id = ?`)
      .run('free', session.desk_id);
  });

  doCheckOut();

  return getDesk(session.desk_id);
}

/**
 * Mark session as away.
 */
function goAway(sessionToken) {
  if (!sessionToken) throw httpError(400, 'sessionToken is required');

  const session = getStmt('getActiveSession', `
    SELECT * FROM sessions WHERE token = ? AND ended_at IS NULL
  `).get(sessionToken);
  if (!session) throw httpError(404, 'No active session with this token');

  const desk = getStmt('getDeskRaw', 'SELECT * FROM desks WHERE id = ?').get(session.desk_id);
  if (desk.status !== 'occupied') {
    throw httpError(409, `Desk must be occupied to go away, was ${desk.status}`);
  }

  const now = nowISO();

  const doGoAway = db.transaction(() => {
    getStmt('setAway', `
      UPDATE sessions SET away_since = ? WHERE id = ?
    `).run(now, session.id);

    getStmt('setDeskStatus', `UPDATE desks SET status = ? WHERE id = ?`)
      .run('away', session.desk_id);
  });

  doGoAway();

  return getDesk(session.desk_id);
}

/**
 * Return from away.
 */
function returnFromAway(sessionToken) {
  if (!sessionToken) throw httpError(400, 'sessionToken is required');

  const session = getStmt('getActiveSession', `
    SELECT * FROM sessions WHERE token = ? AND ended_at IS NULL
  `).get(sessionToken);
  if (!session) throw httpError(404, 'No active session with this token');

  const desk = getStmt('getDeskRaw', 'SELECT * FROM desks WHERE id = ?').get(session.desk_id);
  if (desk.status !== 'away') {
    throw httpError(409, `Desk must be away to return, was ${desk.status}`);
  }

  const doReturn = db.transaction(() => {
    getStmt('clearAway', `
      UPDATE sessions SET away_since = NULL WHERE id = ?
    `).run(session.id);

    getStmt('setDeskStatus', `UPDATE desks SET status = ? WHERE id = ?`)
      .run('occupied', session.desk_id);
  });

  doReturn();

  return getDesk(session.desk_id);
}

/**
 * Respond to a heartbeat prompt (or return from away via heartbeat).
 */
function heartbeatRespond(sessionToken) {
  if (!sessionToken) throw httpError(400, 'sessionToken is required');

  const session = getStmt('getActiveSession', `
    SELECT * FROM sessions WHERE token = ? AND ended_at IS NULL
  `).get(sessionToken);
  if (!session) throw httpError(404, 'No active session with this token');

  const now = nowISO();

  const doHeartbeat = db.transaction(() => {
    getStmt('heartbeatUpdate', `
      UPDATE sessions
         SET heartbeat_pending = 0,
             heartbeat_prompted_at = NULL,
             last_heartbeat_at = ?,
             away_since = NULL
       WHERE id = ?
    `).run(now, session.id);

    // If desk was away, bring it back to occupied
    const desk = getStmt('getDeskRaw', 'SELECT * FROM desks WHERE id = ?').get(session.desk_id);
    if (desk.status === 'away') {
      getStmt('setDeskStatus', `UPDATE desks SET status = ? WHERE id = ?`)
        .run('occupied', session.desk_id);
    }
  });

  doHeartbeat();

  return getDesk(session.desk_id);
}

/**
 * Get session info by token, with computed timer fields.
 */
function getSession(token) {
  if (!token) throw httpError(400, 'token is required');

  const session = getStmt('getSessionFull', `
    SELECT s.*, d.label, d.zone, d.row_num, d.col_num, d.status
      FROM sessions s
      JOIN desks d ON d.id = s.desk_id
     WHERE s.token = ?
  `).get(token);
  if (!session) throw httpError(404, 'Session not found');

  const now = Date.now();

  const result = {
    id: session.id,
    token: session.token,
    desk_id: session.desk_id,
    desk_label: session.label,
    desk_zone: session.zone,
    desk_status: session.status,
    student_name: session.student_name,
    checked_in_at: session.checked_in_at,
    last_heartbeat_at: session.last_heartbeat_at,
    heartbeat_pending: session.heartbeat_pending,
    away_since: session.away_since,
    ended_at: session.ended_at,
    end_reason: session.end_reason,
    away_remaining_sec: null,
    heartbeat_remaining_sec: null,
    next_heartbeat_sec: null,
  };

  if (session.away_since && !session.ended_at) {
    const elapsed = now - new Date(session.away_since).getTime();
    const remaining = (config.awayMaxMs - elapsed) / 1000;
    result.away_remaining_sec = Math.max(0, Math.round(remaining * 10) / 10);
  }

  if (session.heartbeat_pending && session.heartbeat_prompted_at && !session.ended_at) {
    const elapsed = now - new Date(session.heartbeat_prompted_at).getTime();
    const remaining = (config.heartbeatGraceMs - elapsed) / 1000;
    result.heartbeat_remaining_sec = Math.max(0, Math.round(remaining * 10) / 10);
  }

  if (!session.ended_at && !session.heartbeat_pending && session.last_heartbeat_at) {
    const elapsed = now - new Date(session.last_heartbeat_at).getTime();
    const remaining = (config.heartbeatIntervalMs - elapsed) / 1000;
    result.next_heartbeat_sec = Math.max(0, Math.round(remaining * 10) / 10);
  }

  return result;
}

/**
 * Librarian: force-release a desk, ending the active session.
 */
function forceRelease(deskId) {
  const desk = getStmt('getDeskRaw', 'SELECT * FROM desks WHERE id = ?').get(deskId);
  if (!desk) throw httpError(404, 'Desk not found');

  const session = getStmt('getActiveSessionByDesk', `
    SELECT * FROM sessions WHERE desk_id = ? AND ended_at IS NULL
  `).get(deskId);

  const now = nowISO();

  const doRelease = db.transaction(() => {
    if (session) {
      getStmt('endSession', `
        UPDATE sessions SET ended_at = ?, end_reason = ? WHERE id = ?
      `).run(now, 'force_released', session.id);

      getStmt('insertAbandonedLog', `
        INSERT INTO abandoned_log (desk_id, desk_label, student_name, reason, abandoned_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(desk.id, desk.label, session.student_name, 'force_released', now);
    }

    getStmt('setDeskStatus', `UPDATE desks SET status = ? WHERE id = ?`)
      .run('free', deskId);
  });

  doRelease();

  return getDesk(deskId);
}

/**
 * List all entries in the abandoned log, most recent first.
 */
function getAbandonedLog() {
  return getStmt('getAbandonedLog', `
    SELECT * FROM abandoned_log ORDER BY abandoned_at DESC
  `).all();
}

/**
 * Get aggregate stats.
 */
function getStats() {
  const totals = getStmt('getStats', `
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied,
      SUM(CASE WHEN status = 'free' THEN 1 ELSE 0 END) as free,
      SUM(CASE WHEN status = 'away' THEN 1 ELSE 0 END) as away
    FROM desks
  `).get();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const abandoned = getStmt('getAbandonedToday', `
    SELECT COUNT(*) as count FROM abandoned_log WHERE abandoned_at >= ?
  `).get(todayStart.toISOString());

  return {
    total: totals.total,
    occupied: totals.occupied,
    free: totals.free,
    away: totals.away,
    abandonedToday: abandoned.count,
  };
}

/**
 * Generate a QR code data URI for a desk's check-in URL.
 */
async function generateQR(deskId, baseUrl) {
  const desk = getStmt('getDeskRaw', 'SELECT * FROM desks WHERE id = ?').get(deskId);
  if (!desk) throw httpError(404, 'Desk not found');

  const url = `${baseUrl || 'http://localhost:3000'}/session/checkin/${deskId}`;
  const dataUri = await QRCode.toDataURL(url, { width: 300, margin: 2 });

  return { deskId: desk.id, label: desk.label, url, qrDataUri: dataUri };
}

module.exports = {
  getAllDesks,
  getDesk,
  checkIn,
  checkOut,
  goAway,
  returnFromAway,
  heartbeatRespond,
  getSession,
  forceRelease,
  getAbandonedLog,
  getStats,
  generateQR,
};
