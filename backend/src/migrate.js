// Creates the schema and loads seed data.
const fs = require('fs');
const path = require('path');
const db = require('./db');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');

try {
  db.exec(schema);
  console.log('Schema applied.');
  db.exec(seed);
  console.log('Seed data loaded.');
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exitCode = 1;
} finally {
  db.close();
}
