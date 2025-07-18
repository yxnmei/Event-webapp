-- db/schema.sql

-- Drop existing tables if they exist to ensure a clean slate for development
DROP TABLE IF EXISTS site_settings;
DROP TABLE IF EXISTS events;
-- We'll add bookings table here later when we implement booking functionality

-- Create site_settings table
CREATE TABLE site_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    last_modified_at TEXT NOT NULL -- ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ)
);

-- Insert initial default site settings
INSERT INTO site_settings (name, description, last_modified_at)
VALUES ('Event Manager', 'Organize and discover events with ease.', STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now'));

-- Create events table
CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    event_date TEXT NOT NULL, -- Stored as ISO 8601 (e.g., '2025-12-25T14:30:00Z')
    full_price_tickets_available INTEGER NOT NULL DEFAULT 0,
    full_price_amount REAL NOT NULL DEFAULT 0.0,
    concession_tickets_available INTEGER NOT NULL DEFAULT 0,
    concession_amount REAL NOT NULL DEFAULT 0.0,
    location TEXT, -- NEW COLUMN: Location of the event (can be null)
    category TEXT, -- NEW COLUMN: Category (e.g., Workshop, Concert)
    tags TEXT,     -- NEW COLUMN: Comma-separated tags (e.g., "tech,youth")
    created_at TEXT NOT NULL, -- ISO 8601
    last_modified_at TEXT NOT NULL, -- ISO 8601
    published_at TEXT, -- ISO 8601, NULL if draft
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published'))
);

-- Create bookings table
-- This table will store each individual booking transaction
CREATE TABLE bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    user_name TEXT NOT NULL,
    full_tickets_booked INTEGER NOT NULL DEFAULT 0,
    concession_tickets_booked INTEGER NOT NULL DEFAULT 0,
    booked_at TEXT NOT NULL, -- ISO 8601 timestamp of when the booking was made
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);