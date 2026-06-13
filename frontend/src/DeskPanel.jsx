import React, { useState, useEffect } from 'react';
import { getDeskQR, checkIn, checkOut, goAway, returnFromAway, heartbeat } from './api';
import { getDeskStatus, getStatusConfig, formatTime, formatTimestamp } from './statusColors';

// ============================================================================
// DeskPanel — Side panel with desk details, check-in form, and actions
// ============================================================================

export default function DeskPanel({ desk, onClose, onAction }) {
  const [qrData, setQrData] = useState(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const status = getDeskStatus(desk);
  const config = getStatusConfig(status);

  // Check if user has a session for this desk
  const activeToken = localStorage.getItem('deskguard_active_session');
  const deskToken = localStorage.getItem(`deskguard_session_${desk.id}`);
  const isMySession = !!(deskToken && deskToken === activeToken);

  // Fetch QR code for free desks
  useEffect(() => {
    if (desk.status === 'free') {
      getDeskQR(desk.id)
        .then((res) => setQrData(res.qr))
        .catch(() => setQrData(null));
    } else {
      setQrData(null);
    }
  }, [desk.id, desk.status]);

  async function handleCheckIn(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await checkIn(desk.id, name.trim());
      // Store session token
      localStorage.setItem(`deskguard_session_${desk.id}`, result.sessionToken);
      localStorage.setItem('deskguard_active_session', result.sessionToken);
      setName('');
      if (onAction) onAction();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(actionFn, token) {
    setLoading(true);
    setError(null);
    try {
      await actionFn(token);
      if (actionFn === checkOut) {
        localStorage.removeItem(`deskguard_session_${desk.id}`);
        localStorage.removeItem('deskguard_active_session');
      }
      if (onAction) onAction();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="desk-panel">
      {/* Close button */}
      <button className="panel-close-btn" onClick={onClose} aria-label="Close panel">
        ✕
      </button>

      {/* Header */}
      <div className="panel-header">
        <div className="panel-desk-label">{desk.label}</div>
        <div className="panel-desk-zone">Zone {desk.zone} · Row {desk.row_num}, Col {desk.col_num}</div>
        <span className={`badge ${config.badgeClass}`}>
          {config.icon} {config.label}
        </span>
      </div>

      {/* Body */}
      <div className="panel-body">
        {error && (
          <div className="error-banner">
            <span className="error-banner-icon">⚠</span>
            {error}
          </div>
        )}

        {/* ---- FREE: Check-in form + QR ---- */}
        {status === 'free' && (
          <>
            <form className="checkin-form" onSubmit={handleCheckIn}>
              <div className="input-group">
                <label className="input-label" htmlFor="studentName">Your Name</label>
                <input
                  id="studentName"
                  className="input"
                  type="text"
                  placeholder="Enter your name…"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  autoFocus
                  required
                />
              </div>
              <button
                type="submit"
                className="btn btn-success btn-block"
                disabled={loading || !name.trim()}
              >
                {loading ? 'Checking in…' : '✓ Check In'}
              </button>
            </form>

            {qrData && (
              <div className="panel-qr">
                <img src={qrData} alt={`QR code for desk ${desk.label}`} />
                <span className="panel-qr-caption">Scan to check in on mobile</span>
              </div>
            )}
          </>
        )}

        {/* ---- OCCUPIED ---- */}
        {status === 'occupied' && (
          <>
            <div className="panel-info-row">
              <span className="panel-info-label">Student</span>
              <span className="panel-info-value">{desk.student_name || '—'}</span>
            </div>
            <div className="panel-info-row">
              <span className="panel-info-label">Checked in at</span>
              <span className="panel-info-value">{formatTimestamp(desk.checked_in_at)}</span>
            </div>
            {desk.next_heartbeat_sec != null && (
              <div className="panel-info-row">
                <span className="panel-info-label">Next heartbeat</span>
                <span className="panel-info-value">{formatTime(desk.next_heartbeat_sec)}</span>
              </div>
            )}

            {isMySession && (
              <div className="panel-actions">
                <div className="panel-actions-row">
                  <button
                    className="btn btn-warning"
                    onClick={() => handleAction(goAway, deskToken)}
                    disabled={loading}
                  >
                    🚶 Step Away
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleAction(checkOut, deskToken)}
                    disabled={loading}
                  >
                    🚪 Check Out
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ---- AWAY ---- */}
        {status === 'away' && (
          <>
            <div className="panel-info-row">
              <span className="panel-info-label">Student</span>
              <span className="panel-info-value">{desk.student_name || '—'}</span>
            </div>
            <div className="panel-info-row">
              <span className="panel-info-label">Away since</span>
              <span className="panel-info-value">{formatTimestamp(desk.away_since)}</span>
            </div>
            {desk.away_remaining_sec != null && (
              <div className="panel-info-row">
                <span className="panel-info-label">Time remaining</span>
                <span className="panel-info-value text-yellow">{formatTime(desk.away_remaining_sec)}</span>
              </div>
            )}

            {isMySession && (
              <div className="panel-actions">
                <div className="panel-actions-row">
                  <button
                    className="btn btn-success"
                    onClick={() => handleAction(returnFromAway, deskToken)}
                    disabled={loading}
                  >
                    ✋ I'm Back
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleAction(checkOut, deskToken)}
                    disabled={loading}
                  >
                    🚪 Check Out
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ---- HEARTBEAT PENDING ---- */}
        {status === 'heartbeat' && (
          <>
            <div className="heartbeat-prompt">
              <div className="heartbeat-icon">💜</div>
              <div className="heartbeat-title">Are you still here?</div>
              <div className="heartbeat-subtitle">
                Tap below to confirm your presence
              </div>
              {desk.heartbeat_remaining_sec != null && (
                <div className="heartbeat-timer">
                  {formatTime(desk.heartbeat_remaining_sec)}
                </div>
              )}
              {isMySession && (
                <button
                  className="btn btn-purple btn-lg btn-block"
                  onClick={() => handleAction(heartbeat, deskToken)}
                  disabled={loading}
                >
                  {loading ? 'Confirming…' : '✓ Yes, I\'m Here!'}
                </button>
              )}
            </div>

            <div className="panel-info-row">
              <span className="panel-info-label">Student</span>
              <span className="panel-info-value">{desk.student_name || '—'}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
