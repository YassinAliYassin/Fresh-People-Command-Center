export interface FinanceDocumentLine {
  desc: string;
  qty: number;
  rate: number;
  total?: number;
  kind?: 'staff' | 'service' | 'manual' | string;
  staffId?: number;
}

export interface FinanceDocument {
  id: number;
  docNo: string;
  type: 'invoice' | 'quote';
  clientId: number;
  eventId?: string;
  issueDate: string;
  dueDate?: string;
  validUntil?: string;
  status: string;
  includeTax: boolean;
  taxRate: number;
  lines: FinanceDocumentLine[];
  notes: string;
  metadata?: Record<string, unknown>;
}

export interface FinanceSummary {
  invoiced: number;
  paid: number;
  outstanding: number;
  overdueCount: number;
  count: number;
}

export interface FinanceDocsResponse {
  success: boolean;
  docs: FinanceDocument[];
  invoices: FinanceDocument[];
  quotes: FinanceDocument[];
  clients: any[];
  events: any[];
  staff: any[];
  summary: FinanceSummary;
  error?: string;
}

export interface PayrollStaffHours {
  staffId: number;
  fullName: string;
  phone: string;
  role: string;
  rate: number;
  assignmentsCount: number;
  totalHours: number;
  totalEarned: number;
  eventIds: string[];
  paymentStatus: 'PAID' | 'UNPAID' | 'PARTIAL' | 'PROCESSING' | 'OVERDUE';
  pendingAmount: number;
  paidAmount: number;
}

export interface StaffHoursResponse {
  success: boolean;
  cycleStart: string;
  cycleEnd: string;
  summary: {
    totalStaff: number;
    staffWithHours: number;
    totalHours: number;
    totalEarnings: number;
    paidAmount: number;
    pendingAmount: number;
    overdueCount: number;
  };
  staff: PayrollStaffHours[];
  events: any[];
  error?: string;
}

export interface StatementResponse {
  success: boolean;
  statement: FinanceDocument;
  docs: FinanceDocument[];
  summary: {
    totalInvoiced: number;
    paid: number;
    balanceDue: number;
  };
  error?: string;
}

export class FinanceApi {
  private static baseURL = window.location.origin;

  private static async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('fpcc_admin_token') : null;
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const response = await fetch(`${this.baseURL}${path}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || `Finance API request failed (${response.status})`);
    }
    return data as T;
  }

  static async listDocs(): Promise<FinanceDocsResponse> {
    return this.request('/api/dashboard-data?resource=finance&financeResource=docs');
  }

  static async createDoc(doc: Partial<FinanceDocument>): Promise<FinanceDocument> {
    const result = await this.request<{ success: boolean; doc: FinanceDocument }>('/api/dashboard-data?resource=finance&financeResource=docs', {
      method: 'POST',
      body: JSON.stringify(doc),
    });
    return result.doc;
  }

  static async updateDoc(id: number, patch: Partial<FinanceDocument>): Promise<FinanceDocument> {
    const result = await this.request<{ success: boolean; doc: FinanceDocument }>(`/api/dashboard-data?resource=finance&financeResource=docs&id=${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    return result.doc;
  }

  static async deleteDoc(id: number): Promise<void> {
    await this.request(`/api/dashboard-data?resource=finance&financeResource=docs&id=${id}`, { method: 'DELETE' });
  }

  static async convertQuote(id: number): Promise<FinanceDocument> {
    const result = await this.request<{ success: boolean; invoice: FinanceDocument }>(`/api/dashboard-data?resource=finance&financeResource=convert&id=${id}`, {
      method: 'POST',
    });
    return result.invoice;
  }

  static async getStatement(clientId: number): Promise<StatementResponse> {
    return this.request(`/api/dashboard-data?resource=finance&financeResource=statement&clientId=${clientId}`);
  }

  static async getStaffHours(start?: string, end?: string): Promise<StaffHoursResponse> {
    const query = new URLSearchParams();
    query.set('resource', 'finance');
    query.set('financeResource', 'staff-hours');
    if (start) query.set('start', start);
    if (end) query.set('end', end);
    return this.request(`/api/dashboard-data?${query.toString()}`);
  }

  static async recalculateStaffHours(start?: string, end?: string): Promise<StaffHoursResponse> {
    const query = new URLSearchParams();
    query.set('resource', 'finance');
    query.set('financeResource', 'staff-hours');
    if (start) query.set('start', start);
    if (end) query.set('end', end);
    return this.request(`/api/dashboard-data?${query.toString()}`, { method: 'POST', body: '{}' });
  }
}
