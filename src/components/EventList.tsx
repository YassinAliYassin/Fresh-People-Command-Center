import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { BackendEvent } from '../types';
import EventCard from './EventCard';

const EventList: React.FC<{ refreshKey: number }> = ({ refreshKey }) => {
  const [events, setEvents] = useState<BackendEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events');
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      setEvents(data.events || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteEvent = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    try {
      await fetch(`/api/events/${id}`, { method: 'DELETE' });
      fetchEvents();
    } catch (err: any) {
      alert(err.message);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [refreshKey]);

  if (loading) return <div className="text-gray-400 p-6">Loading events...</div>;
  if (error) return <div className="text-red-400 p-6">{error}</div>;

  return (
      <div className="bg-gray-900 text-white p-6 rounded-xl shadow-lg border border-gray-800 max-h-[70vh] overflow-y-auto">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-green-400" />
        Events ({events.length})
      </h2>

      {events.length === 0 ? (
        <div className="text-gray-500 text-center py-8">No events yet. Create one above!</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map(event => (
            <EventCard key={event.id} event={event} onDelete={deleteEvent} />
          ))}
        </div>
      )}
    </div>
  );
};

export default EventList;
