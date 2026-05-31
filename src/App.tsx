import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Calendar, Users, UserCog, Combine, LayoutDashboard } from 'lucide-react';
import EventForm from './components/EventForm';
import EventList from './components/EventList';
import CalendarView from './components/CalendarView';
import StaffView from './components/StaffView';
import HomePage from './components/HomePage';
import UnifiedCalendarView from './components/Calendar/UnifiedView';
import Dashboard from './components/Dashboard';

// Persistent Navigation - Fixed bottom on mobile, top on desktop
const Navbar = () => {
  return (
    <nav className="bg-gray-900 border-t border-gray-800 fixed bottom-0 left-0 right-0 z-40 sm:static sm:border-t-0 sm:border-b sm:bottom-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-around sm:justify-start sm:space-x-8 h-16 items-center">
          <Link
            to="/"
            className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
          >
            <LayoutDashboard size={20} />
            <span className="text-xs sm:text-sm">Dashboard</span>
          </Link>
          <Link
            to="/events"
            className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
          >
            <Users size={20} />
            <span className="text-xs sm:text-sm">Events</span>
          </Link>
          <Link
            to="/calendar"
            className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
          >
            <Calendar size={20} />
            <span className="text-xs sm:text-sm">Calendar</span>
          </Link>
          <Link
            to="/unified-calendar"
            className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
          >
            <Combine size={20} />
            <span className="text-xs sm:text-sm">Unified</span>
          </Link>
          <Link
            to="/staff"
            className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
          >
            <UserCog size={20} />
            <span className="text-xs sm:text-sm">Staff</span>
          </Link>
        </div>
      </div>
      </nav>
  );
};

function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-950 text-white flex flex-col">
        {/* Desktop Top Nav */}
        <div className="hidden sm:block">
          <Navbar />
        </div>

        <main className="flex-1 overflow-y-auto pb-16 sm:pb-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-white">FRESH PEOPLE</h1>
              <p className="text-sm text-gray-400">Operational Command Center</p>
            </div>

            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route
                path="/events"
                element={
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                      <EventForm onEventCreated={() => setRefreshKey(k => k + 1)} />
                    </div>
                    <div className="lg:col-span-2">
                      <EventList key={refreshKey} />
                    </div>
                  </div>
                }
              />
              <Route path="/calendar" element={<CalendarView />} />
              <Route path="/unified-calendar" element={<UnifiedCalendarView />} />
              <Route path="/staff" element={<StaffView />} />
            </Routes>
          </div>
        </main>

        {/* Mobile Bottom Nav */}
        <div className="sm:hidden">
          <Navbar />
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
