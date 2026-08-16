/**
 * Response shapes. Previously every API result was handled as `any`, so
 * TypeScript caught none of the field-name drift between frontend and backend.
 *
 * Status strings are typed as `string` rather than a union because the backend
 * casing is not guaranteed (`ACTIVE` vs `Active`). Always compare through
 * `normaliseStatus()` in lib/format.ts instead of `=== 'Active'`.
 */

export interface School {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  contactPerson?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  activeBuses?: number | null;
  totalBuses?: number | null;
  status?: string | null;
  createdAt?: string | null;
}

export interface Device {
  id: string;
  deviceId: string;
  serialNumber?: string | null;
  licensePlate?: string | null;
  capacity?: number | null;
  schoolId?: string | null;
  status?: string | null;
  lastPing?: string | null;
  createdAt?: string | null;
  installedAt?: string | null;
  school?: { id?: string; name?: string } | null;
  /** Returned once, only on create. */
  deviceSecret?: string;
}

export interface Admin {
  id: string;
  name: string;
  email: string;
  role: string;
  schoolId?: string | null;
  school?: { id?: string; name?: string } | null;
  createdAt?: string | null;
  lastLoginAt?: string | null;
}

export interface Stats {
  totalSchools?: number;
  totalBuses?: number;
  totalStudents?: number;
  activeDevices?: number;
  offlineDevices?: number;
  stationaryDevices?: number;
  warning?: number;
  schoolsGrowthPercent?: number;
  busesGrowthPercent?: number;
}

export interface SchoolStats {
  totalBuses?: number;
  totalRoutes?: number;
  totalStudents?: number;
}

export interface BusLocation {
  busId: string;
  lat: number;
  lng: number;
  speed: number;
  timestamp: string;
  licensePlate?: string | null;
  serialNumber?: string | null;
  schoolName?: string | null;
}

export interface LogEntry {
  id: string;
  busId?: string | null;
  serialNumber?: string | null;
  speed?: number | null;
  timestamp?: string | null;
  bus?: { licensePlate?: string | null } | null;
}

export interface Notification {
  id: string;
  type?: string | null;
  title?: string | null;
  message?: string | null;
  status?: string | null;
  createdAt?: string | null;
}

export interface GlobalSettings {
  id?: string;
  maintenanceMode?: boolean;
  mapCenterLat?: number;
  mapCenterLng?: number;
  mapDefaultZoom?: number;
  overspeedLimitKph?: number;
  offlineAlertMinutes?: number;
  alertEmail?: string | null;
  updatedAt?: string | null;
}

export interface AuthUser {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
}
