import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Types
import {
  OperationalEvent,
  OperationalStaff,
  OperationalAlert,
  PendingPayment,
  ActivityItem,
  LiveKPIs,
  KPIMetric,
  Priority,
  EventStatus,
  StaffStatus,
  AlertSeverity,
  ModalType
} from './types/event-system';

// Command System Components
import CommandHeader from './components/command/CommandHeader';
import OperationsSidebar from './components/command/OperationsSidebar';
import OperationsCalendar from './components/command/OperationsCalendar';
import LiveOperationsFeed from './components/command/LiveOperationsFeed';
import FloatingActionButton from './components/command/FloatingActionButton';
import ModalSystem from './components/command/ModalSystem';

// Existing Components (Preserved Functionality)
import EventForm from './components/EventForm';
import EventList from './components/EventList';
import StaffView from './components/StaffView';
import HomePage from './components/HomePage';
import Dashboard from './components/Dashboard';
import Payroll from './pages/Payroll';

// Styles
import './styles/operations-command.css';
import './styles/finance-agent.css';
import './styles/crm-agent.css';

// ==========================================
// SAMPLE DATA FOR DEMONSTRATION
// ==========================================

const generateSampleEvents = (): OperationalEvent[] => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  return [
    {
      id: '1',
      title: 'Luxury Wedding Reception',
      startDate: today,
      endDate: new Date(today.getTime() + 4 * 60 * 60 * 1000),
      duration: 4,
      client: {
        id: 'c1',
        name: 'Emma & James',
        contactPerson: 'Emma Thompson',
        phone: '+1 (555) 123-4567',
        email: 'emma@thompson.com',
        vipStatus: true
      },
      staff: [
        { id: 's1', name: 'John Doe', role: 'Bartender', status: 'CONFIRMED' as StaffStatus, checkInTime: '14:00' },
        { id: 's2', name: 'Jane Smith', role: 'Server', status: 'CONFIRMED' as StaffStatus }
      ],
      venue: {
        id: 'v1',
        name: 'Grand Ballroom',
        address: '123 Luxury Ave',
        city: 'New York',
        capacity: 300,
        tier: 'Luxury Class'
      },
      location: 'Grand Ballroom, New York',
      priority: 'VIP' as Priority,
      status: 'CONFIRMED' as EventStatus,
      description: 'Elegant wedding reception with premium bar service',
      requirements: 'Champagne toast, signature cocktails',
      dressCode: 'Black Tie',
      budget: 15000,
      staffNeeded: 8,
      staffConfirmed: 6,
      isDirectBooking: false,
      source: 'local',
      totalCost: 4800,
      revenue: 15000,
      profit: 10200,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
      createdBy: 'Admin',
      notes: 'VIP client - ensure premium service',
      tags: ['wedding', 'vip', 'luxury']
    },
    {
      id: '2',
      title: 'Corporate Gala',
      startDate: tomorrow,
      endDate: new Date(tomorrow.getTime() + 5 * 60 * 60 * 1000),
      duration: 5,
      client: {
        id: 'c2',
        name: 'TechCorp Inc.',
        contactPerson: 'Michael Chen',
        phone: '+1 (555) 987-6543',
        email: 'michael@techcorp.com',
        vipStatus: false
      },
      staff: [
        { id: 's3', name: 'Mike Wilson', role: 'Mixologist', status: 'ASSIGNED' as StaffStatus }
      ],
      venue: {
        id: 'v2',
        name: 'Skyline Terrace',
        address: '456 Premium Blvd',
        city: 'New York',
        capacity: 200,
        tier: 'Premium Estate'
      },
      location: 'Skyline Terrace, New York',
      priority: 'HIGH' as Priority,
      status: 'SCHEDULED' as EventStatus,
      description: 'Annual corporate gala with cocktail hour',
      requirements: '3 signature cocktails, wine service',
      dressCode: 'Business Formal',
      budget: 12000,
      staffNeeded: 6,
      staffConfirmed: 3,
      isDirectBooking: false,
      source: 'local',
      totalCost: 3600,
      revenue: 12000,
      profit: 8400,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
      createdBy: 'Admin',
      notes: 'Important client - TechCorp annual event',
      tags: ['corporate', 'gala']
    },
    {
      id: '3',
      title: 'Private Yacht Party',
      startDate: nextWeek,
      endDate: new Date(nextWeek.getTime() + 6 * 60 * 60 * 1000),
      duration: 6,
      client: {
        id: 'c3',
        name: 'Alexandra Rhodes',
        contactPerson: 'Alexandra Rhodes',
        phone: '+1 (555) 555-5555',
        email: 'alex@rhodes.com',
        vipStatus: true
      },
      staff: [],
      venue: {
        id: 'v3',
        name: 'Superyacht Majesty',
        address: 'Marina District',
        city: 'Miami',
        capacity: 50,
        tier: 'Superyacht Deck'
      },
      location: 'Marina District, Miami',
      priority: 'VIP' as Priority,
      status: 'PENDING' as EventStatus,
      description: 'Exclusive yacht party with premium bar',
      requirements: 'Full bar, champagne, canapés',
      dressCode: 'Cocktail Attire',
      budget: 25000,
      staffNeeded: 4,
      staffConfirmed: 0,
      isDirectBooking: true,
      source: 'local',
      totalCost: 0,
      revenue: 25000,
      profit: 25000,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'Admin',
      notes: 'VIP yacht party - high priority',
      tags: ['yacht', 'vip', 'exclusive']
    }
  ];
};

