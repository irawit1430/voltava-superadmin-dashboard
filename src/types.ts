export interface School {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  contactPerson: string;
  activeBuses: number;
  status: 'Active' | 'Pending' | 'Suspended';
  createdAt: string;
}

export interface Stats {
  totalSchools: number;
  totalBuses: number;
  offlineDevices: number;
  totalStudents: number;
}

export interface Device {
  id: string;
  schoolId: string;
  licensePlate: string;
  capacity: number;
  deviceId: string;
  serialNumber: string;
  status: 'ONLINE' | 'OFFLINE';
  lastPing: string;
  createdAt: string;
  school?: { name: string };
}
