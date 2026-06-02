/**
 * ENHANCED TYPE DEFINITIONS FOR AGENT ADVANCED FEATURES
 * Fresh People Command Center - Cycle #4 Enhancements
 */

import { Client } from '../types';

// ==========================================
// CRM AGENT TYPES
// ==========================================

export type PipelineStage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';

export interface PipelineDeal {
  id: string;
  clientId: number;
  clientName: string;
  stage: PipelineStage;
  value: number;
  probability: number;
  expectedCloseDate: string;
  assignedTo: string;
  lastActivity: string;
  notes: string;
}

export interface LeadScore {
  clientId: number;
  score: number; // 0-100
  factors: {
    engagement: number; // 0-100
    demographics: number; // 0-100
    behavior: number; // 0-100
    firmographics: number; // 0-100
  };
  trend: 'up' | 'down' | 'stable';
  lastUpdated: string;
}

export interface CommunicationRecord {
  id: string;
  clientId: number;
  type: 'email' | 'call' | 'meeting' | 'note' | 'sms';
  direction: 'inbound' | 'outbound';
  date: string;
  subject: string;
  content: string;
  duration?: number; // minutes for calls/meetings
  attendees?: string[];
  attachments?: string[];
  outcome?: string;
}

// ==========================================
// CALENDAR AGENT TYPES
// ==========================================

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description: string;
  location: string;
  attendees: string[];
  calendarSource: 'google' | 'apple' | 'internal';
  color: string;
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: string;
  };
  reminders: number[]; // minutes before event
  conflicts?: string[]; // IDs of conflicting events
}

export interface ConflictInfo {
  eventId: string;
  conflictingEventIds: string[];
  conflictType: 'overlap' | 'back_to_back' | 'travel_time';
  severity: 'low' | 'medium' | 'high';
}

// ==========================================
// FINANCE AGENT TYPES
// ==========================================

export interface Invoice {
  id: string;
  clientId: number;
  clientName: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paymentTerms: number; // days
  remindersSent: number;
  lastReminderDate?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PaymentReminder {
  id: string;
  invoiceId: string;
  reminderDate: string;
  reminderType: 'auto' | 'manual';
  channel: 'email' | 'sms' | 'phone';
  status: 'scheduled' | 'sent' | 'failed';
  message: string;
}

export interface RevenueForecast {
  month: string;
  projected: number;
  actual: number;
  pipeline: number;
  confidence: number; // 0-100
}

// ==========================================
// OPERATIONS AGENT TYPES
// ==========================================

export interface StaffMember {
  id: number;
  name: string;
  role: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'on_leave';
  availability: AvailabilitySchedule;
  skills: string[];
  performanceMetrics: PerformanceMetrics;
  shiftPreferences: ShiftPreferences;
}

export interface AvailabilitySchedule {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
}

export interface TimeSlot {
  start: string; // HH:MM
  end: string; // HH:MM
  available: boolean;
}

export interface ShiftPreferences {
  preferredDays: string[];
  preferredHours: string;
  maxHoursPerWeek: number;
  unavailableDates: string[];
}

export interface Shift {
  id: string;
  staffId: number;
  staffName: string;
  date: string;
  startTime: string;
  endTime: string;
  role: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
}

export interface PerformanceMetrics {
  staffId: number;
  period: string;
  hoursWorked: number;
  eventsCompleted: number;
  clientSatisfaction: number; // 0-5 rating
  punctualityRate: number; // percentage
  tasksCompleted: number;
  revenueGenerated: number;
}

// ==========================================
// ENHANCED CLIENT TYPE (EXTENDS EXISTING)
// ==========================================

export interface EnhancedClient extends Client {
  pipelineDeals?: PipelineDeal[];
  leadScore?: LeadScore;
  communicationHistory?: CommunicationRecord[];
  taxExempt?: boolean;
  paymentTerms?: number;
}
