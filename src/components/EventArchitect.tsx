/**
 * EventArchitect Component
 * Extracted from App.tsx for maintainability.
 * Full event creation/editing form with templates, staff allocation, and status management.
 */

import React from 'react';
import { Sparkles, X } from 'lucide-react';
import type { Client, Venue, Staff, EventTemplate } from '../types';
import { EventTemplatesPanel } from './EventTemplatesPanel';
import { StaffAllocationChecklist } from './StaffAllocationChecklist';

export interface EventArchitectProps {
  // Form state
  evTitle: string;
  setEvTitle: (v: string) => void;
  evClient: string;
  setEvClient: (v: string) => void;
  evVenue: string;
  setEvVenue: (v: string) => void;
  evDate: string;
  setEvDate: (v: string) => void;
  evTimeStart: string;
  setEvTimeStart: (v: string) => void;
  evTimeEnd: string;
  setEvTimeEnd: (v: string) => void;
  evNotes: string;
  setEvNotes: (v: string) => void;
  evClientRequirements: string;
  setEvClientRequirements: (v: string) => void;
  evSelectedStaffIds: string[];
  evStatus: 'Pending' | 'Confirmed' | 'Canceled';
  setEvStatus: (v: 'Pending' | 'Confirmed' | 'Canceled') => void;
  isDirectBookingChecked: boolean;
  setIsDirectBookingChecked: (v: boolean) => void;
  // Edit mode
  editingEventId: string | null;
  handleCancelEdit: () => void;
  // Templates
  showTemplatePanel: boolean;
  setShowTemplatePanel: (v: boolean) => void;
  templateName: string;
  setTemplateName: (v: string) => void;
  eventTemplates: EventTemplate[];
  // Data
  clients: Client[];
  venues: Venue[];
  staff: Staff[];
  // Callbacks
  createEvent: (e: React.FormEvent) => void;
  toggleStaffAllocation: (staffId: string) => void;
  saveEventTemplate: () => void;
  applyEventTemplate: (tmpl: EventTemplate) => void;
  deleteEventTemplate: (id: string) => void;
}

