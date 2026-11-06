import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
export function openDatabase(filename = resolve('data/wayfarer.sqlite')) {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
  const db = new Database(filename);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  return db;
}
export function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, selectable INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS places (id INTEGER PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, description TEXT NOT NULL, opening_hours TEXT NOT NULL, neighborhood TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS reviews (id INTEGER PRIMARY KEY, place_id INTEGER NOT NULL REFERENCES places(id), user_id INTEGER NOT NULL REFERENCES users(id), rating INTEGER NOT NULL CHECK(typeof(rating) = 'integer' AND rating BETWEEN 1 AND 5), body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 500), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(place_id, user_id));
    CREATE TABLE IF NOT EXISTS tour_slots (id INTEGER PRIMARY KEY, place_id INTEGER NOT NULL REFERENCES places(id), starts_at TEXT NOT NULL, capacity INTEGER NOT NULL CHECK(typeof(capacity) = 'integer' AND capacity > 0));
    CREATE TABLE IF NOT EXISTS bookings (id INTEGER PRIMARY KEY, slot_id INTEGER NOT NULL REFERENCES tour_slots(id), user_id INTEGER NOT NULL REFERENCES users(id), seats INTEGER NOT NULL CHECK(typeof(seats) = 'integer' AND seats > 0), request_key TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, request_key));
    CREATE INDEX IF NOT EXISTS bookings_slot ON bookings(slot_id);
    CREATE TRIGGER IF NOT EXISTS booking_capacity_insert BEFORE INSERT ON bookings
    WHEN NEW.seats + COALESCE((SELECT SUM(seats) FROM bookings WHERE slot_id = NEW.slot_id),0) > (SELECT capacity FROM tour_slots WHERE id = NEW.slot_id)
    BEGIN SELECT RAISE(ABORT, 'slot_capacity_exceeded'); END;
    CREATE TRIGGER IF NOT EXISTS booking_capacity_update BEFORE UPDATE OF seats, slot_id ON bookings
    WHEN NEW.seats + COALESCE((SELECT SUM(seats) FROM bookings WHERE slot_id = NEW.slot_id AND id != OLD.id),0) > (SELECT capacity FROM tour_slots WHERE id = NEW.slot_id)
    BEGIN SELECT RAISE(ABORT, 'slot_capacity_exceeded'); END;
    CREATE TRIGGER IF NOT EXISTS slot_capacity_update BEFORE UPDATE OF capacity ON tour_slots
    WHEN NEW.capacity < COALESCE((SELECT SUM(seats) FROM bookings WHERE slot_id = OLD.id),0)
    BEGIN SELECT RAISE(ABORT, 'slot_capacity_exceeded'); END;
  `);
}
