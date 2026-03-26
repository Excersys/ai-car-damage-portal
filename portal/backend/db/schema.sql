-- Schema for AI Car Rental Damage Detection Portal
-- Run against a clean Supabase / Postgres instance.
-- Safe to re-run: DROP TABLE guards reset all tables in dependency order.

-- Drop in reverse-dependency order for clean resets
DROP TABLE IF EXISTS detected_damage CASCADE;
DROP TABLE IF EXISTS scans CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS cars CASCADE;

-- Cars table
CREATE TABLE cars (
  id VARCHAR(255) PRIMARY KEY,
  make VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  year INTEGER NOT NULL,
  color VARCHAR(50),
  license_plate VARCHAR(20) UNIQUE NOT NULL,
  vin VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'Available',
  image_url TEXT,
  mileage INTEGER DEFAULT 0,
  last_inspection_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Reservations table
CREATE TABLE reservations (
  id VARCHAR(255) PRIMARY KEY,
  car_id VARCHAR(255) REFERENCES cars(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  user_name VARCHAR(255),
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'Upcoming',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Scans table (one scan per vehicle inspection event)
CREATE TABLE scans (
  id VARCHAR(255) PRIMARY KEY,
  car_id VARCHAR(255) REFERENCES cars(id) ON DELETE CASCADE,
  reservation_id VARCHAR(255) REFERENCES reservations(id) ON DELETE SET NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  type VARCHAR(20) NOT NULL,            -- 'Check-In' | 'Check-Out'
  ai_status VARCHAR(50) DEFAULT 'Clean',
  image_url_front TEXT,
  image_url_rear TEXT,
  image_url_left TEXT,
  image_url_right TEXT,
  qc_status VARCHAR(20) DEFAULT 'Pending',
  qc_by VARCHAR(255),
  qc_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Detected damage table (N damage boxes per scan)
CREATE TABLE detected_damage (
  id SERIAL PRIMARY KEY,
  scan_id VARCHAR(255) REFERENCES scans(id) ON DELETE CASCADE,
  label VARCHAR(100),
  confidence DECIMAL(4,2),
  x INTEGER,
  y INTEGER,
  width INTEGER,
  height INTEGER
);

-- Indexes for common query patterns
CREATE INDEX idx_scans_car_id ON scans(car_id);
CREATE INDEX idx_scans_reservation_id ON scans(reservation_id);
CREATE INDEX idx_reservations_car_id ON reservations(car_id);
CREATE INDEX idx_detected_damage_scan_id ON detected_damage(scan_id);
