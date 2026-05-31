import React, { useState, useEffect } from 'react';
import HeroSection from './HeroSection';
import ActiveEventsCounter from './ActiveEventsCounter';
import StaffCheckInStatus from './StaffCheckInStatus';
import UpcomingBookingsList from './UpcomingBookingsList';
import TeamAttendanceSummary from './TeamAttendanceSummary';
import EventList from './EventList';
import UnifiedCalendarView from './Calendar/UnifiedView';
import { DollarSign, AlertTriangle, Calendar, LayoutDashboard } from 'lucide-react';

// Import Apple Calendar events (embedded)
import appleCalendarEvents from '../data/apple-calendar-events.json';

const HomePage = () => {
  const [todaysEvents, setTodaysEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [revenue, setRevenue] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Dashboard state variables as per provided snippet
  const [activeTab, setActiveTab] = useState<'overview' | 'calendar'>('overview');
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);
  const [appleEvents, setAppleEvents] = useState<any[]>(appleCalendarEvents || []);
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(4); // 0-indexed: 4 = May
  const [selectedDateStr, setSelectedDateStr] = useState<string>('2026-05-28');

  // Fetch today's events
  useEffect(() => {
    const fetchTodaysEvents = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const res = await fetch(`/api/events?date=${today}`);
        const data = await res.json();
        setTodaysEvents(data || []);
      } catch (err) {
        console.error('Failed to fetch today\'s events:', err);
        setTodaysEvents([]);
      } finally {
        setLoadingEvents(false);
      }
    };
    fetchTodaysEvents();
  }, []);

  // Placeholder for revenue (to be connected to actual API later)
  useEffect(() => {
    // Simulated revenue data - replace with actual API call when available
    setRevenue(0);
  }, []);

  return (
    <div className="space-y-8">
      {/* Tab Navigation */}
      <div className="border-b border-gray-800">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
            }`}
          >
            <LayoutDashboard size={18} />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'calendar'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
            }`}
          >
            <Calendar size={18} />
            Calendar
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' ? (
        <>
          {/* Hero Section */}
          <HeroSection />

          {/* Live Operational Data Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ActiveEventsCounter />
            <StaffCheckInStatus />
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center gap-4">
              <div className="p-3 bg-green-900/30 rounded-lg">
                <DollarSign className="text-green-400" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-400">Revenue Today</p>
                <p className="text-2xl font-bold text-white">
                  {revenue !== null ? `$${revenue.toLocaleString()}` : '$0'}
                </p>
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center gap-4">
              <div className="p-3 bg-red-900/30 rounded-lg">
                <AlertTriangle className="text-red-400" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-400">Outstanding Tasks</p>
                <p className="text-2xl font-bold text-white">0</p>
              </div>
            </div>
          </div>

          {/* Main Content with Visual Hierarchy */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Today's Events - Dominant Section */}
            <div className="lg:col-span-2">
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <h2 className="text-xl font-bold text-white mb-4">Today's Events</h2>
                {loadingEvents ? (
                  <p className="text-gray-400">Loading today's events...</p>
                ) : todaysEvents.length === 0 ? (
                  <p className="text-gray-400">No events scheduled for today</p>
                ) : (
                  <EventList refreshKey={refreshKey} />
                )}
              </div>
            </div>

            {/* Sidebar - Team on Duty, Upcoming, Attendance */}
            <div className="space-y-6">
              {/* Team on Duty - Prominent */}
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <h2 className="text-xl font-bold text-white mb-4">Team on Duty</h2>
                <StaffCheckInStatus />
              </div>

              <UpcomingBookingsList />
              <TeamAttendanceSummary />
            </div>
          </div>
        </>
      ) : (
        /* Calendar Tab Content */
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <UnifiedCalendarView 
            googleEvents={googleEvents}
            appleEvents={appleEvents}
            currentYear={currentYear}
            currentMonth={currentMonth}
            selectedDateStr={selectedDateStr}
          />
        </div>
      )}
    </div>
  );
};

export default HomePage;
