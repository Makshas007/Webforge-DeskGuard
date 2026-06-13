// Creates the schema and loads seed data.
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function run() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
  try {
    await pool.query(schema);
    console.log('Schema applied.');
    await pool.query(seed);
    console.log('Seed data loaded.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
