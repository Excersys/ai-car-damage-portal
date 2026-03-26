-- Seed data for AI Car Rental Damage Detection Portal
-- Run AFTER schema.sql. Safe to re-run only on an empty database
-- (schema.sql DROP/CREATE resets the tables first).

-- Cars
INSERT INTO cars (id, make, model, year, color, license_plate, vin, status, image_url, mileage, last_inspection_date) VALUES
('car-001', 'Toyota',    'Camry',   2023, 'Silver', 'ABC-1234', 'JT1AB34C5D6789012', 'Available',   'https://images.unsplash.com/photo-1621007947382-bb3c3968e3bb?auto=format&fit=crop&w=500&q=60', 15000, '2023-10-01'),
('car-002', 'Tesla',     'Model 3', 2024, 'White',  'ELN-420X', '5YJ3E1EB9LF123456', 'Rented',       'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=500&q=60',  8500, '2023-10-25'),
('car-003', 'Ford',      'Mustang', 2022, 'Red',    'MUS-7777', '1FA6P8CF9M5123456', 'Maintenance', 'https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?auto=format&fit=crop&w=500&q=60', 22000, '2023-09-15'),
('car-004', 'Honda',     'CR-V',    2023, 'Blue',   'HND-9988', '2HKRW2H59MH123456', 'Available',   'https://images.unsplash.com/photo-1568844293986-8d0400bd4745?auto=format&fit=crop&w=500&q=60', 12000, '2023-10-20'),
('car-005', 'Chevrolet', 'Tahoe',   2023, 'Black',  'SUV-BIG1', '1GNSK2KD0PR123456', 'Rented',       'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=500&q=60', 18500, '2023-10-10');

-- Reservations
INSERT INTO reservations (id, car_id, user_id, user_name, start_date, end_date, status) VALUES
('res-1001', 'car-002', 'user-501', 'John Doe',      '2023-10-25T10:00:00Z', '2023-10-30T10:00:00Z', 'Active'),
('res-1002', 'car-001', 'user-502', 'Jane Smith',    '2023-10-20T09:00:00Z', '2023-10-22T18:00:00Z', 'Completed'),
('res-1003', 'car-003', 'user-503', 'Mike Johnson',  '2023-09-10T14:00:00Z', '2023-09-15T10:00:00Z', 'Completed'),
('res-1004', 'car-005', 'user-504', 'Sarah Williams','2023-10-28T12:00:00Z', '2023-11-05T12:00:00Z', 'Active'),
('res-1005', 'car-004', 'user-505', 'David Brown',   '2023-11-10T08:00:00Z', '2023-11-15T08:00:00Z', 'Upcoming');

-- Scans
INSERT INTO scans (id, car_id, reservation_id, timestamp, type, ai_status, image_url_front, image_url_rear, image_url_left, image_url_right, qc_status, qc_by, qc_notes) VALUES
('scan-501', 'car-002', 'res-1001', '2023-10-25T10:05:00Z', 'Check-Out', 'Clean',
  'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=800&q=80',
  'Approved', 'System Auto-Approve', NULL),
('scan-502', 'car-001', 'res-1002', '2023-10-22T18:15:00Z', 'Check-In', 'Damage Detected',
  'https://images.unsplash.com/photo-1621007947382-bb3c3968e3bb?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1621007947382-bb3c3968e3bb?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1621007947382-bb3c3968e3bb?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1621007947382-bb3c3968e3bb?auto=format&fit=crop&w=800&q=80',
  'Pending', NULL, NULL),
('scan-503', 'car-003', NULL, '2023-09-15T10:05:00Z', 'Check-In', 'Damage Detected',
  'https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?auto=format&fit=crop&w=800&q=80',
  'Approved', 'Staff Member A', 'Deep dent on passenger door'),
('scan-504', 'car-005', 'res-1004', '2023-10-28T12:05:00Z', 'Check-Out', 'Clean',
  'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
  'Approved', 'System Auto-Approve', NULL);

-- Detected damage
INSERT INTO detected_damage (scan_id, label, confidence, x, y, width, height) VALUES
('scan-502', 'Scratch', 0.92, 150, 200,  50, 30),
('scan-503', 'Dent',    0.98, 300, 400, 100, 80);
