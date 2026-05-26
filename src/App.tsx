import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Calendar, Users, Building, DollarSign } from 'lucide-react';
import EventForm from './components/EventForm';
import EventList from './components/EventList';
import CalendarView from './components/CalendarView';
import ClientsView from './components/ClientsView';
import PayrollSummary from './components/PayrollSummary';

// Persistent Navigation - Fixed bottom on mobile, top on desktop
const Navbar = () => {
  return (
    <nav className="bg-gray-900 border-t border-gray-800 fixed bottom-0 left-0 right-0 z-40 sm:static sm:border-t-0 sm:border-b sm:bottom-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-around sm:justify-start sm:space-x-8 h-16 items-center">
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
            to="/clients"
            className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
          >
            <Building size={20} />
            <span className="text-xs sm:text-sm">Clients</span>
          </Link>
          <Link
            to="/payroll"
            className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
          >
            <DollarSign size={20} />
            <span className="text-xs sm:text-sm">Payroll</span>
          </Link>
        </div>
      </div>
    </nav>
  );
};

// Event Management Page (wrapped with refresh logic)
const EventManagement = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4 sm:p-6">
      <div className="lg:col-span-1">
        <EventForm onEventCreated={() => setRefreshKey(prev => prev + 1)} />
      </div>
      <div className="lg:col-span-2">
        <EventList refreshKey={refreshKey} />
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
            <h1 className="font-display tracking-[0.2em] font-bold text-lg md:text-xl">
              FRESH PEOPLE
            </h1>
            <span className="hidden md:inline h-4 w-[1px] bg-gray-700"></span>
            <span className="hidden md:inline font-mono text-[10px] text-blue-400 uppercase tracking-widest">
              Command Center
            </span>
          </div>
          <div className="font-mono text-[10px] text-gray-400">
            {new Date().toLocaleDateString()}
          </div>
        </div>
      </header>

      {/* Persistent Navigation */}
      <Navbar />

      {/* Main Content - Add bottom padding on mobile for fixed nav */}
      <main className="min-h-screen pb-16 sm:pb-0 overflow-y-auto">
        <Routes>
          <Route path="/events" element={<EventManagement />} />
          <Route path="/calendar" element={<CalendarView />} />
          <Route path="/clients" element={<ClientsView />} />
          <Route path="/payroll" element={<PayrollSummary />} />
          <Route path="*" element={<Navigate to="/events" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
};

export default App;
