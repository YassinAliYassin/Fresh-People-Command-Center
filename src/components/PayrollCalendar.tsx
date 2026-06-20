/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Users,
  AlertCircle,
} from 'lucide-react';
import { Client, Venue, Staff, Event, ActivityLog } from '../types';
import { EventCard } from './EventCard';
import StaffTimeline from './StaffTimeline';
import { GoogleCalendarEvent } from '../lib/googleCalendar';

// ── Types ──────────────────────────────────────────────────────────────────

export interface PayrollCalendarProps {
  // Core data
  events: Event[];
  googleEvents: GoogleCalendarEvent[];
  appleEvents: Event[];
  appleUser: string;
  clients: Client[];
  venues: Venue[];
  staff: Staff[];

  // Calendar navigation
  currentMonth: number;
  currentYear: number;
  setCurrentMonth: (m: number) => void;
  setCurrentYear: (y: number) => void;

  // Selected day
  selectedDateStr: string;
  setSelectedDateStr: (s: string) => void;

  // Payroll cycle
  focusedPayrollCycle: 'current' | 'next';
  setFocusedPayrollCycle: (v: 'current' | 'next') => void;

  // Event form date auto-pop
  setEvDate: (s: string) => void;

  // RSVP
  showRSVPPanel: string | null;
  setShowRSVPPanel: (s: string | null) => void;

  // Handlers
  toggleStaffRSVP: (eventId: string, staffId: string) => void;
  handleQuickStatusChange: (eventId: string) => void;
  handleEditEvent: (event: Event) => void;
  setShowDeleteConfirm: (id: string | null) => void;
  setEvents: React.Dispatch<React.SetStateAction<Event[]>>;
  addActivityLog: (type: string, message: string, urgent?: boolean) => void;
  bulkUpdateRSVP: (eventId: string, state: 'Available' | 'Unavailable') => void;
  getMatchedClientAndVenue: (title: string, clientId?: string, venueId?: string) => { clientId: string; venueId: string };
}

// ── Helpers ────────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  'Lead VIP Architect': '#4F46E5',
  'Corporate Hostess': '#DB2777',
  'Elite Mixologist': '#B45309',
  'Service Supervisor': '#10B981',
  'Private Sommelier': '#1E3A8A',
  'Safety Concierge': '#0D9488',
  'Tactical Concierge': '#0D9488',
  Sommelier: '#1E3A8A',
  Mixologist: '#B45309',
  Concierge: '#0D9488',
  'VIP Hostess': '#DB2777',
  Coordinator: '#4F46E5',
  Partner: '#8B5CF6',
  Manager: '#10B981',
};

const getMonthName = (monthIdx: number) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return months[monthIdx];
};

// ── Component ──────────────────────────────────────────────────────────────

