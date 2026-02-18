const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'entries.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create entries table
db.exec(`
  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sponsor_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    dedication_type TEXT NOT NULL DEFAULT 'In Honor Of',
    dedication_name TEXT NOT NULL,
    occasion TEXT,
    message TEXT,
    preferred_date TEXT,
    assigned_date TEXT,
    amount INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

module.exports = db;
