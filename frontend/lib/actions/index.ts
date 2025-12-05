"use server";

import { query } from "@/lib/db";
import { Car, Reservation, ScanEvent, BoundingBox } from "@/types";
import { revalidatePath } from "next/cache";

// --- Cars ---

export async function getCars(): Promise<Car[]> {
  const res = await query(`
    SELECT 
      id, make, model, year, color, license_plate as "licensePlate", 
      vin, status, image_url as "imageUrl", mileage, 
      TO_CHAR(last_inspection_date, 'YYYY-MM-DD') as "lastInspectionDate"
    FROM cars
    ORDER BY created_at DESC
  `);
  return res.rows;
}

export async function getCarById(id: string): Promise<Car | undefined> {
  const res = await query(`
    SELECT 
      id, make, model, year, color, license_plate as "licensePlate", 
      vin, status, image_url as "imageUrl", mileage, 
      TO_CHAR(last_inspection_date, 'YYYY-MM-DD') as "lastInspectionDate"
    FROM cars WHERE id = $1
  `, [id]);
  return res.rows[0];
}

export async function addCar(data: Omit<Car, 'id'>) {
  const id = crypto.randomUUID(); 
  await query(`
    INSERT INTO cars (id, make, model, year, color, license_plate, vin, status, image_url, mileage)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `, [id, data.make, data.model, data.year, data.color, data.licensePlate, data.vin, 'Available', data.imageUrl, data.mileage]);
  
  revalidatePath('/fleet');
  return id;
}

// --- Reservations ---

export async function getReservationsByCarId(carId: string): Promise<Reservation[]> {
  const res = await query(`
    SELECT 
      id, car_id as "carId", user_id as "userId", user_name as "userName", 
      start_date as "startDate", end_date as "endDate", status
    FROM reservations WHERE car_id = $1
    ORDER BY start_date DESC
  `, [carId]);
  return res.rows.map((row: any) => ({
    ...row,
    startDate: row.startDate.toISOString(),
    endDate: row.endDate.toISOString()
  }));
}

export async function getAllReservations(): Promise<Reservation[]> {
   const res = await query(`
    SELECT 
      id, car_id as "carId", user_id as "userId", user_name as "userName", 
      start_date as "startDate", end_date as "endDate", status
    FROM reservations
    ORDER BY start_date DESC
  `);
  return res.rows.map((row: any) => ({
    ...row,
    startDate: row.startDate.toISOString(),
    endDate: row.endDate.toISOString()
  }));
}


// --- Scans ---

export async function getScans(): Promise<ScanEvent[]> {
  const res = await query(`
    SELECT 
      s.id, s.car_id as "carId", s.reservation_id as "reservationId", 
      s.timestamp, s.type, s.ai_status as "aiStatus", 
      s.qc_status as "qcStatus", s.qc_by as "qcBy", s.qc_notes as "qcNotes",
      s.image_url_front, s.image_url_rear, s.image_url_left, s.image_url_right
    FROM scans s
    ORDER BY s.timestamp DESC
  `);

  const scans = await Promise.all(res.rows.map(async (row: any) => {
      const damageRes = await query(`SELECT label, confidence, x, y, width, height FROM detected_damage WHERE scan_id = $1`, [row.id]);
      return {
          ...row,
          timestamp: row.timestamp.toISOString(),
          imageUrls: {
              front: row.image_url_front,
              rear: row.image_url_rear,
              left: row.image_url_left,
              right: row.image_url_right
          },
          detectedDamage: damageRes.rows
      };
  }));

  return scans;
}

