/**
 * FPCC Operations Command System
 * Enhanced Event System with Structured Objects
 */

// ==========================================
// PRIORITY & STATUS ENUMS
// ==========================================

export type Priority = 'VIP' | 'HIGH' | 'NORMAL' | 'LOW';
export type EventStatus = 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'PENDING';
export type StaffStatus = 'AVAILABLE' | 'ASSIGNED' | 'ON_BREAK' | 'OFF_DUTY' | 'CHECKED_IN';
export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

// ==========================================
// PRIORITY COLOR SYSTEM
// ==========================================

export const PRIORITY_COLORS = {
  VIP: {
    primary: '#BF8F3B',
    light: '#FDE68A',
    dark: '#A4742E',
    glow: 'rgba(191, 143, 59, 0.4)',
    bg: 'rgba(191, 143, 59, 0.1)',
    border: 'rgba(191, 143, 59, 0.3)'
  },
  HIGH: {
    primary: '#EF4444',
    light: '#FCA5A5',
    dark: '#DC2626',
    glow: 'rgba(239, 68, 68, 0.4)',
    bg: 'rgba(239, 68, 68, 0.1)',
    border: 'rgba(239, 68, 68, 0.3)'
  },
  NORMAL: {
    primary: '#3B82F6',
    light: '#93C5FD',
    dark: '#2563EB',
    glow: 'rgba(59, 130, 246, 0.4)',
    bg: 'rgba(59, 130, 246, 0.1)',
    border: 'rgba(59, 130, 246, 0.3)'
  },
  LOW: {
    primary: '#9CA3AF',
    light: '#D1D5DB',
    dark: '#6B7280',
    glow: 'rgba(156, 163, 175, 0.4)',
    bg: 'rgba(156, 163, 175, 0.1)',
    border: 'rgba(156, 163, 175, 0.3)'
  }
} as const;

// ==========================================
// CORE EVENT SYSTEM
// ==========================================

export interface EventStaff {
  id: string;
  name: string;
  role: string;
  status: StaffStatus;
  checkInTime?: string;
  avatar?: string;
}

export interface EventClient {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  vipStatus: boolean;
}

export interface EventVenue {
  id: string;
  name: string;
  address: string;
  city: string;
  capacity: number;
  tier: 'Luxury Class' | 'Premium Estate' | 'Aesthetic Loft' | 'Superyacht Deck';
}

export interface OperationalEvent {
  id: string;
  title: string;
  
  // Time
  startDate: Date;
  endDate: Date;
  duration: number; // hours
  
  // People
  client: EventClient;
  staff: EventStaff[];
  primaryStaff?: EventStaff;
  
  // Location
  venue: EventVenue;
  location: string; // Human readable
  
  // Priority & Status
  priority: Priority;
  status: EventStatus;
  
  // Details
  description?: string;
  requirements?: string;
  dressCode?: string;
  budget?: number;
  
  // Operations
  staffNeeded: number;
  staffConfirmed: number;
  isDirectBooking: boolean;
  source: 'local' | 'icloud' | 'google';
  
  // Financial
  totalCost?: number;
  revenue?: number;
  profit?: number;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  notes?: string;
  tags?: string[];
}

// ==========================================
// KPI & METRICS
// ==========================================

export interface KPIMetric {
  id: string;
  label: string;
  value: number | string;
  change: number; // percentage
  trend: 'up' | 'down' | 'stable';
  icon: string;
  color: string;
}

export interface LiveKPIs {
  totalEvents: KPIMetric;
  activeStaff: KPIMetric;
  pendingPayments: KPIMetric;
  todaysEvents: KPIMetric;
  monthlyRevenue: KPIMetric;
  utilizationRate: KPIMetric;
}

// ==========================================
// ALERTS & NOTIFICATIONS
// ==========================================

export interface OperationalAlert {
  id: string;
  timestamp: Date;
  severity: AlertSeverity;
  title: string;
  message: string;
  relatedEventId?: string;
  relatedStaffId?: string;
  isRead: boolean;
  actionRequired: boolean;
  actions?: AlertAction[];
}

export interface AlertAction {
  label: string;
  action: () => void;
  variant: 'primary' | 'secondary' | 'danger';
}

// ==========================================
// ACTIVITY STREAM
// ==========================================

export interface ActivityItem {
  id: string;
  timestamp: Date;
  type: 'event_create' | 'event_update' | 'event_cancel' | 'staff_checkin' | 'staff_rsvp' | 'payment' | 'sync' | 'alert' | 'call';
  operator: string;
  message: string;
  details?: string;
  relatedEventId?: string;
  relatedStaffId?: string;
  isUrgent: boolean;
}

// ==========================================
// STAFF MANAGEMENT
// ==========================================

export interface OperationalStaff {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  role: string;
  rate: number;
  status: StaffStatus;
  currentEventId?: string;
  checkInTime?: Date;
  totalHoursThisWeek: number;
  totalEarningsThisMonth: number;
  avatar?: string;
  notes?: string;
  createdAt: Date;
}

// ==========================================
// PAYROLL & PAYMENTS
// ==========================================

export interface PendingPayment {
  id: string;
  staffId: string;
  staffName: string;
  eventId: string;
  eventTitle: string;
  amount: number;
  hoursWorked: number;
  rate: number;
  status: 'PENDING' | 'PROCESSING' | 'PAID';
  dueDate: Date;
  createdAt: Date;
}

// ==========================================
// RIGHT PANEL FEED DATA
// ==========================================

export interface LiveOperationsFeed {
  todaysSchedule: OperationalEvent[];
  staffStatus: OperationalStaff[];
  alerts: OperationalAlert[];
  pendingPayments: PendingPayment[];
  recentActivity: ActivityItem[];
}

// ==========================================
// MODAL SYSTEM
// ==========================================

export type ModalType = 'new_event' | 'new_staff' | 'new_client' | 'event_details' | 'staff_details' | 'payment' | 'alert';

export interface ModalConfig {
  type: ModalType;
  title: string;
  data?: any;
  onClose: () => void;
  onSave?: (data: any) => void;
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

export const getPriorityColor = (priority: Priority) => {
  return PRIORITY_COLORS[priority] || PRIORITY_COLORS.NORMAL;
};

export const getStatusBadge = (status: EventStatus) => {
  const badges = {
    SCHEDULED: { color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' },
    CONFIRMED: { color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
    IN_PROGRESS: { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
    COMPLETED: { color: '#6B7280', bg: 'rgba(107, 114, 128, 0.1)' },
    CANCELLED: { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' },
    PENDING: { color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)' }
  };
  return badges[status] || badges.PENDING;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
};
