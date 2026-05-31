/**
 * Unified Calendar View Component
 * Displays events from both Google Calendar (client-side OAuth) and Apple Calendar (via Nylas API)
 * Color-coded by source with event details
 */

import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { fetchGoogleCalendarEvents } from '../../lib/googleCalendar';

const UnifiedCalendarView = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [googleStatus, setGoogleStatus] = useState({ connected: false, error: null, count: 0 });
  const [appleStatus, setAppleStatus] = useState({ connected: false, error: null, count: 0 });
  const [googleToken, setGoogleToken] = useState(null);

  useEffect(() => {
    // Try to get Google OAuth token from Firebase/auth
    const getGoogleToken = async () => {
      try {
        // Dynamic import to avoid SSR issues
        const { getAuth, onAuthStateChanged } = await import('firebase/auth');
        const auth = getAuth();
        
        onAuthStateChanged(auth, async (user) => {
          if (user) {
            const token = await user.getIdToken();
            setGoogleToken(token);
            fetchUnifiedCalendar(token);
          } else {
            // No user signed in - try without token
            fetchUnifiedCalendar(null);
          }
        });
      } catch (err) {
        console.error('Firebase auth error:', err);
        fetchUnifiedCalendar(null);
      }
    };

    getGoogleToken();
  }, []);

  const fetchUnifiedCalendar = async (googleToken) => {
    try {
      setLoading(true);
      let allEvents = [];
      let googleEvents = [];
      let appleEvents = [];

      // ========== FETCH GOOGLE CALENDAR (client-side OAuth) ==========
      if (googleToken) {
        try {
          const now = new Date();
          const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
          const timeMax = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
          
          const googleData = await fetchGoogleCalendarEvents(googleToken, timeMin, timeMax);
          
          googleEvents = (googleData || []).map(event => ({
            id: event.id,
            title: event.summary || 'Untitled Event',
            start: event.start?.dateTime || event.start?.date || null,
            end: event.end?.dateTime || event.end?.date || null,
            description: event.description || '',
            location: event.location || '',
            calendar: 'Google Calendar',
            calendarId: 'primary',
            source: 'google',
            sourceType: 'google',
            color: '#4285F4'
          }));

          setGoogleStatus({ connected: true, error: null, count: googleEvents.length });
        } catch (err) {
          console.error('Google Calendar error:', err);
          setGoogleStatus({ connected: false, error: err.message, count: 0 });
        }
      } else {
        setGoogleStatus({ connected: false, error: 'No Google OAuth token. Sign in to view Google Calendar.', count: 0 });
      }

      // ========== FETCH APPLE CALENDAR (via Nylas API) ==========
      try {
        const response = await fetch('/api/calendar/unified');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        setAppleStatus({
          connected: data.apple?.connected || false,
          error: data.apple?.error || null,
          count: data.apple?.count || 0
        });

        appleEvents = data.apple?.events || [];
      } catch (err) {
        console.error('Apple Calendar error:', err);
        setAppleStatus({ connected: false, error: err.message, count: 0 });
      }

      // ========== COMBINE & SORT ==========
      allEvents = [...googleEvents, ...appleEvents];
      
      // Sort by start date
      allEvents.sort((a, b) => {
        const dateA = new Date(a.start || 0);
        const dateB = new Date(b.start || 0);
        return dateA - dateB;
      });

      setEvents(allEvents);
      setError(null);
    } catch (err) {
      console.error('Error fetching unified calendar:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getSourceColor = (source) => {
    switch (source) {
      case 'google':
        return 'bg-blue-100 border-blue-500 text-blue-800';
      case 'apple':
        return 'bg-green-100 border-green-500 text-green-800';
      default:
        return 'bg-gray-100 border-gray-500 text-gray-800';
    }
  };

  const getSourceLabel = (source) => {
    switch (source) {
      case 'google':
        return 'Google';
      case 'apple':
        return 'Apple (Nylas)';
      default:
        return 'Unknown';
    }
  };

  const formatEventDate = (dateString) => {
    if (!dateString) return 'No date';
    try {
      const date = parseISO(dateString);
      return format(date, 'MMM d, yyyy h:mm a');
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-lg text-gray-600">Loading unified calendar...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Unified Calendar View</h1>
        <p className="text-gray-600">Events from Google Calendar and Apple Calendar (via Nylas)</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className={`p-4 rounded-lg border ${googleStatus.connected ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Google Calendar</h3>
              <p className="text-sm text-gray-600">
                {googleStatus.connected ? `Connected - ${googleStatus.count} events` : 'Not connected'}
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${googleStatus.connected ? 'bg-blue-200 text-blue-800' : 'bg-red-200 text-red-800'}`}>
              {googleStatus.connected ? 'Online' : 'Offline'}
            </div>
          </div>
          {googleStatus.error && (
            <p className="text-sm text-red-600 mt-2">{googleStatus.error}</p>
          )}
        </div>

        <div className={`p-4 rounded-lg border ${appleStatus.connected ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Apple Calendar (Nylas)</h3>
              <p className="text-sm text-gray-600">
                {appleStatus.connected ? `Connected - ${appleStatus.count} events` : 'Not connected'}
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${appleStatus.connected ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
              {appleStatus.connected ? 'Online' : 'Offline'}
            </div>
          </div>
          {appleStatus.error && (
            <p className="text-sm text-red-600 mt-2">{appleStatus.error}</p>
          )}
          {!appleStatus.connected && !appleStatus.error && (
            <p className="text-sm text-gray-600 mt-2">
              Connect iCloud at <a href="https://dashboard.nylas.com" target="_blank" className="text-blue-600 hover:underline">Nylas Dashboard</a>
            </p>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">Error: {error}</p>
        </div>
      )}

      {/* Events List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            All Events ({events.length})
          </h2>
        </div>

        {events.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No events found. Check your calendar connections.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {events.map((event, index) => (
              <div key={`${event.source}-${event.id}-${index}`} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded border ${getSourceColor(event.source)}`}>
                        {getSourceLabel(event.source)}
                      </span>
                      <h3 className="text-lg font-medium text-gray-900">{event.title}</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Calendar:</span> {event.calendar || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Start:</span> {formatEventDate(event.start)}
                      </div>
                      <div>
                        <span className="font-medium">End:</span> {formatEventDate(event.end)}
                      </div>
                      {event.location && (
                        <div>
                          <span className="font-medium">Location:</span> {event.location}
                        </div>
                      )}
                    </div>

                    {event.description && (
                      <p className="mt-2 text-sm text-gray-500 line-clamp-2">{event.description}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Refresh Button */}
      <div className="mt-6 text-center">
        <button
          onClick={() => fetchUnifiedCalendar(googleToken)}
          disabled={loading}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          Refresh Calendar
        </button>
      </div>
    </div>
  );
};

export default UnifiedCalendarView;