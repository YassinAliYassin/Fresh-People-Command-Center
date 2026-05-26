import React, { useState } from 'react';
import { Calendar, User, Shirt, Clock, Trash2, Mail, MessageCircle, Users, Copy, CheckCircle, XCircle, FileText, Send, Receipt } from 'lucide-react';
import { BackendEvent, MiscExpense } from '../types';
import MiscExpenses from './MiscExpenses';

interface EventCardProps {
  event: BackendEvent;
  onDelete: (id: string) => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, onDelete }) => {
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString();
  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  // Timesheet state
  const [showTimesheet, setShowTimesheet] = useState(false);
  const [captainReport, setCaptainReport] = useState('');
  const [parsing, setParsing] = useState(false);

  // Check if we have any contact info to show actions
  const hasContactInfo = (event.assignedStaff && event.assignedStaff.length > 0) || event.staffName || event.clientName || event.clientPhone;
  const hasWhatsApp = event.staffPhone || (event.assignedStaff && event.assignedStaff.some(s => s.phone)) || event.clientPhone;
  const hasEmail = event.clientEmail; // Only client email for now

  // Get primary contact for WhatsApp/Email (first assigned staff or legacy)
  const getPrimaryContact = () => {
    if (event.assignedStaff && event.assignedStaff.length > 0) {
      return event.assignedStaff[0];
    }
    return null;
  };

  // Generate WhatsApp link
  const getWhatsAppLink = () => {
    const primary = getPrimaryContact();
    const phone = primary?.phone || event.staffPhone || event.clientPhone;
    if (!phone) return '#';
    const name = primary?.fullName || event.staffName || event.clientName || 'there';
    const role = primary?.role || '';
    const shiftType = primary?.shiftType || '';
    const shiftText = shiftType && shiftType !== 'Full Shift' ? ` (${shiftType})` : '';
    const text = `Hello ${name}${role ? ` (${role})` : ''}${shiftText}, regarding the ${event.title} on ${formatDate(event.date)}`;
    return `https://wa.me/${phone.replace(/\\D/g, '')}?text=${encodeURIComponent(text)}`;
  };

  // Generate Email link
  const getEmailLink = () => {
    const email = event.clientEmail; // Staff communication via WhatsApp only
    if (!email) return '#';
    const name = event.staffName || event.clientName || '';
    const subject = `Event Details: ${event.title}`;
    const body = `Hi ${name}, checking in on ${event.title} scheduled for ${formatDate(event.date)}`;
    return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // Copy Dispatch Script to clipboard
  const copyDispatchScript = (staff: any) => {
    const script = `Hello ${staff.fullName},

Hope you're well! I'm confirming your assignment for the upcoming event:

📅 Event: ${event.title}
📆 Date: ${formatDate(event.date)}
⏰ Arrival: ${formatTime(event.arrivalTime)}
👔 Uniform: ${event.uniformType || event.dressCode}
🎭 Your Role: ${staff.role}${staff.shiftType && staff.shiftType !== 'Full Shift' ? ` (${staff.shiftType})` : ''}

Please confirm your availability by replying to this message.

Looking forward to a great event!

Best regards,
Fresh People Events Team`;

    navigator.clipboard.writeText(script).then(() => {
      alert('Dispatch script copied to clipboard!');
    }).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = script;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert('Dispatch script copied to clipboard!');
    });
  };

  // Parse Captain's report and update timesheets
  const parseAndLogTimesheet = async () => {
    setParsing(true);
    const lines = captainReport.split('\n').filter(line => line.trim());
    let updated = 0;
    let errors = 0;

    for (const line of lines) {
      // Parse "Name: Start-End" format
      const match = line.match(/^(.+?):\s*(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
      if (!match) {
        errors++;
        continue;
      }

      const [, namePart, startTime, endTime] = match;
      const fullName = namePart.trim();

      // Find matching staff in assignedStaff
      const staff = event.assignedStaff?.find(s => 
        s.fullName.toLowerCase() === fullName.toLowerCase()
      );

      if (!staff) {
        console.warn(`Staff not found: ${fullName}`);
        errors++;
        continue;
      }

      // Calculate hours
      const start = new Date(`2000-01-01T${startTime}:00`);
      const end = new Date(`2000-01-01T${endTime}:00`);
      let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      if (hours < 0) hours += 24; // Handle overnight shifts

      // Find the assignment ID (we need to fetch it)
      try {
        const response = await fetch(`http://${window.location.hostname}:3001/api/events/${event.id}/assignments`);
        const data = await response.json();
        const assignment = data.assignments?.find((a: any) => a.staffId === staff.id);
        
        if (assignment) {
          // Update timesheet
          const updateResponse = await fetch(`http://${window.location.hostname}:3001/api/assignments/${assignment.id}/timesheet`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              totalHours: hours,
              dateWorked: event.date
            })
          });

          if (updateResponse.ok) {
            updated++;
          } else {
            errors++;
          }
        } else {
          errors++;
        }
      } catch (err) {
        console.error('Error updating timesheet:', err);
        errors++;
      }
    }

    setParsing(false);
    alert(`Timesheet logged! Updated: ${updated} staff. Errors: ${errors}`);
    if (updated > 0) {
      window.location.reload();
    }
  };

  // Update staff status
  const updateStaffStatus = async (staffId: number, status: 'Confirmed' | 'Unavailable') => {
    try {
      const response = await fetch(`http://${window.location.hostname}:3001/api/events/${event.id}/assignments/${staffId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        alert(`Staff marked as ${status}`);
        window.location.reload();
      } else {
        alert('Failed to update status');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Error updating status');
    }
  };

  // Handle missing phone for WhatsApp
  const handleWhatsAppClick = (e: React.MouseEvent) => {
    if (!hasWhatsApp) {
      e.preventDefault();
      alert('No phone number available. Please add contact info first.');
    }
  };

  // Handle missing email
  const handleEmailClick = (e: React.MouseEvent) => {
    if (!hasEmail) {
      e.preventDefault();
      alert('No email address available. Please add contact info first.');
    }
  };

  // Update misc expenses
  const updateExpenses = async (expenses: MiscExpense[]) => {
    try {
      const response = await fetch(`http://${window.location.hostname}:3001/api/events/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...event,
          miscExpenses: expenses
        })
      });
      
      if (response.ok) {
        alert('Expenses updated!');
        window.location.reload();
      } else {
        alert('Failed to update expenses');
      }
    } catch (err) {
      console.error('Error updating expenses:', err);
      alert('Error updating expenses');
    }
  };

  const totalExpenses = event.miscExpenses?.reduce((sum, e) => sum + e.amount, 0) || 0;

  return (
    <div className="bg-gray-800 p-5 rounded-lg border border-gray-700 hover:border-blue-500 transition-colors">
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-mono text-blue-400">{event.id}</span>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTimesheet(!showTimesheet)}
            className="text-blue-400 hover:text-blue-300 p-2 -m-2"
            title="Log Timesheet"
          >
            <FileText className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(event.id)}
            className="text-red-400 hover:text-red-300 p-2 -m-2"
            title="Delete event"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <h3 className="font-medium mb-2 text-base">{event.title}</h3>

      <div className="space-y-2 text-sm text-gray-400 mb-4">
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formatDate(event.date)}
        </div>
        
        {/* Timesheet Section */}
        {showTimesheet && (
          <div className="bg-gray-700 p-3 rounded-lg space-y-2">
            <p className="text-xs font-medium text-gray-300">Log Timesheet (Captain's Report)</p>
            <textarea
              value={captainReport}
              onChange={(e) => setCaptainReport(e.target.value)}
              placeholder={`Paste Captain's report here:\nJohn Doe: 18:00-22:00\nJane Smith: 19:00-23:00`}
              className="w-full h-24 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-xs placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />
            <button
              onClick={parseAndLogTimesheet}
              disabled={!captainReport.trim() || parsing}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg text-sm transition-colors min-h-[44px] flex items-center justify-center gap-2"
            >
              {parsing ? 'Processing...' : (
                <>
                  <Send className="w-3 h-3" />
                  Parse & Log Hours
                </>
              )}
            </button>
          </div>
        )}
        
        {/* Staff Roster */}
        {event.assignedStaff && event.assignedStaff.length > 0 ? (
          <div className="flex items-start gap-1">
            <Users className="w-3 h-3 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-gray-300">Staff Roster ({event.assignedStaff.length})</p>
              <div className="flex flex-col gap-2 mt-1">
                {event.assignedStaff.map(staff => (
                  <div key={staff.id} className="bg-gray-700 px-2 py-1 rounded flex items-center justify-between gap-2">
                    <span className="text-xs">
                      {`${staff.fullName} - ${staff.role}`}
                      {staff.shiftType && staff.shiftType !== 'Full Shift' && (
                        <span className="ml-1 text-blue-400">({staff.shiftType})</span>
                      )}
                      {staff.status && staff.status !== 'Pending' && (
                        <span className={`ml-1 ${staff.status === 'Confirmed' ? 'text-green-400' : 'text-red-400'}`}>
                          [{staff.status}]
                        </span>
                      )}
                      {staff.totalHours > 0 && (
                        <span className="ml-1 text-green-400">
                          ({staff.totalHours}hrs / R{staff.earnedAmount?.toFixed(2)})
                        </span>
                      )}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => copyDispatchScript(staff)}
                        className="p-1 text-blue-400 hover:text-blue-300 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Copy dispatch script"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => updateStaffStatus(staff.id, 'Confirmed')}
                        className="p-1 text-green-400 hover:text-green-300 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Mark as Confirmed"
                      >
                        <CheckCircle className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => updateStaffStatus(staff.id, 'Unavailable')}
                        className="p-1 text-red-400 hover:text-red-300 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Mark as Unavailable"
                      >
                        <XCircle className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : event.staffName ? (
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {event.staffName} (legacy)
          </div>
        ) : (
          <div className="flex items-center gap-1 text-gray-500">
            <User className="w-3 h-3" />
            Unassigned
          </div>
        )}
        
        {event.clientName && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <User className="w-3 h-3" />
            Client: {event.clientName}
          </div>
        )}
        
        {/* Miscellaneous Expenses */}
        <div className="mt-2">
          <MiscExpenses 
            eventId={event.id} 
            expenses={event.miscExpenses || []} 
            onUpdate={updateExpenses} 
          />
        </div>
        
        <div className="flex items-center gap-1">
          <Shirt className="w-3 h-3" />
          {event.dressCode}
        </div>
        {event.uniformType && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            Uniform: {event.uniformType}
          </div>
        )}
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {event.duration}hr (Arrive: {formatTime(event.arrivalTime)})
        </div>
        {totalExpenses > 0 && (
          <div className="flex items-center gap-1 text-yellow-400">
            <Receipt className="w-3 h-3" />
            Expenses: R{totalExpenses.toFixed(2)}
          </div>
        )}
      </div>

      {/* Contact Action Row - only show if contact info exists */}
      {hasContactInfo && (
        <div className="flex items-center gap-3 pt-3 border-t border-gray-700">
          <a
            href={getWhatsAppLink()}
            onClick={handleWhatsAppClick}
            className="flex items-center gap-2 text-sm text-green-400 hover:text-green-300 transition-colors p-2 -m-2 min-h-[44px] min-w-[44px] justify-center"
            title="Contact via WhatsApp"
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="hidden sm:inline">WhatsApp</span>
          </a>
          <a
            href={getEmailLink()}
            onClick={handleEmailClick}
            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors p-2 -m-2 min-h-[44px] min-w-[44px] justify-center"
            title="Contact via Email"
          >
            <Mail className="w-5 h-5" />
            <span className="hidden sm:inline">Email</span>
          </a>
        </div>
      )}
    </div>
  );
};

export default EventCard;
