/**
 * Unified Calendar View - Google + Apple Calendars
 * Uses: Google OAuth + Apple Calendar JSON (embedded at build time)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { fetchGoogleCalendarEvents } from '../../lib/googleCalendar';

// Import Apple Calendar events (embedded at build time)
import appleCalendarEvents from '../../data/apple-calendar-events.json';

const UnifiedCalendarView = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [googleStatus, setGoogleStatus] = useState({ connected: false, count: 0, error: null });
  const [appleStatus, setAppleStatus] = useState({ connected: true, count: 0, error: null });
  const [selectedSource, setSelectedSource] = useState('all');

  useEffect(() => {
    loadUnifiedCalendar();
  }, []);

  const loadUnifiedCalendar = async () => {
    setLoading(true);
    setError(null);
    
    let allEvents = [];
    let googleEvents = [];
    let appleEvents = [];

    // 1. Load Apple Calendar events (from embedded JSON)
    try {
      console.log('[Apple Calendar] Loading from embedded JSON...', appleCalendarEvents?.length);
      
      // Validate data
      if (!appleCalendarEvents || !Array.isArray(appleCalendarEvents)) {
        throw new Error('Apple events data is not an array');
      }
      
      appleEvents = appleCalendarEvents.map((ev, index) => ({
        id: ev.id || `apple-${index}-${Date.now()}`,
        title: ev.title || 'Untitled Event',
        start: ev.start || null,
        end: ev.end || null,
        description: ev.description || '',
        location: ev.location || '',
        calendar: ev.calendar || 'iCloud Calendar',
        calendarId: ev.calendarId || 'icloud-feed',
        source: 'apple',
        sourceType: 'icloud-feed',
        color: '#34C759',
        backgroundColor: '#34C75920'
      }));
      
      setAppleStatus({ connected: true, count: appleEvents.length, error: null });
      allEvents = [...allEvents, ...appleEvents];
      console.log(`[Apple Calendar] Loaded ${appleEvents.length} events`);
    } catch (err) {
      console.error('[Apple Calendar] Error:', err);
      setAppleStatus({ connected: false, count: 0, error: err.message });
    }

    // 2. Fetch Google Calendar events (uses your existing OAuth)
    try {
      const token = await getGoogleToken();
      if (token) {
        const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
        
        googleEvents = await fetchGoogleCalendarEvents(token, timeMin, timeMax);
        
        const formattedGoogle = googleEvents.map(ev => ({
          id: ev.id || `google-${Date.now()}-${Math.random()}`,
          title: ev.summary || 'Untitled',
          start: ev.start?.dateTime || ev.start?.date || null,
          end: ev.end?.dateTime || ev.end?.date || null,
          description: ev.description || '',
          location: ev.location || '',
          calendar: ev.calendarName || 'Google Calendar',
          calendarId: ev.calendarId || 'google',
          source: 'google',
          sourceType: 'google',
          color: '#4285F4',
          backgroundColor: '#4285F420'
        }));
        
        allEvents = [...allEvents, ...formattedGoogle];
        setGoogleStatus({ connected: true, count: formattedGoogle.length, error: null });
      } else {
        setGoogleStatus({ connected: false, count: 0, error: 'No Google token' });
      }
    } catch (err) {
      console.error('[Google Calendar] Error:', err);
      setGoogleStatus({ connected: false, count: 0, error: err.message });
    }

    // Sort by start date
    allEvents.sort((a, b) => {
      const dateA = a.start ? new Date(a.start) : new Date(0);
      const dateB = b.start ? new Date(b.start) : new Date(0);
      return dateA - dateB;
    });

    setEvents(allEvents);
    setLoading(false);
  };

  const getGoogleToken = async () => {
    try {
      const { getAuth, onAuthStateChanged } = await import('firebase/auth');
      const auth = getAuth();
      
      return new Promise((resolve) => {
        onAuthStateChanged(auth, async (user) => {
          if (user) {
            const token = await user.getIdToken();
            resolve(token);
          } else {
            resolve(null);
          }
        });
      });
    } catch (err) {
      console.error('Firebase auth error:', err);
      return null;
    }
  };

  const filteredEvents = selectedSource === 'all' 
    ? events 
    : events.filter(e => e.source === selectedSource);

  const formatEventDate = (dateStr) => {
    if (!dateStr) return 'No date';
    try {
      const date = parseISO(dateStr);
      return format(date, 'MMM d, yyyy h:mm a');
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              {[1,2,3].map(i => (
                <div key={i} className="h-10 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Unified Calendar</h2>
        <p className="text-gray-600">Google Calendar + Apple Calendar (iCloud Feed)</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className={`p-4 rounded-lg border ${googleStatus.connected ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Google Calendar</h3>
              <p className="text-sm text-gray-600">{googleStatus.count} events</p>
            </div>
            <div className={`w-3 h-3 rounded-full ${googleStatus.connected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
          </div>
          {googleStatus.error && <p className="text-xs text-red-600 mt-1">{googleStatus.error}</p>}
        </div>

        <div className={`p-4 rounded-lg border ${appleStatus.connected ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Apple Calendar</h3>
              <p className="text-sm text-gray-600">{appleStatus.count} events</p>
            </div>
            <div className={`w-3 h-3 rounded-full ${appleStatus.connected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
          </div>
          {appleStatus.error && <p className="text-xs text-red-600 mt-1">{appleStatus.error}</p>}
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <select 
          value={selectedSource} 
          onChange={(e) => setSelectedSource(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="all">All Calendars ({events.length})</option>
          <option value="google">Google Only ({events.filter(e => e.source === 'google').length})</option>
          <option value="apple">Apple Only ({events.filter(e => e.source === 'apple').length})</option>
        </select>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Events List */}
      <div className="space-y-3">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No events found</p>
          </div>
        ) : (
          filteredEvents.map((event) => (
            <div 
              key={event.id} 
              className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              style={{ borderLeftColor: event.color, borderLeftWidth: '4px' }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{event.title}</h4>
                  <div className="mt-1 space-y-1 text-sm text-gray-600">
                    <p>📅 {formatEventDate(event.start)} - {formatEventDate(event.end)}</p>
                    {event.location && <p>📍 {event.location}</p>}
                    {event.description && (
                      <p className="text-gray-500">📝 {event.description.substring(0, 100)}</p>
                    )}
                  </div>
                </div>
                <div className="ml-4 flex flex-col items-end">
                  <span 
                    className="px-2 py-1 text-xs rounded-full text-white"
                    style={{ backgroundColor: event.color }}
                  >
                    {event.source === 'google' ? 'Google' : 'Apple'}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">{event.calendar}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Refresh Button */}
      <div className="mt-6">
        <button
          onClick={loadUnifiedCalendar}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          Refresh Google Calendar
        </button>
        <p className="text-xs text-gray-500 mt-2">
          Apple Calendar: {appleStatus.count} events (embedded in build). 
          Re-run build script to refresh.
        </p>
      </div>
    </div>
  );
};

export default UnifiedCalendarView;