const generateSampleStaff = (): OperationalStaff[] => {
  return [
    {
      id: 's1',
      fullName: 'John Doe',
      phone: '+1 (555) 111-2222',
      email: 'john@freshpeople.com',
      role: 'Bartender',
      rate: 35,
      status: 'CHECKED_IN',
      currentEventId: '1',
      checkInTime: new Date(),
      totalHoursThisWeek: 24,
      totalEarningsThisMonth: 3360,
      createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    },
    {
      id: 's2',
      fullName: 'Jane Smith',
      phone: '+1 (555) 222-3333',
      email: 'jane@freshpeople.com',
      role: 'Server',
      rate: 28,
      status: 'ASSIGNED',
      currentEventId: '1',
      totalHoursThisWeek: 20,
      totalEarningsThisMonth: 2240,
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    },
    {
      id: 's3',
      fullName: 'Mike Wilson',
      phone: '+1 (555) 333-4444',
      email: 'mike@freshpeople.com',
      role: 'Mixologist',
      rate: 45,
      status: 'ASSIGNED',
      currentEventId: '2',
      totalHoursThisWeek: 30,
      totalEarningsThisMonth: 5400,
      createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000)
    },
    {
      id: 's4',
      fullName: 'Sarah Johnson',
      phone: '+1 (555) 444-5555',
      email: 'sarah@freshpeople.com',
      role: 'Barista',
      rate: 25,
      status: 'AVAILABLE',
      totalHoursThisWeek: 0,
      totalEarningsThisMonth: 0,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    },
    {
      id: 's5',
      fullName: 'David Brown',
      phone: '+1 (555) 555-6666',
      email: 'david@freshpeople.com',
      role: 'Barback',
      rate: 22,
      status: 'OFF_DUTY',
      totalHoursThisWeek: 32,
      totalEarningsThisMonth: 2816,
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)
    }
  ];
};

const generateSampleAlerts = (): OperationalAlert[] => {
  return [
    {
      id: 'a1',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      severity: 'HIGH' as AlertSeverity,
      title: 'Staff Shortage - Tonight Event',
      message: 'Luxury Wedding Reception needs 2 more staff members',
      relatedEventId: '1',
      isRead: false,
      actionRequired: true,
      actions: [
        { label: 'Dispatch Staff', action: () => console.log('Dispatch'), variant: 'primary' },
        { label: 'Postpone', action: () => console.log('Postpone'), variant: 'secondary' }
      ]
    },
    {
      id: 'a2',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      severity: 'MEDIUM' as AlertSeverity,
      title: 'Payment Pending',
      message: 'Invoice #INV-2024-0042 is 5 days overdue',
      isRead: false,
      actionRequired: true,
      actions: [
        { label: 'Send Reminder', action: () => console.log('Remind'), variant: 'primary' },
        { label: 'Call Client', action: () => console.log('Call'), variant: 'secondary' }
      ]
    },
    {
      id: 'a3',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      severity: 'LOW' as AlertSeverity,
      title: 'Weather Alert',
      message: 'Rain expected tomorrow - Superyacht party may need backup plan',
      relatedEventId: '3',
      isRead: true,
      actionRequired: false
    }
  ];
};

const generateSamplePayments = (): PendingPayment[] => {
  return [
    {
      id: 'p1',
      staffId: 's1',
      staffName: 'John Doe',
      eventId: '1',
      eventTitle: 'Luxury Wedding Reception',
      amount: 560,
      hoursWorked: 16,
      rate: 35,
      status: 'PENDING',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date()
    },
    {
      id: 'p2',
      staffId: 's2',
      staffName: 'Jane Smith',
      eventId: '1',
      eventTitle: 'Luxury Wedding Reception',
      amount: 448,
      hoursWorked: 16,
      rate: 28,
      status: 'PENDING',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date()
    },
    {
      id: 'p3',
      staffId: 's3',
      staffName: 'Mike Wilson',
      eventId: '2',
      eventTitle: 'Corporate Gala',
      amount: 360,
      hoursWorked: 8,
      rate: 45,
      status: 'PROCESSING',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    }
  ];
};

