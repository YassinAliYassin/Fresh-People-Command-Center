import React, { useState, useEffect } from 'react';
import { Calendar, Users, UserCog, Combine, Clock, MessageSquare, MapPin, User, FileText } from 'lucide-react';
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

const Dashboard: React.FC = () => {
  // Session timer countdown display string
  const [sessionTimeLeft, setSessionTimeLeft] = useState('4h 00m 00s');

  // Direct Booking manual section check
  const [isDirectBookingChecked, setIsDirectBookingChecked] = useState(false);

  // WhatsApp active tracking dispatch items
  const [dispatchClientDate, setDispatchClientDate] = useState('');
  const [dispatchAdjustedTime, setDispatchAdjustedTime] = useState('');
  const [dispatchArrangements, setDispatchArrangements] = useState('');

  // Entities states (Clients, Venues, Staff, Events)
  const [clients, setClients] = useState<Client[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [events, setEventsState] = useState<Event[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filtered data based on search
  const filteredClients = (Array.isArray(clients) ? clients : []).filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredVenues = (Array.isArray(venues) ? venues : []).filter(v => 
    v.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredStaff = (Array.isArray(staff) ? staff : []).filter(s => 
    s.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Active Tab for Registry List Left Panel
  const [activeTab, setActiveTab] = useState<'clients' | 'venues' | 'staff'>('clients');
  const [roleViewTab, setRoleViewTab] = useState<'individual' | 'specialist'>('specialist');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'payroll'>('all');

  // Operational Calendar display Month/Year - use CURRENT date instead of hardcoded
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed: Jan=0
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  // Google Calendar Integration states
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

  // Apple Calendar & Apple ID state parameters
  const [appleUser, setAppleUser] = useState<any | null>(() => {
    const raw = localStorage.getItem('fp_apple_user');
    if (raw) return JSON.parse(raw);
    const defaultAppleUser = { email: '[REDACTED]' };
    localStorage.setItem('fp_apple_user', JSON.stringify(defaultAppleUser));
    return defaultAppleUser;
  });
  const [isLinkingApple, setIsLinkingApple] = useState(false);

  // Premium in-app alert toast
  const [toastAlert, setToastAlert] = useState<{ message: string; type: 'info' | 'success' | 'warn' | 'error' } | null>(null);

  const showToast = (message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    setToastAlert({ message, type });
  };

  useEffect(() => {
    if (toastAlert) {
      const timer = setTimeout(() => {
        setToastAlert(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [toastAlert]);

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

  // Fetch real-time data from API routes
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientsRes, venuesRes, staffRes, eventsRes] = await Promise.all([
          fetch('/api/clients'),
          fetch('/api/venues'),
          fetch('/api/staff'),
          fetch('/api/events')
        ]);
        
        if (clientsRes.ok) {
          const data = await clientsRes.json();
          // Extract array from response (APIs return { clients: [...] } or similar)
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
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };
    
    fetchData();
  }, []);

  // Calendar view toggle
  const [showCalendar, setShowCalendar] = useState(false);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">FRESH PEOPLE COMMAND CENTER</h1>
          <p className="text-gray-400">Operational Dashboard</p>
        </div>

        {/* Toast Alert */}
        {toastAlert && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
            toastAlert.type === 'error' ? 'bg-red-600' :
            toastAlert.type === 'success' ? 'bg-green-600' :
            toastAlert.type === 'warn' ? 'bg-yellow-600' : 'bg-blue-600'
          } text-white`}>
            {toastAlert.message}
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <Users size={16} />
              <span className="text-sm">Active Clients</span>
            </div>
            <p className="text-2xl font-bold text-white">{clients.length}</p>
          </div>
          <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <Calendar size={16} />
              <span className="text-sm">Events Today</span>
            </div>
            <p className="text-2xl font-bold text-white">{(Array.isArray(events) ? events : []).filter(e => e.date === selectedDateStr).length}</p>
          </div>
          <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <Clock size={16} />
              <span className="text-sm">Session Time</span>
            </div>
            <p className="text-2xl font-bold text-white">{sessionTimeLeft}</p>
          </div>
          <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <Combine size={16} />
              <span className="text-sm">Apple Events</span>
            </div>
            <p className="text-2xl font-bold text-white">{appleEvents.length}</p>
          </div>
        </div>

        {/* Calendar Toggle Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Calendar size={20} />
            {showCalendar ? 'Hide Calendar' : 'Show Unified Calendar'}
          </button>
        </div>

        {/* Unified Calendar Section */}
        {showCalendar && (
          <div className="mb-6">
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Unified Calendar View</h2>
              <UnifiedCalendarView appleEvents={appleEvents} googleEvents={googleEvents} />
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Registry */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              {/* Search Input */}
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:border-blue-500 mb-4"
              />
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setActiveTab('clients')}
                  className={`px-3 py-1 rounded ${activeTab === 'clients' ? 'bg-blue-600' : 'bg-gray-800'}`}
                >
                  Clients
                </button>
                <button
                  onClick={() => setActiveTab('venues')}
                  className={`px-3 py-1 rounded ${activeTab === 'venues' ? 'bg-blue-600' : 'bg-gray-800'}`}
                >
                  Venues
                </button>
                <button
                  onClick={() => setActiveTab('staff')}
                  className={`px-3 py-1 rounded ${activeTab === 'staff' ? 'bg-blue-600' : 'bg-gray-800'}`}
                >
                  Staff
                </button>
              </div>
              <div className="text-gray-400 text-sm">
                {activeTab === 'clients' && `Total Clients: ${filteredClients.length}`}
                {activeTab === 'venues' && `Total Venues: ${filteredVenues.length}`}
                {activeTab === 'staff' && `Total Staff: ${filteredStaff.length}`}
              </div>
            </div>
          </div>

          {/* Right Panel - Event Details */}
          <div className="lg:col-span-2">
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <h3 className="text-lg font-bold text-white mb-4">Recent Activity</h3>
              <div className="space-y-2">
                {(Array.isArray(activityLogs) ? activityLogs : []).slice(0, 5).map((log) => (
                  <div key={log.id} className="bg-gray-800 p-2 rounded text-sm">
                    <span className="text-gray-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className="text-white ml-2">{log.action}</span>
                  </div>
                ))}
                {(Array.isArray(activityLogs) ? activityLogs : []).length === 0 && (
                  <p className="text-gray-500 text-sm">No recent activity</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
