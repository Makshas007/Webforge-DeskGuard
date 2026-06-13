// Desk/session domain logic. All state transitions are server-side.
const db = require('./db');
const config = require('./config');

// Returns desks joined with their active session and a computed `status`.
async function listDesks() {
  const { rows } = await db.query(
    `SELECT d.id, d.code, d.label, d.x, d.y, d.status,
            s.student_id, s.checkin_at, s.last_heartbeat_at, s.away_until,
            (s.last_heartbeat_at + ($1::bigint * interval '1 millisecond')) AS next_heartbeat_due
       FROM desks d
       LEFT JOIN sessions s ON s.desk_id = d.id AND s.state = 'active'
      ORDER BY d.label`,
    [config.heartbeatIntervalMs]
  );
  return rows.map((r) => ({
    code: r.code,
    label: r.label,
    x: r.x,
    y: r.y,
    status: r.status,
    studentId: r.student_id || null,
    checkinAt: r.checkin_at || null,
    awayUntil: r.away_until || null,
    nextHeartbeatDue: r.student_id ? r.next_heartbeat_due : null,
  }));
}

async function getDeskByCode(code) {
  const { rows } = await db.query('SELECT * FROM desks WHERE code = $1', [code]);
  return rows[0] || null;
}

async function checkin(code, studentId) {
  if (!studentId) throw httpError(400, 'studentId is required');
  const desk = await getDeskByCode(code);
  if (!desk) throw httpError(404, 'Unknown desk code');
  if (desk.status !== 'free') throw httpError(409, 'Desk is not free');

  await db.query(
    `INSERT INTO sessions (desk_id, student_id, checkin_at, last_heartbeat_at, state)
     VALUES ($1, $2, now(), now(), 'active')`,
    [desk.id, studentId]
  );
  await db.query(`UPDATE desks SET status = 'occupied' WHERE id = $1`, [desk.id]);
  return { code, status: 'occupied', studentId };
}

async function setAway(code) {
  const desk = await requireActiveDesk(code, 'occupied');
  const { rows } = await db.query(
    `UPDATE sessions SET away_until = now() + ($1::bigint * interval '1 millisecond')
      WHERE desk_id = $2 AND state = 'active' RETURNING away_until`,
    [config.awayMaxMs, desk.id]
  );
  await db.query(`UPDATE desks SET status = 'away' WHERE id = $1`, [desk.id]);
  return { code, status: 'away', awayUntil: rows[0].away_until };
}

// Heartbeat doubles as 'I responded to Still here?' and 'I'm back from Away'.
async function heartbeat(code) {
  const desk = await getDeskByCode(code);
  if (!desk) throw httpError(404, 'Unknown desk code');
  const { rowCount } = await db.query(
    `UPDATE sessions SET last_heartbeat_at = now(), away_until = NULL
      WHERE desk_id = $1 AND state = 'active'`,
    [desk.id]
  );
  if (rowCount === 0) throw httpError(409, 'No active session on this desk');
  await db.query(`UPDATE desks SET status = 'occupied' WHERE id = $1`, [desk.id]);
  return { code, status: 'occupied' };
}

async function checkout(code) {
  const desk = await getDeskByCode(code);
  if (!desk) throw httpError(404, 'Unknown desk code');
  await db.query(
    `UPDATE sessions SET state = 'ended', ended_at = now() WHERE desk_id = $1 AND state = 'active'`,
    [desk.id]
  );
  await db.query(`UPDATE desks SET status = 'free' WHERE id = $1`, [desk.id]);
  return { code, status: 'free' };
}

async function listAbandoned() {
  // Desks that are free but whose most recent session ended as 'abandoned'.
  const { rows } = await db.query(
    `SELECT d.code, d.label, d.x, d.y,
            s.student_id, s.checkin_at, s.ended_at
       FROM desks d
       JOIN LATERAL (
         SELECT * FROM sessions ss WHERE ss.desk_id = d.id
          ORDER BY ss.id DESC LIMIT 1
       ) s ON true
      WHERE s.state = 'abandoned' AND d.status = 'free'
      ORDER BY s.ended_at DESC`
  );
  return rows.map((r) => ({
    code: r.code,
    label: r.label,
    lastStudentId: r.student_id,
    checkinAt: r.checkin_at,
    abandonedAt: r.ended_at,
  }));
}

// Librarian manual reset: force a desk back to free and end any session.
async function reset(code) {
  const desk = await getDeskByCode(code);
  if (!desk) throw httpError(404, 'Unknown desk code');
  await db.query(
    `UPDATE sessions SET state = 'ended', ended_at = now() WHERE desk_id = $1 AND state = 'active'`,
    [desk.id]
  );
  await db.query(`UPDATE desks SET status = 'free' WHERE id = $1`, [desk.id]);
  return { code, status: 'free' };
}

async function requireActiveDesk(code, expectedStatus) {
  const desk = await getDeskByCode(code);
  if (!desk) throw httpError(404, 'Unknown desk code');
  if (expectedStatus && desk.status !== expectedStatus) {
    throw httpError(409, `Desk must be ${expectedStatus}, was ${desk.status}`);
  }
  return desk;
}

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

module.exports = {
  listDesks, checkin, setAway, heartbeat, checkout, listAbandoned, reset,
};
