-- Seed data for ACR AI Car Damage Portal
-- Apply after schema.sql: psql $DATABASE_URL < seed.sql

BEGIN;

-- Cars: 7 vehicles with varied statuses
INSERT INTO cars (id, make, model, year, color, license_plate, vin, status, image_url, mileage, last_inspection_date) VALUES
  ('car-001', 'Toyota',  'Camry',    2023, 'Silver',  '7ABC123', '1HGBH41JXMN109186', 'Available',   '/images/cars/camry.jpg',    18420, '2026-04-15'),
  ('car-002', 'Honda',   'Civic',    2024, 'White',   '8DEF456', '2HGFC2F59RH512345', 'Rented',      '/images/cars/civic.jpg',    6230,  '2026-04-10'),
  ('car-003', 'Tesla',   'Model 3',  2024, 'Red',     '9GHI789', '5YJ3E1EA8RF123456', 'Maintenance', '/images/cars/model3.jpg',   12050, '2026-03-28'),
  ('car-004', 'BMW',     '3 Series', 2022, 'Black',   '3JKL012', 'WBA5R1C50MA234567', 'Available',   '/images/cars/bmw3.jpg',     34100, '2026-04-20'),
  ('car-005', 'Ford',    'Mustang',  2023, 'Blue',    '4MNO345', '1FA6P8TH4P5678901', 'Rented',      '/images/cars/mustang.jpg',  21800, '2026-04-12'),
  ('car-006', 'Hyundai', 'Tucson',   2025, 'Gray',    '5PQR678', 'KM8J3CA45RU890123', 'Available',   '/images/cars/tucson.jpg',   3100,  '2026-04-22'),
  ('car-007', 'Chevrolet','Malibu',  2023, 'White',   '6STU901', '1G1ZD5ST8RF345678', 'Rented',      '/images/cars/malibu.jpg',   27500, '2026-04-05')
ON CONFLICT (id) DO NOTHING;

-- Reservations: 5 reservations linked to cars
INSERT INTO reservations (id, car_id, user_id, user_name, start_date, end_date, status) VALUES
  ('res-001', 'car-002', 'user-101', 'Alice Johnson',   '2026-04-20 09:00', '2026-04-27 17:00', 'Active'),
  ('res-002', 'car-005', 'user-102', 'Bob Martinez',    '2026-04-18 10:00', '2026-04-25 10:00', 'Active'),
  ('res-003', 'car-007', 'user-103', 'Carol Williams',  '2026-04-22 08:00', '2026-04-29 18:00', 'Active'),
  ('res-004', 'car-001', 'user-104', 'David Chen',      '2026-03-10 09:00', '2026-03-17 17:00', 'Completed'),
  ('res-005', 'car-004', 'user-105', 'Eva Petrova',     '2026-05-01 08:00', '2026-05-08 18:00', 'Upcoming')
ON CONFLICT (id) DO NOTHING;

-- Scans: 3 scans — two with detected damage, one clean
INSERT INTO scans (id, car_id, reservation_id, timestamp, type, ai_status, image_url_front, image_url_rear, image_url_left, image_url_right, qc_status, qc_by, qc_notes, qc_reviewed_at) VALUES
  ('scan-001', 'car-002', 'res-001', '2026-04-27 14:30', 'Check-In',  'Damage Detected', '/images/scans/scan001_front.jpg', '/images/scans/scan001_rear.jpg', '/images/scans/scan001_left.jpg', '/images/scans/scan001_right.jpg', 'Approved', 'qc-admin@acr.com', 'Confirmed scratch on front bumper', '2026-04-27 15:10'),
  ('scan-002', 'car-005', 'res-002', '2026-04-25 11:00', 'Check-In',  'Damage Detected', '/images/scans/scan002_front.jpg', '/images/scans/scan002_rear.jpg', '/images/scans/scan002_left.jpg', '/images/scans/scan002_right.jpg', 'Pending',  NULL, NULL, NULL),
  ('scan-003', 'car-001', 'res-004', '2026-03-17 16:45', 'Check-In',  'Clean',           '/images/scans/scan003_front.jpg', '/images/scans/scan003_rear.jpg', '/images/scans/scan003_left.jpg', '/images/scans/scan003_right.jpg', 'Approved', 'qc-admin@acr.com', 'No damage found', '2026-03-17 17:00')
ON CONFLICT (id) DO NOTHING;

-- Detected damage for scan-001 and scan-002
INSERT INTO detected_damage (id, scan_id, label, confidence, x, y, width, height) VALUES
  (gen_random_uuid(), 'scan-001', 'Scratch',    0.94, 120, 340, 85,  30),
  (gen_random_uuid(), 'scan-001', 'Paint Chip', 0.78, 200, 355, 25,  20),
  (gen_random_uuid(), 'scan-002', 'Dent',       0.88, 310, 180, 60, 55)
ON CONFLICT (id) DO NOTHING;

-- Damage charges: sample rows linked to confirmed scans
INSERT INTO damage_charges (id, scan_id, reservation_id, amount, currency, description, status, created_by) VALUES
  ('chg-001', 'scan-001', 'res-001', 35000, 'usd', 'Front bumper scratch — 14cm scratch requiring repaint', 'pending', 'qc-admin@acr.com'),
  ('chg-002', 'scan-001', 'res-001',  8500, 'usd', 'Paint chip repair on hood',                            'pending', 'qc-admin@acr.com')
ON CONFLICT (id) DO NOTHING;

COMMIT;
