import { Reservation } from '../types';

export const mockReservations: Reservation[] = [
  {
    id: 'res-1001',
    carId: 'car-002',
    userId: 'user-501',
    userName: 'John Doe',
    startDate: '2023-10-25T10:00:00Z',
    endDate: '2023-10-30T10:00:00Z',
    status: 'Active'
  },
  {
    id: 'res-1002',
    carId: 'car-001',
    userId: 'user-502',
    userName: 'Jane Smith',
    startDate: '2023-10-20T09:00:00Z',
    endDate: '2023-10-22T18:00:00Z',
    status: 'Completed'
  },
  {
    id: 'res-1003',
    carId: 'car-003',
    userId: 'user-503',
    userName: 'Mike Johnson',
    startDate: '2023-09-10T14:00:00Z',
    endDate: '2023-09-15T10:00:00Z',
    status: 'Completed'
  },
  {
    id: 'res-1004',
    carId: 'car-005',
    userId: 'user-504',
    userName: 'Sarah Williams',
    startDate: '2023-10-28T12:00:00Z',
    endDate: '2023-11-05T12:00:00Z',
    status: 'Active'
  },
  {
    id: 'res-1005',
    carId: 'car-004',
    userId: 'user-505',
    userName: 'David Brown',
    startDate: '2023-11-10T08:00:00Z',
    endDate: '2023-11-15T08:00:00Z',
    status: 'Upcoming'
  }
];

