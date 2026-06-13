import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getDesks } from './api';
import LibraryMap from './LibraryMap';
import DeskPanel from './DeskPanel';
import { STATUS_COLOR, STATUS_LABEL } from './statusColors';

// Live map view. Polls the server every 5s; never runs timers locally.
export default function MapView() {
  const [desks, setDesks] = useState([]);
  const [selectedCode, setSelectedCode] = useState(null);

  const refresh = useCallback(() => {
    getDesks().then(setDesks).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000); // polling cadence only; not a timer enforcer
    return () => clearInterval(id);
  }, [refresh]);

  const selected = desks.find((d) => d.code === selectedCode) || null;

  return (
    <div style={{ fontFamily: 'system-ui', padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>DeskGuard</h1>
        <Link to="/librarian">Librarian dashboard</Link>
      </header>

      <div style={{ display: 'flex', gap: 12, margin: '12px 0' }}>
        {Object.keys(STATUS_LABEL).filter((s) => s !== 'abandoned').map((s) => (
          <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 14, height: 14, background: STATUS_COLOR[s], borderRadius: 3, display: 'inline-block' }} />
            {STATUS_LABEL[s]}
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <LibraryMap desks={desks} onSelect={(d) => setSelectedCode(d.code)} selectedCode={selectedCode} />
        <div style={{ minWidth: 260 }}>
          <DeskPanel desk={selected} onChange={() => refresh()} />
        </div>
      </div>
    </div>
  );
}
