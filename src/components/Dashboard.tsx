import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Calendar, Users, UserCog, Combine, Clock, MessageSquare, MapPin, User, FileText,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Activity, DollarSign,
  BarChart3, PieChart, ArrowUpRight, ArrowDownRight, Bell, RefreshCw, Zap,
  ChevronRight, Info, Target, Globe, Timer, Sparkles, Brain, Shield
} from 'lucide-react';
import UnifiedCalendarView from './Calendar/UnifiedView';

// Import full Apple Calendar events (1457 events from iCloud feed)
import appleCalendarEvents from '../data/apple-calendar-events.json';

// Firebase & Google Calendar integration
import { googleSignIn, getAccessToken, logoutGoogle, initAuth } from '../lib/firebase';
import { fetchGoogleCalendarEvents } from '../lib/googleCalendar';

// Types
interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  balance: number;
}

interface Venue {
  id: string;
  name: string;
  address: string;
}

interface Staff {
  id: string;
  name: string;
  role: 'individual' | 'specialist';
  phone: string;
  hourlyRate: number;
}

interface Event {
  id: string;
  title: string;
  clientId: string;
  venueId: string;
  date: string;
  startTime: string;
  endTime: string;
  staffIds: string[];
  notes: string;
  status: 'Confirmed' | 'Pending' | 'Cancelled';
}

interface ActivityLog {
  id: string;
  action: string;
  timestamp: Date;
  user: string;
}

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

interface KPITrend {
  value: number;
  direction: 'up' | 'down' | 'stable';
  label: string;
}

interface ExecutiveInsight {
  id: string;
  type: 'alert' | 'opportunity' | 'milestone' | 'recommendation';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action?: string;
  timestamp: Date;
}

