import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getAbandoned, resetDesk } from './api';

// Librarian dashboard: view abandoned desks and manually reset them.
export default function LibrarianView() {
  const [rows, setRows] = useState([]);

  const refresh = useCallback(() => {
    getAbandoned().then(setRows).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  const onReset = (code) => resetDesk(code).then(refresh).catch(() => {});

  return (
    <div style={{ fontFamily: 'system-ui', padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Librarian dashboard</h1>
        <Link to="/">Back to map</Link>
      </header>

      <h3>Abandoned desks</h3>
      {rows.length === 0 ? (
        <p>No abandoned desks. 🎉</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr><th align="left">Desk</th><th align="left">Last student</th><th align="left">Checked in</th><th align="left">Abandoned at</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.code} style={{ borderTop: '1px solid #eee' }}>
                <td>{r.label}</td>
                <td>{r.lastStudentId}</td>
                <td>{new Date(r.checkinAt).toLocaleString()}</td>
                <td>{new Date(r.abandonedAt).toLocaleString()}</td>
                <td><button onClick={() => onReset(r.code)}>Reset to Free</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
