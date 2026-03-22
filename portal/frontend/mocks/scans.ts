import { ScanEvent } from '../types';

export const mockScans: ScanEvent[] = [
  // Recent Scan - Check Out (No Damage)
  {
    id: 'scan-501',
    carId: 'car-002',
    reservationId: 'res-1001',
    timestamp: '2023-10-25T10:05:00Z',
    type: 'Check-Out',
    aiStatus: 'Clean',
    imageUrls: {
      front: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=800&q=80',
      rear: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=800&q=80',
      left: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=800&q=80',
      right: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=800&q=80'
    },
    qcStatus: 'Approved',
    qcBy: 'System Auto-Approve'
  },
  // Recent Scan - Check In (Damage Detected)
  {
    id: 'scan-502',
    carId: 'car-001',
    reservationId: 'res-1002',
    timestamp: '2023-10-22T18:15:00Z',
    type: 'Check-In',
    aiStatus: 'Damage Detected',
    imageUrls: {
      front: 'https://images.unsplash.com/photo-1621007947382-bb3c3968e3bb?auto=format&fit=crop&w=800&q=80',
      rear: 'https://images.unsplash.com/photo-1621007947382-bb3c3968e3bb?auto=format&fit=crop&w=800&q=80',
      left: 'https://images.unsplash.com/photo-1621007947382-bb3c3968e3bb?auto=format&fit=crop&w=800&q=80',
      right: 'https://images.unsplash.com/photo-1621007947382-bb3c3968e3bb?auto=format&fit=crop&w=800&q=80'
    },
    detectedDamage: [
      {
        x: 150,
        y: 200,
        width: 50,
        height: 30,
        label: 'Scratch',
        confidence: 0.92
      }
    ],
    qcStatus: 'Pending'
  },
  // Old Scan - Maintenance Check
  {
    id: 'scan-503',
    carId: 'car-003',
    timestamp: '2023-09-15T10:05:00Z',
    type: 'Check-In',
    aiStatus: 'Damage Detected',
    imageUrls: {
      front: 'https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?auto=format&fit=crop&w=800&q=80',
      rear: 'https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?auto=format&fit=crop&w=800&q=80',
      left: 'https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?auto=format&fit=crop&w=800&q=80',
      right: 'https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?auto=format&fit=crop&w=800&q=80'
    },
    detectedDamage: [
      {
        x: 300,
        y: 400,
        width: 100,
        height: 80,
        label: 'Dent',
        confidence: 0.98
      }
    ],
    qcStatus: 'Approved', // Confirmed as damage
    qcBy: 'Staff Member A',
    qcNotes: 'Deep dent on passenger door'
  },
  // Recent Scan - Check In (Clean)
  {
    id: 'scan-504',
    carId: 'car-005',
    reservationId: 'res-1004',
    timestamp: '2023-10-28T12:05:00Z',
    type: 'Check-Out',
    aiStatus: 'Clean',
    imageUrls: {
      front: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
      rear: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
      left: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
      right: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80'
    },
    qcStatus: 'Approved',
    qcBy: 'System Auto-Approve'
  }
];

