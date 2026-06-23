const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'inventory.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('Dry Goods', 'Frozen', 'Mixed')),
    unit_of_measure TEXT NOT NULL,
    reorder_threshold INTEGER NOT NULL DEFAULT 0,
    expiration_date TEXT,
    current_stock INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('IN', 'OUT')),
    quantity INTEGER NOT NULL,
    supplier TEXT,
    destination TEXT,
    date_received TEXT,
    date_dispatched TEXT,
    expiration_date TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
`);

module.exports = db;
