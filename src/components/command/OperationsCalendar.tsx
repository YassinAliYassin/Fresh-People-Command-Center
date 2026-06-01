import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  OperationalEvent,
  Priority,
  EventStatus,
  getPriorityColor,
  formatTime,
  formatDate
} from '../../types/event-system';

/**
 * Operations Calendar Component
 * Complete rewrite with day cells as functional containers holding event chips
 * Features: drag-drop, priority colors, status indicators, luxury UI
 */

interface OperationsCalendarProps {
  events: OperationalEvent[];
  onEventClick: (event: OperationalEvent) => void;
  onEventCreate: (date: Date, time?: string) => void;
  onEventDrop: (eventId: string, newDate: Date) => void;
  onDateRangeChange?: (start: Date, end: Date) => void;
  currentDate?: Date;
  view?: 'month' | 'week' | 'day';
  onViewChange?: (view: 'month' | 'week' | 'day') => void;
}

const OperationsCalendar: React.FC<OperationsCalendarProps> = ({
  events,
  onEventClick,
  onEventCreate,
  onEventDrop,
  onDateRangeChange,
  currentDate = new Date(),
  view = 'month',
  onViewChange
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(currentDate);
  const [draggedEvent, setDraggedEvent] = useState<OperationalEvent | null>(null);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [calendarDays, setCalendarDays] = useState<Date[]>([]);

  // Generate calendar days for month view
  useEffect(() => {
    const days = generateCalendarDays(selectedDate);
    setCalendarDays(days);
    
    if (onDateRangeChange) {
      const start = days[0];
      const end = days[days.length - 1];
      onDateRangeChange(start, end);
    }
  }, [selectedDate, view]);

  // Navigation handlers
  const goToToday = () => setSelectedDate(new Date());
  const goToPrev = () => {
    const newDate = new Date(selectedDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setSelectedDate(newDate);
  };
  const goToNext = () => {
    const newDate = new Date(selectedDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setSelectedDate(newDate);
  };

  // Get events for a specific day
  const getEventsForDay = useCallback((date: Date) => {
    return events.filter(event => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));
      
      return (eventStart >= dayStart && eventStart <= dayEnd) ||
             (eventEnd >= dayStart && eventEnd <= dayEnd) ||
             (eventStart <= dayStart && eventEnd >= dayEnd);
    }).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }, [events]);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, event: OperationalEvent) => {
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', event.id);
  };

  const handleDragOver = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setHoveredCell(date.toISOString());
  };

  const handleDrop = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    setHoveredCell(null);
    
    if (draggedEvent) {
      onEventDrop(draggedEvent.id, date);
      setDraggedEvent(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedEvent(null);
    setHoveredCell(null);
  };

  // Render month view
  const renderMonthView = () => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();

    return (
      <div className="calendar-month-view">
        {/* Day Names Header */}
        <div className="calendar-weekdays">
          {dayNames.map(day => (
            <div key={day} className="weekday-header">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="calendar-grid">
          {calendarDays.map((day, index) => {
            const dayEvents = getEventsForDay(day);
            const isToday = day.toDateString() === today.toDateString();
            const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
            const dayKey = day.toISOString();

            return (
              <div
                key={index}
                className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${hoveredCell === dayKey ? 'hovered' : ''}`}
                onClick={() => onEventCreate(day)}
                onDragOver={(e) => handleDragOver(e, day)}
                onDrop={(e) => handleDrop(e, day)}
                onDragLeave={() => setHoveredCell(null)}
              >
                {/* Day Number */}
                <div className={`day-header ${isToday ? 'today-badge' : ''}`}>
                  <span className="day-number">{day.getDate()}</span>
                  {dayEvents.length > 0 && (
                    <span className="day-event-count">{dayEvents.length}</span>
                  )}
                </div>

                {/* Event Chips Container */}
                <div className="day-events">
                  {dayEvents.slice(0, 4).map((event, eventIndex) => (
                    <EventChip
                      key={event.id}
                      event={event}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                      onDragStart={(e) => handleDragStart(e, event)}
                      onDragEnd={handleDragEnd}
                      compact={dayEvents.length > 2}
                    />
                  ))}
                  
                  {dayEvents.length > 4 && (
                    <div className="more-events">
                      +{dayEvents.length - 4} more
                    </div>
                  )}
                </div>

                {/* Drop Indicator */}
                {hoveredCell === dayKey && draggedEvent && (
                  <div className="drop-indicator" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render week view
  const renderWeekView = () => {
    const weekStart = getWeekStart(selectedDate);
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + i);
      return day;
    });

    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="calendar-week-view">
        {/* Week Header */}
        <div className="week-header">
          <div className="time-column-header" />
          {weekDays.map((day, index) => {
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <div key={index} className={`week-day-header ${isToday ? 'today' : ''}`}>
                <span className="week-day-name">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <span className={`week-day-number ${isToday ? 'today-badge' : ''}`}>
                  {day.getDate()}
                </span>
              </div>
            );
          })}
        </div>

        {/* Time Grid */}
        <div className="week-grid">
          {/* Time Column */}
          <div className="time-column">
            {hours.map(hour => (
              <div key={hour} className="time-slot">
                <span>{formatHour(hour)}</span>
              </div>
            ))}
          </div>

          {/* Day Columns */}
          {weekDays.map((day, dayIndex) => {
            const dayEvents = getEventsForDay(day);
            
            return (
              <div key={dayIndex} className="day-column">
                {hours.map(hour => (
                  <div
                    key={hour}
                    className="hour-cell"
                    onClick={() => {
                      const time = `${hour.toString().padStart(2, '0')}:00`;
                      onEventCreate(day, time);
                    }}
                  />
                ))}
                
                {/* Render Events */}
                {dayEvents.map(event => {
                  const startHour = event.startDate.getHours();
                  const startMinute = event.startDate.getMinutes();
                  const duration = (event.endDate.getTime() - event.startDate.getTime()) / (1000 * 60 * 60);
                  
                  return (
                    <div
                      key={event.id}
                      className="week-event"
                      style={{
                        top: `${startHour * 60 + startMinute}px`,
                        height: `${duration * 60}px`,
                        ...getEventPositionStyle(event.priority)
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                      draggable
                      onDragStart={(e) => handleDragStart(e, event)}
                      onDragEnd={handleDragEnd}
                    >
                      <EventChip event={event} compact />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="operations-calendar">
      {/* Calendar Header */}
      <div className="calendar-command-header">
        <div className="calendar-title-section">
          <h2 className="calendar-title">
            {view === 'month' && selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            {view === 'week' && `Week of ${getWeekStart(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
            {view === 'day' && selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </h2>
          
          <div className="calendar-stats">
            <span className="stat-item">
              <span className="stat-dot" style={{ background: 'var(--gold-500)' }} />
              {events.filter(e => e.priority === 'VIP').length} VIP
            </span>
            <span className="stat-item">
              <span className="stat-dot" style={{ background: '#EF4444' }} />
              {events.filter(e => e.priority === 'HIGH').length} High
            </span>
            <span className="stat-item">
              <span className="stat-dot" style={{ background: '#3B82F6' }} />
              {events.filter(e => e.status === 'CONFIRMED').length} Confirmed
            </span>
          </div>
        </div>

        <div className="calendar-controls">
          {/* View Switcher */}
          <div className="view-switcher">
            {(['month', 'week', 'day'] as const).map(v => (
              <button
                key={v}
                className={`view-btn ${view === v ? 'active' : ''}`}
                onClick={() => onViewChange?.(v)}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="calendar-nav">
            <button className="nav-btn" onClick={goToPrev}>‹</button>
            <button className="today-btn" onClick={goToToday}>Today</button>
            <button className="nav-btn" onClick={goToNext}>›</button>
          </div>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="calendar-content">
        {view === 'month' && renderMonthView()}
        {view === 'week' && renderWeekView()}
        {view === 'day' && renderDayView()}
      </div>
    </div>
  );
};

// ==========================================
// EVENT CHIP COMPONENT
// ==========================================

interface EventChipProps {
  event: OperationalEvent;
  onClick: (e: React.MouseEvent) => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  compact?: boolean;
}

const EventChip: React.FC<EventChipProps> = ({ event, onClick, onDragStart, onDragEnd, compact }) => {
  const priorityColor = getPriorityColor(event.priority);
  const statusBadge = getStatusBadge(event.status);

  return (
    <div
      className={`event-chip ${compact ? 'compact' : ''} priority-${event.priority.toLowerCase()}`}
      onClick={onClick}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{
        borderLeft: `3px solid ${priorityColor.primary}`,
        background: priorityColor.bg,
        borderColor: priorityColor.border
      }}
    >
      {/* Priority Indicator */}
      <div className="chip-priority-bar" style={{ background: priorityColor.primary }} />
      
      {/* Chip Content */}
      <div className="chip-content">
        <div className="chip-title">{event.title}</div>
        
        {!compact && (
          <>
            <div className="chip-time">
              {formatTime(event.startDate)} - {formatTime(event.endDate)}
            </div>
            
            {event.staff.length > 0 && (
              <div className="chip-staff">
                👤 {event.staff.length} staff
              </div>
            )}
            
            {event.venue && (
              <div className="chip-location">
                📍 {event.venue.name}
              </div>
            )}
          </>
        )}
        
        {compact && (
          <div className="chip-time-compact">
            {formatTime(event.startDate)}
          </div>
        )}
      </div>

      {/* Status Badge */}
      <div className="chip-status" style={{
        background: statusBadge.bg,
        color: statusBadge.color
      }}>
        {event.status.charAt(0)}
      </div>

      {/* Priority Glow Effect */}
      <div className="chip-glow" style={{
        boxShadow: `0 0 10px ${priorityColor.glow}`
      }} />
    </div>
  );
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function generateCalendarDays(date: Date): Date[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());
  
  const days: Date[] = [];
  const current = new Date(startDate);
  
  while (days.length < 42) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return days;
}

function getWeekStart(date: Date): Date {
  const day = date.getDay();
  const diff = date.getDate() - day;
  return new Date(date.getFullYear(), date.getMonth(), diff);
}

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

function getEventPositionStyle(priority: Priority) {
  const colors = getPriorityColor(priority);
  return {
    background: colors.bg,
    borderLeft: `3px solid ${colors.primary}`,
    boxShadow: `0 2px 8px ${colors.glow}`
  };
}

function getStatusBadge(status: EventStatus) {
  const badges = {
    SCHEDULED: { color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' },
    CONFIRMED: { color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
    IN_PROGRESS: { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
    COMPLETED: { color: '#6B7280', bg: 'rgba(107, 114, 128, 0.1)' },
    CANCELLED: { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' },
    PENDING: { color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)' }
  };
  return badges[status] || badges.PENDING;
}

// ==========================================
// DAY VIEW RENDERER
// ==========================================

function renderDayView() {
  return <div className="day-view-placeholder">Day View - Coming Soon</div>;
}

export default OperationsCalendar;
