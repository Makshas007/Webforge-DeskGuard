import React, { useState, useCallback, useMemo } from 'react';
import {
  getStats, getAbandonedLog, getDesks,
  releaseDesk, usePolling,
} from './api';
import LibraryMap from './LibraryMap';
import { getDeskStatus, getStatusConfig, formatTimestamp } from './statusColors';

// ============================================================================
// LibrarianView — Admin dashboard with stats, live map, and abandoned log
// ============================================================================

const LIBRARIAN_PASSWORD = 'deskguard2024';

function PasswordGate({ onUnlock }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (password === LIBRARIAN_PASSWORD) {
      sessionStorage.setItem('deskguard_librarian_auth', 'true');
      onUnlock();
    } else {
      setError('Incorrect password. Please try again.');
    }
  }

  return (
    <div className="password-gate">
      <div className="password-gate-card glass-card">
        <div className="password-gate-icon">🔐</div>
        <div className="password-gate-title">Librarian Dashboard</div>
        <div className="password-gate-subtitle">
          Enter the librarian password to access the admin panel
        </div>
        <form className="password-gate-form" onSubmit={handleSubmit}>
          <input
            className="input input-lg"
            type="password"
            placeholder="Enter password…"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            autoFocus
          />
          {error && <div className="password-gate-error">{error}</div>}
          <button type="submit" className="btn btn-primary btn-lg btn-block">
            🔓 Unlock Dashboard
          </button>
        </form>
      </div>
    </div>
  );
}

function ReleaseModal({ desk, onConfirm, onCancel, loading }) {
  const status = getDeskStatus(desk);
  const config = getStatusConfig(status);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">⚠️ Force Release Desk</div>
        <div className="modal-body">
          Are you sure you want to force-release <strong>{desk.label}</strong>?
          <br /><br />
          Student <strong>{desk.student_name || 'Unknown'}</strong> will be
          checked out and the desk will become free.
          <br /><br />
          <span className={`badge ${config.badgeClass}`}>
            Current status: {config.label}
          </span>
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Releasing…' : '🗑️ Force Release'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const [releaseTarget, setReleaseTarget] = useState(null);
  const [releaseLoading, setReleaseLoading] = useState(false);
  const [selectedDesk, setSelectedDesk] = useState(null);

  const fetchStats = useCallback(() => getStats(), []);
  const fetchAbandoned = useCallback(() => getAbandonedLog(), []);
  const fetchDesks = useCallback(() => getDesks(), []);

  const { data: stats } = usePolling(fetchStats, 5000);
  const { data: abandoned } = usePolling(fetchAbandoned, 5000);
  const { data: desks, refresh: refreshDesks } = usePolling(fetchDesks, 5000);

  function handleDeskSelect(desk) {
    setSelectedDesk((prev) => (prev?.id === desk.id ? null : desk));
    // If desk is occupied or away, offer force-release
    if (desk.status === 'occupied' || desk.status === 'away') {
      setReleaseTarget(desk);
    }
  }

  async function handleRelease() {
    if (!releaseTarget) return;
    setReleaseLoading(true);
    try {
      await releaseDesk(releaseTarget.id);
      setReleaseTarget(null);
      setSelectedDesk(null);
      refreshDesks();
    } catch (err) {
      alert('Release failed: ' + err.message);
    } finally {
      setReleaseLoading(false);
    }
  }

  // Keep selectedDesk in sync
  const currentSelectedDesk = useMemo(() => {
    if (!selectedDesk || !desks) return null;
    return desks.find((d) => d.id === selectedDesk.id) || null;
  }, [desks, selectedDesk]);

  return (
    <div className="librarian-container">
      {/* Header */}
      <div className="librarian-header">
        <div className="librarian-title">
          📊 Librarian Dashboard
        </div>
        <div className="live-indicator">
          <span className="live-dot" />
          LIVE
        </div>
      </div>

      {/* Stats Grid */}
      <div className="librarian-grid">
        <div className="stat-card stat-card-blue">
          <div className="stat-card-label">Total Desks</div>
          <div className="stat-card-value">{stats?.total ?? '—'}</div>
        </div>
        <div className="stat-card stat-card-red">
          <div className="stat-card-label">Occupied</div>
          <div className="stat-card-value">{stats?.occupied ?? '—'}</div>
        </div>
        <div className="stat-card stat-card-green">
          <div className="stat-card-label">Free</div>
          <div className="stat-card-value">{stats?.free ?? '—'}</div>
        </div>
        <div className="stat-card stat-card-yellow">
          <div className="stat-card-label">Away</div>
          <div className="stat-card-value">{stats?.away ?? '—'}</div>
        </div>
        <div className="stat-card stat-card-purple">
          <div className="stat-card-label">Abandoned Today</div>
          <div className="stat-card-value">{stats?.abandonedToday ?? '—'}</div>
        </div>
      </div>

      {/* Live Map */}
      <div className="librarian-section">
        <div className="librarian-section-title">
          🗺️ Live Floor Plan
          <span className="badge badge-neutral" style={{ marginLeft: 'auto' }}>
            Click occupied desk to force-release
          </span>
        </div>
        <div className="library-map-container">
          <LibraryMap
            desks={desks || []}
            selectedDesk={currentSelectedDesk}
            onSelectDesk={handleDeskSelect}
          />
        </div>
      </div>

      {/* Abandoned Log */}
      <div className="librarian-section">
        <div className="librarian-section-title">
          📋 Abandoned Sessions Log
        </div>
        <div className="abandoned-table-container">
          {abandoned && abandoned.length > 0 ? (
            <table className="abandoned-table">
              <thead>
                <tr className="table-header">
                  <th>Desk</th>
                  <th>Student</th>
                  <th>Reason</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {abandoned.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <span className="badge badge-neutral">
                        {entry.desk_label}
                      </span>
                    </td>
                    <td>{entry.student_name}</td>
                    <td>
                      <span className={`badge ${
                        entry.reason === 'heartbeat_timeout' ? 'badge-purple' :
                        entry.reason === 'away_timeout' ? 'badge-yellow' :
                        'badge-red'
                      }`}>
                        {entry.reason?.replace(/_/g, ' ') || 'unknown'}
                      </span>
                    </td>
                    <td>{formatTimestamp(entry.abandoned_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="abandoned-empty">
              <div className="abandoned-empty-icon">✨</div>
              <div>No abandoned sessions today</div>
            </div>
          )}
        </div>
      </div>

      {/* Release Modal */}
      {releaseTarget && (
        <ReleaseModal
          desk={releaseTarget}
          onConfirm={handleRelease}
          onCancel={() => setReleaseTarget(null)}
          loading={releaseLoading}
        />
      )}
    </div>
  );
}

export default function LibrarianView() {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem('deskguard_librarian_auth') === 'true'
  );

  if (!authed) {
    return <PasswordGate onUnlock={() => setAuthed(true)} />;
  }

  return <Dashboard />;
}
