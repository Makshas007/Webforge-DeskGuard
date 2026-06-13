// ==========================================================================
// Status Configuration — maps desk status to visual properties
// ==========================================================================

export const STATUS_CONFIG = {
  free: {
    className: 'desk-free',
    label: 'Free',
    color: 'var(--accent-green)',
    glow: 'var(--accent-green-glow)',
    badgeClass: 'badge-green',
    icon: '✓',
  },
  occupied: {
    className: 'desk-occupied',
    label: 'Occupied',
    color: 'var(--accent-red)',
    glow: 'var(--accent-red-glow)',
    badgeClass: 'badge-red',
    icon: '●',
  },
  away: {
    className: 'desk-away',
    label: 'Away',
    color: 'var(--accent-yellow)',
    glow: 'var(--accent-yellow-glow)',
    badgeClass: 'badge-yellow',
    icon: '◑',
  },
  heartbeat: {
    className: 'desk-heartbeat',
    label: 'Pending',
    color: 'var(--accent-purple)',
    glow: 'var(--accent-purple-glow)',
    badgeClass: 'badge-purple',
    icon: '♥',
  },
};

export function getDeskStatus(desk) {
  if (desk.heartbeat_pending) return 'heartbeat';
  return desk.status;
}

export function getStatusConfig(status) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.free;
}

// Format seconds to mm:ss or hh:mm:ss
export function formatTime(totalSeconds) {
  if (totalSeconds == null || totalSeconds < 0) return '--:--';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Format ISO timestamp to readable time
export function formatTimestamp(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Calculate elapsed time string from a timestamp
export function elapsedSince(isoString) {
  if (!isoString) return '--:--';
  const start = new Date(isoString).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - start) / 1000));
  return formatTime(diffSec);
}
