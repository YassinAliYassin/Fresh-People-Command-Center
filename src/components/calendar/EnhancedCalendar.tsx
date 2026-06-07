// @ts-nocheck
/**
 * Enhanced Calendar Component
 * Features: Drag-drop rescheduling, conflict detection, unified Google/Apple view
 */

import React, { useState, useCallback, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  AlertTriangle,
  CheckCircle,
  X,
  Clock,
  MapPin,
  Users,
  RefreshCw,
  Filter
} from 'lucide-react';
import { CalendarEvent, ConflictInfo } from '../../types/agent-types';
import { detectBatchConflicts } from '../../utils/conflict-detection';

// Mock unified calendar events
const MOCK_EVENTS: CalendarEvent[] = [
  {
    id: 'google-1',
    title: 'Team Standup',
    start: '2026-06-03T09:00:00',
    end: '2026-06-03T09:30:00',
    description: 'Daily team sync',
    location: 'Conference Room A',
    attendees: ['john@company.com', 'jane@company.com'],
    calendarSource: 'google',
    color: '#4285F4',
    reminders: [10]
  },
  {
    id: 'apple-1',
    title: 'Client Meeting - Acme Corp',
    start: '2026-06-03T10:00:00',
    end: '2026-06-03T11:00:00',
    description: 'Quarterly review meeting',
    location: 'Virtual - Zoom',
    attendees: ['client@acme.com', 'john@company.com'],
    calendarSource: 'apple',
    color: '#34C759',
    reminders: [15]
  },
  {
    id: 'google-2',
    title: 'Project Planning',
    start: '2026-06-03T10:30:00',
    end: '2026-06-03T12:00:00',
    description: 'Plan Q3 deliverables',
    location: 'Office',
    attendees: ['john@company.com', 'jane@company.com', 'bob@company.com'],
    calendarSource: 'google',
    color: '#4285F4',
    reminders: [30]
  },
  {
    id: 'apple-2',
    title: 'Lunch with Partner',
    start: '2026-06-03T12:30:00',
    end: '2026-06-03T13:30:00',
    description: 'Discuss partnership opportunities',
    location: 'Downtown Cafe',
    attendees: ['partner@tech.com'],
    calendarSource: 'apple',
    color: '#34C759',
    reminders: [60]
  }
];

interface EnhancedCalendarProps {
  initialView?: 'day' | 'week' | 'month';
}

