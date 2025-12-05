export type CarStatus = 'Available' | 'Rented' | 'Maintenance';

export interface Car {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  vin: string;
  status: CarStatus;
  imageUrl: string;
  mileage: number;
  lastInspectionDate: string;
}

export interface Reservation {
  id: string;
  carId: string;
  userId: string; // Mock User ID
  userName: string;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Completed' | 'Upcoming' | 'Cancelled';
}

export type ScanType = 'Check-In' | 'Check-Out';
export type AIStatus = 'Clean' | 'Damage Detected' | 'Pending Review';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string; // e.g., "Scratch", "Dent"
  confidence: number;
}

export interface ScanEvent {
  id: string;
  carId: string;
  reservationId?: string;
  timestamp: string;
  type: ScanType;
  aiStatus: AIStatus;
  imageUrls: {
    front: string;
    rear: string;
    left: string;
    right: string;
  };
  detectedDamage?: BoundingBox[];
  qcStatus?: 'Pending' | 'Approved' | 'Rejected';
  qcBy?: string;
  qcNotes?: string;
}

