import { Car } from '../types';

export const mockCars: Car[] = [
  {
    id: 'car-001',
    make: 'Toyota',
    model: 'Camry',
    year: 2023,
    color: 'Silver',
    licensePlate: 'ABC-1234',
    vin: 'JT1AB34C5D6789012',
    status: 'Available',
    imageUrl: 'https://images.unsplash.com/photo-1621007947382-bb3c3968e3bb?auto=format&fit=crop&w=500&q=60',
    mileage: 15000,
    lastInspectionDate: '2023-10-01'
  },
  {
    id: 'car-002',
    make: 'Tesla',
    model: 'Model 3',
    year: 2024,
    color: 'White',
    licensePlate: 'ELN-420X',
    vin: '5YJ3E1EB9LF123456',
    status: 'Rented',
    imageUrl: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=500&q=60',
    mileage: 8500,
    lastInspectionDate: '2023-10-25'
  },
  {
    id: 'car-003',
    make: 'Ford',
    model: 'Mustang',
    year: 2022,
    color: 'Red',
    licensePlate: 'MUS-7777',
    vin: '1FA6P8CF9M5123456',
    status: 'Maintenance',
    imageUrl: 'https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?auto=format&fit=crop&w=500&q=60',
    mileage: 22000,
    lastInspectionDate: '2023-09-15'
  },
  {
    id: 'car-004',
    make: 'Honda',
    model: 'CR-V',
    year: 2023,
    color: 'Blue',
    licensePlate: 'HND-9988',
    vin: '2HKRW2H59MH123456',
    status: 'Available',
    imageUrl: 'https://images.unsplash.com/photo-1568844293986-8d0400bd4745?auto=format&fit=crop&w=500&q=60',
    mileage: 12000,
    lastInspectionDate: '2023-10-20'
  },
  {
    id: 'car-005',
    make: 'Chevrolet',
    model: 'Tahoe',
    year: 2023,
    color: 'Black',
    licensePlate: 'SUV-BIG1',
    vin: '1GNSK2KD0PR123456',
    status: 'Rented',
    imageUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=500&q=60',
    mileage: 18500,
    lastInspectionDate: '2023-10-10'
  }
];

