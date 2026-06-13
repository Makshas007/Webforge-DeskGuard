const express = require('express');
const desks = require('./desks');

const router = express.Router();

const wrap = (fn) => (req, res) => {
  Promise.resolve(fn(req, res)).catch((err) => {
    const status = err.status || 500;
    if (status === 500) console.error(err);
    res.status(status).json({ error: err.message || 'Internal error' });
  });
};

router.get('/desks', wrap(async (_req, res) => {
  res.json(await desks.listDesks());
}));

router.post('/desks/:code/checkin', wrap(async (req, res) => {
  res.json(await desks.checkin(req.params.code, req.body.studentId));
}));

router.post('/desks/:code/away', wrap(async (req, res) => {
  res.json(await desks.setAway(req.params.code));
}));

router.post('/desks/:code/heartbeat', wrap(async (req, res) => {
  res.json(await desks.heartbeat(req.params.code));
}));

router.post('/desks/:code/checkout', wrap(async (req, res) => {
  res.json(await desks.checkout(req.params.code));
}));

router.get('/librarian/abandoned', wrap(async (_req, res) => {
  res.json(await desks.listAbandoned());
}));

router.post('/librarian/desks/:code/reset', wrap(async (req, res) => {
  res.json(await desks.reset(req.params.code));
}));

module.exports = router;
