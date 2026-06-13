const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const config = require('./config');

// Resolve relative to the backend root (one level up from src/)
const backendRoot = path.resolve(__dirname, '..');
const dbFullPath = path.resolve(backendRoot, config.dbPath);

// Ensure the data directory exists
fs.mkdirSync(path.dirname(dbFullPath), { recursive: true });

const db = new Database(dbFullPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = db;
