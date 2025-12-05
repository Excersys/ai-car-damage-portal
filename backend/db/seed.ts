import { Pool } from 'pg';
import dotenv from 'dotenv';
import { mockCars } from '../../frontend/mocks/cars';
import { mockReservations } from '../../frontend/mocks/reservations';
import { mockScans } from '../../frontend/mocks/scans';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seed() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    console.log('Clearing existing data...');
    await client.query('TRUNCATE TABLE detected_damage, scans, reservations, cars CASCADE');

    console.log('Seeding Cars...');
    for (const car of mockCars) {
      await client.query(
        `INSERT INTO cars (id, make, model, year, color, license_plate, vin, status, image_url, mileage, last_inspection_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          car.id, // Note: Ensure mock IDs are UUIDs or change schema to VARCHAR/TEXT if sticking to custom IDs like 'car-001'
          car.make,
          car.model,
          car.year,
          car.color,
          car.licensePlate,
          car.vin,
          car.status,
          car.imageUrl,
          car.mileage,
          car.lastInspectionDate
        ]
      );
    }

    console.log('Seeding Reservations...');
    for (const res of mockReservations) {
      await client.query(
        `INSERT INTO reservations (id, car_id, user_id, user_name, start_date, end_date, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          res.id,
          res.carId,
          res.userId,
          res.userName,
          res.startDate,
          res.endDate,
          res.status
        ]
      );
    }

    console.log('Seeding Scans...');
    for (const scan of mockScans) {
      await client.query(
        `INSERT INTO scans (id, car_id, reservation_id, timestamp, type, ai_status, image_url_front, image_url_rear, image_url_left, image_url_right, qc_status, qc_by, qc_notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          scan.id,
          scan.carId,
          scan.reservationId,
          scan.timestamp,
          scan.type,
          scan.aiStatus,
          scan.imageUrls.front,
          scan.imageUrls.rear,
          scan.imageUrls.left,
          scan.imageUrls.right,
          scan.qcStatus,
          scan.qcBy,
          scan.qcNotes
        ]
      );

      if (scan.detectedDamage && scan.detectedDamage.length > 0) {
        for (const damage of scan.detectedDamage) {
          await client.query(
            `INSERT INTO detected_damage (scan_id, label, confidence, x, y, width, height)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              scan.id,
              damage.label,
              damage.confidence,
              damage.x,
              damage.y,
              damage.width,
              damage.height
            ]
          );
        }
      }
    }

    await client.query('COMMIT');
    console.log('Seeding completed successfully!');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error seeding data:', e);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();

