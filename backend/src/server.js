const express = require('express');
const cors = require('cors');
const config = require('./config');
const routes = require('./routes');
const { startSweep } = require('./sweep');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', routes);
app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(config.port, () => {
  console.log(`DeskGuard API listening on :${config.port}`);
  startSweep();
  console.log(`Sweep job running every ${config.sweepIntervalMs / 1000}s`);
});
