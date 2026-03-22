-- Cars Table (Updated for text IDs)
CREATE TABLE cars (
    id VARCHAR(255) PRIMARY KEY, -- Changed from UUID to VARCHAR to support 'car-001' style IDs
    make VARCHAR(255) NOT NULL,
    model VARCHAR(255) NOT NULL,
    year INT NOT NULL,
    color VARCHAR(100) NOT NULL,
    license_plate VARCHAR(50) UNIQUE NOT NULL,
    vin VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'Available',
    image_url TEXT,
    mileage INT DEFAULT 0,
    last_inspection_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Reservations Table
CREATE TABLE reservations (
    id VARCHAR(255) PRIMARY KEY, -- Changed from UUID
    car_id VARCHAR(255) REFERENCES cars(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Scans Table
CREATE TABLE scans (
    id VARCHAR(255) PRIMARY KEY, -- Changed from UUID
    car_id VARCHAR(255) REFERENCES cars(id) ON DELETE CASCADE,
    reservation_id VARCHAR(255) REFERENCES reservations(id) ON DELETE SET NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    type VARCHAR(50) NOT NULL,
    ai_status VARCHAR(50) DEFAULT 'Clean',
    image_url_front TEXT,
    image_url_rear TEXT,
    image_url_left TEXT,
    image_url_right TEXT,
    qc_status VARCHAR(50) DEFAULT 'Pending',
    qc_by VARCHAR(255),
    qc_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Detected Damage
CREATE TABLE detected_damage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_id VARCHAR(255) REFERENCES scans(id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL,
    confidence FLOAT NOT NULL,
    x INT NOT NULL,
    y INT NOT NULL,
    width INT NOT NULL,
    height INT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
