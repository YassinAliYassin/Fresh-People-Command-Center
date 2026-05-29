import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import { enUS } from 'date-fns/locale/en-US';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Dark theme styles for react-big-calendar
const calendarStyles = `
  .rbc-calendar {
    color: #e5e7eb;
  }
  .rbc-header {
    background: #1f2937;
    color: #e5e7eb;
    border-color: #374151;
    padding: 8px;
  }
  .rbc-month-view, .rbc-time-view {
    border-color: #374151;
  }
  .rbc-day-bg {
    background: #111827;
  }
  .rbc-off-range-bg {
    background: #0f172a;
  }
  .rbc-today {
    background: #1e3a5f;
  }
  .rbc-event {
    background: #2563eb;
    border-radius: 4px;
    padding: 2px 6px;
  }
  .rbc-show-more {
    color: #60a5fa;
    background: transparent;
  }
  .rbc-toolbar button {
    color: #e5e7eb;
    border-color: #374151;
    background: #1f2937;
  }
  .rbc-toolbar button:hover {
    background: #374151;
  }
  .rbc-toolbar button.rbc-active {
    background: #2563eb;
    border-color: #2563eb;
  }
  .rbc-time-slot {
    border-color: #374151;
  }
  .rbc-timeslot-group {
    border-color: #374151;
  }
  .rbc-time-content {
    border-color: #374151;
  }
  .rbc-time-header-content {
    border-color: #374151;
  }
  .rbc-time-view .rbc-row {
    border-color: #374151;
  }
`;

const CalendarView = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/events');
        const data = await res.json();
        const calendarEvents = data.events.map((event) => {
          const start = new Date(event.date);
          const end = new Date(start.getTime() + event.duration * 60 * 60 * 1000);
          const staffList = Array.isArray(event.staff_assigned) 
            ? event.staff_assigned.join(', ') 
            : event.staff_assigned || 'Unassigned';
          return {
            title: `${event.title} • ${staffList}`,
            start,
            end,
            resource: event,
          };
        });
        setEvents(calendarEvents);
      } catch (err) {
        console.error('Failed to fetch calendar events:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  if (loading) return <div className="text-gray-300 p-6">Loading calendar...</div>;

  return (
    <div className="bg-gray-900 rounded-xl shadow-lg border border-gray-800 p-6">
      <style>{calendarStyles}</style>
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <span className="text-blue-400">📅</span>
        Event Calendar
      </h2>
      <div className="h-[60vh] sm:h-[70vh]">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
        />
      </div>
    </div>
  );
};

export default CalendarView;
