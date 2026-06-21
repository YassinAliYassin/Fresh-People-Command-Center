/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  Users,
  Calendar,
  ChevronDown,
  ChevronUp,
  Bell,
  X,
  CheckCircle2,
  ShieldAlert,
  UserX,
} from 'lucide-react';
import { Event, Staff, Client, Venue } from '../types';

interface StaffingAlertsPanelProps {
  events: Event[];
  staff: Staff[];
  clients: Client[];
  venues: Venue[];
}

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: 'unstaffed' | 'pending_rsvp' | 'conflict' | 'upcoming_48h' | 'canceled_active';
  title: string;
  description: string;
  eventId?: string;
  eventDate?: string;
  actionLabel?: string;
}

export default function StaffingAlertsPanel({ events, staff, clients, venues }: StaffingAlertsPanelProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['critical', 'warning', 'info']));

  const alerts = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString().split('T')[0];
    const result: Alert[] = [];

    for (const ev of events) {
      // Skip canceled events for most checks (but flag them separately)
      const isCanceled = ev.status === 'Canceled';
      const isFuture = ev.date >= today;
      const isWithin48h = ev.date >= today && ev.date <= in48h;

      // 1. Unstaffed events (no staff assigned)
      if (!isCanceled && isFuture && (!ev.staffIds || ev.staffIds.length === 0)) {
        const client = clients.find(c => c.id === ev.clientId);
        result.push({
          id: `unstaffed-${ev.id}`,
          type: 'critical',
          category: 'unstaffed',
          title: ev.title,
          description: `No staff assigned — ${client?.name || 'Unknown client'} @ ${ev.date} ${ev.startTime}`,
          eventId: ev.id,
          eventDate: ev.date,
          actionLabel: 'Assign Staff',
        });
      }

      // 2. Pending RSVPs
      if (!isCanceled && isFuture && ev.staffIds && ev.staffIds.length > 0 && ev.staffRSVPs) {
        const pendingStaff = ev.staffIds.filter(sid => ev.staffRSVPs?.[sid] === 'Pending');
        if (pendingStaff.length > 0) {
          const pendingNames = pendingStaff.map(sid => {
            const s = staff.find(st => st.id === sid);
            return s ? `${s.name} ${s.surname}` : sid;
          });
          result.push({
            id: `pending-${ev.id}`,
            type: 'warning',
            category: 'pending_rsvp',
            title: ev.title,
            description: `${pendingStaff.length} pending RSVP${pendingStaff.length > 1 ? 's' : ''}: ${pendingNames.join(', ')} — ${ev.date} ${ev.startTime}`,
            eventId: ev.id,
            eventDate: ev.date,
            actionLabel: 'Follow Up',
          });
        }
      }

      // 3. Upcoming within 48h that need attention (unstaffed or pending RSVPs)
      if (isWithin48h && !isCanceled) {
        const hasIssues = (!ev.staffIds || ev.staffIds.length === 0) ||
          (ev.staffRSVPs && ev.staffIds?.some(sid => ev.staffRSVPs?.[sid] === 'Pending'));
        if (hasIssues) {
          // Only add if not already captured above
          const alreadyCaptured = result.some(a => a.eventId === ev.id && (a.category === 'unstaffed' || a.category === 'pending_rsvp'));
          if (!alreadyCaptured) {
            result.push({
              id: `urgent-${ev.id}`,
              type: 'critical',
              category: 'upcoming_48h',
              title: ev.title,
              description: `Event in next 48h needs attention — ${ev.date} ${ev.startTime}-${ev.endTime}`,
              eventId: ev.id,
              eventDate: ev.date,
              actionLabel: 'Review',
            });
          }
        }
      }

      // 4. Conflicts (staff double-booked)
      if (!isCanceled && isFuture && ev.staffIds && ev.staffIds.length > 0) {
        for (const otherEv of events) {
          if (otherEv.id === ev.id || otherEv.status === 'Canceled') continue;
          if (otherEv.date !== ev.date) continue;

          const sharedStaff = ev.staffIds.filter(sid => otherEv.staffIds?.includes(sid));
          if (sharedStaff.length === 0) continue;

          // Check time overlap
          const evStart = ev.startTime;
          const evEnd = ev.endTime;
          const otherStart = otherEv.startTime;
          const otherEnd = otherEv.endTime;

          const overlaps = evStart < otherEnd && otherStart < evEnd;
          if (overlaps) {
            const staffNames = sharedStaff.map(sid => {
              const s = staff.find(st => st.id === sid);
              return s ? `${s.name} ${s.surname}` : sid;
            });
            const alertId = `conflict-${ev.id}-${otherEv.id}`;
            const reverseId = `conflict-${otherEv.id}-${ev.id}`;
            if (!result.some(a => a.id === reverseId)) {
              result.push({
                id: alertId,
                type: 'critical',
                category: 'conflict',
                title: `${ev.title} ↔ ${otherEv.title}`,
                description: `Double-booked: ${staffNames.join(', ')} — ${ev.date} ${evStart}-${evEnd} vs ${otherStart}-${otherEnd}`,
                eventId: ev.id,
                eventDate: ev.date,
                actionLabel: 'Resolve',
              });
            }
          }
        }
      }

      // 5. Canceled events with staff still assigned (cleanup needed)
      if (isCanceled && ev.staffIds && ev.staffIds.length > 0) {
        result.push({
          id: `canceled-${ev.id}`,
          type: 'info',
          category: 'canceled_active',
          title: ev.title,
          description: `Canceled but ${ev.staffIds.length} staff still assigned — ${ev.date}`,
          eventId: ev.id,
          eventDate: ev.date,
          actionLabel: 'Clean Up',
        });
      }
    }

    // Sort: critical first, then warning, then info; within each, by date
    const typeOrder = { critical: 0, warning: 1, info: 2 };
    result.sort((a, b) => {
      if (typeOrder[a.type] !== typeOrder[b.type]) return typeOrder[a.type] - typeOrder[b.type];
      return (a.eventDate || '').localeCompare(b.eventDate || '');
    });

    return result;
  }, [events, staff, clients, venues]);

  const activeAlerts = alerts.filter(a => !dismissedAlerts.has(a.id));
  const criticalCount = activeAlerts.filter(a => a.type === 'critical').length;
  const warningCount = activeAlerts.filter(a => a.type === 'warning').length;
  const infoCount = activeAlerts.filter(a => a.type === 'info').length;

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const dismissAlert = (id: string) => {
    setDismissedAlerts(prev => new Set(prev).add(id));
  };

  const dismissAll = () => {
    setDismissedAlerts(new Set(activeAlerts.map(a => a.id)));
  };

  if (alerts.length === 0) {
    return (
      <div className="glass-panel rounded-lg p-4 sm:p-5 shadow-luxury-glow">
        <span className="text-xs sm:text-[10px] uppercase tracking-[0.2em] text-slate-800 font-display flex items-center gap-1.5 mb-3 border-b border-slate-205 pb-2 font-bold select-none">
          <Bell className="w-4 h-4 text-gold-600" /> Staffing Alerts
        </span>
        <div className="flex flex-col items-center justify-center py-6 gap-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          <p className="text-xs sm:text-[10px] text-slate-500 font-semibold">All clear — no staffing issues detected</p>
        </div>
      </div>
    );
  }

  const renderCategorySection = (type: 'critical' | 'warning' | 'info', icon: React.ReactNode, label: string, count: number, colorClass: string) => {
    const categoryAlerts = activeAlerts.filter(a => a.type === type);
    if (categoryAlerts.length === 0) return null;
    const isExpanded = expandedCategories.has(type);

    return (
      <div className="space-y-1.5">
        <button
          onClick={() => toggleCategory(type)}
          className="w-full flex items-center justify-between py-2 sm:py-1.5 px-2 rounded hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            {icon}
            <span className="text-[10px] sm:text-[9px] uppercase tracking-wider font-bold">{label}</span>
            <span className="text-[9px] sm:text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-opacity-10">
              {count}
            </span>
          </div>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
        </button>
        {isExpanded && (
          <div className="space-y-1.5 sm:space-y-1 pl-1">
            {categoryAlerts.map(alert => (
              <div
                key={alert.id}
                className={`p-3 sm:p-2.5 rounded-lg border text-left ${
                  type === 'critical'
                    ? 'bg-red-50/80 border-red-200'
                    : type === 'warning'
                    ? 'bg-amber-50/80 border-amber-200'
                    : 'bg-blue-50/80 border-blue-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 sm:mb-0.5">
                      {alert.category === 'unstaffed' && <UserX className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-red-500 shrink-0" />}
                      {alert.category === 'pending_rsvp' && <Clock className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-amber-500 shrink-0" />}
                      {alert.category === 'conflict' && <ShieldAlert className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-red-500 shrink-0" />}
                      {alert.category === 'upcoming_48h' && <Calendar className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-red-500 shrink-0" />}
                      {alert.category === 'canceled_active' && <AlertCircle className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-blue-500 shrink-0" />}
                      <span className="text-[10px] sm:text-[9px] font-bold text-slate-800 truncate">{alert.title}</span>
                    </div>
                    <p className="text-[9px] sm:text-[8px] text-slate-600 leading-relaxed">{alert.description}</p>
                    {alert.eventDate && (
                      <span className="text-[8px] sm:text-[7px] text-slate-400 font-mono mt-0.5 block">{alert.eventDate}</span>
                    )}
                  </div>
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="p-1.5 sm:p-0.5 hover:bg-white/60 rounded transition-colors cursor-pointer shrink-0 min-w-[32px] min-h-[32px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                    title="Dismiss"
                  >
                    <X className="w-4 h-4 sm:w-3 sm:h-3 text-slate-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="glass-panel rounded-lg p-4 sm:p-5 shadow-luxury-glow">
      <div className="flex items-center justify-between mb-3 border-b border-slate-205 pb-2">
        <span className="text-xs sm:text-[10px] uppercase tracking-[0.2em] text-slate-800 font-display flex items-center gap-1.5 font-bold select-none">
          <Bell className="w-4 h-4 text-gold-600" /> Staffing Alerts
        </span>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="text-[9px] sm:text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
              {criticalCount} critical
            </span>
          )}
          {warningCount > 0 && (
            <span className="text-[9px] sm:text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
              {warningCount} warning
            </span>
          )}
          {activeAlerts.length > 0 && (
            <button
              onClick={dismissAll}
              className="text-[8px] sm:text-[7px] text-slate-400 hover:text-slate-600 font-mono uppercase tracking-wider cursor-pointer px-1 py-0.5"
            >
              Dismiss all
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2 max-h-[500px] sm:max-h-[400px] overflow-y-auto overscroll-contain">
        {renderCategorySection('critical', <AlertTriangle className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-red-500" />, 'Critical', criticalCount, 'text-red-700')}
        {renderCategorySection('warning', <AlertCircle className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-amber-500" />, 'Warnings', warningCount, 'text-amber-700')}
        {renderCategorySection('info', <AlertCircle className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-blue-500" />, 'Info', infoCount, 'text-blue-700')}
      </div>

      {activeAlerts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-4 gap-2">
          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          <p className="text-xs sm:text-[9px] text-slate-500 font-semibold">All alerts dismissed</p>
        </div>
      )}
    </div>
  );
}
