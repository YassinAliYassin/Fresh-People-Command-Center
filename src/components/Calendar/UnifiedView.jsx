/**
 * Unified Calendar View - SIMPLIFIED VERSION
 * Renders Google and Apple Calendar events
 * Props: googleEvents, appleEvents, currentYear, currentMonth, selectedDateStr
 * 
 * FIX: Pure functional component - no useEffect/state blocking unmounting
 * FIX: Filter to only show current + upcoming events (last 30 days + future)
 */

import React from 'react';
import { format, parseISO } from 'date-fns';

// Get current date string in YYYY-MM-DD format
const getTodayStr = () => {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const UnifiedCalendarView = ({ 
  googleEvents = [], 
  appleEvents = [],
  currentYear = new Date().getFullYear(),
  currentMonth = new Date().getMonth(),
  selectedDateStr = getTodayStr()
}) => {
  
  // Ensure events are arrays
  const googleEventsArray = Array.isArray(googleEvents) ? googleEvents : [];
  const appleEventsArray = Array.isArray(appleEvents) ? appleEvents : [];
  
  // Combine Google and Apple events
  const combinedEvents = [
    // Format Google events
    ...googleEventsArray.map((ev, index) => ({
      id: ev.id || `google-${index}`,
      title: ev.title || ev.summary || 'Untitled Event',
      start: ev.start?.dateTime || ev.start?.date || null,
      end: ev.end?.dateTime || ev.end?.date || null,
      description: ev.description || '',
      location: ev.location || '',
      calendar: 'Google Calendar',
      source: 'google',
      color: '#4285F4'
    })),
    // Format Apple events (use passed appleEvents or fallback to embedded)
    ...appleEventsArray.map((ev, index) => ({
      id: ev.id || `apple-${index}`,
      title: ev.title || 'Untitled Event',
      start: ev.start || ev.startTime || null,
      end: ev.end || ev.endTime || null,
      description: ev.description || ev.notes || '',
      location: ev.location || '',
      calendar: 'iCloud Calendar',
      source: 'apple',
      color: '#34C759'
    }))
  ];

  // FILTER: Only show events from last 30 days + upcoming (hide old 2024/2025 events)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days ago
  
  const filteredEvents = combinedEvents.filter(ev => {
    if (!ev.start) return false;
    try {
      const startDate = parseISO(ev.start);
      return startDate >= cutoffDate;
    } catch {
      return false;
    }
  });

  const formatEventDate = (dateStr) => {
    if (!dateStr) return 'No date';
    try {
      const date = parseISO(dateStr);
      return format(date, 'MMM d, yyyy h:mm a');
    } catch {
      return dateStr || 'Invalid date';
    }
  };

  console.log(`[UnifiedView] Rendering ${filteredEvents.length} events (${googleEventsArray.length} Google, ${appleEventsArray.length} Apple, filtered from ${combinedEvents.length} total)`);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Unified Calendar</h2>
        <p className="text-gray-400">Apple Calendar (iCloud Feed) - {filteredEvents.length} events (showing last 30 days + upcoming)</p>
      </div>

      {/* Status */}
      <div className="mb-6 p-4 bg-green-900 border border-green-700 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white">Apple Calendar</h3>
            <p className="text-sm text-gray-300">{filteredEvents.length} events loaded (last 30 days + upcoming)</p>
          </div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-3">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No events found</p>
          </div>
        ) : (
          filteredEvents.slice(0, 50).map((event) => (
            <div 
              key={event.id} 
              className="p-4 border border-gray-700 rounded-lg hover:shadow-md transition-shadow bg-gray-800"
              style={{ borderLeftColor: event.color, borderLeftWidth: '4px' }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-white">{event.title}</h4>
                  <div className="mt-1 space-y-1 text-sm text-gray-300">
                    <p>📅 {formatEventDate(event.start)} - {formatEventDate(event.end)}</p>
                    {event.location && <p>📍 {event.location}</p>}
                    {event.description && event.description.length > 0 && (
                      <p className="text-gray-400">📝 {event.description.substring(0, 100)}</p>
                    )}
                  </div>
                </div>
                <div className="ml-4 flex flex-col items-end">
                  <span 
                    className="px-2 py-1 text-xs rounded-full text-white"
                    style={{ backgroundColor: event.color }}
                  >
                    {event.source === 'apple' ? 'Apple' : 'Google'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {filteredEvents.length > 50 && (
        <p className="text-sm text-gray-400 mt-4 text-center">
          Showing 50 of {filteredEvents.length} events
        </p>
      )}
    </div>
  );
};

export default UnifiedCalendarView;
