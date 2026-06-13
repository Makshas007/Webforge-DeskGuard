// ==========================================================================
// DeskGuard API Client & Polling Hook
// ==========================================================================
import { useState, useEffect, useCallback } from 'react';

const API = '/api';

async function request(url, options = {}) {
  const res = await fetch(`${API}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ---- Desk endpoints ----
export const getDesks = () => request('/desks');
export const getDesk = (id) => request(`/desks/${id}`);
export const getDeskQR = (id) => request(`/desks/${id}/qr`);

// ---- Session endpoints (token-based) ----
export const checkIn = (id, studentName) =>
  request(`/desks/${id}/checkin`, { method: 'POST', body: { studentName } });

export const checkOut = (sessionToken) =>
  request('/session/checkout', { method: 'POST', body: { sessionToken } });

export const goAway = (sessionToken) =>
  request('/session/away', { method: 'POST', body: { sessionToken } });

export const returnFromAway = (sessionToken) =>
  request('/session/return', { method: 'POST', body: { sessionToken } });

export const heartbeat = (sessionToken) =>
  request('/session/heartbeat', { method: 'POST', body: { sessionToken } });

export const getSession = (token) => request(`/session/${token}`);

// ---- Librarian endpoints ----
export const getAbandonedLog = () => request('/librarian/abandoned');
export const releaseDesk = (deskId) =>
  request(`/librarian/release/${deskId}`, { method: 'POST' });
export const getStats = () => request('/librarian/stats');

// ==========================================================================
// Custom polling hook — polls fetchFn every intervalMs
// ==========================================================================
export function usePolling(fetchFn, intervalMs = 5000) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const result = await fetchFn();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
  }, [refresh, intervalMs]);

  return { data, error, loading, refresh };
}
