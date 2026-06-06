// FPCC Core Service - Enhanced with TypeScript interfaces
export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
}

export interface WhatsAppDispatchResult {
  success: boolean;
  dispatched?: number;
  skipped?: number;
  failed?: number;
  details?: Array<{
    staffId: number;
    status: 'sent' | 'skipped' | 'failed';
    name?: string;
    phone?: string;
    messageId?: string;
    error?: string;
  }>;
  message?: string;
}

export interface AppleCalendarResult {
  success: boolean;
  events: CalendarEvent[];
  count: number;
  error?: string;
}

export class FPCCCore {
  private static baseURL = window.location.origin;

  // Send WhatsApp notification via backend API
  static async sendWhatsApp(
    eventId: number, 
    staffIds: number[]
  ): Promise<WhatsAppDispatchResult> {
    try {
      if (!eventId || !Array.isArray(staffIds) || staffIds.length === 0) {
        return {
          success: false,
          message: 'Invalid parameters: eventId and non-empty staffIds array required'
        };
      }

      const response = await fetch(`${this.baseURL}/api/dispatch-staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, staffIds })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('WhatsApp dispatch failed:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to send notification' 
      };
    }
  }

  // Sync Apple Calendar
  static async syncAppleCalendar(calendarUrl?: string): Promise<AppleCalendarResult> {
    try {
      const url = calendarUrl || process.env.ICLOUD_CALENDAR_URL;
      
      const response = await fetch(`${this.baseURL}/api/calendar/apple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendarUrl: url })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Apple Calendar sync failed:', error);
      return { 
        success: false, 
        events: [], 
        count: 0,
        error: error instanceof Error ? error.message : 'Failed to sync Apple Calendar'
      };
    }
  }

  // Sync Google Calendar
  static async syncGoogleCalendar(): Promise<AppleCalendarResult> {
    try {
      const response = await fetch(`${this.baseURL}/api/calendar/google`, {
        method: 'POST'
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Google Calendar sync failed:', error);
      return { 
        success: false, 
        events: [], 
        count: 0,
        error: error instanceof Error ? error.message : 'Failed to sync Google Calendar'
      };
    }
  }
}
