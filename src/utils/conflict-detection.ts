/**
 * Conflict Detection Utility
 * Detects scheduling conflicts between calendar events
 */

import { CalendarEvent, ConflictInfo } from '../types/agent-types';

/**
 * Detect conflicts between a new/updated event and existing events
 */
export const detectConflicts = (
  event: CalendarEvent,
  existingEvents: CalendarEvent[],
  excludeEventId?: string
): ConflictInfo | null => {
  const conflicts: string[] = [];
  
  const eventStart = new Date(event.start);
  const eventEnd = new Date(event.end);
  
  for (const existing of existingEvents) {
    // Skip the event being updated
    if (excludeEventId && existing.id === excludeEventId) continue;
    
    const existingStart = new Date(existing.start);
    const existingEnd = new Date(existing.end);
    
    // Check for overlap
    if (eventStart < existingEnd && eventEnd > existingStart) {
      conflicts.push(existing.id);
    }
  }
  
  if (conflicts.length === 0) return null;
  
  // Determine conflict type and severity
  let conflictType: 'overlap' | 'back_to_back' | 'travel_time' = 'overlap';
  let severity: 'low' | 'medium' | 'high' = 'high';
  
  // Check if events are back-to-back (less than 15 min gap)
  for (const conflictId of conflicts) {
    const conflictEvent = existingEvents.find(e => e.id === conflictId);
    if (!conflictEvent) continue;
    
    const conflictStart = new Date(conflictEvent.start);
    const conflictEnd = new Date(conflictEvent.end);
    
    const gap = Math.abs(eventStart.getTime() - conflictEnd.getTime()) / (1000 * 60); // minutes
    
    if (gap <= 15 && gap >= 0) {
      conflictType = 'back_to_back';
      severity = 'medium';
    }
  }
  
  return {
    eventId: event.id,
    conflictingEventIds: conflicts,
    conflictType,
    severity
  };
};

/**
 * Detect conflicts for multiple events (batch detection)
 */
export const detectBatchConflicts = (
  events: CalendarEvent[]
): Map<string, ConflictInfo> => {
  const conflictMap = new Map<string, ConflictInfo>();
  
  for (const event of events) {
    const conflict = detectConflicts(event, events, event.id);
    if (conflict) {
      conflictMap.set(event.id, conflict);
    }
  }
  
  return conflictMap;
};

/**
 * Get conflicting events details
 */
export const getConflictDetails = (
  conflict: ConflictInfo,
  events: CalendarEvent[]
): CalendarEvent[] => {
  return conflict.conflictingEventIds
    .map(id => events.find(e => e.id === id))
    .filter((e): e is CalendarEvent => e !== undefined);
};

/**
 * Suggest alternative time slots for conflicting events
 */
export const suggestAlternativeSlots = (
  event: CalendarEvent,
  conflictingEvents: CalendarEvent[],
  duration: number = 60 // minutes
): { start: string; end: string }[] => {
  const suggestions: { start: string; end: string }[] = [];
  const eventStart = new Date(event.start);
  const eventEnd = new Date(event.end);
  
  // Try slots before the conflicting event
  for (const conflictEvent of conflictingEvents) {
    const conflictStart = new Date(conflictEvent.start);
    
    // Before conflict
    const beforeStart = new Date(conflictStart.getTime() - duration * 60000);
    if (beforeStart > new Date()) {
      suggestions.push({
        start: beforeStart.toISOString(),
        end: conflictStart.toISOString()
      });
    }
    
    // After conflict
    const conflictEnd = new Date(conflictEvent.end);
    const afterEnd = new Date(conflictEnd.getTime() + 60000); // 1 min buffer
    suggestions.push({
      start: afterEnd.toISOString(),
      end: new Date(afterEnd.getTime() + duration * 60000).toISOString()
    });
  }
  
  // Next day same time
  const nextDayStart = new Date(eventStart);
  nextDayStart.setDate(nextDayStart.getDate() + 1);
  suggestions.push({
    start: nextDayStart.toISOString(),
    end: new Date(nextDayStart.getTime() + (eventEnd.getTime() - eventStart.getTime())).toISOString()
  });
  
  return suggestions.slice(0, 3); // Return top 3 suggestions
};

/**
 * Format conflict message for display
 */
export const formatConflictMessage = (conflict: ConflictInfo): string => {
  const count = conflict.conflictingEventIds.length;
  
  switch (conflict.conflictType) {
    case 'overlap':
      return `Overlaps with ${count} event${count > 1 ? 's' : ''}`;
    case 'back_to_back':
      return `Back-to-back with ${count} event${count > 1 ? 's' : ''} (less than 15min gap)`;
    case 'travel_time':
      return `Insufficient travel time between ${count} event${count > 1 ? 's' : ''}`;
    default:
      return `Conflict with ${count} event${count > 1 ? 's' : ''}`;
  }
};
