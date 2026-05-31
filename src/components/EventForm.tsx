import React, { useState, useEffect, useRef } from 'react';
import { CalendarPlus, User, Clock, CheckCircle, MessageSquare } from 'lucide-react';
import { BackendEvent } from '../types';

const generateEventId = (): string => {
  const date = new Date();
  const yyyymmdd = date.toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `FP-${yyyymmdd}-${random}`;
};

const EventForm: React.FC<{ onEventCreated?: () => void }> = ({ onEventCreated }) => {
  const [event, setEvent] = useState<Partial<BackendEvent>>({
    id: generateEventId(),
    duration: 5,
  });
  const [staffList, setStaffList] = useState<Array<{ id: number; name: string; phone: string }>>([]);
  const [staffAssigned, setStaffAssigned] = useState<number[]>([]);
  const [sendWhatsApp, setSendWhatsApp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [whatsappResults, setWhatsappResults] = useState<Array<{ staff: string; phone?: string; sent: boolean }>>([]);
  const dateRef = useRef<HTMLInputElement>(null);

  // Fetch staff from API
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await fetch('/api/staff');
        const data = await res.json();
        setStaffList(data.staff || []);
      } catch (err) {
        console.error('Failed to fetch staff:', err);
      }
    };
    fetchStaff();
  }, []);

  const handleChange = (field: keyof BackendEvent, value: any) => {
    setEvent(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setWhatsappResults([]);
    
    // FIX: Always read date from ref (works for both manual input and programmatic changes)
    const dateValue = event.date || dateRef.current?.value || '';
    console.log('EventForm: Submitting with dateValue:', dateValue, 'event.date:', event.date);
    
    if (!dateValue) {
      setError('Please select event date & time');
      setLoading(false);
      return;
    }
    
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...event,
          date: dateValue,
          staff_assigned: staffAssigned.map(id => 
            staffList.find(s => s.id === id)?.name || ''
          ).filter(Boolean),
          sendWhatsApp: sendWhatsApp
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to create event');
      
      let msg = 'Event created successfully!';
      if (data.whatsapp && data.whatsapp.length > 0) {
        setWhatsappResults(data.whatsapp);
        const sent = data.whatsapp.filter((r: any) => r.sent).length;
        msg += ` WhatsApp sent to ${sent}/${data.whatsapp.length} staff.`;
      }
      
      setSuccessMsg(msg);
      setEvent({ id: generateEventId(), duration: 5 });
      setStaffAssigned([]);
      setTimeout(() => setSuccessMsg(''), 5000);
      if (onEventCreated) onEventCreated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 rounded-xl shadow-lg border border-gray-800 p-6">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <CalendarPlus size={24} className="text-blue-400" />
        New Event Entry
      </h2>

      {successMsg && (
        <div className="mb-4 p-3 bg-green-900/50 border border-green-700 rounded-lg flex items-start gap-2 text-green-300">
          <CheckCircle size={18} className="mt-0.5" />
          <div>
            <p>{successMsg}</p>
            {whatsappResults.length > 0 && (
              <div className="mt-2 text-sm">
                {whatsappResults.map((r, i) => (
                  <div key={i} className={r.sent ? 'text-green-400' : 'text-red-400'}>
                    {r.sent ? '✓' : '✗'} {r.staff} {r.phone || ''}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Event ID</label>
          <input
            type="text"
            value={event.id}
            disabled
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-300"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Event Title</label>
          <input
            type="text"
            placeholder="e.g. Corporate Gala 2026"
            value={event.title || ''}
            onChange={e => handleChange('title', e.target.value)}
            required
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Event Date & Time</label>
          <input
            ref={dateRef}
            type="datetime-local"
            value={event.date || ''}
            onChange={e => handleChange('date', e.target.value)}
            required
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Duration (hrs)</label>
          <input
            type="number"
            value={event.duration || 5}
            onChange={e => handleChange('duration', parseInt(e.target.value))}
            min={5}
            max={12}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Staff Assigned (Select All Applicable)</label>
          <div className="grid grid-cols-2 gap-2 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 max-h-40 overflow-y-auto">
            {staffList.map((staff) => {
              const isChecked = staffAssigned.includes(staff.id);
              return (
                <label key={staff.id} className="flex items-center space-x-3 text-sm text-gray-200 cursor-pointer p-1.5 hover:bg-slate-800 rounded transition-colors">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      let updated = [...staffAssigned];
                      if (e.target.checked) {
                        if (!updated.includes(staff.id)) updated.push(staff.id);
                      } else {
                        updated = updated.filter(id => id !== staff.id);
                      }
                      setStaffAssigned(updated);
                    }}
                    className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 bg-slate-800 w-4 h-4"
                  />
                  <span>{staff.name}</span>
                </label>
              );
            })}
          </div>
        </div>

        <label className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700 cursor-pointer hover:bg-slate-800 transition-colors">
          <input
            type="checkbox"
            checked={sendWhatsApp}
            onChange={(e) => setSendWhatsApp(e.target.checked)}
            className="rounded border-slate-600 text-green-600 focus:ring-green-500 bg-slate-800 w-5 h-5"
          />
          <MessageSquare size={20} className="text-green-400" />
          <span className="text-gray-200">Send booking details via WhatsApp to assigned staff</span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-[48px] bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <CalendarPlus size={20} />
          {loading ? 'Creating...' : 'Create Event & Notify Staff'}
        </button>
      </form>
    </div>
  );
};

export default EventForm;
