import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
  'en-US': require('date-fns/locale/en-US'),
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const CalendarView = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch(`http://${window.location.hostname}:3001/api/events`);
        const data = await res.json();
        const calendarEvents = data.events.map((event) => {
          const start = new Date(event.date);
          const end = new Date(start.getTime() + event.duration * 60 * 60 * 1000);
          return {
            title: `${event.title} (${event.staff_assigned})`,
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
    <div className="p-4 sm:p-6">
      <h2 className="text-2xl font-bold text-gray-100 mb-6">Event Calendar</h2>
      <div className="bg-gray-800 rounded-lg p-4 h-[60vh] sm:h-[70vh]">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          className="text-gray-100"
        />
      </div>
    </div>
  );
};

export default CalendarView;
