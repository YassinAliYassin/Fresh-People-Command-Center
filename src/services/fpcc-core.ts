// FPCC Core Service - Clean API integration
export class FPCCCore {
  private static baseURL = window.location.origin;

  // Send WhatsApp notification via backend API
  static async sendWhatsApp(phone: string, payload: {
    type: 'booking' | 'dispatch' | 'reminder';
    clientName: string;
    dateTime: string;
    uniformType?: string;
    staffName?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseURL}/api/dispatch-staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffPhone: phone,
          ...payload
        })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('WhatsApp dispatch failed:', error);
      return { success: false, message: 'Failed to send notification' };
    }
  }

  // Sync Apple Calendar
  static async syncAppleCalendar(calendarUrl: string): Promise<any> {
    const response = await fetch(`${this.baseURL}/api/calendar/apple`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ calendarUrl })
    });
    return response.json();
  }

  // Sync Google Calendar
  static async syncGoogleCalendar(): Promise<any> {
    const response = await fetch(`${this.baseURL}/api/calendar/google`, {
      method: 'POST'
    });
    return response.json();
  }
}
