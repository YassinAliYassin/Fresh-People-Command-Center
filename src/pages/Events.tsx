import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Trash2, 
  CheckCircle, 
  Clock, 
  MessageSquare, 
  Users, 
  MapPin, 
  Phone, 
  Mail,
  Star,
  AlertTriangle,
  Info
} from 'lucide-react';
import { OperationalEvent, PRIORITY_COLORS, getPriorityColor, getStatusBadge } from '../types/event-system';

// Mock data for demonstration - replace with actual API call
const mockEvents: OperationalEvent[] = [
  {
    id: '1',
    title: 'VIP Wedding Reception',
    startDate: new Date('2026-06-15T18:00:00'),
    endDate: new Date('2026-06-16T02:00:00'),
    duration: 8,
    client: {
      id: 'c1',
      name: 'Ahmed Al-Mansouri',
      contactPerson: 'Ahmed',
      phone: '+971501234567',
      email: 'ahmed@email.com',
      vipStatus: true
    },
    staff: [
      { id: 's1', name: 'Mohammed Ali', role: 'Head Security', status: 'ASSIGNED', checkInTime: undefined, avatar: undefined },
      { id: 's2', name: 'Sarah Johnson', role: 'Team Lead', status: 'ASSIGNED', checkInTime: undefined, avatar: undefined }
    ],
    primaryStaff: { id: 's1', name: 'Mohammed Ali', role: 'Head Security', status: 'ASSIGNED', checkInTime: undefined, avatar: undefined },
    venue: {
      id: 'v1',
      name: 'Burj Al Arab Ballroom',
      address: 'Jumeirah Beach Road',
      city: 'Dubai',
      capacity: 500,
      tier: 'Luxury Class'
    },
    location: 'Dubai, UAE',
    priority: 'VIP',
    status: 'CONFIRMED',
    description: 'High-profile wedding reception for VIP client',
    requirements: 'Elite security team, discrete service',
    dressCode: 'Black Tie',
    budget: 50000,
    staffNeeded: 10,
    staffConfirmed: 8,
    isDirectBooking: true,
    source: 'local',
    totalCost: 45000,
    revenue: 50000,
    profit: 5000,
    createdAt: new Date('2026-06-01'),
    updatedAt: new Date('2026-06-10'),
    createdBy: 'admin',
    notes: 'VIP client - extra attention required',
    tags: ['vip', 'wedding', 'high-profile']
  },
  {
    id: '2',
    title: 'Corporate Event - Annual Gala',
    startDate: new Date('2026-06-20T19:00:00'),
    endDate: new Date('2026-06-21T01:00:00'),
    duration: 6,
    client: {
      id: 'c2',
      name: 'Emirates Group',
      contactPerson: 'Lisa Chen',
      phone: '+971502345678',
      email: 'lisa.chen@emirates.com',
      vipStatus: false
    },
    staff: [
      { id: 's3', name: 'James Wilson', role: 'Coordinator', status: 'ASSIGNED', checkInTime: undefined, avatar: undefined }
    ],
    venue: {
      id: 'v2',
      name: 'Atlantis The Palm',
      address: 'Crescent Road',
      city: 'Dubai',
      capacity: 1000,
      tier: 'Premium Estate'
    },
    location: 'Dubai, UAE',
    priority: 'HIGH',
    status: 'SCHEDULED',
    description: 'Annual corporate gala dinner',
    requirements: 'Professional staff, formal service',
    dressCode: 'Business Formal',
    budget: 30000,
    staffNeeded: 15,
    staffConfirmed: 10,
    isDirectBooking: false,
    source: 'icloud',
    totalCost: 28000,
    revenue: 30000,
    profit: 2000,
    createdAt: new Date('2026-06-05'),
    updatedAt: new Date('2026-06-10'),
    createdBy: 'admin',
    notes: undefined,
    tags: ['corporate', 'gala', 'annual']
  },
  {
    id: '3',
    title: 'Birthday Party',
    startDate: new Date('2026-06-25T20:00:00'),
    endDate: new Date('2026-06-26T00:00:00'),
    duration: 4,
    client: {
      id: 'c3',
      name: 'Fatima Hassan',
      contactPerson: 'Fatima',
      phone: '+971503456789',
      email: 'fatima@email.com',
      vipStatus: false
    },
    staff: [],
    venue: {
      id: 'v3',
      name: 'Private Villa',
      address: 'Palm Jumeirah',
      city: 'Dubai',
      capacity: 100,
      tier: 'Aesthetic Loft'
    },
    location: 'Dubai, UAE',
    priority: 'NORMAL',
    status: 'PENDING',
    description: 'Private birthday celebration',
    requirements: undefined,
    dressCode: 'Smart Casual',
    budget: 5000,
    staffNeeded: 3,
    staffConfirmed: 0,
    isDirectBooking: true,
    source: 'local',
    totalCost: undefined,
    revenue: undefined,
    profit: undefined,
    createdAt: new Date('2026-06-08'),
    updatedAt: new Date('2026-06-08'),
    createdBy: 'admin',
    notes: undefined,
    tags: ['birthday', 'private']
  }
];