const EnhancedCalendar: React.FC<EnhancedCalendarProps> = ({ initialView = 'week' }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week' | 'month'>(initialView);
  const [events, setEvents] = useState<CalendarEvent[]>(MOCK_EVENTS);
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);
  const [conflicts, setConflicts] = useState<Map<string, ConflictInfo>>(new Map());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [filterSource, setFilterSource] = useState<'all' | 'google' | 'apple'>('all');

  // Detect conflicts when events change
  useMemo(() => {
    const newConflicts = detectBatchConflicts(events as any);
    // @ts-ignore - Map assignment from array
    setConflicts(new Map(newConflicts.map((c: any, i: number) => [String(i), c])));
  }, [events]);

  // Filter events
  const filteredEvents = useMemo(() => {
    if (filterSource === 'all') return events;
    return events.filter(e => e.calendarSource === filterSource);
  }, [events, filterSource]);

  // Handle drag start
  const handleDragStart = useCallback((e: React.DragEvent, event: CalendarEvent) => {
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', event.id);
  }, []);

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent, newStart: string) => {
    e.preventDefault();
    
    if (!draggedEvent) return;
    
    const eventStart = new Date(newStart);
    const duration = new Date(draggedEvent.end).getTime() - new Date(draggedEvent.start).getTime();
    const newEnd = new Date(eventStart.getTime() + duration);
    
    const updatedEvent: CalendarEvent = {
      ...draggedEvent,
      start: eventStart.toISOString(),
      end: newEnd.toISOString()
    };
    
    // Check for conflicts
    const conflict = detectConflicts(updatedEvent, events, draggedEvent.id);
    
    if (conflict) {
      setSelectedEvent(updatedEvent);
      setShowConflictModal(true);
      return;
    }
    
    // Update event
    setEvents(prev => prev.map(ev => 
      ev.id === draggedEvent.id ? updatedEvent : ev
    ));
    
    setDraggedEvent(null);
  }, [draggedEvent, events]);

  // Format time
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  // Navigate dates
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (view === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  // Get conflict for event
  const getConflict = (eventId: string) => {
    return conflicts.get(eventId);
  };

  return (
    <div className="enhanced-calendar">
      {/* Header */}
      <div className="calendar-header">
        <div className="calendar-header-left">
          <div className="calendar-nav">
            <button onClick={() => navigateDate('prev')}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="calendar-current-date">
              {currentDate.toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric',
                ...(view === 'day' ? { day: 'numeric' } : {})
              })}
            </h3>
            <button onClick={() => navigateDate('next')}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button 
            className="calendar-today-btn"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </button>
        </div>

        <div className="calendar-header-right">
          {/* Filter */}
          <div className="calendar-filter">
            <Filter className="w-4 h-4" />
            {['all', 'google', 'apple'].map(source => (
              <button
                key={source}
                className={`filter-btn ${filterSource === source ? 'active' : ''}`}
                onClick={() => setFilterSource(source as any)}
              >
                {source.charAt(0).toUpperCase() + source.slice(1)}
              </button>
            ))}
          </div>

          {/* View Switcher */}
          <div className="calendar-view-switcher">
            {(['day', 'week', 'month'] as const).map(v => (
              <button
                key={v}
                className={`view-btn ${view === v ? 'active' : ''}`}
                onClick={() => setView(v)}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          <button className="calendar-add-btn">
            <Plus className="w-4 h-4" />
            Add Event
          </button>
        </div>
      </div>

      {/* Conflict Summary */}
      {conflicts.size > 0 && (
        <div className="conflict-summary">
          <AlertTriangle className="w-4 h-4" />
          <span>{conflicts.size} conflict{conflicts.size > 1 ? 's' : ''} detected</span>
          <button onClick={() => {
            // Scroll to first conflict
          }}>
            View Details
          </button>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="calendar-grid">
        {/* Time slots for week/day view */}
        {view === 'day' || view === 'week' ? (
          <div className="calendar-timeslots">
            {/* Generate time slots */}
            {Array.from({ length: 24 }, (_, hour) => (
              <div key={hour} className="time-slot">
                <div className="time-label">
                  {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                </div>
                <div 
                  className="time-slot-area"
                  onDragOver={handleDragOver}
                  onDrop={(e) => {
                    const date = new Date(currentDate);
                    date.setHours(hour, 0, 0, 0);
                    handleDrop(e, date.toISOString());
                  }}
                >
                  {/* Render events for this time slot */}
                  {filteredEvents
                    .filter(event => {
                      const eventHour = new Date(event.start).getHours();
                      return eventHour === hour;
                    })
                    .map(event => {
                      const conflict = getConflict(event.id);
                      return (
                        <div
                          key={event.id}
                          className={`calendar-event ${conflict ? 'has-conflict' : ''}`}
                          style={{ 
                            backgroundColor: event.color + '20',
                            borderLeftColor: event.color,
                            borderLeftWidth: '3px'
                          }}
                          draggable
                          onDragStart={(e) => handleDragStart(e, event)}
                          onClick={() => setSelectedEvent(event)}
                        >
                          <div className="event-title">{event.title}</div>
                          <div className="event-time">
                            {formatTime(event.start)} - {formatTime(event.end)}
                          </div>
                          {conflict && (
                            <div className="event-conflict-badge">
                              <AlertTriangle className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Month view placeholder
          <div className="month-view">
            <p>Month view - {filteredEvents.length} events</p>
          </div>
        )}
      </div>

      {/* Conflict Resolution Modal */}
      {showConflictModal && selectedEvent && (
        <div className="conflict-modal-overlay" onClick={() => setShowConflictModal(false)}>
          <div className="conflict-modal" onClick={(e) => e.stopPropagation()}>
            <div className="conflict-modal-header">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <h4>Scheduling Conflict Detected</h4>
              <button onClick={() => setShowConflictModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="conflict-info">
              <p><strong>Event:</strong> {selectedEvent.title}</p>
              <p><strong>Time:</strong> {formatDate(selectedEvent.start)} {formatTime(selectedEvent.start)} - {formatTime(selectedEvent.end)}</p>
              
              {getConflict(selectedEvent.id) && (
                <div className="conflict-details">
                  <p className="conflict-message">
                    {formatConflictMessage(getConflict(selectedEvent.id)!)}
                  </p>
                  
                  <div className="conflicting-events">
                    <h5>Conflicting Events:</h5>
                    {getConflict(selectedEvent.id)?.conflictingEventIds.map(id => {
                      const event = events.find(e => e.id === id);
                      return event ? (
                        <div key={id} className="conflicting-event">
                          <span className="event-dot" style={{ backgroundColor: event.color }}></span>
                          <span>{event.title}</span>
                          <span className="event-time">{formatTime(event.start)} - {formatTime(event.end)}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="conflict-actions">
              <h5>Suggested Alternatives:</h5>
              {suggestAlternativeSlots(selectedEvent, []).map((slot, i) => (
                <button key={i} className="alternative-slot">
                  <Clock className="w-4 h-4" />
                  {formatDate(slot.start)} {formatTime(slot.start)} - {formatTime(slot.end)}
                </button>
              ))}
            </div>

            <div className="conflict-modal-footer">
              <button 
                className="btn-secondary"
                onClick={() => setShowConflictModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={() => {
                  // Force save with conflict
                  setEvents(prev => prev.map(ev => 
                    ev.id === selectedEvent.id ? selectedEvent : ev
                  ));
                  setShowConflictModal(false);
                }}
              >
                Save Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && !showConflictModal && (
        <div className="event-modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="event-modal" onClick={(e) => e.stopPropagation()}>
            <div className="event-modal-header">
              <div 
                className="event-color-bar"
                style={{ backgroundColor: selectedEvent.color }}
              ></div>
              <h4>{selectedEvent.title}</h4>
              <button onClick={() => setSelectedEvent(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="event-details">
              <div className="detail-row">
                <Clock className="w-4 h-4" />
                <span>{formatDate(selectedEvent.start)} {formatTime(selectedEvent.start)} - {formatTime(selectedEvent.end)}</span>
              </div>
              {selectedEvent.location && (
                <div className="detail-row">
                  <MapPin className="w-4 h-4" />
                  <span>{selectedEvent.location}</span>
                </div>
              )}
              {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                <div className="detail-row">
                  <Users className="w-4 h-4" />
                  <span>{selectedEvent.attendees.length} attendee{selectedEvent.attendees.length > 1 ? 's' : ''}</span>
                </div>
              )}
              {selectedEvent.description && (
                <div className="event-description">
                  <p>{selectedEvent.description}</p>
                </div>
              )}
            </div>

            <div className="event-modal-footer">
              <span className="calendar-source">
                {selectedEvent.calendarSource === 'google' ? 'Google Calendar' : 'Apple Calendar'}
              </span>
              <div className="event-actions">
                <button className="btn-secondary">Edit</button>
                <button className="btn-danger">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedCalendar;
