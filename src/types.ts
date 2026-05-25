/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Client {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  notes: string;
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  capacity: number;
  tier: string; // "Luxury Class" | "Premium Estate" | "Aesthetic Loft" | "Superyacht Deck"
  notes: string;
}

export interface Staff {
  id: string;
  name: string;
  surname: string;
  role: string;
  rate: number;
  phone: string;
  email: string;
  notes: string;
}

export interface Event {
  id: string;
  title: string;
  clientId: string;
  venueId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  staffIds: string[]; // Mapped staff allocations
  notes: string;
  clientRequirements?: string; // Other requirements requested by the client
  googleEventId?: string; // ID if synced with Google Calendar
  appleEventId?: string; // ID if synced with Apple Calendar / iCloud
  status?: 'Pending' | 'Confirmed' | 'Canceled';
  isDirectBooking?: boolean; // If booked directly on the spot
  staffRSVPs?: Record<string, 'Pending' | 'Available' | 'Unavailable'>; // Tracking responses per staff member
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  operator: string;
  type: 'auth' | 'event_create' | 'event_delete' | 'sync' | 'direct_booking' | 'call' | 'staff_reply';
  message: string;
  isUrgent?: boolean;
}

export interface BackendEvent {
  id: string;
  title: string;
  date: string;
  duration: number;
  staffName: string;  // Full name (Firstname Surname)
  staffPhone?: string;
  staffEmail?: string;
  clientName?: string;  // Full name (Firstname Surname)
  clientPhone?: string;
  clientEmail?: string;
  dressCode: string;
  uniformType?: string;  // Uniform type for staff
  arrivalTime: string;
  createdAt?: string;
}