const generateSampleActivity = (): ActivityItem[] => {
  return [
    {
      id: 'act1',
      timestamp: new Date(Date.now() - 10 * 60 * 1000),
      type: 'staff_checkin',
      operator: 'John Doe',
      message: 'John Doe checked in for Luxury Wedding Reception',
      relatedEventId: '1',
      relatedStaffId: 's1',
      isUrgent: false
    },
    {
      id: 'act2',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
      type: 'event_create',
      operator: 'Admin',
      message: 'New event created: Private Yacht Party',
      details: 'VIP client - Alexandra Rhodes',
      relatedEventId: '3',
      isUrgent: true
    },
    {
      id: 'act3',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
      type: 'staff_rsvp',
      operator: 'Jane Smith',
      message: 'Jane Smith confirmed availability for Corporate Gala',
      relatedEventId: '2',
      relatedStaffId: 's2',
      isUrgent: false
    },
    {
      id: 'act4',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
      type: 'payment',
      operator: 'System',
      message: 'Payment of $560 processed for John Doe',
      details: 'Event: Luxury Wedding Reception',
      isUrgent: false
    },
    {
      id: 'act5',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      type: 'sync',
      operator: 'System',
      message: 'iCloud calendar synced successfully',
      isUrgent: false
    }
  ];
};

// ==========================================
// MAIN APP COMPONENT
// ==========================================