const Dashboard: React.FC = () => {
  // ==================== AGENT IDENTITY & BRANDING ====================
  const [agentStatus, setAgentStatus] = useState<'active' | 'analyzing' | 'alert'>('active');
  const [lastAnalysis, setLastAnalysis] = useState<Date>(new Date());
  
  // ==================== SESSION & TIMING ====================
  const [sessionTimeLeft, setSessionTimeLeft] = useState('4h 00m 00s');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live clock update every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  // ==================== DATA STATES ====================
  const [clients, setClients] = useState<Client[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [events, setEventsState] = useState<Event[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [dataRefreshInterval, setDataRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  
  // ==================== KPI TRENDS & ANALYTICS ====================
  const [kpiTrends, setKpiTrends] = useState<{
    revenue: KPITrend;
    events: KPITrend;
    clients: KPITrend;
    staff: KPITrend;
  }>({
    revenue: { value: 12.5, direction: 'up', label: 'vs last month' },
    events: { value: 8.3, direction: 'up', label: 'vs last week' },
    clients: { value: 5.2, direction: 'up', label: 'new this month' },
    staff: { value: 2.1, direction: 'stable', label: 'utilization rate' }
  });
  
  // ==================== EXECUTIVE INSIGHTS ====================
  const [executiveInsights, setExecutiveInsights] = useState<ExecutiveInsight[]>([
    {
      id: '1',
      type: 'opportunity',
      priority: 'high',
      title: 'Revenue Growth Detected',
      description: 'Client booking rate increased 12.5% this month. Consider expanding specialist roster.',
      action: 'View Recommendations',
      timestamp: new Date()
    },
    {
      id: '2',
      type: 'alert',
      priority: 'critical',
      title: 'Calendar Sync Required',
      description: 'Google Calendar not synced for 2 hours. 3 pending events may be affected.',
      action: 'Sync Now',
      timestamp: new Date(Date.now() - 300000)
    },
    {
      id: '3',
      type: 'milestone',
      priority: 'medium',
      title: 'Monthly Target Within Reach',
      description: '87% of monthly revenue target achieved. 3 days remaining.',
      action: 'View Details',
      timestamp: new Date(Date.now() - 600000)
    }
  ]);
  
  // ==================== FILTERED DATA ====================
  const filteredClients = useMemo(() => 
    (Array.isArray(clients) ? clients : []).filter(c => 
      c.name?.toLowerCase().includes(searchQuery.toLowerCase())
    ), [clients, searchQuery]
  );
  
  const filteredVenues = useMemo(() => 
    (Array.isArray(venues) ? venues : []).filter(v => 
      v.name?.toLowerCase().includes(searchQuery.toLowerCase())
    ), [venues, searchQuery]
  );
  
  const filteredStaff = useMemo(() => 
    (Array.isArray(staff) ? staff : []).filter(s => 
      s.name?.toLowerCase().includes(searchQuery.toLowerCase())
    ), [staff, searchQuery]
  );

  // ==================== ACTIVE TAB & FILTERS ====================
  const [activeTab, setActiveTab] = useState<'clients' | 'venues' | 'staff'>('clients');
  const [roleViewTab, setRoleViewTab] = useState<'individual' | 'specialist'>('specialist');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'payroll'>('all');
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'quarter'>('month');

  // ==================== CALENDAR STATES ====================
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [showCalendar, setShowCalendar] = useState(false);

  // ==================== GOOGLE CALENDAR INTEGRATION ====================
  const [googleUser, setGoogleUser] = useState<any | null>(null);
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isSilentSyncing, setIsSilentSyncing] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
    const raw = localStorage.getItem('fp_autosync_enabled');
    return raw ? raw === 'true' : true;
  });

  // ==================== APPLE CALENDAR STATES ====================
  const [appleUser, setAppleUser] = useState<any | null>(() => {
    const raw = localStorage.getItem('fp_apple_user');
    if (raw) return JSON.parse(raw);
    const defaultAppleUser = { email: '[REDACTED]' };
    localStorage.setItem('fp_apple_user', JSON.stringify(defaultAppleUser));
    return defaultAppleUser;
  });
  const [isLinkingApple, setIsLinkingApple] = useState(false);
  const [appleEmailInput, setAppleEmailInput] = useState('');
  const [applePasswordInput, setApplePasswordInput] = useState('');
  const [appleFeedUrl, setAppleFeedUrl] = useState<string>(() => {
    const stored = localStorage.getItem('fp_apple_feed_url');
    if (stored) return stored;
    const defaultUrl = '[REDACTED]';
    localStorage.setItem('fp_apple_feed_url', defaultUrl);
    return defaultUrl;
  });
  const [isAppleAuthModalOpen, setIsAppleAuthModalOpen] = useState(false);
  const [isAppleSimulatorVisible, setIsAppleSimulatorVisible] = useState(true);
  const [simNewTitle, setSimNewTitle] = useState('');
  const [simNewDate, setSimNewDate] = useState('2026-05-28');
  const [simNewTimeStart, setSimNewTimeStart] = useState('12:00');
  const [simNewTimeEnd, setSimNewTimeEnd] = useState('14:00');
  const [simNewNotes, setSimNewNotes] = useState('');
  const [appleEvents, setAppleEvents] = useState<any[]>(appleCalendarEvents);

  // ==================== DIRECT BOOKING & DISPATCH ====================
  const [isDirectBookingChecked, setIsDirectBookingChecked] = useState(false);
  const [dispatchClientDate, setDispatchClientDate] = useState('');
  const [dispatchAdjustedTime, setDispatchAdjustedTime] = useState('');
  const [dispatchArrangements, setDispatchArrangements] = useState('');

  // ==================== TOAST ALERTS ====================
  const [toastAlert, setToastAlert] = useState<{ message: string; type: 'info' | 'success' | 'warn' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    setToastAlert({ message, type });
  }, []);

  useEffect(() => {
    if (toastAlert) {
      const timer = setTimeout(() => {
        setToastAlert(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [toastAlert]);

  // ==================== AUTONOMOUS DATA FETCHING ====================
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [clientsRes, venuesRes, staffRes, eventsRes] = await Promise.all([
        fetch('/api/clients'),
        fetch('/api/venues'),
        fetch('/api/staff'),
        fetch('/api/events')
      ]);
      
      if (clientsRes.ok) {
        const data = await clientsRes.json();
        const clientsArray = Array.isArray(data) ? data : (data.clients || data.staff || data || []);
        setClients(Array.isArray(clientsArray) ? clientsArray : []);
      }
      if (venuesRes.ok) {
        const data = await venuesRes.json();
        const venuesArray = Array.isArray(data) ? data : (data.venues || data || []);
        setVenues(Array.isArray(venuesArray) ? venuesArray : []);
      }
      if (staffRes.ok) {
        const data = await staffRes.json();
        const staffArray = Array.isArray(data) ? data : (data.staff || data || []);
        setStaff(Array.isArray(staffArray) ? staffArray : []);
      }
      if (eventsRes.ok) {
        const data = await eventsRes.json();
        const eventsArray = Array.isArray(data) ? data : (data.events || data || []);
        setEventsState(Array.isArray(eventsArray) ? eventsArray : []);
      }
      
      setLastAnalysis(new Date());
      setAgentStatus('active');
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setAgentStatus('alert');
      showToast('Data fetch failed. Retrying...', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Autonomous refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 30000);
    
    setDataRefreshInterval(interval);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchData]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // ==================== KPI COMPUTATIONS ====================
  const kpiData = useMemo(() => {
    const todayEvents = (Array.isArray(events) ? events : []).filter(e => e.date === selectedDateStr);
    const confirmedEvents = todayEvents.filter(e => e.status === 'Confirmed');
    const pendingEvents = todayEvents.filter(e => e.status === 'Pending');
    
    // Calculate revenue (mock - in production, this would come from API)
    const monthlyRevenue = clients.length * 2500; // Average client value
    const dailyRevenue = monthlyRevenue / 30;
    
    // Staff utilization
    const activeStaff = (Array.isArray(staff) ? staff : []).filter(s => s.role === 'specialist');
    const staffUtilization = activeStaff.length > 0 
      ? Math.round((confirmedEvents.length / activeStaff.length) * 100) 
      : 0;
    
    return {
      totalClients: clients.length,
      totalEvents: events.length,
      todayEvents: todayEvents.length,
      confirmedToday: confirmedEvents.length,
      pendingToday: pendingEvents.length,
      monthlyRevenue,
      dailyRevenue,
      staffUtilization,
      totalStaff: staff.length,
      totalVenues: venues.length
    };
  }, [clients, events, staff, venues, selectedDateStr]);

  // ==================== TREND INDICATOR COMPONENT ====================
  const TrendIndicator: React.FC<{ trend: KPITrend }> = ({ trend }) => {
    const isPositive = trend.direction === 'up';
    const isNeutral = trend.direction === 'stable';
    
    return (
      <div className={`flex items-center gap-1 text-xs ${
        isNeutral ? 'text-gray-400' : isPositive ? 'text-green-400' : 'text-red-400'
      }`}>
        {!isNeutral && (isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />)}
        <span>{trend.value}% {trend.label}</span>
      </div>
    );
  };

  // ==================== INSIGHT CARD COMPONENT ====================
  const InsightCard: React.FC<{ insight: ExecutiveInsight }> = ({ insight }) => {
    const typeConfig = {
      alert: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
      opportunity: { icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
      milestone: { icon: CheckCircle, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
      recommendation: { icon: Target, color: 'text-gold-400', bg: 'bg-gold-500/10', border: 'border-gold-500/30' }
    };
    
    const config = typeConfig[insight.type];
    const Icon = config.icon;
    
    return (
      <div className={`p-4 rounded-lg border ${config.border} ${config.bg} backdrop-blur-sm hover:scale-[1.02] transition-all duration-300 cursor-pointer`}>
        <div className="flex items-start gap-3">
          <Icon size={20} className={config.color} />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-white font-medium text-sm">{insight.title}</h4>
              <span className={`text-xs px-2 py-0.5 rounded ${
                insight.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                insight.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                insight.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                {insight.priority}
              </span>
            </div>
            <p className="text-gray-400 text-xs mb-2">{insight.description}</p>
            {insight.action && (
              <button className="text-gold-400 hover:text-gold-300 text-xs font-medium transition-colors">
                {insight.action} →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ==================== GLASSMORPHISM KPI CARD ====================
  const GlassKPIcard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: KPITrend;
    accent?: boolean;
  }> = ({ title, value, icon, trend, accent }) => (
    <div className={`relative overflow-hidden rounded-2xl backdrop-blur-xl border p-6 transition-all duration-500 hover:scale-105 hover:shadow-2xl group ${
      accent 
        ? 'bg-gradient-to-br from-gold-900/40 to-gold-800/20 border-gold-500/30 shadow-gold-500/10' 
        : 'bg-gray-900/60 border-gray-700/50 hover:border-gold-500/30'
    }`}>
      {/* Animated background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-gold-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl ${
            accent ? 'bg-gold-500/20 text-gold-400' : 'bg-gray-800/50 text-gray-400'
          } group-hover:scale-110 transition-transform duration-300`}>
            {icon}
          </div>
          {trend && <TrendIndicator trend={trend} />}
        </div>
        
        <div className="space-y-1">
          <p className={`text-sm font-medium ${accent ? 'text-gold-300' : 'text-gray-400'}`}>
            {title}
          </p>
          <p className={`text-3xl font-bold ${accent ? 'text-gold-400' : 'text-white'}`}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );

  // ==================== RENDER ====================
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* ==================== EXECUTIVE INTELLIGENCE AGENT HEADER ==================== */}
        <div className="mb-8 relative">
          {/* Agent Status Indicator */}
          <div className="absolute top-0 right-0 flex items-center gap-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm border ${
              agentStatus === 'active' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
              agentStatus === 'analyzing' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
              'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              <Activity size={16} className="animate-pulse" />
              <span className="text-sm font-medium">
                Executive Intelligence Agent: {agentStatus.toUpperCase()}
              </span>
            </div>
            <button
              onClick={fetchData}
              className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50 hover:border-gold-500/30 transition-all duration-300"
              title="Refresh Data"
            >
              <RefreshCw size={18} className={`text-gold-400 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Main Header */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gold-500 blur-xl opacity-20 animate-pulse" />
              <div className="relative bg-gradient-to-br from-gold-500 to-gold-600 p-4 rounded-2xl shadow-gold-500/25">
                <Brain size={32} className="text-gray-900" />
              </div>
            </div>
            <div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-gold-400 via-gold-300 to-gold-500 bg-clip-text text-transparent">
                EXECUTIVE INTELLIGENCE AGENT
              </h1>
              <p className="text-gray-400 text-lg mt-1">
                Fresh People Command Center • Autonomous Operations Dashboard
              </p>
            </div>
          </div>

          {/* Sub-header Info Bar */}
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Timer size={14} />
              <span>Session: {sessionTimeLeft}</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe size={14} />
              <span>Last Analysis: {lastAnalysis.toLocaleTimeString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-gold-400" />
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-gold-400">Autonomous Mode: ACTIVE</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield size={14} />
              <span>Data Refresh: 30s interval</span>
            </div>
          </div>
        </div>

        {/* ==================== TOAST ALERT ==================== */}
        {toastAlert && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-2xl backdrop-blur-xl border animate-slide-in ${
            toastAlert.type === 'error' ? 'bg-red-600/90 border-red-500/50' :
            toastAlert.type === 'success' ? 'bg-green-600/90 border-green-500/50' :
            toastAlert.type === 'warn' ? 'bg-yellow-600/90 border-yellow-500/50' : 
            'bg-blue-600/90 border-blue-500/50'
          } text-white`}>
            <div className="flex items-center gap-3">
              {toastAlert.type === 'error' && <AlertTriangle size={20} />}
              {toastAlert.type === 'success' && <CheckCircle size={20} />}
              {toastAlert.type === 'warn' && <AlertTriangle size={20} />}
              {toastAlert.type === 'info' && <Info size={20} />}
              <span>{toastAlert.message}</span>
            </div>
          </div>
        )}

        {/* ==================== EXECUTIVE INSIGHTS PANEL ==================== */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Sparkles className="text-gold-400" size={24} />
              Executive Insights & Recommendations
            </h2>
            <button className="text-gold-400 hover:text-gold-300 text-sm font-medium transition-colors flex items-center gap-1">
              View All <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {executiveInsights.map(insight => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </div>

        {/* ==================== KPI DASHBOARD ==================== */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <BarChart3 className="text-gold-400" size={24} />
              Key Performance Indicators
            </h2>
            <div className="flex items-center gap-2">
              {(['today', 'week', 'month', 'quarter'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                    timeRange === range
                      ? 'bg-gold-500 text-gray-900 shadow-gold-500/25'
                      : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <GlassKPIcard
              title="Total Revenue"
              value={`$${(kpiData.monthlyRevenue / 1000).toFixed(1)}K`}
              icon={<DollarSign size={24} />}
              trend={kpiTrends.revenue}
              accent
            />
            <GlassKPIcard
              title="Active Clients"
              value={kpiData.totalClients}
              icon={<Users size={24} />}
              trend={kpiTrends.clients}
            />
            <GlassKPIcard
              title="Events This Month"
              value={kpiData.totalEvents}
              icon={<Calendar size={24} />}
              trend={kpiTrends.events}
            />
            <GlassKPIcard
              title="Staff Utilization"
              value={`${kpiData.staffUtilization}%`}
              icon={<UserCog size={24} />}
              trend={kpiTrends.staff}
            />
          </div>

          {/* Secondary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-gray-900/40 backdrop-blur-sm rounded-xl border border-gray-800/50 p-4 hover:border-gold-500/30 transition-all duration-300">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Calendar size={16} />
                <span className="text-sm">Today's Events</span>
              </div>
              <p className="text-2xl font-bold text-white">{kpiData.todayEvents}</p>
              <div className="flex gap-3 mt-2 text-xs">
                <span className="text-green-400">✓ {kpiData.confirmedToday} confirmed</span>
                <span className="text-yellow-400">◐ {kpiData.pendingToday} pending</span>
              </div>
            </div>

            <div className="bg-gray-900/40 backdrop-blur-sm rounded-xl border border-gray-800/50 p-4 hover:border-gold-500/30 transition-all duration-300">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Clock size={16} />
                <span className="text-sm">Session Time</span>
              </div>
              <p className="text-2xl font-bold text-white">{sessionTimeLeft}</p>
            </div>

            <div className="bg-gray-900/40 backdrop-blur-sm rounded-xl border border-gray-800/50 p-4 hover:border-gold-500/30 transition-all duration-300">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Combine size={16} />
                <span className="text-sm">Apple Events</span>
              </div>
              <p className="text-2xl font-bold text-white">{appleEvents.length}</p>
            </div>

            <div className="bg-gray-900/40 backdrop-blur-sm rounded-xl border border-gray-800/50 p-4 hover:border-gold-500/30 transition-all duration-300">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <MapPin size={16} />
                <span className="text-sm">Active Venues</span>
              </div>
              <p className="text-2xl font-bold text-white">{kpiData.totalVenues}</p>
            </div>
          </div>
        </div>

        {/* ==================== CALENDAR TOGGLE ==================== */}
        <div className="mb-6">
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl font-medium"
          >
            <Calendar size={20} />
            {showCalendar ? 'Hide Calendar' : 'Show Unified Calendar'}
            <ChevronRight size={20} className={`transition-transform duration-300 ${showCalendar ? 'rotate-90' : ''}`} />
          </button>
        </div>

        {/* ==================== UNIFIED CALENDAR SECTION ==================== */}
        {showCalendar && (
          <div className="mb-8 animate-fade-in">
            <div className="bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Calendar className="text-gold-400" size={24} />
                Unified Calendar View
              </h2>
              <UnifiedCalendarView appleEvents={appleEvents} googleEvents={googleEvents} />
            </div>
          </div>
        )}

        {/* ==================== MAIN CONTENT GRID ==================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Registry */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Users className="text-gold-400" size={20} />
                Registry
              </h3>
              
              {/* Search Input */}
              <input
                type="text"
                placeholder="Search clients, venues, staff..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-gray-800/50 text-white px-4 py-3 rounded-xl border border-gray-700/50 focus:outline-none focus:border-gold-500/50 focus:ring-2 focus:ring-gold-500/20 transition-all duration-300 mb-4"
              />

              {/* Tab Navigation */}
              <div className="flex gap-2 mb-4">
                {(['clients', 'venues', 'staff'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                      activeTab === tab
                        ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-gray-900 shadow-gold-500/25'
                        : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {/* Role Filter for Staff */}
              {activeTab === 'staff' && (
                <div className="flex gap-2 mb-4">
                  {(['specialist', 'individual'] as const).map(role => (
                    <button
                      key={role}
                      onClick={() => setRoleViewTab(role)}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 ${
                        roleViewTab === role
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-gray-800/30 text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </button>
                  ))}
                </div>
              )}

              {/* List Header */}
              <div className="flex items-center justify-between mb-3 text-sm text-gray-400">
                <span>
                  {activeTab === 'clients' && `Total: ${filteredClients.length}`}
                  {activeTab === 'venues' && `Total: ${filteredVenues.length}`}
                  {activeTab === 'staff' && `Total: ${filteredStaff.length}`}
                </span>
                <button className="text-gold-400 hover:text-gold-300 transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* List Content */}
              <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                {activeTab === 'clients' && filteredClients.slice(0, 10).map(client => (
                  <div key={client.id} className="bg-gray-800/30 hover:bg-gray-700/50 p-3 rounded-lg cursor-pointer transition-all duration-300 border border-transparent hover:border-gold-500/20">
                    <div className="font-medium text-white text-sm">{client.name}</div>
                    <div className="text-xs text-gray-400 mt-1">{client.email}</div>
                  </div>
                ))}
                {activeTab === 'venues' && filteredVenues.slice(0, 10).map(venue => (
                  <div key={venue.id} className="bg-gray-800/30 hover:bg-gray-700/50 p-3 rounded-lg cursor-pointer transition-all duration-300 border border-transparent hover:border-gold-500/20">
                    <div className="font-medium text-white text-sm">{venue.name}</div>
                    <div className="text-xs text-gray-400 mt-1">{venue.address}</div>
                  </div>
                ))}
                {activeTab === 'staff' && filteredStaff
                  .filter(s => s.role === roleViewTab)
                  .slice(0, 10)
                  .map(person => (
                    <div key={person.id} className="bg-gray-800/30 hover:bg-gray-700/50 p-3 rounded-lg cursor-pointer transition-all duration-300 border border-transparent hover:border-gold-500/20">
                      <div className="font-medium text-white text-sm">{person.name}</div>
                      <div className="text-xs text-gray-400 mt-1">{person.role} • ${person.hourlyRate}/hr</div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Activity & Analytics */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Activity */}
            <div className="bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Activity className="text-gold-400" size={20} />
                Recent Activity
              </h3>
              <div className="space-y-3">
                {(Array.isArray(activityLogs) ? activityLogs : []).slice(0, 8).map((log) => (
                  <div key={log.id} className="bg-gray-800/30 hover:bg-gray-700/50 p-4 rounded-lg transition-all duration-300 border border-transparent hover:border-gold-500/20">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-white text-sm font-medium">{log.action}</p>
                        <p className="text-gray-400 text-xs mt-1">by {log.user}</p>
                      </div>
                      <span className="text-gray-500 text-xs">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
                {(Array.isArray(activityLogs) ? activityLogs : []).length === 0 && (
                  <div className="text-center py-8">
                    <Bell size={48} className="text-gray-700 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No recent activity</p>
                    <p className="text-gray-600 text-xs mt-1">System monitoring active</p>
                  </div>
                )}
              </div>
            </div>

            {/* Live System Status */}
            <div className="bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Zap className="text-gold-400" size={20} />
                Live System Status
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs text-gray-400">Google Calendar</span>
                  </div>
                  <p className="text-sm font-medium text-white">
                    {googleUser ? 'Connected' : 'Disconnected'}
                  </p>
                </div>

                <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${appleUser ? 'bg-green-400' : 'bg-gray-500'} animate-pulse`} />
                    <span className="text-xs text-gray-400">Apple Calendar</span>
                  </div>
                  <p className="text-sm font-medium text-white">
                    {appleUser ? 'Synced' : 'Standby'}
                  </p>
                </div>

                <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    <span className="text-xs text-gray-400">Auto-Sync</span>
                  </div>
                  <p className="text-sm font-medium text-white">
                    {autoSyncEnabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>

                <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-gold-400 animate-pulse" />
                    <span className="text-xs text-gray-400">API Status</span>
                  </div>
                  <p className="text-sm font-medium text-white">
                    {isLoading ? 'Updating...' : 'Operational'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== FOOTER ==================== */}
        <div className="mt-12 pt-6 border-t border-gray-800/50">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-4">
              <span>Executive Intelligence Agent v3.0</span>
              <span>•</span>
              <span>Autonomous Operations Active</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Data refreshes every 30 seconds</span>
              <span>•</span>
              <span>{currentTime.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== CUSTOM STYLES ==================== */}
      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(191, 143, 59, 0.5);
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(191, 143, 59, 0.7);
        }

        .text-gold-300 { color: #D4A853; }
        .text-gold-400 { color: #BF8F3B; }
        .text-gold-500 { color: #A67B2E; }
        .bg-gold-300 { background-color: #D4A853; }
        .bg-gold-400 { background-color: #BF8F3B; }
        .bg-gold-500 { background-color: #A67B2E; }
        .bg-gold-500\\/10 { background-color: rgba(166, 123, 46, 0.1); }
        .bg-gold-500\\/20 { background-color: rgba(166, 123, 46, 0.2); }
        .bg-gold-900\\/40 { background-color: rgba(26, 19, 6, 0.4); }
        .border-gold-300 { border-color: #D4A853; }
        .border-gold-400 { border-color: #BF8F3B; }
        .border-gold-500 { border-color: #A67B2E; }
        .border-gold-500\\/20 { border-color: rgba(166, 123, 46, 0.2); }
        .border-gold-500\\/30 { border-color: rgba(166, 123, 46, 0.3); }
        .shadow-gold-500\\/10 { box-shadow: 0 10px 15px -3px rgba(166, 123, 46, 0.1); }
        .shadow-gold-500\\/25 { box-shadow: 0 10px 15px -3px rgba(166, 123, 46, 0.25); }
      `}</style>
    </div>
  );
};

export default Dashboard;