interface EventsPageProps {
  refreshKey?: number;
}

const Events: React.FC<EventsPageProps> = ({ refreshKey }) => {
  const [events, setEvents] = useState<OperationalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');

  const fetchEvents = async () => {
    try {
      setLoading(true);
      // In production, replace with actual API call
      // const res = await fetch('/api/events');
      // if (!res.ok) throw new Error('Failed to fetch events');
      // const data = await res.json();
      // setEvents(data.events || []);
      
      // Using mock data for now
      setTimeout(() => {
        setEvents(mockEvents);
        setLoading(false);
      }, 500);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const deleteEvent = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    try {
      // await fetch(`/api/events/${id}`, { method: 'DELETE' });
      setEvents(events.filter(e => e.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [refreshKey]);

  const filteredEvents = selectedPriority === 'ALL' 
    ? events 
    : events.filter(e => e.priority === selectedPriority);

  const getPriorityIcon = (priority: string) => {
    switch(priority) {
      case 'VIP': return <Star size={14} className="inline" />;
      case 'HIGH': return <AlertTriangle size={14} className="inline" />;
      case 'NORMAL': return <Info size={14} className="inline" />;
      case 'LOW': return <Info size={14} className="inline" />;
      default: return null;
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="text-gray-400 text-center py-20">Loading events...</div>
    </div>
  );
  
  if (error) return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="text-red-400 text-center py-20">{error}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      {/* Event Intelligence Agent Header */}
      <div className="mb-8 border-b border-gray-800 pb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-black font-bold text-xl shadow-lg">
            E
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight">
              Event Intelligence Agent
            </h1>
            <p className="text-gray-400 text-lg mt-1">
              Command Center • Operational Event Management System
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            <span>System Online</span>
          </div>
          <span>•</span>
          <span>{events.length} Active Events</span>
          <span>•</span>
          <span>{events.filter(e => e.priority === 'VIP').length} VIP Events</span>
        </div>
      </div>

      {/* Priority Filter */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {['ALL', 'VIP', 'HIGH', 'NORMAL', 'LOW'].map(priority => (
          <button
            key={priority}
            onClick={() => setSelectedPriority(priority)}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              selectedPriority === priority
                ? 'bg-white text-black shadow-lg'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
            }`}
            style={
              selectedPriority === priority && priority !== 'ALL'
                ? { backgroundColor: PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS].primary, color: 'white' }
                : {}
            }
          >
            {priority === 'ALL' ? 'All Events' : `${getPriorityIcon(priority)} ${priority}`}
            <span className="ml-2 text-xs opacity-70">
              ({priority === 'ALL' ? events.length : events.filter(e => e.priority === priority).length})
            </span>
          </button>
        ))}
      </div>

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <div className="text-gray-500 text-center py-20 text-lg">
          <Calendar size={48} className="mx-auto mb-4 opacity-50" />
          <p>No events found. Create a new event to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map(event => (
            <EventCard key={event.id} event={event} onDelete={deleteEvent} />
          ))}
        </div>
      )}
    </div>
  );
};

interface EventCardProps {
  event: OperationalEvent;
  onDelete: (id: string) => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, onDelete }) => {
  const priorityColors = getPriorityColor(event.priority);
  const statusBadge = getStatusBadge(event.status);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    if (status === 'CONFIRMED' || status === 'COMPLETED') {
      return <CheckCircle size={14} className="text-green-400" />;
    }
    return <Clock size={14} className="text-yellow-400" />;
  };

  return (
    <div 
      className={`bg-gray-800 rounded-xl p-6 border transition-all duration-300 hover:transform hover:scale-[1.02] hover:shadow-2xl ${event.status === 'PENDING' ? 'animate-pulse' : ''}`}
      style={{
        borderColor: priorityColors.border,
        backgroundColor: 'rgba(31, 41, 55, 0.8)',
        backdropFilter: 'blur(10px)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 0 30px ${priorityColors.glow}, 0 0 60px ${priorityColors.glow}`;
        e.currentTarget.style.borderColor = priorityColors.primary;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = priorityColors.border;
      }}
    >
      {/* Priority & Status Header */}
      <div className="flex justify-between items-start mb-4">
        <div 
          className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
          style={{ 
            backgroundColor: priorityColors.bg, 
            color: priorityColors.primary,
            border: `1px solid ${priorityColors.border}`
          }}
        >
          {event.priority} Priority
        </div>
        <div 
          className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1"
          style={{ 
            backgroundColor: statusBadge.bg, 
            color: statusBadge.color 
          }}
        >
          {getStatusIcon(event.status)}
          {event.status}
        </div>
      </div>

      {/* Event Title */}
      <h3 className="text-xl font-bold text-white mb-3 leading-tight">
        {event.title}
      </h3>

      {/* Client Information */}
      <div className="mb-4 p-3 rounded-lg bg-gray-900/50 border border-gray-700/50">
        <div className="flex items-center gap-2 mb-2">
          <Users size={16} className="text-yellow-400" />
          <span className="text-sm font-semibold text-gray-200">Client</span>
        </div>
        <div className="text-white font-medium">{event.client.name}</div>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Phone size={12} /> {event.client.phone}
          </span>
          {event.client.vipStatus && (
            <span className="flex items-center gap-1 text-yellow-400">
              <Star size={12} /> VIP
            </span>
          )}
        </div>
      </div>

      {/* Venue Information */}
      <div className="mb-4 flex items-start gap-2 text-sm text-gray-300">
        <MapPin size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
        <div>
          <div className="font-medium text-white">{event.venue.name}</div>
          <div className="text-xs text-gray-400">{event.venue.tier} • Capacity: {event.venue.capacity}</div>
        </div>
      </div>

      {/* Date & Time */}
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-300">
        <Calendar size={16} className="text-green-400" />
        <span>{formatDate(event.startDate)} - {event.duration}h</span>
      </div>

      {/* Assigned Staff */}
      {event.staff && event.staff.length > 0 ? (
        <div className="mb-4 p-3 rounded-lg bg-gray-900/50 border border-gray-700/50">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare size={16} className="text-blue-400" />
            <span className="text-sm font-semibold text-gray-200">
              Staff Assigned ({event.staff.length}/{event.staffNeeded})
            </span>
          </div>
          <div className="space-y-1">
            {event.staff.map((staff, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-blue-300">{staff.name}</span>
                <span className="text-xs text-gray-500">{staff.role}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-4 p-3 rounded-lg bg-gray-900/30 border border-gray-700/30 text-sm text-gray-500 italic">
          No staff assigned yet
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-700">
        <button
          onClick={() => onDelete(event.id)}
          className="flex-1 px-4 py-2 rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium"
        >
          <Trash2 size={16} />
          Delete
        </button>
      </div>
    </div>
  );
};

export default Events;
