import { CalendarEvent, ConflictInfo } from '../types/agent-types';

export function detectBatchConflicts(events: CalendarEvent[]): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];
  
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const eventA = events[i];
      const eventB = events[j];
      
      // Check for time overlap
      const startA = new Date(eventA.start);
      const endA = new Date(eventA.end);
      const startB = new Date(eventB.start);
      const endB = new Date(eventB.end);
      
      if (startA < endB && startB < endA) {
        // Check for staff conflicts
        const staffOverlap = eventA.staffIds?.filter(id => 
          eventB.staffIds?.includes(id)
        ) || [];
        
        if (staffOverlap.length > 0) {
          conflicts.push({
            type: 'double-booking',
            severity: 'high',
            message: `Staff double-booked between "${eventA.title}" and "${eventB.title}"`,
            affectedStaff: staffOverlap,
            affectedEvents: [eventA.id, eventB.id]
          });
        } else {
          conflicts.push({
            type: 'overlap',
            severity: 'medium',
            message: `Time overlap between "${eventA.title}" and "${eventB.title}"`,
            affectedEvents: [eventA.id, eventB.id]
          });
        }
      }
    }
  }
  
  return conflicts;
}

export function detectConflicts(events: CalendarEvent[]): ConflictInfo[] {
  return detectBatchConflicts(events);
}

export function formatConflictMessage(conflict: ConflictInfo): string {
  return conflict.message || 'Conflict detected';
}

export function suggestAlternativeSlots(event: CalendarEvent, existing: CalendarEvent[]): any[] {
  // Basic stub: return empty suggestions
  return [];
}

export function detectStaffAvailability(
  staffId: number, 
  newEvent: CalendarEvent, 
  existingEvents: CalendarEvent[]
): ConflictInfo | null {
  const conflicts = existingEvents.filter(event => {
    if (!event.staffIds?.includes(staffId)) return false;
    
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    const newStart = new Date(newEvent.start);
    const newEnd = new Date(newEvent.end);
    
    return newStart < eventEnd && eventStart < newEnd;
  });
  
  if (conflicts.length > 0) {
    return {
      type: 'availability',
      severity: 'high',
      message: `Staff member ${staffId} already assigned during this time`,
      affectedStaff: [staffId],
      affectedEvents: conflicts.map(e => e.id)
    };
  }
  
  return null;
}