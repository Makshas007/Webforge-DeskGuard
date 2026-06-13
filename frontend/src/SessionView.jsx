import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getSession, getDesk, checkIn, checkOut,
  goAway, returnFromAway, heartbeat, usePolling,
} from './api';
import {
  getStatusConfig, formatTime, formatTimestamp, elapsedSince,
} from './statusColors';

// ============================================================================
// SessionView — Student's personal session page
// Two modes: Check-in (/session/checkin/:deskId) and Active (/session/:token)
// ============================================================================

function CheckInMode({ deskId }) {
  const navigate = useNavigate();
  const [desk, setDesk] = useState(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getDesk(deskId)
      .then(setDesk)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [deskId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await checkIn(deskId, name.trim());
      localStorage.setItem(`deskguard_session_${deskId}`, result.sessionToken);
      localStorage.setItem('deskguard_active_session', result.sessionToken);
      navigate(`/session/${result.sessionToken}`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="session-container">
        <div className="session-card">
          <div className="loading-container">
            <div className="loading-spinner" />
            <span className="loading-text">Loading desk info…</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="session-container">
      <div className="session-card">
        <div className="session-header">
          <div className="session-desk-label">{desk?.label || `Desk ${deskId}`}</div>
          {desk?.zone && (
            <div className="session-zone">Zone {desk.zone}</div>
          )}
        </div>

        {desk?.status !== 'free' ? (
          <div className="session-ended">
            <div className="session-ended-icon">🚫</div>
            <div className="session-ended-title">Desk Unavailable</div>
            <div className="session-ended-subtitle">
              This desk is currently {desk?.status}. Please choose another.
            </div>
          </div>
        ) : (
          <form className="checkin-form" onSubmit={handleSubmit}>
            <div className="checkin-title">Check In to This Desk</div>
            <div className="checkin-subtitle">
              Enter your name to reserve this seat
            </div>

            {error && (
              <div className="error-banner">
                <span className="error-banner-icon">⚠</span>
                {error}
              </div>
            )}

            <div className="input-group">
              <label className="input-label" htmlFor="checkin-name">Your Name</label>
              <input
                id="checkin-name"
                className="input input-lg"
                type="text"
                placeholder="e.g. Alex Johnson"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
                autoFocus
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-success btn-lg btn-block"
              disabled={submitting || !name.trim()}
            >
              {submitting ? 'Checking in…' : '✓ Check In Now'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function ActiveSession({ token }) {
  const navigate = useNavigate();
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ended, setEnded] = useState(false);

  const fetchSession = useCallback(() => getSession(token), [token]);
  const { data: session, loading, refresh } = usePolling(fetchSession, 5000);

  // Determine effective status
  const effectiveStatus = useMemo(() => {
    if (!session) return 'free';
    if (session.heartbeat_pending) return 'heartbeat';
    return session.status;
  }, [session]);

  const config = getStatusConfig(effectiveStatus);

  async function handleAction(actionFn) {
    setActionLoading(true);
    setError(null);
    try {
      await actionFn(token);
      if (actionFn === checkOut) {
        // Clean up localStorage
        if (session?.desk_id) {
          localStorage.removeItem(`deskguard_session_${session.desk_id}`);
        }
        localStorage.removeItem('deskguard_active_session');
        setEnded(true);
      }
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading && !session) {
    return (
      <div className="session-container">
        <div className="session-card">
          <div className="loading-container">
            <div className="loading-spinner" />
            <span className="loading-text">Loading session…</span>
          </div>
        </div>
      </div>
    );
  }

  if (!session || ended) {
    return (
      <div className="session-container">
        <div className="session-card">
          <div className="session-ended">
            <div className="session-ended-icon">👋</div>
            <div className="session-ended-title">Session Ended</div>
            <div className="session-ended-subtitle">
              {ended
                ? 'You have successfully checked out. Your desk is now free.'
                : 'This session is no longer active.'}
            </div>
            <button
              className="btn btn-ghost mt-lg"
              onClick={() => navigate('/')}
            >
              ← Back to Library Map
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If the server says the status is "free", the session has been auto-released
  if (session.status === 'free') {
    return (
      <div className="session-container">
        <div className="session-card">
          <div className="session-ended">
            <div className="session-ended-icon">⏰</div>
            <div className="session-ended-title">Session Expired</div>
            <div className="session-ended-subtitle">
              Your session was automatically ended. The desk has been released.
            </div>
            <button
              className="btn btn-ghost mt-lg"
              onClick={() => navigate('/')}
            >
              ← Back to Library Map
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="session-container">
      {/* Heartbeat urgent overlay */}
      {effectiveStatus === 'heartbeat' && (
        <div className="heartbeat-prompt">
          <div className="heartbeat-icon">💜</div>
          <div className="heartbeat-title">Are you still here?</div>
          <div className="heartbeat-subtitle">
            Confirm your presence to keep your desk
          </div>
          {session.heartbeat_remaining_sec != null && (
            <div className="heartbeat-timer">
              {formatTime(session.heartbeat_remaining_sec)}
            </div>
          )}
          <button
            className="btn btn-purple btn-xl btn-block"
            onClick={() => handleAction(heartbeat)}
            disabled={actionLoading}
          >
            {actionLoading ? 'Confirming…' : "✓ YES, I'M HERE!"}
          </button>
        </div>
      )}

      <div className="session-card">
        {/* Header */}
        <div className="session-header">
          <div className="session-desk-label">
            Desk {session.desk_id != null ? session.desk_id : ''}
          </div>
          <div className="session-zone">{session.student_name}</div>
        </div>

        {/* Status badge */}
        <div className={`session-status ${
          effectiveStatus === 'occupied' ? 'session-status-occupied' :
          effectiveStatus === 'away' ? 'session-status-away' :
          'session-status-occupied'
        }`}>
          <span
            className="session-status-dot"
            style={{ backgroundColor: config.color }}
          />
          {config.label}
        </div>

        {/* Timer */}
        <div className="timer-display">
          <div className="timer-label">Session Duration</div>
          <div className="timer-value">{elapsedSince(session.checked_in_at)}</div>
        </div>

        {/* Info rows */}
        <div className="session-info">
          <div className="session-info-row">
            <span className="session-info-label">Checked in</span>
            <span className="session-info-value">
              {formatTimestamp(session.checked_in_at)}
            </span>
          </div>
          {effectiveStatus === 'away' && session.away_remaining_sec != null && (
            <div className="session-info-row">
              <span className="session-info-label">Away time remaining</span>
              <span className="session-info-value text-yellow">
                {formatTime(session.away_remaining_sec)}
              </span>
            </div>
          )}
          {effectiveStatus === 'occupied' && session.heartbeat_remaining_sec != null && (
            <div className="session-info-row">
              <span className="session-info-label">Next heartbeat in</span>
              <span className="session-info-value">
                {formatTime(session.heartbeat_remaining_sec)}
              </span>
            </div>
          )}
        </div>

        {error && (
          <div className="error-banner mb-md">
            <span className="error-banner-icon">⚠</span>
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="session-actions">
          {effectiveStatus === 'occupied' && (
            <div className="session-actions-row">
              <button
                className="btn btn-warning btn-lg"
                onClick={() => handleAction(goAway)}
                disabled={actionLoading}
              >
                🚶 Step Away
              </button>
              <button
                className="btn btn-danger btn-lg"
                onClick={() => handleAction(checkOut)}
                disabled={actionLoading}
              >
                🚪 Check Out
              </button>
            </div>
          )}
          {effectiveStatus === 'away' && (
            <div className="session-actions-row">
              <button
                className="btn btn-success btn-lg"
                onClick={() => handleAction(returnFromAway)}
                disabled={actionLoading}
              >
                ✋ I'm Back!
              </button>
              <button
                className="btn btn-danger btn-lg"
                onClick={() => handleAction(checkOut)}
                disabled={actionLoading}
              >
                🚪 Check Out
              </button>
            </div>
          )}
          {effectiveStatus === 'heartbeat' && (
            <button
              className="btn btn-danger btn-lg btn-block"
              onClick={() => handleAction(checkOut)}
              disabled={actionLoading}
            >
              🚪 Check Out Instead
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SessionView() {
  const { token, deskId } = useParams();

  // Check-in mode: /session/checkin/:deskId
  if (deskId) {
    return <CheckInMode deskId={deskId} />;
  }

  // Active session mode: /session/:token
  if (token) {
    return <ActiveSession token={token} />;
  }

  // Fallback
  return (
    <div className="session-container">
      <div className="session-card">
        <div className="session-ended">
          <div className="session-ended-icon">❓</div>
          <div className="session-ended-title">No Session Found</div>
          <div className="session-ended-subtitle">
            Please scan a desk QR code or check in from the library map.
          </div>
        </div>
      </div>
    </div>
  );
}