export async function getScanById(id: string): Promise<ScanEvent | undefined> {
    const res = await query(`
        SELECT 
        s.id, s.car_id as "carId", s.reservation_id as "reservationId", 
        s.timestamp, s.type, s.ai_status as "aiStatus", 
        s.qc_status as "qcStatus", s.qc_by as "qcBy", s.qc_notes as "qcNotes",
        s.image_url_front, s.image_url_rear, s.image_url_left, s.image_url_right
        FROM scans s
        WHERE s.id = $1
    `, [id]);

    if (res.rows.length === 0) return undefined;
    const row = res.rows[0];

    const damageRes = await query(`SELECT label, confidence, x, y, width, height FROM detected_damage WHERE scan_id = $1`, [id]);

    return {
        ...row,
        timestamp: row.timestamp.toISOString(),
        imageUrls: {
            front: row.image_url_front,
            rear: row.image_url_rear,
            left: row.image_url_left,
            right: row.image_url_right
        },
        detectedDamage: damageRes.rows
    };
}

export async function getScansByCarId(carId: string): Promise<ScanEvent[]> {
     const res = await query(`
    SELECT 
      s.id, s.car_id as "carId", s.reservation_id as "reservationId", 
      s.timestamp, s.type, s.ai_status as "aiStatus", 
      s.qc_status as "qcStatus", s.qc_by as "qcBy", s.qc_notes as "qcNotes",
      s.image_url_front, s.image_url_rear, s.image_url_left, s.image_url_right
    FROM scans s
    WHERE s.car_id = $1
    ORDER BY s.timestamp DESC
  `, [carId]);

  const scans = await Promise.all(res.rows.map(async (row: any) => {
      const damageRes = await query(`SELECT label, confidence, x, y, width, height FROM detected_damage WHERE scan_id = $1`, [row.id]);
      return {
          ...row,
          timestamp: row.timestamp.toISOString(),
          imageUrls: {
              front: row.image_url_front,
              rear: row.image_url_rear,
              left: row.image_url_left,
              right: row.image_url_right
          },
          detectedDamage: damageRes.rows
      };
  }));

  return scans;
}

export async function updateQCStatus(scanId: string, status: 'Approved' | 'Rejected', userId: string) {
    await query(`
        UPDATE scans 
        SET qc_status = $1, qc_by = $2 
        WHERE id = $3
    `, [status, userId, scanId]);
    revalidatePath('/qc');
    revalidatePath(`/qc/${scanId}`);
}

export async function searchGlobal(queryStr: string) {
  const term = `%${queryStr}%`;

  const carsRes = await query(`
    SELECT 
      id, make, model, year, color, license_plate as "licensePlate", 
      vin, status, image_url as "imageUrl", mileage, 
      TO_CHAR(last_inspection_date, 'YYYY-MM-DD') as "lastInspectionDate"
    FROM cars
    WHERE make ILIKE $1 OR model ILIKE $1 OR license_plate ILIKE $1 OR vin ILIKE $1
  `, [term]);

  const resRes = await query(`
    SELECT 
      id, car_id as "carId", user_id as "userId", user_name as "userName", 
      start_date as "startDate", end_date as "endDate", status
    FROM reservations
    WHERE user_name ILIKE $1 OR user_id ILIKE $1 OR id::text ILIKE $1
  `, [term]);

  const scanRes = await query(`
    SELECT 
      s.id, s.car_id as "carId", s.reservation_id as "reservationId", 
      s.timestamp, s.type, s.ai_status as "aiStatus", 
      s.qc_status as "qcStatus", s.qc_by as "qcBy", s.qc_notes as "qcNotes",
      s.image_url_front, s.image_url_rear, s.image_url_left, s.image_url_right
    FROM scans s
    WHERE s.id::text ILIKE $1 OR s.car_id ILIKE $1
  `, [term]);

  return {
    cars: carsRes.rows,
    reservations: resRes.rows.map((row: any) => ({
        ...row,
        startDate: row.startDate.toISOString(),
        endDate: row.endDate.toISOString()
    })),
    scans: scanRes.rows.map((row: any) => ({
        ...row,
        timestamp: row.timestamp.toISOString(),
        imageUrls: { 
            front: row.image_url_front, 
            rear: row.image_url_rear,
            left: row.image_url_left,
            right: row.image_url_right
        },
        detectedDamage: [] 
    }))
  };
}
