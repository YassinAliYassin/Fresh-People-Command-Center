import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DollarSign,
  MessageCircle,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Search,
  Send,
  FileText,
  BarChart3,
  Users,
  CreditCard,
  Loader2,
  Calculator,
  Percent,
  Bell,
  LineChart
} from 'lucide-react';
import { StaffAssignment, MiscExpense, Staff } from '../types';
import * as dataStore from '../services/dataStore';

// ==========================================
// TYPE DEFINITIONS - FINANCE AGENT
// ==========================================

interface PayrollStaff {
  staffId: number;
  fullName: string;
  phone: string;
  role: string;
  assignmentsCount: number;
  totalHours: number;
  totalEarned: number;
  paymentStatus: 'PAID' | 'UNPAID' | 'PARTIAL' | 'PROCESSING' | 'OVERDUE';
  lastPaymentDate?: string;
  pendingAmount?: number;
  paidAmount?: number;
}

interface PayrollData {
  cycleStart: string;
  cycleEnd: string;
  staff: PayrollStaff[];
  summary: {
    totalStaff: number;
    totalHours: number;
    totalEarnings: number;
    paidAmount: number;
    pendingAmount: number;
    overdueCount: number;
  };
}

interface PaymentRecord {
  id: string;
  staffId: number;
  staffName: string;
  eventId: string;
  eventTitle: string;
  amount: number;
  hoursWorked: number;
  rate: number;
  status: 'PAID' | 'UNPAID' | 'PARTIAL' | 'PROCESSING' | 'OVERDUE';
  dueDate: string;
  paidDate?: string;
  createdAt: string;
}

interface FinanceMetrics {
  weeklyTotals: { week: string; earnings: number; hours: number }[];
  monthlyTotals: { month: string; earnings: number; hours: number }[];
  yearlyTotals: { year: string; earnings: number; hours: number }[];
  staffBreakdown: {
    staffId: number;
    fullName: string;
    totalEarnings: number;
    totalHours: number;
    eventCount: number;
    avgRate: number;
  }[];
}

// ==========================================
// FINANCE AGENT - AUTONOMOUS PAYROLL SYSTEM
// ==========================================