const EventArchitect: React.FC<EventArchitectProps> = ({
  evTitle, setEvTitle,
  evClient, setEvClient,
  evVenue, setEvVenue,
  evDate, setEvDate,
  evTimeStart, setEvTimeStart,
  evTimeEnd, setEvTimeEnd,
  evNotes, setEvNotes,
  evClientRequirements, setEvClientRequirements,
  evSelectedStaffIds,
  evStatus, setEvStatus,
  isDirectBookingChecked, setIsDirectBookingChecked,
  editingEventId, handleCancelEdit,
  showTemplatePanel, setShowTemplatePanel,
  templateName, setTemplateName,
  eventTemplates,
  clients, venues, staff,
  createEvent, toggleStaffAllocation,
  saveEventTemplate, applyEventTemplate, deleteEventTemplate,
}) => {
  return (
    <div className={`glass-panel rounded-lg p-5 shadow-luxury-glow ${editingEventId ? 'ring-2 ring-gold-400' : ''}`}>
      <div className="flex items-center justify-between mb-4 border-b border-slate-205 pb-2">
        <span className="text-[10px] uppercase tracking-[0.2em] text-slate-800 font-display flex items-center gap-1.5 font-bold">
          <Sparkles className="w-4 h-4 text-gold-600 animate-pulse" />
          {editingEventId ? 'Edit Event' : 'Event Architect'}
        </span>
        {editingEventId && (
          <button
            type="button"
            onClick={handleCancelEdit}
            className="text-[8px] text-slate-500 hover:text-red-600 font-mono uppercase tracking-widest font-bold cursor-pointer flex items-center gap-1 transition-all"
          >
            <X className="w-3 h-3" /> Cancel Edit
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowTemplatePanel(!showTemplatePanel)}
          className={`text-[8px] font-mono uppercase tracking-widest font-bold cursor-pointer flex items-center gap-1 transition-all px-2 py-1 rounded border ${
            showTemplatePanel
              ? 'bg-violet-100 text-violet-700 border-violet-300'
              : 'text-slate-500 hover:text-violet-600 border-slate-200 hover:border-violet-300'
          }`}
        >
          📋 Templates
        </button>
      </div>

      {/* Event Templates Panel */}
      <EventTemplatesPanel
        showTemplatePanel={showTemplatePanel}
        setShowTemplatePanel={setShowTemplatePanel}
        templateName={templateName}
        setTemplateName={setTemplateName}
        eventTemplates={eventTemplates}
        clients={clients}
        venues={venues}
        evTitle={evTitle}
        evClient={evClient}
        evVenue={evVenue}
        evTimeStart={evTimeStart}
        evTimeEnd={evTimeEnd}
        evSelectedStaffIds={evSelectedStaffIds}
        evNotes={evNotes}
        evClientRequirements={evClientRequirements}
        isDirectBookingChecked={isDirectBookingChecked}
        onSaveTemplate={saveEventTemplate}
        onApplyTemplate={applyEventTemplate}
        onDeleteTemplate={deleteEventTemplate}
      />

      <form onSubmit={createEvent} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="input_ev_title" className="text-[8px] text-slate-505 uppercase tracking-widest block font-bold">Event/Gala Title</label>
          <input
            type="text"
            id="input_ev_title"
            value={evTitle}
            onChange={(e) => setEvTitle(e.target.value)}
            required
            placeholder="e.g. VIP Yacht Gala Launch"
            className="w-full bg-white border border-slate-300 text-xs text-slate-900 px-3 py-2 rounded focus:border-gold-500 focus:bg-white focus:outline-hidden transition-all placeholder-slate-450 font-bold"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1 font-semibold">
            <label htmlFor="select_ev_client" className="text-[8px] text-slate-505 uppercase tracking-widest block font-bold">Client Sponsor</label>
            <select
              id="select_ev_client"
              value={evClient}
              onChange={(e) => setEvClient(e.target.value)}
              required
              className="w-full bg-white border border-slate-300 text-xs text-slate-900 px-2 py-2 rounded focus:border-gold-500 focus:outline-hidden cursor-pointer font-bold"
            >
              <option value="" className="bg-white text-slate-900">Select Account...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id} className="bg-white text-slate-900">{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1 font-semibold">
            <label htmlFor="select_ev_venue" className="text-[8px] text-slate-505 uppercase tracking-widest block font-bold">Premium Venue</label>
            <select
              id="select_ev_venue"
              value={evVenue}
              onChange={(e) => setEvVenue(e.target.value)}
              required
              className="w-full bg-white border border-slate-300 text-xs text-slate-900 px-2 py-2 rounded focus:border-gold-500 focus:outline-hidden cursor-pointer font-bold"
            >
              <option value="" className="bg-white text-slate-900">Select Location...</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id} className="bg-white text-slate-900">{v.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="input_ev_date" className="text-[8px] text-slate-550 uppercase tracking-widest block font-bold">Calendar Date</label>
            <input
              type="date"
              id="input_ev_date"
              value={evDate}
              onChange={(e) => setEvDate(e.target.value)}
              required
              className="w-full bg-white border border-slate-300 text-xs text-slate-900 px-2.5 py-1.5 rounded focus:border-gold-500 focus:outline-hidden font-mono font-bold"
            />
          </div>
          <div className="grid grid-cols-2 gap-1">
            <div className="space-y-1">
              <label htmlFor="input_ev_start" className="text-[8px] text-slate-550 uppercase tracking-widest block font-extrabold text-slate-700">Time In</label>
              <input
                type="time"
                id="input_ev_start"
                value={evTimeStart}
                onChange={(e) => setEvTimeStart(e.target.value)}
                required
                className="w-full bg-white border border-slate-300 text-[10px] text-slate-905 px-1 py-1.5 rounded focus:border-gold-500 focus:outline-hidden font-mono font-bold"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="input_ev_end" className="text-[8px] text-slate-550 uppercase tracking-widest block font-extrabold text-slate-700">Time Out</label>
              <input
                type="time"
                id="input_ev_end"
                value={evTimeEnd}
                onChange={(e) => setEvTimeEnd(e.target.value)}
                required
                className="w-full bg-white border border-slate-300 text-[10px] text-slate-905 px-1 py-1.5 rounded focus:border-gold-500 focus:outline-hidden font-mono font-bold"
              />
            </div>
          </div>
        </div>

        {/* Event Status */}
        <div className="space-y-1">
          <label htmlFor="select_ev_status" className="text-[8px] text-slate-505 uppercase tracking-widest block font-bold">Event Status</label>
          <select
            id="select_ev_status"
            value={evStatus}
            onChange={(e) => setEvStatus(e.target.value as 'Pending' | 'Confirmed' | 'Canceled')}
            className="w-full bg-white border border-slate-300 text-xs text-slate-900 px-2 py-2 rounded focus:border-gold-500 focus:outline-hidden cursor-pointer font-bold"
          >
            <option value="Pending" className="bg-white text-slate-900">⏳ Pending</option>
            <option value="Confirmed" className="bg-white text-slate-900">✅ Confirmed</option>
            <option value="Canceled" className="bg-white text-slate-900">❌ Canceled</option>
          </select>
        </div>

        {/* Direct Booking Manual Setup */}
        <div className="bg-gold-50/50 p-3 rounded-lg border border-gold-200/50 space-y-1.5">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_direct_booking_check"
              checked={isDirectBookingChecked}
              onChange={(e) => setIsDirectBookingChecked(e.target.checked)}
              className="rounded text-gold-600 focus:ring-0 w-3.5 h-3.5 bg-white border-slate-300 cursor-pointer"
            />
            <label htmlFor="is_direct_booking_check" className="text-[8.5px] text-gold-700 font-bold uppercase tracking-wider cursor-pointer select-none">
              Direct Booking (Bypass Bot Dispatch)
            </label>
          </div>
          <p className="text-[8px] text-slate-600 leading-relaxed font-semibold">
            If booking was compiled direct, staff allocations are logged as pre-confirmed, skipping WhatsApp dispatch flow.
          </p>
        </div>

        {/* Staff Allocation Checklist */}
        <StaffAllocationChecklist
          staff={staff}
          evSelectedStaffIds={evSelectedStaffIds}
          onToggleStaff={toggleStaffAllocation}
        />

        <div className="space-y-1">
          <label htmlFor="textarea_ev_notes" className="text-[8px] text-slate-505 uppercase tracking-widest block font-bold">Brand Directives</label>
          <textarea
            id="textarea_ev_notes"
            value={evNotes}
            onChange={(e) => setEvNotes(e.target.value)}
            rows={2}
            placeholder="White-glove protocol detail..."
            className="w-full bg-white border border-slate-300 text-xs text-slate-900 px-3 py-1.5 rounded focus:border-gold-500 focus:outline-hidden placeholder-slate-400 font-medium"
          ></textarea>
        </div>

        <div className="space-y-1">
          <label htmlFor="textarea_ev_client_requirements" className="text-[8px] text-slate-550 uppercase tracking-widest block font-bold text-gold-700">Client Contractual Requirements / Custom Notes</label>
          <textarea
            id="textarea_ev_client_requirements"
            value={evClientRequirements}
            onChange={(e) => setEvClientRequirements(e.target.value)}
            rows={2}
            placeholder="e.g. Vegetarian catering crew only, French-speaking preferred, strict VIP experience..."
            className="w-full bg-white border border-slate-300 text-xs text-slate-900 px-3 py-1.5 rounded focus:border-gold-500 focus:outline-hidden placeholder-slate-450 font-bold"
          ></textarea>
        </div>

        <button
          type="submit"
          className={`w-full py-2 font-display font-bold text-[9px] tracking-widest uppercase transition-all rounded shadow-sm cursor-pointer ${
            editingEventId
              ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:brightness-110 text-white'
              : 'bg-gradient-to-r from-gold-600 to-gold-500 hover:brightness-110 text-white'
          }`}
        >
          {editingEventId ? 'Update Event & Sync Log' : 'Assemble Event & Sync Log'}
        </button>
      </form>
    </div>
  );
};

export default EventArchitect;