function App() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Data State
  const [events, setEvents] = useState<OperationalEvent[]>(generateSampleEvents());
  const [staff, setStaff] = useState<OperationalStaff[]>(generateSampleStaff());
  const [alerts, setAlerts] = useState<OperationalAlert[]>(generateSampleAlerts());
  const [payments, setPayments] = useState<PendingPayment[]>(generateSamplePayments());
  const [activity, setActivity] = useState<ActivityItem[]>(generateSampleActivity());

  // Modal State
  const [activeModal, setActiveModal] = useState<ModalType | null>(null);
  const [modalData, setModalData] = useState<any>(null);

  // KPIs
  const [kpis, setKpis] = useState<LiveKPIs>({
    totalEvents: {
      id: 'total-events',
      label: 'Total Events',
      value: 24,
      change: 12.5,
      trend: 'up',
      icon: '📅',
      color: '#BF8F3B'
    },
    activeStaff: {
      id: 'active-staff',
      label: 'Active Staff',
      value: '18/24',
      change: 8.3,
      trend: 'up',
      icon: '👥',
      color: '#10B981'
    },
    pendingPayments: {
      id: 'pending-payments',
      label: 'Pending Payments',
      value: '$12.4K',
      change: -5.2,
      trend: 'down',
      icon: '💰',
      color: '#EF4444'
    },
    todaysEvents: {
      id: 'todays-events',
      label: "Today's Events",
      value: 3,
      change: 0,
      trend: 'stable',
      icon: '⚡',
      color: '#3B82F6'
    },
    monthlyRevenue: {
      id: 'monthly-revenue',
      label: 'Monthly Revenue',
      value: '$84.2K',
      change: 18.7,
      trend: 'up',
      icon: '📈',
      color: '#8B5CF6'
    },
    utilizationRate: {
      id: 'utilization',
      label: 'Utilization Rate',
      value: '78%',
      change: 4.2,
      trend: 'up',
      icon: '📊',
      color: '#F59E0B'
    }
  });

  // Theme toggle handler
  const handleThemeToggle = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme ? 'dark' : 'light');
    localStorage.setItem('fpcc-theme', newTheme ? 'dark' : 'light');
  };

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('fpcc-theme') || 'dark';
    const isDark = savedTheme === 'dark';
    setIsDarkMode(isDark);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch initial data (preserved from original)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventsRes, staffRes] = await Promise.all([
          fetch('/api/events'),
          fetch('/api/staff')
        ]);

        if (eventsRes.ok) {
          const eventsData = await eventsRes.json();
          // Transform to OperationalEvent format
          console.log('Events fetched:', eventsData);
        }

        if (staffRes.ok) {
          const staffData = await staffRes.json();
          console.log('Staff fetched:', staffData);
        }
      } catch (err) {
        console.error('Failed to fetch initial data:', err);
      }
    };

    fetchData();
  }, [refreshKey]);

  // Get today's schedule
  const todaysSchedule = events.filter(event => {
    const eventDate = new Date(event.startDate).toDateString();
    const today = new Date().toDateString();
    return eventDate === today;
  });

  // Event handlers
  const handleEventClick = (event: OperationalEvent) => {
    console.log('Event clicked:', event);
    setActiveModal('event_details');
    setModalData(event);
  };

  const handleEventCreate = (date: Date, time?: string) => {
    console.log('Create event:', date, time);
    setActiveModal('new_event');
    setModalData({ date, time });
  };

  const handleEventDrop = (eventId: string, newDate: Date) => {
    console.log('Event dropped:', eventId, newDate);
    setEvents(prev => prev.map(e =>
      e.id === eventId
        ? { ...e, startDate: newDate, endDate: new Date(newDate.getTime() + e.duration * 60 * 60 * 1000) }
        : e
    ));
  };

  const handleStaffClick = (staff: OperationalStaff) => {
    console.log('Staff clicked:', staff);
    setActiveModal('staff_details');
    setModalData(staff);
  };

  const handleAlertAction = (alertId: string, action: string) => {
    console.log('Alert action:', alertId, action);
    setAlerts(prev => prev.map(a =>
      a.id === alertId ? { ...a, isRead: true } : a
    ));
  };

  const handlePaymentProcess = (paymentId: string) => {
    console.log('Process payment:', paymentId);
    setPayments(prev => prev.map(p =>
      p.id === paymentId ? { ...p, status: 'PROCESSING' } : p
    ));
  };

  const handleModalSave = (type: ModalType, data: any) => {
    console.log('Modal save:', type, data);

    switch (type) {
      case 'new_event':
        const newEvent: OperationalEvent = {
          id: `event-${Date.now()}`,
          title: data.title,
          startDate: new Date(data.date + 'T' + data.startTime),
          endDate: new Date(data.date + 'T' + data.endTime),
          duration: (new Date(data.date + 'T' + data.endTime).getTime() - new Date(data.date + 'T' + data.startTime).getTime()) / (1000 * 60 * 60),
          client: {
            id: `client-${Date.now()}`,
            name: data.client,
            contactPerson: '',
            phone: '',
            email: '',
            vipStatus: data.priority === 'VIP'
          },
          staff: [],
          venue: {
            id: `venue-${Date.now()}`,
            name: data.venue,
            address: '',
            city: '',
            capacity: 0,
            tier: 'Luxury Class'
          },
          location: data.venue,
          priority: data.priority,
          status: 'SCHEDULED',
          staffNeeded: data.staffNeeded,
          staffConfirmed: 0,
          isDirectBooking: false,
          source: 'local',
          totalCost: 0,
          revenue: 0,
          profit: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'Admin',
          notes: data.notes,
          tags: []
        };
        setEvents(prev => [...prev, newEvent]);
        break;

      case 'new_staff':
        const newStaff: OperationalStaff = {
          id: `staff-${Date.now()}`,
          fullName: data.fullName,
          phone: data.phone,
          email: data.email,
          role: data.role,
          rate: data.rate,
          status: 'AVAILABLE',
          totalHoursThisWeek: 0,
          totalEarningsThisMonth: 0,
          createdAt: new Date()
        };
        setStaff(prev => [...prev, newStaff]);
        break;
    }

    setActiveModal(null);
    setModalData(null);
  };

  const handleFabAction = (action: string, data?: any) => {
    console.log('FAB action:', action, data);
    if (action === 'open_modal' && data?.type) {
      setActiveModal(data.type);
      setModalData(data);
    }
  };

  return (
    <BrowserRouter>
      <div className="operations-command-layout" style={{
        display: 'grid',
        gridTemplateColumns: `${sidebarOpen ? '280px' : '72px'} 1fr ${rightPanelOpen ? '360px' : '0px'}`,
        gridTemplateRows: '80px 1fr',
        gridTemplateAreas: '"header header header" "left-panel center right-panel"',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)'
      }}>
        {/* Ambient Glow Effects */}
        <div className="ambient-glow ambient-glow-1" />
        <div className="ambient-glow ambient-glow-2" />
        <div className="ambient-glow ambient-glow-3" />

        {/* Command Header */}
        <div style={{ gridArea: 'header', zIndex: 100 }}>
          <CommandHeader
            kpis={kpis}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            onToggleTheme={handleThemeToggle}
            isDarkMode={isDarkMode}
            systemStatus="operational"
            currentTime={currentTime}
          />
        </div>

        {/* Left Panel - Operations Sidebar */}
        <div style={{ gridArea: 'left-panel', overflowY: 'auto', zIndex: 50 }}>
          <OperationsSidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            collapsed={!sidebarOpen}
            onToggleCollapse={() => setSidebarOpen(!sidebarOpen)}
          />
        </div>

        {/* Center Panel - Main Workspace */}
        <main style={{
          gridArea: 'center',
          overflowY: 'auto',
          padding: '2rem',
          background: 'var(--bg-primary)'
        }} className="layout-center">
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <Routes>
              {/* Dashboard Route */}
              <Route
                path="/"
                element={
                  <div className="animate-fade-in">
                    <div style={{ marginBottom: '2rem' }}>
                      <h1 style={{
                        fontSize: '2rem',
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, var(--gold-300), var(--gold-500))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        marginBottom: '0.5rem'
                      }}>
                        Executive Dashboard
                      </h1>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        Welcome to Fresh People Command Center
                      </p>
                    </div>

                    {/* KPI Cards */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                      gap: '1.5rem',
                      marginBottom: '2rem'
                    }}>
                      {Object.values(kpis).map(kpi => (
                        <div key={kpi.id} className="glass-card hover-card" style={{
                          padding: '1.5rem',
                          cursor: 'pointer'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <span style={{ fontSize: '1.5rem' }}>{kpi.icon}</span>
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: kpi.trend === 'up' ? '#10B981' : kpi.trend === 'down' ? '#EF4444' : 'var(--text-muted)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}>
                              {kpi.trend === 'up' ? '↑' : kpi.trend === 'down' ? '↓' : '→'} {Math.abs(kpi.change)}%
                            </span>
                          </div>
                          <div style={{
                            fontSize: '1.75rem',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            marginBottom: '0.25rem'
                          }}>
                            {kpi.value}
                          </div>
                          <div style={{
                            fontSize: '0.813rem',
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}>
                            {kpi.label}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Dashboard Content */}
                    <Dashboard />
                  </div>
                }
              />

              {/* Calendar Route - NEW OPERATIONS CALENDAR */}
              <Route
                path="/calendar"
                element={
                  <div className="animate-fade-in">
                    <OperationsCalendar
                      events={events}
                      onEventClick={handleEventClick}
                      onEventCreate={handleEventCreate}
                      onEventDrop={handleEventDrop}
                    />
                  </div>
                }
              />

              {/* Events Route (Preserved) */}
              <Route
                path="/events"
                element={
                  <div className="animate-fade-in">
                    <h1 style={{
                      fontSize: '2rem',
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, var(--gold-300), var(--gold-500))',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      marginBottom: '2rem'
                    }}>
                      Event Management
                    </h1>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                      gap: '1.5rem'
                    }}>
                      <div>
                        <EventForm onEventCreated={() => {
                          setRefreshKey(k => k + 1);
                        }} />
                      </div>
                      <div>
                        <EventList refreshKey={refreshKey} />
                      </div>
                    </div>
                  </div>
                }
              />

              {/* Staff Route (Preserved) */}
              <Route
                path="/staff"
                element={
                  <div className="animate-fade-in">
                    <h1 style={{
                      fontSize: '2rem',
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, var(--gold-300), var(--gold-500))',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      marginBottom: '2rem'
                    }}>
                      Staff Management
                    </h1>
                    <StaffView />
                  </div>
                }
              />

              {/* Payroll Route - Finance Agent */}
              <Route
                path="/payroll"
                element={
                  <div className="animate-fade-in">
                    <Payroll />
                  </div>
                }
              />

              {/* Catch all - redirect to dashboard */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>

        {/* Right Panel - Live Operations Feed */}
        <div style={{ gridArea: 'right-panel', overflowY: 'auto', zIndex: 50 }}>
          <LiveOperationsFeed
            todaysSchedule={todaysSchedule}
            staffStatus={staff}
            alerts={alerts}
            pendingPayments={payments}
            recentActivity={activity}
            onEventClick={handleEventClick}
            onStaffClick={handleStaffClick}
            onAlertAction={handleAlertAction}
            onPaymentProcess={handlePaymentProcess}
            collapsed={!rightPanelOpen}
            onToggleCollapse={() => setRightPanelOpen(!rightPanelOpen)}
          />
        </div>

        {/* Floating Action Button */}
        <FloatingActionButton
          onAction={handleFabAction}
          position="bottom-right"
        />

        {/* Modal System */}
        <ModalSystem
          activeModal={activeModal}
          modalData={modalData}
          onClose={() => {
            setActiveModal(null);
            setModalData(null);
          }}
          onSave={handleModalSave}
        />
      </div>
    </BrowserRouter>
  );
}

export default App;
