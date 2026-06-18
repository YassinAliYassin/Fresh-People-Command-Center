/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, User } from 'lucide-react';
import type { Staff, Event, Client, Venue } from '../types';

interface StaffShiftCalendarProps {
  staff: Staff[];
  events: Event[];
  clients: Client[];
  venues: Venue[];
  selectedStaffId: string;
  onSelectStaff: (id: string) => void;
  month: number;
  year: number;
  onShiftMonth: (direction: number) => void;
  getMonthName: (monthIdx: number) => string;
}

const statusColors: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-800 border-amber-200',
  Confirmed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Canceled: 'bg-red-100 text-red-800 border-red-200',
};

const statusDotColors: Record<string, string> = {
  Pending: 'bg-amber-400',
  Confirmed: 'bg-emerald-500',
  Canceled: 'bg-red-400',
};

export default function StaffShiftCalendar({
  staff,
  events,
  clients,
  venues,
  selectedStaffId,
  onSelectStaff,
  month,
  year,
  onShiftMonth,
  getMonthName,
}: StaffShiftCalendarProps) {
  const selectedStaff = staff.find((s) => s.id === selectedStaffId);

  // Filter events for the selected staff member in the current month/year
  const staffEvents = useMemo(() => {
    if (!selectedStaffId) return [];
    return events
      .filter((ev) => {
        const evDate = new Date(ev.date + 'T00:00:00');
        return (
          ev.staffIds.includes(selectedStaffId) &&
          evDate.getMonth() === month &&
          evDate.getFullYear() === year
        );
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  }, [events, selectedStaffId, month, year]);

  // Total hours for the month
  const totalHours = useMemo(() => {
    return staffEvents.reduce((sum, ev) => {
      const [sh, sm] = ev.startTime.split(':').map(Number);
      const [eh, em] = ev.endTime.split(':').map(Number);
      return sum + (eh * 60 + em - sh * 60 - sm) / 60;
    }, 0);
  }, [staffEvents]);

  // Calendar grid days
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayIndex; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [month, year]);

  // Map of day -> events for quick lookup
  const eventsByDay = useMemo(() => {
    const map: Record<number, Event[]> = {};
    staffEvents.forEach((ev) => {
      const day = parseInt(ev.date.split('-')[2], 10);
      if (!map[day]) map[day] = [];
      map[day].push(ev);
    });
    return map;
  }, [staffEvents]);

  return (
    <div className="glass-panel rounded-lg p-5 shadow-luxury-glow flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5 border-b border-slate-200/60 pb-3">
        <span className="text-[10px] uppercase tracking-[0.2em] text-slate-800 font-display flex items-center gap-1.5 font-bold">
          <CalendarDays className="w-4 h-4 text-gold-600 animate-pulse" /> Staff Shift Calendar
        </span>
        {selectedStaff && (
          <span className="font-mono text-[8.5px] px-2 py-0.5 bg-gold-50 border border-gold-200/40 rounded-full text-gold-700 uppercase tracking-widest font-bold">
            {totalHours.toFixed(1)}h
          </span>
        )}
      </div>

      {/* Staff Selector */}
      <div className="mb-3">
        <label className="text-[8px] text-slate-650 uppercase tracking-widest block font-bold mb-1">Select Staff Member</label>
        <select
          value={selectedStaffId}
          onChange={(e) => onSelectStaff(e.target.value)}
          className="w-full bg-white border border-slate-300 text-[10px] text-slate-900 px-2 py-1.5 rounded focus:border-gold-500 focus:outline-hidden font-mono font-bold"
        >
          <option value="">— Choose staff —</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} {s.surname} — {s.role}
            </option>
          ))}
        </select>
      </div>

      {selectedStaff ? (
        <>
          {/* Staff Info Badge */}
          <div className="bg-gold-50/60 border border-gold-200/40 rounded-md p-2.5 mb-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gold-200/60 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-gold-700" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-900 truncate">
                {selectedStaff.name} {selectedStaff.surname}
              </div>
              <div className="text-[8px] text-slate-500 font-mono">
                {selectedStaff.role} · R{selectedStaff.rate}/h
              </div>
            </div>
            <div className="ml-auto text-right flex-shrink-0">
              <div className="text-[11px] font-extrabold text-gold-700 font-mono">{staffEvents.length}</div>
              <div className="text-[7px] text-slate-500 uppercase tracking-widest font-bold">Shifts</div>
            </div>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => onShiftMonth(-1)}
              className="p-1 text-slate-600 hover:text-gold-600 hover:bg-slate-100 rounded transition-all cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-display text-[10px] text-slate-900 font-bold uppercase tracking-widest">
              {getMonthName(month)} {year}
            </span>
            <button
              onClick={() => onShiftMonth(1)}
              className="p-1 text-slate-600 hover:text-gold-600 hover:bg-slate-100 rounded transition-all cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-0.5 text-center mb-1 select-none">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
              <span key={d} className={`text-[7px] uppercase tracking-widest font-bold ${i === 6 ? 'text-gold-700' : 'text-slate-500'}`}>
                {d}
              </span>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-0.5 mb-3">
            {calendarDays.map((day, idx) => {
              const dayEvents = day ? eventsByDay[day] : [];
              const hasEvents = dayEvents.length > 0;
              return (
                <div
                  key={idx}
                  className={`aspect-square flex flex-col items-center justify-center rounded text-[8px] font-mono relative ${
                    day
                      ? hasEvents
                        ? 'bg-gold-50 border border-gold-200/50 text-slate-900 font-bold'
                        : 'text-slate-400 hover:bg-slate-50'
                      : ''
                  }`}
                >
                  {day && (
                    <>
                      {day}
                      {hasEvents && (
                        <div className="flex gap-0.5 mt-0.5">
                          {dayEvents.slice(0, 3).map((ev, ei) => (
                            <span
                              key={ei}
                              className={`w-1 h-1 rounded-full ${statusDotColors[ev.status || 'Pending'] || 'bg-slate-300'}`}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Shift List for the Month */}
          <div className="border-t border-slate-200/60 pt-3">
            <span className="text-[8px] text-slate-600 uppercase tracking-widest font-bold block mb-2">
              {staffEvents.length} Shift{staffEvents.length !== 1 ? 's' : ''} in {getMonthName(month)}
            </span>
            {staffEvents.length === 0 ? (
              <div className="text-[9px] text-slate-400 text-center py-3 italic">
                No shifts assigned this month.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-0.5">
                {staffEvents.map((ev) => {
                  const client = clients.find((c) => c.id === ev.clientId);
                  const venue = venues.find((v) => v.id === ev.venueId);
                  const evDate = new Date(ev.date + 'T00:00:00');
                  const dayName = evDate.toLocaleDateString('en-ZA', { weekday: 'short' });
                  const dayNum = evDate.getDate();
                  return (
                    <div
                      key={ev.id}
                      className="flex items-start gap-2 p-2 bg-white border border-slate-200/60 rounded-md hover:border-gold-300/50 transition-all"
                    >
                      {/* Date block */}
                      <div className="flex-shrink-0 w-9 text-center">
                        <div className="text-[7px] text-slate-500 uppercase font-bold">{dayName}</div>
                        <div className="text-[13px] font-extrabold text-slate-900 font-mono leading-tight">{dayNum}</div>
                      </div>
                      {/* Event details */}
                      <div className="min-w-0 flex-1">
                        <div className="text-[9px] font-bold text-slate-800 truncate">{ev.title}</div>
                        <div className="flex items-center gap-1 mt-0.5 text-[8px] text-slate-500">
                          <Clock className="w-2.5 h-2.5" />
                          <span className="font-mono">{ev.startTime}–{ev.endTime}</span>
                        </div>
                        {venue && (
                          <div className="flex items-center gap-1 mt-0.5 text-[8px] text-slate-500">
                            <MapPin className="w-2.5 h-2.5" />
                            <span className="truncate">{venue.name}</span>
                          </div>
                        )}
                      </div>
                      {/* Status badge */}
                      <span className={`flex-shrink-0 text-[7px] uppercase tracking-widest px-1.5 py-0.5 rounded border font-bold ${statusColors[ev.status || 'Pending']}`}>
                        {ev.status || 'Pending'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-[9px] text-slate-400 text-center py-6 italic">
          Select a staff member to view their shift calendar.
        </div>
      )}
    </div>
  );
}
