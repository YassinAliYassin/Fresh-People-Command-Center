/**
 * EventCard Component
 * Extracted from App.tsx dispatch view for maintainability.
 * Renders a single event card with RSVP management, status actions, and conflict badges.
 */

import React from 'react';
import { Globe, Apple } from 'lucide-react';
import type { Event, Client, Venue, Staff, ActivityLog } from '../types';

export interface EventCardProps {
  ev: Event;
  clientObj: Client | undefined;
  venueObj: Venue | undefined;
  isGoogleImport: boolean;
  isAppleImport: boolean;
  conflictingEventIds: Set<string>;
  staff: Staff[];
  showRSVPPanel: string | null;
  events: Event[];
  selectedDateStr?: string;
  setShowRSVPPanel: (id: string | null) => void;
  handleQuickStatusChange: (eventId: string) => void;
  handleEditEvent: (event: Event) => void;
  setShowDeleteConfirm: (id: string) => void;
  setEvents: React.Dispatch<React.SetStateAction<Event[]>>;
  addActivityLog: (type: ActivityLog['type'], message: string) => void;
  toggleStaffRSVP: (eventId: string, staffId: string) => void;
}

export function EventCard(props: EventCardProps & { key?: React.Key }) {
  const {
    ev,
    clientObj,
    venueObj,
    isGoogleImport,
    isAppleImport,
    conflictingEventIds,
    staff,
    showRSVPPanel,
    events,
    setShowRSVPPanel,
    handleQuickStatusChange,
    handleEditEvent,
    setShowDeleteConfirm,
    setEvents,
    addActivityLog,
  } = props;
  const updateStaffRSVP = (sId: string, newState: 'Available' | 'Pending' | 'Unavailable') => {
    const sObj = staff.find((s) => s.id === sId);
    if (!sObj) return;
    const updatedEvents = events.map((e) => {
      if (e.id !== ev.id) return e;
      const currentRSVPs = e.staffRSVPs || {};
      return { ...e, staffRSVPs: { ...currentRSVPs, [sId]: newState } };
    });
    setEvents(updatedEvents);
    localStorage.setItem('fp_events', JSON.stringify(updatedEvents));
    addActivityLog('staff_reply', `Operator marked ${sObj.name} as ${newState} for "${ev.title}".`);
  };

  return (
    <div
      className={`p-3 border rounded-lg relative overflow-hidden transition-all hover:bg-slate-50/50 ${
        isGoogleImport
          ? 'border-blue-250 bg-blue-50/40'
          : isAppleImport
          ? 'border-slate-300 bg-slate-100/40'
          : 'border-slate-201 bg-white shadow-xs'
      }`}
    >
      {/* Decorative side accent tag line */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-[3px] ${
          isGoogleImport ? 'bg-blue-500' : isAppleImport ? 'bg-slate-900' : 'bg-gold-500'
        }`}
      ></div>

      <div className="pl-2.5">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-xs text-slate-900 tracking-wide font-extrabold flex items-center gap-1.5 flex-wrap">
              {ev.title}
              {isGoogleImport && (
                <span className="flex items-center gap-1 text-[8px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                  <Globe className="w-2.5 h-2.5" /> Google Cal
                </span>
              )}
              {isAppleImport && (
                <span className="flex items-center gap-1 text-[8px] font-mono bg-slate-900 text-white px-1.5 py-0.5 rounded border border-slate-750">
                  <Apple className="w-2.2 h-2.2 text-white" /> Apple Cal
                </span>
              )}
              {!isGoogleImport && !isAppleImport && conflictingEventIds.has(ev.id) && (
                <span className="flex items-center gap-1 text-[8px] font-mono bg-red-50 text-red-700 px-1.5 py-0.5 rounded border border-red-200 animate-pulse">
                  ⚠ Conflict
                </span>
              )}
            </h4>
            <p className="text-[9.5px] text-slate-600 mt-1 font-medium">
              Partner: {clientObj?.name || (isGoogleImport ? 'Synced calendar meeting' : isAppleImport ? 'iCloud synchronized event' : 'Local Account')} &bull; Location: {venueObj?.name || 'Private Address'}
            </p>
          </div>
          <span className="text-[9.5px] font-mono font-bold text-gold-700">
            {ev.startTime} - {ev.endTime}
          </span>
        </div>

        {!isGoogleImport && !isAppleImport && ev.staffIds.length > 0 && (
          <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1.5">
            <span className="text-[8px] text-slate-500 uppercase tracking-widest font-mono mr-1 pt-0.5 font-bold">Allocated:</span>
            {ev.staffIds.map((sId) => {
              const sObj = staff.find((s) => s.id === sId);
              if (!sObj) return null;
              return (
                <span
                  key={sId}
                  className="text-[8px] px-2.5 py-0.5 bg-slate-50 border border-slate-200 rounded-full font-mono text-slate-705 font-bold"
                >
                  {sObj.name} {sObj.surname[0]}. ({sObj.role})
                </span>
              );
            })}
          </div>
        )}

        {ev.clientRequirements && (
          <div className="mt-2 text-[9px] text-slate-800 bg-gold-50/40 p-2.5 rounded border border-gold-200/40 font-medium">
            <span className="text-[8px] uppercase tracking-wider text-gold-700 block mb-1 font-bold">Other Client Requirements:</span>
            {ev.clientRequirements}
          </div>
        )}

        {/* Event Status Badge */}
        {ev.status && !isGoogleImport && !isAppleImport && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">Status:</span>
            <span className={`text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded font-bold border ${
              ev.status === 'Confirmed'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : ev.status === 'Canceled'
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {ev.status}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between mt-3.5 pt-2.5 border-t border-slate-100">
          <p className="text-[9px] text-slate-500 italic truncate max-w-[80%] font-medium">
            Brand Note: {ev.notes || 'No directive guidelines.'}
          </p>
          {!isGoogleImport && !isAppleImport && (
            <div className="flex items-center gap-2">
              {ev.staffIds.length > 0 && (
                <>
                  <button
                    onClick={() => setShowRSVPPanel(showRSVPPanel === ev.id ? null : ev.id)}
                    className="text-[8.5px] text-blue-600 hover:text-blue-500 hover:underline transition-all font-mono font-bold cursor-pointer"
                  >
                    RSVP ({ev.staffIds.length})
                  </button>
                  <span className="text-slate-300">|</span>
                </>
              )}
              <button
                onClick={() => handleQuickStatusChange(ev.id)}
                className={`text-[8.5px] hover:underline transition-all font-mono font-bold cursor-pointer ${
                  ev.status === 'Confirmed'
                    ? 'text-emerald-600 hover:text-emerald-500'
                    : ev.status === 'Canceled'
                    ? 'text-red-500 hover:text-red-400'
                    : 'text-amber-600 hover:text-amber-500'
                }`}
                title="Click to cycle: Pending → Confirmed → Canceled"
              >
                {ev.status === 'Confirmed' ? '✓ Confirmed' : ev.status === 'Canceled' ? '✗ Canceled' : '⏳ Pending'}
              </button>
              <span className="text-slate-300">|</span>
              <button
                onClick={() => handleEditEvent(ev)}
                className="text-[8.5px] text-gold-700 hover:text-gold-600 hover:underline transition-all font-mono font-bold cursor-pointer"
              >
                Edit
              </button>
              <span className="text-slate-300">|</span>
              <button
                onClick={() => setShowDeleteConfirm(ev.id)}
                className="text-[8.5px] text-red-650 hover:text-red-500 hover:underline transition-all font-mono font-bold cursor-pointer"
              >
                Delete
              </button>
            </div>
          )}
        </div>

        {/* RSVP Management Panel */}
        {showRSVPPanel === ev.id && !isGoogleImport && !isAppleImport && (
          <div className="mt-3 pt-3 border-t border-slate-200 bg-slate-50/50 -mx-3 -mb-3 px-3 pb-3 rounded-b-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[8px] text-slate-600 uppercase tracking-widest font-bold">Staff RSVP Management</span>
              <button
                onClick={() => setShowRSVPPanel(null)}
                className="text-[8px] text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1.5">
              {ev.staffIds.map((sId) => {
                const sObj = staff.find((s) => s.id === sId);
                if (!sObj) return null;
                const rsvpState = ev.staffRSVPs?.[sId] || (ev.isDirectBooking ? 'Available' : 'Pending');
                return (
                  <div key={sId} className="flex items-center justify-between bg-white border border-slate-200 rounded px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-slate-800 font-bold">{sObj.name} {sObj.surname[0]}.</span>
                      <span className={`text-[7px] font-mono uppercase tracking-widest px-1 py-0.5 rounded font-bold border ${
                        rsvpState === 'Available'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : rsvpState === 'Unavailable'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {rsvpState}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateStaffRSVP(sId, 'Available')}
                        className={`text-[7px] px-1.5 py-0.5 rounded font-bold cursor-pointer border transition-all ${
                          rsvpState === 'Available'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-emerald-300 hover:text-emerald-700'
                        }`}
                      >
                        ✓ Available
                      </button>
                      <button
                        onClick={() => updateStaffRSVP(sId, 'Pending')}
                        className={`text-[7px] px-1.5 py-0.5 rounded font-bold cursor-pointer border transition-all ${
                          rsvpState === 'Pending'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-amber-300 hover:text-amber-700'
                        }`}
                      >
                        ⌛ Pending
                      </button>
                      <button
                        onClick={() => updateStaffRSVP(sId, 'Unavailable')}
                        className={`text-[7px] px-1.5 py-0.5 rounded font-bold cursor-pointer border transition-all ${
                          rsvpState === 'Unavailable'
                            ? 'bg-red-100 text-red-800 border-red-300'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-red-300 hover:text-red-700'
                        }`}
                      >
                        ✗ Unavailable
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
