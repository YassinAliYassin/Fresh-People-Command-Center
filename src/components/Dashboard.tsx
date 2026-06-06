import React, { useState, useEffect, useMemo } from 'react';
import { Users, MapPin, DollarSign, RefreshCw } from 'lucide-react';

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

const Dashboard: React.FC<{
  staff: any[];
  events: any[];
  clients: any[];
  records: any[];
  now: number;
  addToast: (msg: string, type?: string) => void;
}> = ({ staff, events, clients, records, now, addToast }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const todayStr = new Date(now).toISOString().slice(0, 10);
  
  const todayEvents = events.filter(e => e.date === todayStr);
  const confirmedToday = todayEvents.filter(e => e.status === 'Confirmed').length;
  const pendingToday = todayEvents.filter(e => e.status === 'Pending').length;
  
  const activeStaff = staff.filter(s => 
    records.some(r => r.staffId === s.id && !r.clockOut)
  ).length;
  
  const completedShifts = records.filter(r => r.clockOut);
  const totalHours = completedShifts.reduce((a, r) => a + (r.clockOut - r.clockIn) / 3600000, 0);
  
  const totalPayroll = completedShifts.reduce((a, r) => {
    const s = staff.find(x => x.id === r.staffId);
    return a + (r.clockOut - r.clockIn) / 3600000 * (s?.hourlyRate || 0);
  }, 0);

  const refresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setLastRefresh(new Date());
      setIsLoading(false);
      addToast('Refreshed', 'success');
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Clean Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <button 
            onClick={refresh}
            className="p-2 rounded-lg bg-white hover:bg-gray-100 border border-gray-200 transition-colors shadow-sm"
            title="Refresh"
          >
            <RefreshCw size={18} className={`text-blue-600 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Clean KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Staff', value: staff.length, icon: <Users size={20} />, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: "Today's Events", value: todayEvents.length, icon: <MapPin size={20} />, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Active Staff', value: activeStaff, icon: <Users size={20} />, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Total Payroll', value: `R${totalPayroll.toFixed(0)}`, icon: <DollarSign size={20} />, color: 'text-emerald-600', bg: 'bg-emerald-50' }
          ].map((kpi, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${kpi.bg} ${kpi.color}`}>
                  {kpi.icon}
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-1">{kpi.label}</p>
              <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Events */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Today's Events</h3>
            {todayEvents.length === 0 ? (
              <p className="text-gray-400 text-sm">No events today</p>
            ) : (
              <div className="space-y-3">
                {todayEvents.slice(0, 5).map(ev => (
                  <div key={ev.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${
                      ev.status === 'Confirmed' ? 'bg-green-500' : 'bg-yellow-500'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{ev.title}</p>
                      <p className="text-xs text-gray-500">{ev.startTime} - {ev.endTime}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Quick Stats</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Confirmed Today</span>
                  <span className="text-green-600 font-medium">{confirmedToday}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Pending Today</span>
                  <span className="text-yellow-600 font-medium">{pendingToday}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Total Hours</span>
                  <span className="text-blue-600 font-medium">{totalHours.toFixed(1)}h</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Active Staff</span>
                  <span className="text-purple-600 font-medium">{activeStaff}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Last Refresh */}
        <div className="mt-6 text-xs text-gray-400 text-right">
          Last updated: {lastRefresh.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