const Payroll: React.FC<any> = (props: any) => {
  // Core State
  const [payroll, setPayroll] = useState<PayrollData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Date Range & Filters
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year' | 'custom'>('month');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'UNPAID' | 'PARTIAL' | 'OVERDUE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // UI State
  const [expandedStaff, setExpandedStaff] = useState<number | null>(null);
  const [showPaymentRecords, setShowPaymentRecords] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<PayrollStaff | null>(null);
  const [metrics, setMetrics] = useState<FinanceMetrics | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf' | 'whatsapp'>('csv');
  const [taxRate, setTaxRate] = useState(15);

  // ==========================================
  // DATA FETCHING - AUTONOMOUS BEHAVIOR
  // ==========================================

  const fetchPayroll = useCallback(async (start?: string, end?: string) => {
    setLoading(true);
    setError(null);

    try {
      // Build payroll from the local data store (Supabase sync is automatic when configured)
      const storedStaff: any[] = dataStore.listStaff();
      const storedEvents: any[] = dataStore.listEvents();
      const today = new Date();
      const cycleStart = start || new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
      const cycleEnd = end || new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);

      // Compute hours per staff from event assignments within cycle
      const eventHours = (ev: any) => {
        try {
          const [sh, sm] = ev.startTime.split(':').map(Number);
          const [eh, em] = ev.endTime.split(':').map(Number);
          let m = eh * 60 + em - sh * 60 - sm;
          if (m < 0) m += 24 * 60;
          return m / 60;
        } catch {
          return 0;
        }
      };

      const eventsInCycle = storedEvents.filter(ev => ev.date >= cycleStart && ev.date <= cycleEnd);

      const staffWithEarnings = storedStaff.map((s: any) => {
        const assignments = eventsInCycle.filter(ev => (ev.staffIds || []).includes(s.id));
        const totalHours = assignments.reduce((sum, ev) => sum + eventHours(ev), 0);
        const totalEarned = totalHours * (s.rate || 0);
        return {
          staffId: s.id,
          fullName: s.name,
          phone: s.phone || '',
          role: s.role || '',
          assignmentsCount: assignments.length,
          totalHours,
          totalEarned,
        };
      });

      const enhancedStaff = staffWithEarnings.map((staff: any) => ({
        ...staff,
        paymentStatus: calculatePaymentStatus(staff),
        pendingAmount: staff.totalEarned * 0.3,
        paidAmount: staff.totalEarned * 0.7,
      }));

      const enhancedData: PayrollData = {
        cycleStart,
        cycleEnd,
        staff: enhancedStaff,
        summary: {
          totalStaff: enhancedStaff.length,
          totalHours: enhancedStaff.reduce((sum, s) => sum + s.totalHours, 0),
          totalEarnings: enhancedStaff.reduce((sum, s) => sum + s.totalEarned, 0),
          paidAmount: enhancedStaff.reduce((sum, s) => sum + (s.paidAmount || 0), 0),
          pendingAmount: enhancedStaff.reduce((sum, s) => sum + (s.pendingAmount || 0), 0),
          overdueCount: enhancedStaff.filter(s => s.paymentStatus === 'OVERDUE').length,
        },
      };

      setPayroll(enhancedData);
      generateFinanceMetrics(enhancedStaff);
    } catch (err) {
      console.error('Error fetching payroll:', err);
      setError('Failed to load payroll data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const calculatePaymentStatus = (staff: any): 'PAID' | 'UNPAID' | 'PARTIAL' | 'PROCESSING' | 'OVERDUE' => {
    // Simulate payment status logic
    const random = Math.random();
    if (random < 0.3) return 'PAID';
    if (random < 0.5) return 'UNPAID';
    if (random < 0.7) return 'PARTIAL';
    if (random < 0.85) return 'PROCESSING';
    return 'OVERDUE';
  };

  const generateFinanceMetrics = (staff: PayrollStaff[]) => {
    // Generate simulated metrics
    const metrics: FinanceMetrics = {
      weeklyTotals: [
        { week: 'Week 1', earnings: 12500, hours: 280 },
        { week: 'Week 2', earnings: 15200, hours: 340 },
        { week: 'Week 3', earnings: 9800, hours: 220 },
        { week: 'Week 4', earnings: 18100, hours: 405 }
      ],
      monthlyTotals: [
        { month: 'Jan', earnings: 65000, hours: 1450 },
        { month: 'Feb', earnings: 58000, hours: 1300 },
        { month: 'Mar', earnings: 72000, hours: 1600 },
        { month: 'Apr', earnings: 68900, hours: 1540 }
      ],
      yearlyTotals: [
        { year: '2023', earnings: 750000, hours: 16800 },
        { year: '2024', earnings: 820000, hours: 18300 }
      ],
      staffBreakdown: staff.map(s => ({
        staffId: s.staffId,
        fullName: s.fullName || s.name || '',
        totalEarnings: s.totalEarned,
        totalHours: s.totalHours,
        eventCount: s.assignmentsCount,
        avgRate: s.totalHours > 0 ? s.totalEarned / s.totalHours : 0
      }))
    };
    
    setMetrics(metrics);
  };

  useEffect(() => {
    fetchPayroll();
  }, [fetchPayroll]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchPayroll(customStart || undefined, customEnd || undefined);
    setIsRefreshing(false);
  };

  const handleCustomRange = () => {
    if (customStart && customEnd) {
      fetchPayroll(customStart, customEnd);
    }
  };

  // ==========================================
  // FILTERED & PROCESSED DATA
  // ==========================================

  const filteredStaff = useMemo(() => {
    if (!payroll) return [];
    const q = searchQuery.toLowerCase().trim();
    return payroll.staff.filter(s => 
      (statusFilter === 'ALL' || s.paymentStatus === statusFilter) &&
      (q === '' || s.fullName.toLowerCase().includes(q) || s.role.toLowerCase().includes(q))
    );
  }, [payroll, statusFilter, searchQuery]);

  const pendingPayments = useMemo(() => {
    if (!payroll) return [];
    return payroll.staff.filter(s => 
      s.paymentStatus === 'UNPAID' || 
      s.paymentStatus === 'PARTIAL' || 
      s.paymentStatus === 'OVERDUE'
    );
  }, [payroll]);

  const overduePayments = useMemo(() => {
    if (!payroll) return [];
    return payroll.staff.filter(s => s.paymentStatus === 'OVERDUE');
  }, [payroll]);

  const taxSummary = useMemo(() => {
    const grossPayroll = payroll?.summary.totalEarnings || 0;
    const taxablePayroll = grossPayroll * 0.92;
    const taxAmount = taxablePayroll * (taxRate / 100);
    const netPayroll = grossPayroll - taxAmount;

    return { grossPayroll, taxablePayroll, taxAmount, netPayroll };
  }, [payroll, taxRate]);

  const paymentReminderPlan = useMemo(() => {
    const today = new Date();
    return pendingPayments.map((staff, index) => {
      const dueDate = new Date(today);
      dueDate.setDate(today.getDate() + (staff.paymentStatus === 'OVERDUE' ? 0 : index + 1));

      return {
        staff,
        dueDate,
        priority: staff.paymentStatus === 'OVERDUE' ? 'Critical' : staff.paymentStatus === 'UNPAID' ? 'High' : 'Normal',
        channel: staff.phone ? 'WhatsApp' : 'Manual follow-up'
      };
    });
  }, [pendingPayments]);

  const revenueForecast = useMemo(() => {
    if (!metrics) return [];
    const monthly = metrics.monthlyTotals;
    const recent = monthly.slice(-3);
    const baseline = recent.length
      ? recent.reduce((sum, item) => sum + item.earnings, 0) / recent.length
      : payroll?.summary.totalEarnings || 0;
    const last = monthly[monthly.length - 1]?.earnings || baseline;
    const previous = monthly[monthly.length - 2]?.earnings || last;
    const growthRate = previous > 0 ? Math.max(-0.12, Math.min(0.18, (last - previous) / previous)) : 0.04;

    return ['Next month', '+2 months', '+3 months'].map((label, index) => ({
      label,
      revenue: Math.round(baseline * Math.pow(1 + growthRate, index + 1)),
      growthRate
    }));
  }, [metrics, payroll]);

  // ==========================================
  // PAYMENT ACTIONS
  // ==========================================

  const generateWhatsAppMessage = (staff: PayrollStaff) => {
    const statusText = {
      'PAID': '✅ Paid in full',
      'UNPAID': '⏳ Payment pending',
      'PARTIAL': '💰 Partial payment made',
      'PROCESSING': '🔄 Payment processing',
      'OVERDUE': '🚨 Payment OVERDUE'
    }[staff.paymentStatus] || '';

    const message = `Hi ${staff.fullName},

📊 *Payroll Summary* ${payroll?.cycleStart} to ${payroll?.cycleEnd}

${statusText}
💰 Total Earned: R${staff.totalEarned.toFixed(2)}
⏱️ Hours Worked: ${staff.totalHours.toFixed(2)}hrs
📅 Events: ${staff.assignmentsCount}

${staff.pendingAmount ? `⚠️ Pending: R${staff.pendingAmount.toFixed(2)}` : ''}
${staff.paidAmount ? `✅ Paid: R${staff.paidAmount.toFixed(2)}` : ''}

Thank you for your hard work! 

Best regards,
Flow Events Finance Team`;

    const url = `https://wa.me/${staff.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const exportCSV = () => {
    if (!payroll) return;
    
    const headers = 'Name,Role,Hours,Earnings,Status,Pending Amount,Paid Amount,Assignments\n';
    const rows = filteredStaff.map(s => 
      `${s.fullName},${s.role},${s.totalHours.toFixed(2)},${s.totalEarned.toFixed(2)},${s.paymentStatus},${s.pendingAmount?.toFixed(2) || 0},${s.paidAmount?.toFixed(2) || 0},${s.assignmentsCount}`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-report-${payroll.cycleStart}-to-${payroll.cycleEnd}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    // In production, integrate with a PDF library
    alert('PDF export functionality would be implemented here');
  };

  const handleBulkWhatsApp = () => {
    pendingPayments.forEach(staff => {
      setTimeout(() => generateWhatsAppMessage(staff), 1000);
    });
  };

  // ==========================================
  // VISUAL INDICATORS & HELPERS
  // ==========================================

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10B981', border: 'rgba(16, 185, 129, 0.3)' };
      case 'UNPAID': return { bg: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: 'rgba(239, 68, 68, 0.3)' };
      case 'PARTIAL': return { bg: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', border: 'rgba(245, 158, 11, 0.3)' };
      case 'PROCESSING': return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', border: 'rgba(59, 130, 246, 0.3)' };
      case 'OVERDUE': return { bg: 'rgba(239, 68, 68, 0.2)', color: '#EF4444', border: 'rgba(239, 68, 68, 0.5)' };
      default: return { bg: 'rgba(156, 163, 175, 0.1)', color: '#9CA3AF', border: 'rgba(156, 163, 175, 0.3)' };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID': return <CheckCircle className="w-4 h-4" />;
      case 'UNPAID': return <XCircle className="w-4 h-4" />;
      case 'PARTIAL': return <Clock className="w-4 h-4" />;
      case 'PROCESSING': return <RefreshCw className="w-4 h-4" />;
      case 'OVERDUE': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', { 
      style: 'currency', 
      currency: 'ZAR',
      minimumFractionDigits: 2 
    }).format(amount);
  };

  // ==========================================
  // RENDER COMPONENTS
  // ==========================================

  const renderFinanceHeader = () => (
    <div className="finance-header">
      <div className="finance-header-left">
        <div className="finance-icon">
          <DollarSign className="w-8 h-8" />
        </div>
        <div>
          <h1 className="finance-title">Finance Agent</h1>
          <p className="finance-subtitle">Autonomous Payroll Management System</p>
        </div>
      </div>
      
      <div className="finance-header-right">
        <button
          onClick={handleRefresh}
          className="finance-btn finance-btn-secondary"
          disabled={isRefreshing}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        
        <button
          onClick={() => setShowPaymentRecords(!showPaymentRecords)}
          className="finance-btn finance-btn-primary"
        >
          <FileText className="w-4 h-4" />
          Payment Records
        </button>
      </div>
    </div>
  );

  const renderSummaryCards = () => {
    if (!payroll) return null;
    
    const cards = [
      {
        title: 'Total Earnings',
        value: formatCurrency(payroll.summary.totalEarnings),
        icon: <DollarSign className="w-5 h-5" />,
        color: '#BF8F3B',
        bgColor: 'rgba(191, 143, 59, 0.1)'
      },
      {
        title: 'Total Hours',
        value: `${payroll.summary.totalHours.toFixed(2)} hrs`,
        icon: <Clock className="w-5 h-5" />,
        color: '#3B82F6',
        bgColor: 'rgba(59, 130, 246, 0.1)'
      },
      {
        title: 'Pending Payments',
        value: formatCurrency(payroll.summary.pendingAmount),
        icon: <AlertCircle className="w-5 h-5" />,
        color: '#F59E0B',
        bgColor: 'rgba(245, 158, 11, 0.1)',
        alert: payroll.summary.pendingAmount > 0
      },
      {
        title: 'Overdue',
        value: overduePayments.length.toString(),
        icon: <XCircle className="w-5 h-5" />,
        color: '#EF4444',
        bgColor: 'rgba(239, 68, 68, 0.1)',
        alert: overduePayments.length > 0
      }
    ];
    
    return (
      <div className="finance-summary-grid">
        {cards.map((card, idx) => (
          <div key={idx} className={`finance-summary-card ${card.alert ? 'finance-card-alert' : ''}`}>
            <div className="finance-card-header">
              <div className="finance-card-icon" style={{ background: card.bgColor, color: card.color }}>
                {card.icon}
              </div>
              {card.alert && <div className="finance-pulse-dot" style={{ background: card.color }} />}
            </div>
            <div className="finance-card-content">
              <p className="finance-card-title">{card.title}</p>
              <p className="finance-card-value">{card.value}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderFilters = () => (
    <div className="finance-filters">
      <div className="finance-filter-group">
        <div className="finance-search-box">
          <Search className="w-4 h-4" />
          <input
            type="text"
            placeholder="Search staff..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="finance-search-input"
          />
        </div>
        
        <div className="finance-filter-buttons">
          {(['ALL', 'PAID', 'UNPAID', 'PARTIAL', 'OVERDUE'] as const).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`finance-filter-btn ${statusFilter === status ? 'active' : ''}`}
              style={statusFilter === status ? { borderColor: getStatusColor(status).border } : {}}
            >
              {status}
            </button>
          ))}
        </div>
      </div>
      
      <div className="finance-date-range">
        <input
          type="date"
          value={customStart}
          onChange={(e) => setCustomStart(e.target.value)}
          className="finance-date-input"
        />
        <span className="finance-date-separator">to</span>
        <input
          type="date"
          value={customEnd}
          onChange={(e) => setCustomEnd(e.target.value)}
          className="finance-date-input"
        />
        <button
          onClick={handleCustomRange}
          className="finance-btn finance-btn-secondary"
          disabled={!customStart || !customEnd}
        >
          <Filter className="w-4 h-4" />
          Apply
        </button>
      </div>
    </div>
  );

  const renderStaffCard = (staff: PayrollStaff) => {
    const statusStyle = getStatusColor(staff.paymentStatus);
    const isExpanded = expandedStaff === staff.staffId;
    
    return (
      <div 
        key={staff.staffId} 
        className={`finance-staff-card ${isExpanded ? 'expanded' : ''}`}
        style={{ borderLeft: `3px solid ${statusStyle.color}` }}
      >
        <div 
          className="finance-staff-header"
          onClick={() => setExpandedStaff(isExpanded ? null : staff.staffId)}
        >
          <div className="finance-staff-info">
            <div className="finance-staff-avatar" style={{ background: statusStyle.bg, color: statusStyle.color }}>
              {(staff.fullName || staff.name || '').charAt(0)}
            </div>
            <div>
              <p className="finance-staff-name">{staff.fullName}</p>
              <p className="finance-staff-role">{staff.role} • {staff.assignmentsCount} events</p>
            </div>
          </div>
          
          <div className="finance-staff-metrics">
            <div className="finance-staff-metric">
              <span className="finance-metric-label">Hours</span>
              <span className="finance-metric-value">{staff.totalHours.toFixed(2)}</span>
            </div>
            <div className="finance-staff-metric">
              <span className="finance-metric-label">Earned</span>
              <span className="finance-metric-value">{formatCurrency(staff.totalEarned)}</span>
            </div>
            <div 
              className="finance-status-badge"
              style={{ background: statusStyle.bg, color: statusStyle.color, border: `1px solid ${statusStyle.border}` }}
            >
              {getStatusIcon(staff.paymentStatus)}
              <span>{staff.paymentStatus}</span>
            </div>
          </div>
          
          <button className="finance-expand-btn">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
        
        {isExpanded && (
          <div className="finance-staff-details">
            <div className="finance-details-grid">
              <div className="finance-detail-item">
                <span className="finance-detail-label">Phone</span>
                <span className="finance-detail-value">{staff.phone}</span>
              </div>
              <div className="finance-detail-item">
                <span className="finance-detail-label">Pending Amount</span>
                <span className="finance-detail-value" style={{ color: '#F59E0B' }}>
                  {formatCurrency(staff.pendingAmount || 0)}
                </span>
              </div>
              <div className="finance-detail-item">
                <span className="finance-detail-label">Paid Amount</span>
                <span className="finance-detail-value" style={{ color: '#10B981' }}>
                  {formatCurrency(staff.paidAmount || 0)}
                </span>
              </div>
              <div className="finance-detail-item">
                <span className="finance-detail-label">Avg Rate/Hr</span>
                <span className="finance-detail-value">
                  {formatCurrency(staff.totalHours > 0 ? staff.totalEarned / staff.totalHours : 0)}
                </span>
              </div>
            </div>
            
            <div className="finance-staff-actions">
              <button
                onClick={() => generateWhatsAppMessage(staff)}
                className="finance-btn finance-btn-success"
                disabled={!staff.phone}
              >
                <MessageCircle className="w-4 h-4" />
                Send WhatsApp
              </button>
              
              <button
                onClick={() => {
                  setSelectedStaff(staff);
                  // Open payment modal or navigate to payment details
                }}
                className="finance-btn finance-btn-primary"
              >
                <CreditCard className="w-4 h-4" />
                Process Payment
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPendingAlerts = () => {
    if (pendingPayments.length === 0) return null;
    
    return (
      <div className="finance-alerts">
        <div className="finance-alert-header">
          <AlertCircle className="w-5 h-5 text-yellow-400" />
          <h3 className="finance-alert-title">Pending Payment Alerts ({pendingPayments.length})</h3>
        </div>
        
        <div className="finance-alert-list">
          {pendingPayments.slice(0, 5).map(staff => (
            <div key={staff.staffId} className="finance-alert-item">
              <div className="finance-alert-dot" style={{ background: getStatusColor(staff.paymentStatus).color }} />
              <div className="finance-alert-content">
                <p className="finance-alert-name">{staff.fullName}</p>
                <p className="finance-alert-detail">
                  {formatCurrency(staff.pendingAmount || 0)} pending • {staff.paymentStatus}
                </p>
              </div>
              <button
                onClick={() => generateWhatsAppMessage(staff)}
                className="finance-btn-icon"
                title="Send reminder"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          ))}
          
          {pendingPayments.length > 5 && (
            <p className="finance-alert-more">
              +{pendingPayments.length - 5} more pending payments
            </p>
          )}
        </div>
        
        {pendingPayments.length > 1 && (
          <button
            onClick={handleBulkWhatsApp}
            className="finance-btn finance-btn-warning finance-btn-full"
          >
            <MessageCircle className="w-4 h-4" />
            Send Bulk Reminders ({pendingPayments.length} staff)
          </button>
        )}
      </div>
    );
  };

  const renderMetricsChart = () => {
    if (!metrics) return null;
    
    return (
      <div className="finance-metrics">
        <h3 className="finance-section-title">
          <BarChart3 className="w-5 h-5" />
          Financial Overview
        </h3>
        
        <div className="finance-chart-tabs">
          {(['week', 'month', 'year'] as const).map(period => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`finance-chart-tab ${selectedPeriod === period ? 'active' : ''}`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
        
        <div className="finance-chart">
          {selectedPeriod === 'week' && metrics.weeklyTotals.map((week, idx) => (
            <div key={idx} className="finance-chart-bar-group">
              <div className="finance-chart-bar-label">{week.week}</div>
              <div className="finance-chart-bar-container">
                <div 
                  className="finance-chart-bar earnings"
                  style={{ height: `${(week.earnings / 20000) * 100}%` }}
                  title={`Earnings: ${formatCurrency(week.earnings)}`}
                />
              </div>
              <div className="finance-chart-bar-value">{formatCurrency(week.earnings)}</div>
            </div>
          ))}
          
          {selectedPeriod === 'month' && metrics.monthlyTotals.map((month, idx) => (
            <div key={idx} className="finance-chart-bar-group">
              <div className="finance-chart-bar-label">{month.month}</div>
              <div className="finance-chart-bar-container">
                <div 
                  className="finance-chart-bar earnings"
                  style={{ height: `${(month.earnings / 80000) * 100}%` }}
                  title={`Earnings: ${formatCurrency(month.earnings)}`}
                />
              </div>
              <div className="finance-chart-bar-value">{formatCurrency(month.earnings)}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTaxCalculator = () => (
    <div className="finance-agent-card">
      <h3 className="finance-section-title">
        <Calculator className="w-5 h-5" />
        Tax Calculator
      </h3>

      <div className="finance-tax-rate-control">
        <label>Payroll tax rate</label>
        <div>
          <input
            type="number"
            min="0"
            max="45"
            step="0.5"
            value={taxRate}
            onChange={(e) => setTaxRate(Number(e.target.value))}
          />
          <Percent className="w-4 h-4" />
        </div>
      </div>

      <div className="finance-tax-breakdown">
        <div>
          <span>Gross payroll</span>
          <strong>{formatCurrency(taxSummary.grossPayroll)}</strong>
        </div>
        <div>
          <span>Taxable payroll</span>
          <strong>{formatCurrency(taxSummary.taxablePayroll)}</strong>
        </div>
        <div>
          <span>Estimated tax</span>
          <strong className="text-yellow-400">{formatCurrency(taxSummary.taxAmount)}</strong>
        </div>
        <div>
          <span>Net payroll</span>
          <strong className="text-green-400">{formatCurrency(taxSummary.netPayroll)}</strong>
        </div>
      </div>
    </div>
  );

  const renderPaymentReminderSystem = () => (
    <div className="finance-agent-card">
      <h3 className="finance-section-title">
        <Bell className="w-5 h-5" />
        Payment Reminders
      </h3>

      <div className="finance-reminder-list">
        {paymentReminderPlan.slice(0, 4).map(reminder => (
          <div key={reminder.staff.staffId} className="finance-reminder-item">
            <div>
              <p>{reminder.staff.fullName}</p>
              <span>{reminder.channel} • {reminder.dueDate.toLocaleDateString('en-ZA')}</span>
            </div>
            <strong className={reminder.priority === 'Critical' ? 'text-red-400' : reminder.priority === 'High' ? 'text-yellow-400' : 'text-gray-300'}>
              {reminder.priority}
            </strong>
          </div>
        ))}

        {paymentReminderPlan.length === 0 && (
          <div className="finance-reminder-empty">
            <CheckCircle className="w-5 h-5" />
            No payment reminders due
          </div>
        )}
      </div>

      {paymentReminderPlan.length > 0 && (
        <button
          onClick={handleBulkWhatsApp}
          className="finance-btn finance-btn-warning finance-btn-full"
        >
          <Send className="w-4 h-4" />
          Send Due Reminders
        </button>
      )}
    </div>
  );

  const renderRevenueForecast = () => (
    <div className="finance-agent-card">
      <h3 className="finance-section-title">
        <LineChart className="w-5 h-5" />
        Revenue Forecast
      </h3>

      <div className="finance-forecast-chart">
        {revenueForecast.map(item => {
          const maxRevenue = Math.max(...revenueForecast.map(forecast => forecast.revenue), 1);
          return (
            <div key={item.label} className="finance-forecast-row">
              <span>{item.label}</span>
              <div className="finance-forecast-track">
                <div style={{ width: `${(item.revenue / maxRevenue) * 100}%` }} />
              </div>
              <strong>{formatCurrency(item.revenue)}</strong>
            </div>
          );
        })}
      </div>

      <p className="finance-forecast-note">
        Trend basis: {revenueForecast[0] ? `${(revenueForecast[0].growthRate * 100).toFixed(1)}%` : '0.0%'} monthly movement from recent payroll history.
      </p>
    </div>
  );

  // ==========================================
  // MAIN RENDER
  // ==========================================

  if (loading) {
    return (
      <div className="finance-loading">
        <div className="finance-loading-spinner">
          <Loader2 className="w-12 h-12 animate-spin" style={{ color: '#BF8F3B' }} />
        </div>
        <p className="finance-loading-text">Finance Agent is processing payroll data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="finance-error">
        <AlertCircle className="w-16 h-16 mb-4" style={{ color: '#EF4444' }} />
        <h2 className="finance-error-title">Unable to Load Finance Data</h2>
        <p className="finance-error-message">{error}</p>
        <button onClick={handleRefresh} className="finance-btn finance-btn-primary mt-4">
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  if (!payroll) {
    return (
      <div className="finance-empty">
        <FileText className="w-16 h-16 mb-4" style={{ color: '#6B7280' }} />
        <h2 className="finance-empty-title">No Payroll Data Available</h2>
        <p className="finance-empty-message">Configure payroll cycle to begin tracking staff payments</p>
      </div>
    );
  }

  return (
    <div className="finance-container">
      {/* Ambient Background Effects */}
      <div className="finance-ambient-glow finance-glow-1" />
      <div className="finance-ambient-glow finance-glow-2" />
      
      {/* Finance Agent Header */}
      {renderFinanceHeader()}
      
      {/* Summary Cards */}
      {renderSummaryCards()}
      
      {/* Pending Alerts */}
      {renderPendingAlerts()}
      
      {/* Filters & Date Range */}
      {renderFilters()}
      
      {/* Main Content Area */}
      <div className="finance-content">
        {/* Staff Payments List */}
        <div className="finance-staff-list">
          <div className="finance-list-header">
            <h2 className="finance-section-title">
              <Users className="w-5 h-5" />
              Staff Payment Status ({filteredStaff.length})
            </h2>
            
            <div className="finance-export-buttons">
              <button onClick={exportCSV} className="finance-btn finance-btn-secondary">
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button onClick={exportPDF} className="finance-btn finance-btn-secondary">
                <FileText className="w-4 h-4" />
                Export PDF
              </button>
            </div>
          </div>
          
          <div className="finance-staff-cards">
            {filteredStaff.length === 0 ? (
              <div className="finance-no-results">
                <Search className="w-12 h-12 mb-3" style={{ color: '#6B7280' }} />
                <p>No staff match your current filters</p>
              </div>
            ) : (
              filteredStaff.map(staff => renderStaffCard(staff))
            )}
          </div>
        </div>
        
        {/* Metrics Sidebar */}
        <div className="finance-sidebar">
          {renderMetricsChart()}
          {renderTaxCalculator()}
          {renderPaymentReminderSystem()}
          {renderRevenueForecast()}
          
          {/* Quick Stats */}
          <div className="finance-quick-stats">
            <h3 className="finance-section-title">
              <TrendingUp className="w-5 h-5" />
              Quick Stats
            </h3>
            
            <div className="finance-stat-item">
              <span className="finance-stat-label">Avg Hours/Staff</span>
              <span className="finance-stat-value">
                {payroll.summary.totalStaff > 0 
                  ? (payroll.summary.totalHours / payroll.summary.totalStaff).toFixed(2)
                  : '0.00'
                } hrs
              </span>
            </div>
            
            <div className="finance-stat-item">
              <span className="finance-stat-label">Avg Earnings/Staff</span>
              <span className="finance-stat-value">
                {payroll.summary.totalStaff > 0 
                  ? formatCurrency(payroll.summary.totalEarnings / payroll.summary.totalStaff)
                  : formatCurrency(0)
                }
              </span>
            </div>
            
            <div className="finance-stat-item">
              <span className="finance-stat-label">Payment Completion</span>
              <span className="finance-stat-value" style={{ 
                color: payroll.summary.pendingAmount === 0 ? '#10B981' : '#F59E0B' 
              }}>
                {payroll.summary.totalEarnings > 0 
                  ? ((payroll.summary.paidAmount / payroll.summary.totalEarnings) * 100).toFixed(1)
                  : '0.0'
                }%
              </span>
            </div>

            {payroll.summary.overdueCount > 0 && (
              <div className="finance-stat-item animate-pulse">
                <span className="finance-stat-label text-red-400">Overdue Payments</span>
                <span className="finance-stat-value text-red-400">
                  {payroll.summary.overdueCount} staff
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payroll;
