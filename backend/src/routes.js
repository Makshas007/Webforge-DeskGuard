const express = require('express');
const desks = require('./desks');

const router = express.Router();

// Wrap handler so thrown errors with .status are sent as proper HTTP responses.
// Supports both sync functions and async functions (for QR generation).
const wrap = (fn) => (req, res) => {
  try {
    const result = fn(req, res);
    // If the result is a promise (async function like generateQR), handle it
    if (result && typeof result.then === 'function') {
      result.catch((err) => {
        const status = err.status || 500;
        if (status === 500) console.error(err);
        res.status(status).json({ error: err.message || 'Internal error' });
      });
    }
  } catch (err) {
    const status = err.status || 500;
    if (status === 500) console.error(err);
    res.status(status).json({ error: err.message || 'Internal error' });
  }
};

// ---------------------------------------------------------------------------
// Desk endpoints
// ---------------------------------------------------------------------------

router.get('/desks', wrap((_req, res) => {
  res.json(desks.getAllDesks());
}));

router.get('/desks/:id', wrap((req, res) => {
  res.json(desks.getDesk(Number(req.params.id)));
}));

router.get('/desks/:id/qr', wrap(async (req, res) => {
  const baseUrl = req.query.baseUrl || process.env.QR_BASE_URL || 'http://localhost:3000';
  const result = await desks.generateQR(Number(req.params.id), baseUrl);
  res.json(result);
}));

router.post('/desks/:id/checkin', wrap((req, res) => {
  const result = desks.checkIn(Number(req.params.id), req.body.studentName);
  res.status(201).json(result);
}));

// ---------------------------------------------------------------------------
// Session endpoints
// ---------------------------------------------------------------------------

router.post('/session/checkout', wrap((req, res) => {
  res.json(desks.checkOut(req.body.sessionToken));
}));

router.post('/session/away', wrap((req, res) => {
  res.json(desks.goAway(req.body.sessionToken));
}));

router.post('/session/return', wrap((req, res) => {
  res.json(desks.returnFromAway(req.body.sessionToken));
}));

router.post('/session/heartbeat', wrap((req, res) => {
  res.json(desks.heartbeatRespond(req.body.sessionToken));
}));

router.get('/session/:token', wrap((req, res) => {
  res.json(desks.getSession(req.params.token));
}));

// ---------------------------------------------------------------------------
// Librarian endpoints
// ---------------------------------------------------------------------------

router.get('/librarian/abandoned', wrap((_req, res) => {
  res.json(desks.getAbandonedLog());
}));

router.post('/librarian/release/:deskId', wrap((req, res) => {
  res.json(desks.forceRelease(Number(req.params.deskId)));
}));

router.get('/librarian/stats', wrap((_req, res) => {
  res.json(desks.getStats());
}));

module.exports = router;
