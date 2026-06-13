// Thin API client. The server is the source of truth for all desk state.
const json = (res) => {
  if (!res.ok) return res.json().then((b) => Promise.reject(new Error(b.error || res.statusText)));
  return res.json();
};

export const getDesks = () => fetch('/api/desks').then(json);
export const checkin = (code, studentId) =>
  fetch(`/api/desks/${code}/checkin`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId }),
  }).then(json);
export const setAway = (code) => fetch(`/api/desks/${code}/away`, { method: 'POST' }).then(json);
export const heartbeat = (code) => fetch(`/api/desks/${code}/heartbeat`, { method: 'POST' }).then(json);
export const checkout = (code) => fetch(`/api/desks/${code}/checkout`, { method: 'POST' }).then(json);
export const getAbandoned = () => fetch('/api/librarian/abandoned').then(json);
export const resetDesk = (code) =>
  fetch(`/api/librarian/desks/${code}/reset`, { method: 'POST' }).then(json);
