// Agent types for Fresh People Command Center

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  location?: string;
  description?: string;
  staffIds?: number[];
  clientId?: number;
  color?: string;
}

export interface ConflictInfo {
  type: 'overlap' | 'double-booking' | 'availability';
  severity: 'low' | 'medium' | 'high';
  message: string;
  affectedStaff?: number[];
  affectedEvents?: string[];
}

export interface CommunicationRecord {
  id: string;
  type: 'email' | 'whatsapp' | 'call' | 'meeting';
  clientId: number;
  staffId?: number;
  date: Date;
  subject: string;
  content: string;
  status: 'sent' | 'delivered' | 'read' | 'replied';
}

export interface LeadScore {
  id: string;
  clientId: number;
  score: number;
  factors: {
    engagement: number;
    budget: number;
    timeline: number;
    fit: number;
  };
  lastUpdated: Date;
}

export interface PipelineDeal {
  id: string;
  clientId: number;
  title: string;
  value: number;
  stage: PipelineStage;
  probability: number;
  expectedCloseDate: Date;
  notes: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  color: string;
}

export interface Invoice {
  id: number;
  docNo: string;
  clientId: number;
  eventId?: number;
  issueDate: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  lines: InvoiceItem[];
  notes?: string;
}

export interface InvoiceItem {
  desc: string;
  qty: number;
  rate: number;
}

export interface Staff {
  id: number;
  name: string;
  role: string;
  rate: number;
  pin: string;
  uniform: boolean;
  department: string;
  email: string;
  phone: string;
}

export interface Client {
  id: number;
  name: string;
  email: string;
  vatNo: string;
  address: string;
  phone: string;
}

export interface Event {
  id: number;
  title: string;
  date: string;
  venue: string;
  staffIds: number[];
  startTime: string;
  endTime: string;
  clientId: number;
  color: string;
  gcalId: string | null;
  notes: string;
}