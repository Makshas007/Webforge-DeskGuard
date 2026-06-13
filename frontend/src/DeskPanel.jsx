import React, { useState } from 'react';
import { checkin, setAway, heartbeat, checkout } from './api';
import { STATUS_LABEL } from './statusColors';

// Actions for a selected desk. Mirrors the QR-scan flow: scanning a desk QR
// opens this panel for that desk code.
export default function DeskPanel({ desk, onChange }) {
  const [studentId, setStudentId] = useState('');
  const [error, setError] = useState(null);

  if (!desk) return <p>Select a desk on the map (or scan its QR code).</p>;

  const run = (fn) => fn.then(onChange).catch((e) => setError(e.message));

  return (
    <div>
      <h3>Desk {desk.label} <small>({STATUS_LABEL[desk.status]})</small></h3>
      {error && <p style={{ color: '#c62828' }}>{error}</p>}

      {desk.status === 'free' && (
        <form onSubmit={(e) => { e.preventDefault(); setError(null); run(checkin(desk.code, studentId)); }}>
          <input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="Student ID" required />
          <button type="submit">Check in</button>
        </form>
      )}

      {(desk.status === 'occupied' || desk.status === 'away') && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {desk.status === 'occupied' && (
            <button onClick={() => { setError(null); run(setAway(desk.code)); }}>Away</button>
          )}
          <button onClick={() => { setError(null); run(heartbeat(desk.code)); }}>
            {desk.status === 'away' ? "I'm back" : "Still here"}
          </button>
          <button onClick={() => { setError(null); run(checkout(desk.code)); }}>Check out</button>
          {desk.awayUntil && desk.status === 'away' && (
            <p>Away until {new Date(desk.awayUntil).toLocaleTimeString()}</p>
          )}
        </div>
      )}
    </div>
  );
}