const PayrollCalendar: React.FC<PayrollCalendarProps> = ({
  events,
  googleEvents,
  appleEvents,
  appleUser,
  clients,
  venues,
  staff,
  currentMonth,
  currentYear,
  setCurrentMonth,
  setCurrentYear,
  selectedDateStr,
  setSelectedDateStr,
  focusedPayrollCycle,
  setFocusedPayrollCycle,
  setEvDate,
  showRSVPPanel,
  setShowRSVPPanel,
  toggleStaffRSVP,
  handleQuickStatusChange,
  handleEditEvent,
  setShowDeleteConfirm,
  setEvents,
  addActivityLog,
  bulkUpdateRSVP,
  getMatchedClientAndVenue,
}) => {
  // ── Local state ──────────────────────────────────────────────────────────
  const [eventSearchQuery, setEventSearchQuery] = useState('');
  const [eventStatusFilter, setEventStatusFilter] = useState<'all' | 'Confirmed' | 'Pending' | 'Canceled'>('all');

  // ── Payroll cycle bounds ─────────────────────────────────────────────────
  const payrollCycleBounds = useMemo(() => {
    if (focusedPayrollCycle === 'current') {
      return {
        label: 'Apr 26 - May 25',
        startDateStr: `${currentYear}-04-26`,
        endDateStr: `${currentYear}-05-25`,
        openMonth: 3,
        closeMonth: 4,
      };
    } else {
      return {
        label: 'May 26 - Jun 25',
        startDateStr: `${currentYear}-05-26`,
        endDateStr: `${currentYear}-06-25`,
        openMonth: 4,
        closeMonth: 5,
      };
    }
  }, [focusedPayrollCycle, currentYear]);

  // ── Calendar helpers ─────────────────────────────────────────────────────
  const isDayInSelectedPayrollCycle = (day: number) => {
    if (focusedPayrollCycle === 'current') {
      return day >= 1 && day <= 25;
    } else {
      return day >= 26 && day <= 31;
    }
  };

  const shiftMonth = (direction: number) => {
    let nextM = currentMonth + direction;
    let nextY = currentYear;
    if (nextM < 0) { nextM = 11; nextY -= 1; }
    else if (nextM > 11) { nextM = 0; nextY += 1; }
    setCurrentMonth(nextM);
    setCurrentYear(nextY);
  };

  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const days: { dayNumber: number; isCurrentMonth: boolean; dateStr: string }[] = [];

    const prevMonthLastDate = new Date(currentYear, currentMonth, 0).getDate();
    const prevMonthIdx = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dNum = prevMonthLastDate - i;
      days.push({
        dayNumber: dNum,
        isCurrentMonth: false,
        dateStr: `${prevMonthYear}-${String(prevMonthIdx + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`,
      });
    }

    for (let d = 1; d <= totalDaysInMonth; d++) {
      days.push({
        dayNumber: d,
        isCurrentMonth: true,
        dateStr: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      });
    }

    const currentRenderedCount = days.length;
    const remainingTo42 = 42 - currentRenderedCount;
    const nextMonthIdx = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    for (let n = 1; n <= remainingTo42; n++) {
      days.push({
        dayNumber: n,
        isCurrentMonth: false,
        dateStr: `${nextMonthYear}-${String(nextMonthIdx + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`,
      });
    }
    return days;
  }, [currentYear, currentMonth]);

  // ── Event aggregation for a date ─────────────────────────────────────────
  const getEventsForDate = (dateStr: string): Event[] => {
    const localMatches = events.filter((ev) => ev.date === dateStr);
    const googleMatches = googleEvents
      .filter((gEv) => {
        const gDate = gEv.start?.dateTime?.split('T')[0] || gEv.start?.date;
        return gDate === dateStr;
      })
      .filter((gEv) => {
        const fpId = gEv.extendedProperties?.private?.freshPeopleEventId;
        return !events.some((e) => e.id === fpId || e.googleEventId === gEv.id);
      })
      .map((gEv) => {
        const startTime = gEv.start?.dateTime ? gEv.start.dateTime.split('T')[1].slice(0, 5) : '00:00';
        const endTime = gEv.end?.dateTime ? gEv.end.dateTime.split('T')[1].slice(0, 5) : '23:59';
        return {
          id: `gcal-import-${gEv.id}`,
          title: gEv.summary || 'Google Imported Event',
          clientId: 'external_gcal',
          venueId: 'external_gcal',
          date: dateStr,
          startTime,
          endTime,
          staffIds: [],
          notes: gEv.description || 'Imported from connected Google calendar account.',
          status: 'Confirmed' as const,
        };
      });

    const appleMatches = appleUser
      ? appleEvents
          .filter((aEv) => aEv.date === dateStr)
          .filter((aEv) => !events.some((e) => e.id === aEv.appleEventId || e.appleEventId === aEv.id || e.id === aEv.id))
          .map((aEv) => {
            const matched = getMatchedClientAndVenue(aEv.title, aEv.clientId, aEv.venueId);
            return {
              id: `apple-import-${aEv.id}`,
              title: aEv.title,
              clientId: matched.clientId,
              venueId: matched.venueId,
              date: dateStr,
              startTime: aEv.startTime,
              endTime: aEv.endTime,
              staffIds: [],
              notes: aEv.notes || 'Imported from linked Apple Calendar / iCloud account.',
              clientRequirements: aEv.clientRequirements || '',
              status: 'Confirmed' as const,
            };
          })
      : [];

    return [...localMatches, ...googleMatches, ...appleMatches];
  };

  // ── Selected day computed values ─────────────────────────────────────────
  const selectedDayEvents = useMemo(() => getEventsForDate(selectedDateStr), [events, googleEvents, appleEvents, appleUser, selectedDateStr, getEventsForDate]);

  const selectedDayDoubleShifts = useMemo(() => {
    const dailyEvents = events.filter((e) => e.date === selectedDateStr);
    return staff
      .map((s) => ({
        staff: s,
        events: dailyEvents.filter((e) => e.staffIds.includes(s.id)),
      }))
      .filter((item) => item.events.length >= 2);
  }, [events, selectedDateStr, staff]);

  const selectedDayConflicts = useMemo(() => {
    const conflicts: Array<{
      staffId: string;
      staffName: string;
      staffRole: string;
      eventA: { id: string; title: string; date: string; startTime: string; endTime: string };
      eventB: { id: string; title: string; date: string; startTime: string; endTime: string };
    }> = [];
    const localEvents = events.filter(
      (e) => !e.id.startsWith('gcal-import') && !e.id.startsWith('apple-import') && !e.id.startsWith('apple-live')
    );

    const getEventDates = (date: string, startTime: string, endTime: string) => {
      const start = new Date(`${date}T${startTime}`);
      const end = new Date(`${date}T${endTime}`);
      return { start: start.getTime(), end: end.getTime() };
    };

    for (let i = 0; i < localEvents.length; i++) {
      for (let j = i + 1; j < localEvents.length; j++) {
        const evA = localEvents[i];
        const evB = localEvents[j];
        const sharedStaff = evA.staffIds.filter((id) => evB.staffIds.includes(id));
        if (sharedStaff.length === 0) continue;
        const { start: startA, end: endA } = getEventDates(evA.date, evA.startTime, evA.endTime);
        const { start: startB, end: endB } = getEventDates(evB.date, evB.startTime, evB.endTime);
        const overlaps = startA < endB && startB < endA;
        if (overlaps) {
          sharedStaff.forEach((sId) => {
            const sObj = staff.find((s) => s.id === sId);
            conflicts.push({
              staffId: sId,
              staffName: sObj ? `${sObj.name} ${sObj.surname}` : sId,
              staffRole: sObj?.role || '',
              eventA: { id: evA.id, title: evA.title, date: evA.date, startTime: evA.startTime, endTime: evA.endTime },
              eventB: { id: evB.id, title: evB.title, date: evB.date, startTime: evB.startTime, endTime: evB.endTime },
            });
          });
        }
      }
    }
    return conflicts;
  }, [events, staff]);

  const selectedDayFilteredConflicts = useMemo(
    () => selectedDayConflicts.filter((c) => c.eventA.date === selectedDateStr || c.eventB.date === selectedDateStr),
    [selectedDayConflicts, selectedDateStr]
  );

  const conflictingEventIds = useMemo(() => {
    const ids = new Set<string>();
    selectedDayFilteredConflicts.forEach((c) => {
      ids.add(c.eventA.id);
      ids.add(c.eventB.id);
    });
    return ids;
  }, [selectedDayFilteredConflicts]);

  // ── Role utilization data ────────────────────────────────────────────────
  const roleUtilizationData = useMemo(() => {
    const startStr = payrollCycleBounds.startDateStr;
    const endStr = payrollCycleBounds.endDateStr;
    const cycleEvents = events.filter((ev) => ev.date >= startStr && ev.date <= endStr);
    const breakdown: Record<string, number> = {};
    staff.forEach((s) => { if (s.role) breakdown[s.role] = 0; });
    cycleEvents.forEach((ev) => {
      const startMin = parseInt(ev.startTime.split(':')[0]) * 60 + parseInt(ev.startTime.split(':')[1]);
      const endMin = parseInt(ev.endTime.split(':')[0]) * 60 + parseInt(ev.endTime.split(':')[1]);
      const hrs = (endMin - startMin) / 60;
      ev.staffIds.forEach((sId) => {
        const sObj = staff.find((s) => s.id === sId);
        if (sObj && sObj.role) breakdown[sObj.role] = (breakdown[sObj.role] || 0) + hrs;
      });
    });
    return Object.entries(breakdown)
      .map(([name, hours]) => ({ name, Hours: parseFloat(hours.toFixed(1)) }))
      .sort((a, b) => b.Hours - a.Hours);
  }, [events, staff, payrollCycleBounds]);

  const freshPeopleGroupedData = useMemo(() => {
    const startStr = payrollCycleBounds.startDateStr;
    const endStr = payrollCycleBounds.endDateStr;
    const cycleEvents = events.filter((ev) => ev.date >= startStr && ev.date <= endStr);
    const groups = [
      { name: 'Brand Ambassadors & Promoters', roles: ['Lead VIP Architect'], description: 'Bespoke marketing ambassadors, elite brand representatives, and activation model hosts.', Hours: 0, color: '#4F46E5' },
      { name: 'Event Hosts & Hostesses (FOH)', roles: ['Corporate Hostess'], description: 'FOH hospitality guides, receptionists, RSVP desk captains, and luxury greeting hosts.', Hours: 0, color: '#DB2777' },
      { name: 'Beverage Specialists', roles: ['Elite Mixologist'], description: 'Premium cocktail architects, luxury bar captains, and private sommelier service.', Hours: 0, color: '#B45309' },
      { name: 'Operations Supervisors', roles: ['Service Supervisor'], description: 'Senior floor managers, event coordinators, and quality assurance leads.', Hours: 0, color: '#10B981' },
      { name: 'Concierge & Security', roles: ['Safety Concierge', 'Tactical Concierge'], description: 'VIP safety officers, access control specialists, and guest experience guardians.', Hours: 0, color: '#0D9488' },
    ];
    cycleEvents.forEach((ev) => {
      const startMin = parseInt(ev.startTime.split(':')[0]) * 60 + parseInt(ev.startTime.split(':')[1]);
      const endMin = parseInt(ev.endTime.split(':')[0]) * 60 + parseInt(ev.endTime.split(':')[1]);
      const hrs = (endMin - startMin) / 60;
      ev.staffIds.forEach((sId) => {
        const sObj = staff.find((s) => s.id === sId);
        if (sObj && sObj.role) {
          const grp = groups.find((g) => g.roles.includes(sObj.role));
          if (grp) grp.Hours += hrs;
        }
      });
    });
    return groups.map((g) => ({ ...g, Hours: parseFloat(g.Hours.toFixed(1)) }));
  }, [events, staff, payrollCycleBounds]);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <section id="calendar_section" className="lg:col-span-4 flex flex-col space-y-6 animate-fade-in">
      <div className="glass-panel rounded-lg p-5 shadow-luxury-glow flex flex-col flex-1 h-full">
        {/* Calendar Controls */}
        <div className="flex items-center justify-between mb-4 border-b border-slate-200/60 pb-3">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gold-600 animate-pulse" />
            <h2 className="font-display tracking-[0.15em] text-xs uppercase text-slate-900 font-extrabold">Payroll Cycle Schedule</h2>
          </div>
          <div className="flex items-center space-x-1.5 font-bold">
            <button onClick={() => shiftMonth(-1)} className="p-1 text-slate-600 hover:text-gold-600 hover:bg-slate-100 rounded transition-all cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-display text-[11px] text-slate-900 font-bold uppercase tracking-widest px-1">
              {getMonthName(currentMonth)} {currentYear}
            </span>
            <button onClick={() => shiftMonth(1)} className="p-1 text-slate-600 hover:text-gold-600 hover:bg-slate-100 rounded transition-all cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Payroll Highlight Panel */}
        <div className="bg-gold-50/60 border border-gold-300/40 rounded-lg p-4 mb-4 space-y-2 relative overflow-hidden">
          <div className="flex justify-between items-center pb-1">
            <span className="text-[8px] text-slate-600 uppercase tracking-widest font-extrabold flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-gold-600" /> Corporate Payroll Highlight Rules
            </span>
            <span className="text-[7.5px] uppercase tracking-widest text-gold-700 font-bold bg-white/80 px-1.5 py-0.5 border border-gold-250 rounded shadow-xs">
              {payrollCycleBounds.label}
            </span>
          </div>
          <p className="text-[10px] text-slate-700 leading-relaxed font-medium">
            Our premium payroll interval opens automatically on the <span className="text-gold-700 font-extrabold">26th of the previous month</span> and cuts off/closes on the <span className="text-gold-700 font-extrabold">25th of the current cycle</span> month.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gold-200/30 text-[9px] font-bold">
            <button
              onClick={() => setFocusedPayrollCycle('current')}
              className={`py-1 rounded text-center cursor-pointer font-mono uppercase tracking-widest border transition-all ${focusedPayrollCycle === 'current' ? 'bg-gold-100 border-gold-400 text-gold-800' : 'border-slate-205 text-slate-500 hover:text-slate-800 hover:bg-white/40'}`}
            >
              Cycle ending May 25
            </button>
            <button
              onClick={() => setFocusedPayrollCycle('next')}
              className={`py-1 rounded text-center cursor-pointer font-mono uppercase tracking-widest border transition-all ${focusedPayrollCycle === 'next' ? 'bg-gold-100 border-gold-400 text-gold-800' : 'border-slate-205 text-slate-500 hover:text-slate-800 hover:bg-white/40'}`}
            >
              Cycle opening May 26
            </button>
          </div>
        </div>

        {/* Day of Week Headers */}
        <div className="grid grid-cols-7 gap-1 text-center mb-1.5 select-none font-bold">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
            <span key={d} className={`text-[9px] ${i === 6 ? 'text-gold-700' : 'text-slate-600'} uppercase tracking-widest`}>{d}</span>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1.5 flex-1 select-none min-h-[220px]">
          {calendarDays.map((d, index) => {
            const isSelected = selectedDateStr === d.dateStr;
            const dailyEvents = getEventsForDate(d.dateStr);
            const fitsCycleInCurrentMonthDisplay = d.isCurrentMonth && isDayInSelectedPayrollCycle(d.dayNumber);

            return (
              <div
                key={`${d.dateStr}-${index}`}
                onClick={() => {
                  setSelectedDateStr(d.dateStr);
                  setEvDate(d.dateStr);
                }}
                className={`relative p-2 flex flex-col min-h-[46px] rounded transition-all cursor-pointer ${d.isCurrentMonth ? 'bg-white border border-slate-200' : 'bg-transparent text-slate-400 border border-transparent'} ${isSelected ? '!border-gold-500 bg-gold-50/50 shadow-gold-glow' : ''} ${fitsCycleInCurrentMonthDisplay ? 'payroll-span border-dashed !border-gold-500/30 font-bold' : ''} hover:border-gold-400 hover:bg-gold-50/20`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-[10px] font-mono leading-none font-extrabold ${d.isCurrentMonth ? (fitsCycleInCurrentMonthDisplay ? 'text-gold-700' : 'text-slate-800') : 'text-slate-400'}`}>
                    {d.dayNumber}
                  </span>
                  {dailyEvents.length > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-gold-600 inline-block animate-pulse"></span>
                  )}
                </div>
                {d.isCurrentMonth && dailyEvents.length > 0 && (
                  <div className="mt-auto space-y-0.5">
                    {dailyEvents.slice(0, 2).map((ev) => {
                      const isGCalImport = ev.id.startsWith('gcal-import');
                      return (
                        <div key={ev.id} className={`text-[7px] truncate px-1 rounded-sm font-bold tracking-wide leading-tight ${isGCalImport ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-gold-50 text-gold-800 border border-gold-200/50'}`}>
                          {ev.title}
                        </div>
                      );
                    })}
                    {dailyEvents.length > 2 && (
                      <div className="text-[6.5px] font-mono text-slate-500 text-right font-bold">+{dailyEvents.length - 2} more</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected Day Drawer */}
        <div id="selected_day_drawer" className="mt-4 pt-4 border-t border-slate-200/65 space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-905 font-bold">Roster detail &bull; {selectedDateStr}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[8.5px] font-mono text-gold-700 uppercase tracking-widest font-extrabold">{selectedDayEvents.length} Active Command Mappings</span>
                {selectedDayEvents.length > 0 && <span className="h-3 w-[1px] bg-slate-200"></span>}
                {selectedDayEvents.length > 0 && (
                  <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest italic font-bold">
                    Payroll Span: {parseInt(selectedDateStr.split('-')[2]) <= 25 ? 'Cycle Apr 26-May 25' : 'Cycle May 26-Jun 25'}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                setEvDate(selectedDateStr);
                document.getElementById('input_ev_title')?.focus();
              }}
              className="text-[8.5px] text-slate-600 hover:text-gold-700 border border-slate-350 hover:border-gold-400 px-2.5 py-1 rounded transition-all font-mono uppercase tracking-widest font-bold bg-white"
            >
              + Add Event
            </button>
          </div>

          {/* Search and Filter */}
          {selectedDayEvents.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search events..."
                  value={eventSearchQuery}
                  onChange={(e) => setEventSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-[10px] text-slate-900 px-3 py-1.5 pl-7 rounded focus:border-gold-500 focus:outline-none placeholder-slate-400 font-medium"
                />
                <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <select
                value={eventStatusFilter}
                onChange={(e) => setEventStatusFilter(e.target.value as any)}
                className="bg-white border border-slate-200 text-[10px] text-slate-700 px-2 py-1.5 rounded focus:border-gold-500 focus:outline-none font-bold cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Pending">Pending</option>
                <option value="Canceled">Canceled</option>
              </select>
              {(eventSearchQuery || eventStatusFilter !== 'all') && (
                <button
                  onClick={() => { setEventSearchQuery(''); setEventStatusFilter('all'); }}
                  className="text-[8px] text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-300 px-2 py-1 rounded transition-all font-mono uppercase tracking-widest font-bold bg-white cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {/* Conflict Warning Banner */}
          {selectedDayFilteredConflicts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-red-800 uppercase tracking-widest">
                    ⚠ Staff Conflict{selectedDayFilteredConflicts.length > 1 ? 's' : ''} Detected ({selectedDayFilteredConflicts.length})
                  </p>
                  <div className="mt-1.5 space-y-1 max-h-[80px] overflow-y-auto">
                    {selectedDayFilteredConflicts.map((c, idx) => (
                      <p key={idx} className="text-[8.5px] text-red-700 leading-relaxed">
                        <span className="font-bold">{c.staffName}</span> ({c.staffRole}) is double-booked:{' '}
                        <span className="font-mono">"{c.eventA.title}"</span> ({c.eventA.date} {c.eventA.startTime}-{c.eventA.endTime}) ↔{' '}
                        <span className="font-mono">"{c.eventB.title}"</span> ({c.eventB.date} {c.eventB.startTime}-{c.eventB.endTime})
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Staff Timeline */}
          {selectedDayEvents.length > 0 && (
            <StaffTimeline
              events={events}
              staff={staff}
              clients={clients}
              venues={venues}
              selectedDate={selectedDateStr}
              onSelectEvent={() => {}}
            />
          )}

          {/* Event Cards or Empty State */}
          {selectedDayEvents.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-200 bg-white/50 rounded-lg font-medium">
              No operational mappings budgeted on this calendar date.
            </div>
          ) : (
            <div className="space-y-3 max-h-[190px] overflow-y-auto pr-1">
              {selectedDayEvents
                .filter((ev) => {
                  const matchesSearch = !eventSearchQuery || ev.title.toLowerCase().includes(eventSearchQuery.toLowerCase()) || ev.notes.toLowerCase().includes(eventSearchQuery.toLowerCase());
                  const matchesStatus = eventStatusFilter === 'all' || ev.status === eventStatusFilter;
                  return matchesSearch && matchesStatus;
                })
                .map((ev) => {
                  const clientObj = clients.find((c) => c.id === ev.clientId);
                  const venueObj = venues.find((v) => v.id === ev.venueId);
                  const isGoogleImport = ev.id.startsWith('gcal-import');
                  const isAppleImport = ev.id.startsWith('apple-import') || ev.id.startsWith('apple-live');
                  return (
                    <EventCard
                      key={ev.id}
                      ev={ev}
                      clientObj={clientObj}
                      venueObj={venueObj}
                      isGoogleImport={isGoogleImport}
                      isAppleImport={isAppleImport}
                      conflictingEventIds={conflictingEventIds}
                      staff={staff}
                      showRSVPPanel={showRSVPPanel}
                      events={events}
                      selectedDateStr={selectedDateStr}
                      setShowRSVPPanel={setShowRSVPPanel}
                      handleQuickStatusChange={handleQuickStatusChange}
                      handleEditEvent={handleEditEvent}
                      setShowDeleteConfirm={setShowDeleteConfirm}
                      setEvents={setEvents}
                      addActivityLog={addActivityLog}
                      toggleStaffRSVP={toggleStaffRSVP}
                      onBulkRSVP={bulkUpdateRSVP}
                    />
                  );
                })}
            </div>
          )}

          {/* Double-Shift Auditor */}
          {selectedDayEvents.length > 0 && (() => {
            const approvedDS = selectedDayDoubleShifts.filter((item) =>
              item.events.every((ev) => {
                const rsvp = ev.staffRSVPs?.[item.staff.id] || (ev.isDirectBooking ? 'Available' : 'Pending');
                return rsvp === 'Available';
              })
            );
            const pendingDS = selectedDayDoubleShifts.filter((item) =>
              item.events.some((ev) => {
                const rsvp = ev.staffRSVPs?.[item.staff.id] || (ev.isDirectBooking ? 'Available' : 'Pending');
                return rsvp === 'Pending';
              })
            );

            return (
              <div className="mt-6 pt-4 border-t border-slate-200/65 space-y-4" id="double_shift_auditor_panel">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-[10px] uppercase tracking-[0.2em] text-slate-800 font-display font-bold flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-gold-600 animate-pulse" /> Double-Shift Audit Engine
                    </h4>
                    <p className="text-[8px] text-slate-500 uppercase tracking-widest font-mono mt-0.5">
                      Breakdown: Approved vs Outstanding on {selectedDateStr}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1.5 font-mono text-[8px] font-bold">
                    <span className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-200/60 rounded">{approvedDS.length} Approved</span>
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/60 rounded animate-pulse">{pendingDS.length} Pending</span>
                  </div>
                </div>

                {selectedDayDoubleShifts.length === 0 ? (
                  <p className="text-[9.5px] text-slate-500 italic py-2 bg-slate-50 text-center rounded-md border border-slate-150">
                    No double shifts detected for this date.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    <p className="text-[8.5px] text-slate-600 font-semibold leading-relaxed">
                      Vetted staff members assigned to multiple events today. Click check/pending badges to instantly toggle confirmation status.
                    </p>
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {selectedDayDoubleShifts.map(({ staff: s, events: evs }) => {
                        const isFullyApproved = evs.every((ev) => {
                          const rsvp = ev.staffRSVPs?.[s.id] || (ev.isDirectBooking ? 'Available' : 'Pending');
                          return rsvp === 'Available';
                        });
                        return (
                          <div key={s.id} className={`p-2.5 border rounded-md transition-all ${isFullyApproved ? 'border-green-200 bg-green-50/25' : 'border-amber-200 bg-amber-50/25 font-bold'}`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-bold text-slate-900">{s.name} {s.surname}</span>
                                <span className="text-[7.5px] uppercase tracking-widest px-1.5 py-0.5 bg-gold-50 text-gold-700 rounded-sm italic border border-gold-200/40 font-bold">{s.role}</span>
                              </div>
                              <span className={`text-[7.5px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded border font-bold ${isFullyApproved ? 'bg-green-100 border-green-300 text-green-800' : 'bg-amber-100 border-amber-300 text-amber-800'}`}>
                                {isFullyApproved ? 'All Approved' : 'Action Required'}
                              </span>
                            </div>
                            <div className="space-y-1">
                              {evs.map((evItem) => {
                                const rsvpState = evItem.staffRSVPs?.[s.id] || (evItem.isDirectBooking ? 'Available' : 'Pending');
                                return (
                                  <div key={evItem.id} className="flex items-center justify-between text-[9px] bg-white border border-slate-150 rounded px-2 py-1">
                                    <div className="truncate max-w-[65%] font-medium">
                                      <span className="font-extrabold text-slate-800">{evItem.title}</span>
                                      <span className="text-slate-500 font-mono text-[8.5px] block">{evItem.startTime} - {evItem.endTime}</span>
                                    </div>
                                    <button
                                      onClick={() => toggleStaffRSVP(evItem.id, s.id)}
                                      className={`text-[7.5px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border cursor-pointer transition-all font-bold ${rsvpState === 'Available' ? 'bg-green-50 hover:bg-green-100 border-green-200 text-green-700' : 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700'}`}
                                    >
                                      {rsvpState === 'Available' ? '✓ Approved' : '⌛ Pending'}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </section>
  );
};

export default PayrollCalendar;
