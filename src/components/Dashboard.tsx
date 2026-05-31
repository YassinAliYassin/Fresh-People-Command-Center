import React, { useState, useEffect } from 'react';
import { Calendar, Users, UserCog, Combine, Clock, MessageSquare, MapPin, User, FileText } from 'lucide-react';
import UnifiedCalendarView from './Calendar/UnifiedView';

// Import full Apple Calendar events (1457 events from iCloud feed)
import appleCalendarEvents from '../data/apple-calendar-events.json';

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

  // Active Tab for Registry List Left Panel
  const [activeTab, setActiveTab] = useState<'clients' | 'venues' | 'staff'>('clients');
  const [roleViewTab, setRoleViewTab] = useState<'individual' | 'specialist'>('specialist');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'payroll'>('all');

  // Operational Calendar display Month/Year
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(4); // May (0-indexed: May=4)
  const [selectedDateStr, setSelectedDateStr] = useState<string>('2026-05-28');

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
  const [appleEvents, setAppleEvents] = useState<Event[]>(appleCalendarEvents as Event[]);

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
            <p className="text-2xl font-bold text-white">{events.filter(e => e.date === selectedDateStr).length}</p>
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
                {activeTab === 'clients' && `Total Clients: ${clients.length}`}
                {activeTab === 'venues' && `Total Venues: ${venues.length}`}
                {activeTab === 'staff' && `Total Staff: ${staff.length}`}
              </div>
            </div>
          </div>

          {/* Right Panel - Event Details */}
          <div className="lg:col-span-2">
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <h3 className="text-lg font-bold text-white mb-4">Recent Activity</h3>
              <div className="space-y-2">
                {activityLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="bg-gray-800 p-2 rounded text-sm">
                    <span className="text-gray-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className="text-white ml-2">{log.action}</span>
                  </div>
                ))}
                {activityLogs.length === 0 && (
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
