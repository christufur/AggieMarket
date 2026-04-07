import {Database} from "bun:sqlite";

const isTest = process.env.NODE_ENV === "test";
const db = new Database(isTest ? ":memory:" : "db.sqlite");

db.run("PRAGMA journal_mode=WAL;");

db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        bio TEXT,
        avatar_url TEXT,
        status TEXT DEFAULT 'pending_verification', -- (pending_verification | active | suspended)
        rating_avg REAL DEFAULT 0.0,
        rating_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Add cover_url if it doesn't exist (migration for existing DBs)
try {
  db.run(`ALTER TABLE users ADD COLUMN cover_url TEXT`);
} catch {
  // column already exists
}

db.run(`
  CREATE TABLE IF NOT EXISTS email_verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    email TEXT NOT NULL CHECK (email LIKE '%@nmsu.edu'),
    token TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

db.run(`
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    device_info TEXT,
    ip_address TEXT,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);


// Content Tables
db.run(`
  CREATE TABLE IF NOT EXISTS listings (
    id TEXT PRIMARY KEY,
    seller_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL,
    is_free BOOLEAN DEFAULT 0,
    category TEXT NOT NULL,
    condition TEXT,
    status TEXT DEFAULT 'active', -- (active | pending | sold | deleted) [cite: 13]
    view_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES users(id)
  );
`);
db.run(`
  CREATE TABLE IF NOT EXISTS listing_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    listing_id TEXT NOT NULL,
    s3_key TEXT NOT NULL, -- The unique key for AWS S3 [cite: 19]
    s3_url TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
  );
`);

db.run(`
  CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    provider_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL,
    price_type TEXT, -- e.g., 'hourly', 'flat', 'starting_at'
    category TEXT NOT NULL,
    availability TEXT, -- e.g., 'Weekends only' or 'MTTh 4-6pm'
    status TEXT DEFAULT 'active',
    view_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (provider_id) REFERENCES users(id)
  );
`);
db.run(`
  CREATE TABLE IF NOT EXISTS service_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id TEXT NOT NULL,
    s3_key TEXT NOT NULL,
    s3_url TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
  );
`);

db.run(`
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    organizer_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    location TEXT NOT NULL,
    is_online BOOLEAN DEFAULT 0,
    starts_at DATETIME NOT NULL,
    ends_at DATETIME,
    is_free BOOLEAN DEFAULT 1,
    ticket_price REAL DEFAULT 0.0,
    max_attendees INTEGER,
    status TEXT DEFAULT 'active',
    view_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organizer_id) REFERENCES users(id)
  );
`);
db.run(`
  CREATE TABLE IF NOT EXISTS event_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT NOT NULL,
    s3_key TEXT NOT NULL,
    s3_url TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
  );
`);

db.run(`
-- FTS5 virtual table for listings
CREATE VIRTUAL TABLE IF NOT EXISTS listings_fts USING fts5(
  id, title, description, category,
  content='listings', content_rowid='rowid'
);

-- FTS5 virtual table for services
CREATE VIRTUAL TABLE IF NOT EXISTS services_fts USING fts5(
  id, title, description, category,
  content='services', content_rowid='rowid'
);

-- FTS5 virtual table for events
CREATE VIRTUAL TABLE IF NOT EXISTS events_fts USING fts5(
  id, title, description, category, location,
  content='events', content_rowid='rowid'
);
`);



export default db;