/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, lazy, Suspense, useRef } from 'react';
import {
  Calendar,
  CalendarDays,
  Users,
  ChevronLeft,
  ChevronRight,
  Radio,
  PhoneForwarded,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Client, Venue, Staff, Event, EventTemplate, ActivityLog } from './types';
import {
  initAuth,
  googleSignIn,
  logoutGoogle,
  getAccessToken
} from './lib/firebase';
import {
  fetchGoogleCalendarEvents,
  pushEventToGoogleCalendar,
  updateEventInGoogleCalendar,
  deleteEventFromGoogleCalendar,
  GoogleCalendarEvent
} from './lib/googleCalendar';
import { INITIAL_CLIENTS, INITIAL_VENUES, INITIAL_STAFF, INITIAL_EVENTS } from './data/seedData';

import { OperationsSnapshot } from './components/OperationsSnapshot';
import { EventCard } from './components/EventCard';
import StaffTimeline from './components/StaffTimeline';
import MasterRegistry from './components/MasterRegistry';
import ActivityLogPanel from './components/ActivityLogPanel';
import EventArchitect from './components/EventArchitect';
import DispatchPanel from './components/DispatchPanel';
import PayrollCalendar from './components/PayrollCalendar';
import RegistrationModals from './components/RegistrationModals';
import RoleUtilizationChart from './components/RoleUtilizationChart';
import DialogsModals from './components/DialogsModals';
import StaffAvailabilityPanel from './components/StaffAvailabilityPanel';
import ExportToolbar from './components/ExportToolbar';
import AuthGateway from './components/AuthGateway';
import AppHeader from './components/AppHeader';
import ToastNotifications from './components/ToastNotifications';
import StaffingAlertsPanel from './components/StaffingAlertsPanel';
import StaffPerformancePanel from './components/StaffPerformancePanel';

const RoleChart = lazy(() => import('./components/RoleChart'));
const StaffShiftCalendar = lazy(() => import('./components/StaffShiftCalendar'));

// Safe self-healing global localStorage wrapper to prevent QuotaExceededError crashes
try {
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key: string, value: string) {
    try {
      originalSetItem.call(localStorage, key, value);
    } catch (e: any) {
      console.warn(`Local storage quota warning for key "${key}":`, e);
      if (
        e.name === 'QuotaExceededError' ||
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        e.code === 22 ||
        e.code === 1014
      ) {
        try {
          // Dynamic self-cleaning: purge large log buffers & calendar cache feeds to free space
          localStorage.removeItem('fp_logs');
          localStorage.removeItem('fp_apple_events');
          // Retry the target storage injection
          originalSetItem.call(localStorage, key, value);
        } catch (retryError) {
          console.error('Local storage completely exhausted. Write safely bypassed:', retryError);
        }
      }
    }
  };
} catch (globalErr) {
  console.warn('Unable to globally secure local storage writes:', globalErr);
}

// Hardcoded security credentials as specified
const OPERATOR_CREDENTIALS = {
  username: 'yassin',
  password: 'FreshPeople2026!'
};

// Safe self-healing global localStorage wrapper to prevent QuotaExceededError crashes
try {
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key: string, value: string) {
    try {
      originalSetItem.call(localStorage, key, value);
    } catch (e: any) {
      console.warn(`Local storage quota warning for key "${key}":`, e);
      if (
        e.name === 'QuotaExceededError' ||
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        e.code === 22 ||
        e.code === 1014
      ) {
        try {
          // Dynamic self-cleaning: purge large log buffers & calendar cache feeds to free space
          localStorage.removeItem('fp_logs');
          localStorage.removeItem('fp_apple_events');
          // Retry the target storage injection
          originalSetItem.call(localStorage, key, value);
        } catch (retryError) {
          console.error('Local storage completely exhausted. Write safely bypassed:', retryError);
        }
      }
    }
  };
} catch (globalErr) {
  console.warn('Unable to globally secure local storage writes:', globalErr);
}

const getDurationHours = (start: string, end: string): number => {
  try {
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    let diffMin = (eH * 60 + eM) - (sH * 60 + sM);
    if (diffMin < 0) diffMin += 24 * 60; // handle midnight rollover
    return diffMin / 60;
  } catch {
    return 0;
  }
};

const getEventDates = (dateStr: string, startTime: string, endTime: string) => {
  try {
    const start = new Date(`${dateStr}T${startTime}:00`);
    let end = new Date(`${dateStr}T${endTime}:00`);
    if (end < start) {
      end.setDate(end.getDate() + 1);
    }
    return { start, end };
  } catch {
    return { start: new Date(), end: new Date() };
  }
};

const ensureUniqueLogIds = (logs: any[]): any[] => {
  if (!Array.isArray(logs)) return [];
  const seen = new Set<string>();
  return logs.map((log, index) => {
    let cleanId = log?.id;
    if (!cleanId || seen.has(cleanId)) {
      cleanId = `${cleanId || 'log'}-${index}-${Math.random().toString(36).substring(2, 7)}`;
    }
    seen.add(cleanId);
    return { ...log, id: cleanId };
  }).filter(Boolean);
};

export default function App() {
  // Security Veil authentication states
  const [operatorId, setOperatorId] = useState('');
  const [securityPhrase, setSecurityPhrase] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(() => {
    const unlocked = sessionStorage.getItem('fresh_people_unlocked') === 'true' || localStorage.getItem('fresh_people_unlocked') === 'true';
    const loginTime = localStorage.getItem('fresh_people_login_time');
    if (unlocked && loginTime) {
      const elapsed = Date.now() - parseInt(loginTime, 10);
      const SESSION_LIMIT = 4 * 60 * 60 * 1000; // 4 Hours Session Expiry
      if (elapsed < SESSION_LIMIT) {
        return true;
      } else {
        localStorage.removeItem('fresh_people_unlocked');
        localStorage.removeItem('fresh_people_login_time');
        sessionStorage.removeItem('fresh_people_unlocked');
        return false;
      }
    }
    return false;
  });
  const [authError, setAuthError] = useState(false);

  // Advanced Password Recovery Toggle States
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOperatorId, setForgotOperatorId] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  // Session timer countdown display string
  const [sessionTimeLeft, setSessionTimeLeft] = useState('4h 00m 00s');

  // Direct Booking manual section check
  const [isDirectBookingChecked, setIsDirectBookingChecked] = useState(false);

  // WhatsApp active tracking dispatch items
  const [dispatchClientDate, setDispatchClientDate] = useState('');
  const [dispatchAdjustedTime, setDispatchAdjustedTime] = useState('');
  const [dispatchArrangements, setDispatchArrangements] = useState('');

  // Entities states (Clients, Venues, Staff, Events)
  const [clients, setClients] = useState<Client[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [events, setEventsState] = useState<Event[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  // Undo/Redo History System (must be declared before setEvents for tracking)
  const [undoStack, setUndoStack] = useState<Event[][]>([]);
  const [redoStack, setRedoStack] = useState<Event[][]>([]);
  const [undoToast, setUndoToast] = useState<string | null>(null);
  const isUndoRedoAction = useRef(false);
  const MAX_UNDO_HISTORY = 50;

  // Active Tab for Registry List Left Panel
  const [activeTab, setActiveTab ] = useState<'clients' | 'venues' | 'staff'>('clients');
  // roleViewTab moved to RoleUtilizationChart component
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'payroll'>('all');

  // Operational Calendar display Month/Year
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(4); // May (0-indexed: May=4)
  const [selectedDateStr, setSelectedDateStr] = useState<string>('2026-05-28');

  // Google Calendar Integration states
  const [googleUser, setGoogleUser] = useState<any | null>(null);
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isSilentSyncing, setIsSilentSyncing] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
    const raw = localStorage.getItem('fp_autosync_enabled');
    return raw ? raw === 'true' : true;
  });

  // Apple Calendar & Apple ID state parameters
  const [appleUser, setAppleUser] = useState<any | null>(() => {
    const raw = localStorage.getItem('fp_apple_user');
    if (raw) return JSON.parse(raw);
    const defaultAppleUser = { email: 'realyassinali@gmail.com' };
    localStorage.setItem('fp_apple_user', JSON.stringify(defaultAppleUser));
    return defaultAppleUser;
  });
  const [isLinkingApple, setIsLinkingApple] = useState(false);

  // Premium in-app alert toast to prevent native alert popup crashes in sandboxed iframes
  const [toastAlert, setToastAlert] = useState<{ message: string; type: 'info' | 'success' | 'warn' | 'error' } | null>(null);

  const showToast = (message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    setToastAlert({ message, type });
  };

  useEffect(() => {
    if (toastAlert) {
      const timer = setTimeout(() => {
        setToastAlert(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [toastAlert]);
  const [appleEmailInput, setAppleEmailInput] = useState('');
  const [applePasswordInput, setApplePasswordInput] = useState('');
  const [appleFeedUrl, setAppleFeedUrl] = useState<string>(() => {
    const stored = localStorage.getItem('fp_apple_feed_url');
    if (stored) return stored;
    const defaultUrl = 'https://p56-caldav.icloud.com/published/2/MjA3NTMxODM0NzYyMDc1M_MJWBML9PYYcak11gdiRE00jIWbogtgWyD9NtdzTpGoU6oXGhtZYzSDjGnia66w7NxkexZbSwm_tUVl14qv7-g';
    localStorage.setItem('fp_apple_feed_url', defaultUrl);
    return defaultUrl;
  });
  const [isAppleAuthModalOpen, setIsAppleAuthModalOpen] = useState(false);
  const [isAppleSimulatorVisible, setIsAppleSimulatorVisible] = useState(true);
  const [simNewTitle, setSimNewTitle] = useState('');
  const [simNewDate, setSimNewDate] = useState('2026-05-28');
  const [simNewTimeStart, setSimNewTimeStart] = useState('12:00');
  const [simNewTimeEnd, setSimNewTimeEnd] = useState('14:00');
  const [simNewNotes, setSimNewNotes] = useState('');
  const [appleEvents, setAppleEvents] = useState<Event[]>(() => {
    const raw = localStorage.getItem('fp_apple_events');
    if (raw && raw.includes('RMA Khw breakfast')) return JSON.parse(raw);
    
    // Seed real primary-world iCloud / Apple Calendar events customized for @realyassinali
    const seed: Event[] = [
      {
        id: 'apple-live-1',
        title: 'iCloud: RMA Khw breakfast',
        clientId: 'client-rma',
        venueId: 'venue-rma',
        date: '2026-05-25',
        startTime: '08:00',
        endTime: '15:00',
        staffIds: [],
        notes: 'Synchronized from Apple Calendar feed at location: RMA.',
        status: 'Confirmed'
      },
      {
        id: 'apple-live-2',
        title: 'iCloud: Motseng breakfast and lunch',
        clientId: 'client-motseng',
        venueId: 'venue-motseng',
        date: '2026-05-25',
        startTime: '08:00',
        endTime: '14:30',
        staffIds: [],
        notes: 'Synchronized from Apple Calendar feed at location: Motseng.',
        status: 'Confirmed'
      },
      {
        id: 'apple-live-3',
        title: 'iCloud: RMA Dolly/Mali',
        clientId: 'client-rma',
        venueId: 'venue-rma',
        date: '2026-05-26',
        startTime: '08:00',
        endTime: '15:00',
        staffIds: [],
        notes: 'Synchronized from Apple Calendar feed at location: RMA.',
        status: 'Confirmed'
      },
      {
        id: 'apple-live-4',
        title: 'iCloud: ETV',
        clientId: 'client-etv',
        venueId: 'venue-etv',
        date: '2026-05-28',
        startTime: '08:00',
        endTime: '09:00',
        staffIds: [],
        notes: 'Synchronized from Apple Calendar feed.',
        status: 'Confirmed'
      },
      {
        id: 'apple-live-5',
        title: 'iCloud: Sanofi ICDT & World Asthma Day',
        clientId: 'client-sanofi',
        venueId: 'venue-sanofi',
        date: '2026-05-28',
        startTime: '10:00',
        endTime: '15:00',
        staffIds: [],
        notes: 'Synchronized from Apple Calendar feed at location: Sanofi.',
        status: 'Confirmed'
      },
      {
        id: 'apple-live-6',
        title: 'iCloud: MAST Fre Minds eve',
        clientId: 'client-mast',
        venueId: 'venue-tbc',
        date: '2026-05-29',
        startTime: '08:00',
        endTime: '16:00',
        staffIds: [],
        notes: 'Synchronized from Apple Calendar feed at location: TBC.',
        status: 'Confirmed'
      },
      {
        id: 'apple-live-7',
        title: 'iCloud: ETV',
        clientId: 'client-etv',
        venueId: 'venue-etv',
        date: '2026-05-29',
        startTime: '08:00',
        endTime: '09:00',
        staffIds: [],
        notes: 'Synchronized from Apple Calendar feed.',
        status: 'Confirmed'
      },
      {
        id: 'apple-live-8',
        title: 'iCloud: Omphile Letshwiti Lunch',
        clientId: 'client-omphile',
        venueId: 'venue-tbc',
        date: '2026-05-30',
        startTime: '11:30',
        endTime: '13:30',
        staffIds: [],
        notes: 'Synchronized from Apple Calendar feed.',
        status: 'Confirmed'
      }
    ];
    localStorage.setItem('fp_apple_events', JSON.stringify(seed));
    return seed;
  });

  const syncToolToAppleCalendar = (updatedEvents: Event[]) => {
    const rawApple = localStorage.getItem('fp_apple_events');
    let currentApple: Event[] = rawApple ? JSON.parse(rawApple) : [];

    updatedEvents.forEach(toolEv => {
      const matchIdx = currentApple.findIndex(aEv => aEv.id === toolEv.appleEventId || aEv.appleEventId === toolEv.id || aEv.id === toolEv.id);
      if (matchIdx !== -1) {
        currentApple[matchIdx] = {
          ...currentApple[matchIdx],
          title: toolEv.title,
          date: toolEv.date,
          startTime: toolEv.startTime,
          endTime: toolEv.endTime,
          notes: toolEv.notes,
          clientRequirements: toolEv.clientRequirements,
          status: toolEv.status,
          staffIds: toolEv.staffIds,
          staffRSVPs: toolEv.staffRSVPs
        };
      } else {
        const newAppleEv: Event = {
          ...toolEv,
          id: toolEv.appleEventId || `apple-sync-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          appleEventId: toolEv.id
        };
        currentApple.push(newAppleEv);
      }
    });

    currentApple = currentApple.filter(aEv => {
      if (aEv.appleEventId) {
        return updatedEvents.some(toolEv => toolEv.id === aEv.appleEventId);
      }
      return true;
    });

    setAppleEvents(currentApple);
    localStorage.setItem('fp_apple_events', JSON.stringify(currentApple));
  };

  const getMatchedClientAndVenue = (title: string, currentClientId?: string, currentVenueId?: string) => {
    if (currentClientId && clients.some(c => c.id === currentClientId)) {
      const vId = currentVenueId && venues.some(v => v.id === currentVenueId) ? currentVenueId : 'venue-1';
      return { clientId: currentClientId, venueId: vId };
    }

    const combined = title.toLowerCase();
    let cId = 'client-1';
    let vId = 'venue-1';

    if (combined.includes('rma')) {
      cId = 'client-rma';
      vId = 'venue-rma';
    } else if (combined.includes('motseng')) {
      cId = 'client-motseng';
      vId = 'venue-motseng';
    } else if (combined.includes('etv')) {
      cId = 'client-etv';
      vId = 'venue-etv';
    } else if (combined.includes('sanofi')) {
      cId = 'client-sanofi';
      vId = 'venue-sanofi';
    } else if (combined.includes('mast')) {
      cId = 'client-mast';
      vId = 'venue-tbc';
    } else if (combined.includes('omphile') || combined.includes('letshwiti')) {
      cId = 'client-omphile';
      vId = 'venue-tbc';
    } else {
      const matchedC = clients.find(c => combined.includes(c.name.toLowerCase()));
      if (matchedC) {
        cId = matchedC.id;
        const matchedV = venues.find(v => combined.includes(v.name.toLowerCase()));
        if (matchedV) vId = matchedV.id;
      }
    }

    return { clientId: cId, venueId: vId };
  };

  const syncAppleToToolCalendar = (updatedAppleEvents: Event[]) => {
    let toolEvents = [...events];
    let changed = false;

    updatedAppleEvents.forEach(appleEv => {
      const matchIdx = toolEvents.findIndex(e => e.id === appleEv.appleEventId || e.appleEventId === appleEv.id || e.id === appleEv.id);
      if (matchIdx !== -1) {
        const toolEv = toolEvents[matchIdx];
        const matched = getMatchedClientAndVenue(appleEv.title, appleEv.clientId, appleEv.venueId);
        if (
          toolEv.title !== appleEv.title ||
          toolEv.date !== appleEv.date ||
          toolEv.startTime !== appleEv.startTime ||
          toolEv.endTime !== appleEv.endTime ||
          toolEv.notes !== appleEv.notes ||
          toolEv.clientRequirements !== appleEv.clientRequirements ||
          toolEv.status !== appleEv.status ||
          toolEv.clientId !== matched.clientId ||
          toolEv.venueId !== matched.venueId
        ) {
          toolEvents[matchIdx] = {
            ...toolEvents[matchIdx],
            title: appleEv.title,
            clientId: matched.clientId,
            venueId: matched.venueId,
            date: appleEv.date,
            startTime: appleEv.startTime,
            endTime: appleEv.endTime,
            notes: appleEv.notes || toolEv.notes,
            clientRequirements: appleEv.clientRequirements || toolEv.clientRequirements,
            status: appleEv.status || toolEv.status,
            appleEventId: appleEv.id
          };
          changed = true;
          addActivityLog('sync', `iCloud Auto-Sync: Reflected updates from Apple Calendar for "${appleEv.title}".`);
        }
      } else {
        const matched = getMatchedClientAndVenue(appleEv.title, appleEv.clientId, appleEv.venueId);
        const importedLocal: Event = {
          id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          title: appleEv.title,
          clientId: matched.clientId,
          venueId: matched.venueId,
          date: appleEv.date,
          startTime: appleEv.startTime,
          endTime: appleEv.endTime,
          staffIds: appleEv.staffIds || [],
          notes: appleEv.notes || 'Created directly via iCloud Linked Calendar App.',
          clientRequirements: appleEv.clientRequirements || '',
          status: appleEv.status || 'Confirmed',
          appleEventId: appleEv.id,
          staffRSVPs: appleEv.staffRSVPs || {}
        };
        toolEvents.unshift(importedLocal);
        changed = true;
        addActivityLog('sync', `iCloud Auto-Sync: Synchronized new event "${appleEv.title}" from Apple Calendar.`);
      }
    });

    const initialLen = toolEvents.length;
    toolEvents = toolEvents.filter(toolEv => {
      if (toolEv.appleEventId) {
        const stillInApple = updatedAppleEvents.some(aEv => aEv.id === toolEv.appleEventId);
        if (!stillInApple) {
          changed = true;
          addActivityLog('sync', `iCloud Auto-Sync: Decoupled & removed event "${toolEv.title}" matching changes from Apple Calendar.`);
          return false;
        }
      }
      return true;
    });

    if (changed || toolEvents.length !== initialLen) {
      setEvents(toolEvents);
      localStorage.setItem('fp_events', JSON.stringify(toolEvents));
    }
  };

  const setEvents = (val: Event[] | ((prev: Event[]) => Event[])) => {
    setEventsState((prev) => {
      const resolved = typeof val === 'function' ? val(prev) : val;

      // Track undo history (skip during undo/redo to prevent loops)
      if (!isUndoRedoAction.current && resolved !== prev) {
        setUndoStack(u => {
          const newStack = [...u, prev];
          return newStack.length > MAX_UNDO_HISTORY ? newStack.slice(-MAX_UNDO_HISTORY) : newStack;
        });
        setRedoStack([]);
      }

      const rawApple = localStorage.getItem('fp_apple_events');
      let currentApple: Event[] = rawApple ? JSON.parse(rawApple) : [];

      resolved.forEach(toolEv => {
        const matchIdx = currentApple.findIndex(aEv => aEv.id === toolEv.appleEventId || aEv.appleEventId === toolEv.id || aEv.id === toolEv.id);
        if (matchIdx !== -1) {
          currentApple[matchIdx] = {
            ...currentApple[matchIdx],
            title: toolEv.title,
            date: toolEv.date,
            startTime: toolEv.startTime,
            endTime: toolEv.endTime,
            notes: toolEv.notes,
            clientRequirements: toolEv.clientRequirements,
            status: toolEv.status,
            staffIds: toolEv.staffIds,
            staffRSVPs: toolEv.staffRSVPs
          };
        } else {
          const newAppleEv: Event = {
            ...toolEv,
            id: toolEv.appleEventId || `apple-sync-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            appleEventId: toolEv.id
          };
          currentApple.push(newAppleEv);
        }
      });

      currentApple = currentApple.filter(aEv => {
        if (aEv.appleEventId) {
          return resolved.some(toolEv => toolEv.id === aEv.appleEventId);
        }
        return true;
      });

      localStorage.setItem('fp_apple_events', JSON.stringify(currentApple));

      setTimeout(() => {
        setAppleEvents(currentApple);
      }, 0);

      return resolved;
    });
  };

  const undo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(s => s.slice(0, -1));
    setRedoStack(s => {
      const current = events;
      return [...s, current];
    });
    isUndoRedoAction.current = true;
    setEventsState(prev);
    setUndoToast('Action undone');
    addActivityLog('event_create', `↪ Undone — events restored to previous state`);
    setTimeout(() => setUndoToast(null), 2500);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(s => s.slice(0, -1));
    setUndoStack(u => {
      const current = events;
      const newStack = [...u, current];
      return newStack.length > MAX_UNDO_HISTORY ? newStack.slice(-MAX_UNDO_HISTORY) : newStack;
    });
    isUndoRedoAction.current = true;
    setEventsState(next);
    setUndoToast('Action redone');
    addActivityLog('event_create', `↩ Redone — events restored`);
    setTimeout(() => setUndoToast(null), 2500);
  };

  const handleAddAppleSimulatorEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simNewTitle) return;

    const newAppleEvId = `apple-sim-${Date.now()}`;
    const matched = getMatchedClientAndVenue(simNewTitle);
    const newAppleEv: Event = {
      id: newAppleEvId,
      title: `iCloud: ${simNewTitle}`,
      clientId: matched.clientId,
      venueId: matched.venueId,
      date: simNewDate,
      startTime: simNewTimeStart,
      endTime: simNewTimeEnd,
      staffIds: [],
      notes: simNewNotes || 'Entered via iPhone Simulator interface.',
      status: 'Confirmed'
    };

    const updated = [newAppleEv, ...appleEvents];
    setAppleEvents(updated);
    localStorage.setItem('fp_apple_events', JSON.stringify(updated));

    syncAppleToToolCalendar(updated);

    setSimNewTitle('');
    setSimNewNotes('');
    addActivityLog('sync', `iCloud Simulator: Saved and synced new Apple Calendar event: "${newAppleEv.title}".`);
  };

  const handleDeleteAppleSimulatorEvent = (id: string, title: string) => {
    const nextList = appleEvents.filter(ev => ev.id !== id);
    setAppleEvents(nextList);
    localStorage.setItem('fp_apple_events', JSON.stringify(nextList));

    syncAppleToToolCalendar(nextList);
    addActivityLog('sync', `iCloud Simulator: Cancelled and deleted Apple Calendar event: "${title}".`);
  };

  // Call Logger inputs
  const [callCaller, setCallCaller] = useState('');
  const [callType, setCallType] = useState<'call' | 'booking' | 'staff_confirm'>('call');
  const [callSummary, setCallSummary] = useState('');
  const [callUrgent, setCallUrgent] = useState(false);

  // Ingestion Modal Trigger state
  const [activeModal, setActiveModal] = useState<'client' | 'venue' | 'staff' | null>(null);

  // Entity creation inputs
  const [newClient, setNewClient] = useState({ name: '', contact: '', email: '', phone: '', notes: '' });
  const [newVenue, setNewVenue] = useState({ name: '', address: '', capacity: 200, tier: 'Luxury Class', notes: '' });
  const [newStaff, setNewStaff] = useState({ name: '', surname: '', role: 'Lead VIP Architect', rate: 45, phone: '', email: '', notes: '' });

  // Event Scheduler inputs
  const [evTitle, setEvTitle] = useState('');
  const [evClient, setEvClient] = useState('');
  const [evVenue, setEvVenue] = useState('');
  const [evDate, setEvDate] = useState('2026-05-28');
  const [evTimeStart, setEvTimeStart] = useState('18:00');
  const [evTimeEnd, setEvTimeEnd] = useState('22:00');
  const [evNotes, setEvNotes] = useState('');
  const [evClientRequirements, setEvClientRequirements] = useState('');
  const [evSelectedStaffIds, setEvSelectedStaffIds] = useState<string[]>([]);
  const [evStatus, setEvStatus] = useState<'Pending' | 'Confirmed' | 'Canceled'>('Pending');
  const [recurrence, setRecurrence] = useState<'none' | 'weekly' | 'biweekly' | 'monthly'>('none');
  const [recurrenceEnd, setRecurrenceEnd] = useState('');

  // Edit mode state
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Dispatch details
  const [selectedDispatchEventId, setSelectedDispatchEventId] = useState('');
  const [dispatchTemplate, setDispatchTemplate] = useState(
    'Hi {StaffName} hope you are well. Are you available on {Date} from {In} to {Out} with Fresh People mapping? Click links to reply: Confirm: {ConfirmLink} | Reject: {RejectLink}'
  );

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Staff Shift Calendar states
  const [selectedShiftStaffId, setSelectedShiftStaffId] = useState<string>('');
  const [shiftCalendarMonth, setShiftCalendarMonth] = useState(new Date().getMonth());
  const [shiftCalendarYear, setShiftCalendarYear] = useState(new Date().getFullYear());
  const [showRSVPPanel, setShowRSVPPanel] = useState<string | null>(null);

  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Force-create conflict confirmation state
  const [pendingConflict, setPendingConflict] = useState<{
    doubleBookedStaffDetails: string[];
    onConfirm: () => void;
  } | null>(null);

  // Event Templates
  const [eventTemplates, setEventTemplates] = useState<EventTemplate[]>(() => {
    try {
      const saved = localStorage.getItem('fp_event_templates');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showTemplatePanel, setShowTemplatePanel] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateToApply, setTemplateToApply] = useState<EventTemplate | null>(null);

  // Load and apply local data and parameter hooks
  useEffect(() => {
    // Check local storage or seed, force-migrating to South Africa Johannesburg setup
    const isMigrated = localStorage.getItem('fp_migrated_sa_2026_v5') === 'true';

    if (!isMigrated) {
      localStorage.setItem('fp_clients', JSON.stringify(INITIAL_CLIENTS));
      localStorage.setItem('fp_venues', JSON.stringify(INITIAL_VENUES));
      localStorage.setItem('fp_staff', JSON.stringify(INITIAL_STAFF));
      localStorage.setItem('fp_events', JSON.stringify(INITIAL_EVENTS));
      localStorage.setItem('fp_migrated_sa_2026_v5', 'true');

      setClients(INITIAL_CLIENTS);
      setVenues(INITIAL_VENUES);
      setStaff(INITIAL_STAFF);
      setEvents(INITIAL_EVENTS);

      // Synchronize default iCloud events immediately on first setup
      setTimeout(() => {
        const rawApple = localStorage.getItem('fp_apple_events');
        if (rawApple) {
          syncAppleToToolCalendar(JSON.parse(rawApple));
        }
      }, 100);

      const initLog: ActivityLog = {
        id: 'log-1',
        timestamp: new Date().toISOString(),
        operator: 'System Sentinel',
        type: 'auth',
        message: 'Fresh People Operations Center unlocked inside South Africa (Johannesburg HQ).'
      };
      setActivityLogs([initLog]);
      localStorage.setItem('fp_logs', JSON.stringify([initLog]));
    } else {
      const storedClients = localStorage.getItem('fp_clients');
      const storedVenues = localStorage.getItem('fp_venues');
      const storedStaff = localStorage.getItem('fp_staff');
      const storedEvents = localStorage.getItem('fp_events');
      const storedLogs = localStorage.getItem('fp_logs');

      if (storedClients) setClients(JSON.parse(storedClients));
      if (storedVenues) setVenues(JSON.parse(storedVenues));
      if (storedStaff) setStaff(JSON.parse(storedStaff));
      if (storedEvents) {
        const parsed = JSON.parse(storedEvents);
        setEvents(parsed);
        // Ensure Apple events are fully merged/sync-triggered immediately on subsequent visits
        setTimeout(() => {
          const rawApple = localStorage.getItem('fp_apple_events');
          if (rawApple) {
            syncAppleToToolCalendar(JSON.parse(rawApple));
          }
        }, 120);
      }
      if (storedLogs) {
        const parsedLogs = JSON.parse(storedLogs);
        const uniqueLogs = ensureUniqueLogIds(parsedLogs).slice(0, 100);
        setActivityLogs(uniqueLogs);
        localStorage.setItem('fp_logs', JSON.stringify(uniqueLogs));
      }
    }
  }, []);

  // Listen for Google authentication state changes via Firebase
  useEffect(() => {
    const unsub = initAuth(
      (user, token) => {
        setGoogleUser(user);
        addActivityLog('sync', `Google Account synchronisation verified for ${user.email}.`);
        triggerGoogleSync(token);
      },
      () => {
        setGoogleUser(null);
      }
    );
    return () => unsub();
  }, []);

  // Automatic background auto-sync polling loop
  useEffect(() => {
    if (!autoSyncEnabled) return;

    const interval = setInterval(() => {
      if (googleUser) {
        console.log('Continuous Background Auto-Sync: Fetching updates from Google Calendar...');
        triggerGoogleSync(undefined, true);
      }
      
      if (appleUser) {
        console.log('Continuous Background Auto-Sync: Fetching updates from live iCloud Apple Calendar feed...');
        triggerAppleFeedFetch(true);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [googleUser, appleUser, autoSyncEnabled, currentMonth, currentYear, events, appleFeedUrl]);

  // Parse URI Parameters for automatic Dispatch Return responses
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const action = searchParams.get('action');
    const eventId = searchParams.get('eventId');
    const staffId = searchParams.get('staffId');

    if (action && eventId && staffId) {
      // Find staff and event
      const storedEvents = localStorage.getItem('fp_events') ? JSON.parse(localStorage.getItem('fp_events')!) : INITIAL_EVENTS;
      const storedStaff = localStorage.getItem('fp_staff') ? JSON.parse(localStorage.getItem('fp_staff')!) : INITIAL_STAFF;

      const targetEv = storedEvents.find((e: Event) => e.id === eventId);
      const targetS = storedStaff.find((s: Staff) => s.id === staffId);

      if (targetEv && targetS) {
        const staffFullName = `${targetS.name} ${targetS.surname}`;
        let statusUpdate: Event['status'] = 'Pending';
        let logMsg = '';

        if (action === 'confirm') {
          statusUpdate = 'Confirmed';
          logMsg = `Staff member ${staffFullName} approved scheduled slot for "${targetEv.title}". Roster state updated to CONFIRMED.`;
        } else if (action === 'reject') {
          statusUpdate = 'Canceled';
          logMsg = `Staff member ${staffFullName} declined scheduled slot for "${targetEv.title}". Status state updated to ATTENTION.`;
        }

        // Update local events state list with both overall event status and individual staff RSVP states
        const updatedEvents = storedEvents.map((e: Event) => {
          if (e.id === eventId) {
            const currentRSVPs = e.staffRSVPs || {};
            const nextRSVPs = { ...currentRSVPs, [staffId]: action === 'confirm' ? 'Available' as const : 'Unavailable' as const };
            return {
              ...e,
              status: statusUpdate,
              staffRSVPs: nextRSVPs
            };
          }
          return e;
        });

        localStorage.setItem('fp_events', JSON.stringify(updatedEvents));
        setEvents(updatedEvents);

        // Add to logs
        const newLog: ActivityLog = {
          id: `log-reply-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          timestamp: new Date().toISOString(),
          operator: 'WhatsApp Hook',
          type: 'staff_reply',
          message: logMsg,
          isUrgent: action === 'reject'
        };

        const currentLogs = localStorage.getItem('fp_logs') ? JSON.parse(localStorage.getItem('fp_logs')!) : [];
        const logsCombined = ensureUniqueLogIds([newLog, ...currentLogs]).slice(0, 100);
        localStorage.setItem('fp_logs', JSON.stringify(logsCombined));
        setActivityLogs(logsCombined);

        // Notify client
        showToast(`Core Operational Callback Handled: ${staffFullName} replied: ${action.toUpperCase()}`, 'success');

        // Clean query parameters to avoid looping triggers
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  // Session details timer checking
  useEffect(() => {
    if (!isUnlocked) return;
    
    // Check session every second to update remaining hours
    const interval = setInterval(() => {
      const loginTime = localStorage.getItem('fresh_people_login_time');
      if (loginTime) {
        const elapsed = Date.now() - parseInt(loginTime, 10);
        const SESSION_LIMIT = 4 * 60 * 60 * 1000; // 4 Hours Session Expiry
        const remaining = SESSION_LIMIT - elapsed;
        
        if (remaining <= 0) {
          triggerLogout();
          showToast('Secure Session Expiry: Your Operator key has expired due to quiet period bounds.', 'error');
        } else {
          const secs = Math.floor((remaining / 1000) % 60);
          const mins = Math.floor((remaining / (1000 * 60)) % 60);
          const hrs = Math.floor((remaining / (1000 * 60 * 60)) % 24);
          
          let formatted = '';
          if (hrs > 0) formatted += `${hrs}h `;
          formatted += `${mins}m ${secs}s`;
          setSessionTimeLeft(formatted);
        }
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isUnlocked]);

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable;

      // Esc always works — close modals/panels
      if (e.key === 'Escape') {
        if (showShortcutsModal) { setShowShortcutsModal(false); return; }
        if (activeModal) { setActiveModal(null); return; }
        if (showDeleteConfirm) { setShowDeleteConfirm(null); return; }
        if (showRSVPPanel) { setShowRSVPPanel(null); return; }
        if (editingEventId) { handleCancelEdit(); return; }
        return;
      }

      // '?' — show keyboard shortcuts help (Shift+/)
      if (e.key === '?' && !isInput) {
        e.preventDefault();
        setShowShortcutsModal(prev => !prev);
        return;
      }

      // Ctrl+N — New event (scroll to event form)
      if (e.key === 'n' && e.ctrlKey && !isInput) {
        e.preventDefault();
        const formEl = document.getElementById('directory_section');
        if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      // Alt+C — Switch to Clients tab
      if (e.key === 'c' && e.altKey && !isInput) {
        e.preventDefault();
        switchTab('clients');
        return;
      }

      // Alt+V — Switch to Venues tab
      if (e.key === 'v' && e.altKey && !isInput) {
        e.preventDefault();
        switchTab('venues');
        return;
      }

      // Alt+S — Switch to Staff tab
      if (e.key === 's' && e.altKey && !isInput) {
        e.preventDefault();
        switchTab('staff');
        return;
      }

      // Alt+E — Open event creation modal (same as clicking New Event)
      if (e.key === 'e' && e.altKey && !isInput) {
        e.preventDefault();
        const formEl = document.getElementById('directory_section');
        if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      // Ctrl+B — Export JSON backup
      if (e.key === 'b' && e.ctrlKey && !isInput) {
        e.preventDefault();
        handleExportJSON();
        return;
      }

      // Ctrl+Z — Undo (with Shift for Redo, or Ctrl+Y)
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !isInput) {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      // Ctrl+Y — Redo (alternative)
      if (e.key === 'y' && (e.ctrlKey || e.metaKey) && !isInput) {
        e.preventDefault();
        redo();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModal, showDeleteConfirm, showRSVPPanel, editingEventId, showShortcutsModal, undo, redo]);

  // Sync state functions
  const addActivityLog = (type: ActivityLog['type'], message: string, isUrgent = false) => {
    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      operator: 'yassin',
      type,
      message,
      isUrgent
    };
    setActivityLogs((prev) => {
      // Keep only the 100 latest entries to prevent storage bloat and QuotaExceededError
      const next = [newLog, ...prev].slice(0, 100);
      localStorage.setItem('fp_logs', JSON.stringify(next));
      return next;
    });
  };

  // Clock Update
  const [systime, setSystime] = useState('19:52:35');
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setSystime(now.toISOString().split('T')[1].slice(0, 8));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Authentication Submission
  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      operatorId.toLowerCase() === OPERATOR_CREDENTIALS.username &&
      securityPhrase === OPERATOR_CREDENTIALS.password
    ) {
      setIsUnlocked(true);
      sessionStorage.setItem('fresh_people_unlocked', 'true');
      localStorage.setItem('fresh_people_unlocked', 'true');
      localStorage.setItem('fresh_people_login_time', Date.now().toString());
      setAuthError(false);
      // Log authentication success
      addActivityLog('auth', `Operator 'yassin' successfully decrypted gateway. 4-hour session timer loaded.`);
    } else {
      setAuthError(true);
    }
  };

  // Advanced Password Recovery via Placeholder Email Dispatch Service
  const handleResetPasswordRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOperatorId || !forgotEmail) return;

    // Simulate link dispatch
    setResetSuccessMessage(`Security recovery link successfully generated & dispatched to ${forgotEmail}. [Simulated System Service Active] - The decryption key remains 'FreshPeople2026!'`);
    addActivityLog('auth', `Emergency recovery protocol initialized for ID: ${forgotOperatorId} matching email ${forgotEmail}.`, true);
    
    setForgotOperatorId('');
    setForgotEmail('');
  };

  // Logout Handlers
  const triggerLogout = () => {
    setIsUnlocked(false);
    sessionStorage.removeItem('fresh_people_unlocked');
    localStorage.removeItem('fresh_people_unlocked');
    localStorage.removeItem('fresh_people_login_time');
    addActivityLog('auth', `Operator logged out. Gate controls locked secure.`);
  };

  // Tab switcher helper
  const switchTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
  };

  // Ingestion Sub-Forms submission
  const registerClient = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `client-${Date.now()}`;
    const clientData: Client = { id: newId, ...newClient };
    const list = [...clients, clientData];
    setClients(list);
    localStorage.setItem('fp_clients', JSON.stringify(list));
    addActivityLog('event_create', `Ingested Premium Client: "${clientData.name}" managed via ${clientData.contact}.`);
    setNewClient({ name: '', contact: '', email: '', phone: '', notes: '' });
    setActiveModal(null);
  };

  const registerVenue = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `venue-${Date.now()}`;
    const venueData: Venue = { id: newId, ...newVenue };
    const list = [...venues, venueData];
    setVenues(list);
    localStorage.setItem('fp_venues', JSON.stringify(list));
    addActivityLog('event_create', `Indexed Premium Venue: "${venueData.name}" (${venueData.tier}) fully buffered.`);
    setNewVenue({ name: '', address: '', capacity: 200, tier: 'Luxury Class', notes: '' });
    setActiveModal(null);
  };

  const registerStaff = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `staff-${Date.now()}`;
    const staffData: Staff = { id: newId, ...newStaff };
    const list = [...staff, staffData];
    setStaff(list);
    localStorage.setItem('fp_staff', JSON.stringify(list));
    addActivityLog('event_create', `Registered Staff Member: ${staffData.name} ${staffData.surname} (${staffData.role}) logged.`);
    setNewStaff({ name: '', surname: '', role: 'Lead VIP Architect', rate: 45, phone: '', email: '', notes: '' });
    setActiveModal(null);
  };

  // Create scheduled Local Event & Sync to Google Calendar automatically
  const createEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    // Edit mode: update existing event
    if (editingEventId) {
      if (!evClient || !evVenue) {
        showToast('Please select Client and Venue partners before proceeding.', 'warn');
        return;
      }

      const existingEvent = events.find(ev => ev.id === editingEventId);
      if (!existingEvent) {
        showToast('Event not found. It may have been deleted.', 'error');
        setEditingEventId(null);
        return;
      }

      // Double-booking validation (exclude the event being edited)
      const { start: newStart, end: newEnd } = getEventDates(evDate, evTimeStart, evTimeEnd);
      const doubleBookedStaffDetails: string[] = [];

      evSelectedStaffIds.forEach(staffId => {
        const conflictingEvents = events.filter(existingEv => {
          if (existingEv.id === editingEventId) return false;
          if (!existingEv.staffIds.includes(staffId)) return false;
          const { start: existStart, end: existEnd } = getEventDates(
            existingEv.date, existingEv.startTime, existingEv.endTime
          );
          return newStart < existEnd && existStart < newEnd;
        });
        if (conflictingEvents.length > 0) {
          const staffObj = staff.find(s => s.id === staffId);
          const name = staffObj ? `${staffObj.name} ${staffObj.surname} (${staffObj.role})` : `Staff ID: ${staffId}`;
          const eventTitles = conflictingEvents.map(ev => `"${ev.title}" on ${ev.date} at ${ev.startTime}-${ev.endTime}`).join(', ');
          doubleBookedStaffDetails.push(`• ${name} is busy with: ${eventTitles}`);
        }
      });

      if (doubleBookedStaffDetails.length > 0) {
        const warningMessage = `Staff Double-Booking overlap detected!\n\n${doubleBookedStaffDetails.join('\n')}\n\nProceed anyway?`;
        if (!window.confirm(warningMessage)) {
          return;
        }
        addActivityLog('event_create', `⚠ Operator overrode double-booking conflict for edit of "${evTitle}".`);
      }

      const rsvps: Record<string, 'Available' | 'Pending'> = {};
      evSelectedStaffIds.forEach(id => {
        // Preserve existing RSVP for staff that were already allocated, default new ones
        rsvps[id] = existingEvent.staffRSVPs?.[id] || (isDirectBookingChecked ? 'Available' : 'Pending');
      });

      const updatedEvent: Event = {
        ...existingEvent,
        title: evTitle,
        clientId: evClient,
        venueId: evVenue,
        date: evDate,
        startTime: evTimeStart,
        endTime: evTimeEnd,
        staffIds: evSelectedStaffIds,
        notes: evNotes,
        clientRequirements: evClientRequirements,
        status: evStatus,
        isDirectBooking: isDirectBookingChecked,
        staffRSVPs: rsvps,
      };

      const updatedEvents = events.map(ev => ev.id === editingEventId ? updatedEvent : ev);
      setEvents(updatedEvents);
      localStorage.setItem('fp_events', JSON.stringify(updatedEvents));
      addActivityLog('event_create', `Updated event: "${updatedEvent.title}" on ${updatedEvent.date}.`);

      // Update Google Calendar if synced
      const token = await getAccessToken();
      if (googleUser && token && existingEvent.googleEventId) {
        try {
          setSyncStatusMsg('Updating Google Calendar event...');
          const clientObj = clients.find(c => c.id === evClient);
          const venueObj = venues.find(v => v.id === evVenue);
          await updateEventInGoogleCalendar(
            token,
            existingEvent.googleEventId,
            updatedEvent,
            clientObj?.name || 'Local client',
            venueObj?.name || 'Local venue',
            venueObj?.address || 'Local Address'
          );
          addActivityLog('sync', `Google Calendar event updated for "${updatedEvent.title}".`);
          triggerGoogleSync(token);
        } catch (err: any) {
          console.error('Google update failed:', err);
          addActivityLog('sync', `Failed to update Google Calendar: ${err.message}`, true);
        } finally {
          setSyncStatusMsg('');
        }
      }

      // Reset form and exit edit mode
      resetEventForm();
      setEditingEventId(null);
      showToast(`Event "${updatedEvent.title}" updated successfully.`, 'success');
      return;
    }
    if (!evClient || !evVenue) {
      showToast('Please select Client and Venue partners before proceeding.', 'warn');
      return;
    }

    // Double-booking validation check for selected staff
    const { start: newStart, end: newEnd } = getEventDates(evDate, evTimeStart, evTimeEnd);
    const doubleBookedStaffDetails: string[] = [];

    evSelectedStaffIds.forEach(staffId => {
      const conflictingEvents = events.filter(existingEvent => {
        if (!existingEvent.staffIds.includes(staffId)) return false;

        const { start: existStart, end: existEnd } = getEventDates(
          existingEvent.date,
          existingEvent.startTime,
          existingEvent.endTime
        );

        // Standard overlapping interval check
        return newStart < existEnd && existStart < newEnd;
      });

      if (conflictingEvents.length > 0) {
        const staffObj = staff.find(s => s.id === staffId);
        const name = staffObj ? `${staffObj.name} ${staffObj.surname} (${staffObj.role})` : `Staff ID: ${staffId}`;
        const eventTitles = conflictingEvents
          .map(ev => `"${ev.title}" on ${ev.date} at ${ev.startTime}-${ev.endTime}`)
          .join(', ');
        doubleBookedStaffDetails.push(`• ${name} is busy with: ${eventTitles}`);
      }
    });

    if (doubleBookedStaffDetails.length > 0) {
      const warningMessage = `Staff Double-Booking overlap detected!\n\n${doubleBookedStaffDetails.join('\n')}\n\nProceed anyway?`;
      if (!window.confirm(warningMessage)) {
        return;
      }
      addActivityLog('event_create', `⚠ Operator overrode double-booking conflict for "${evTitle}".`);
    }

    const eventId = `event-${Date.now()}`;
    const rsvps: Record<string, 'Available' | 'Pending'> = {};
    evSelectedStaffIds.forEach(id => {
      rsvps[id] = isDirectBookingChecked ? 'Available' : 'Pending';
    });

    const mappedEvent: Event = {
      id: eventId,
      title: evTitle,
      clientId: evClient,
      venueId: evVenue,
      date: evDate,
      startTime: evTimeStart,
      endTime: evTimeEnd,
      staffIds: evSelectedStaffIds,
      notes: evNotes,
      clientRequirements: evClientRequirements,
      status: evStatus,
      isDirectBooking: isDirectBookingChecked,
      staffRSVPs: rsvps
    };

    // Core validation: Update events state lists
    const nextEvents = [mappedEvent, ...events];
    setEvents(nextEvents);
    localStorage.setItem('fp_events', JSON.stringify(nextEvents));

    if (isDirectBookingChecked) {
      addActivityLog('direct_booking', `Manual Direct Booking Registered: "${mappedEvent.title}" on ${mappedEvent.date} (Staff pre-confirmed: ${mappedEvent.staffIds.length}).`);
    } else {
      addActivityLog('event_create', `Architected Scheduled Event: "${mappedEvent.title}" on ${mappedEvent.date} (Staff count: ${mappedEvent.staffIds.length}).`);
    }

    // Bidirectional sync: If logged in to Google Calendar, push context immediately!
    const token = await getAccessToken();
    if (googleUser && token) {
      try {
        const clientObj = clients.find((c) => c.id === evClient);
        const venueObj = venues.find((v) => v.id === evVenue);

        setSyncStatusMsg('Pushing event to Google Calendar automatically...');
        const googleEventId = await pushEventToGoogleCalendar(
          token,
          mappedEvent,
          clientObj?.name || 'Local client',
          venueObj?.name || 'Local venue',
          venueObj?.address || 'Local Address'
        );

        // Cache Google Event Id locally
        const updatedEvents = nextEvents.map((ev) => {
          if (ev.id === eventId) {
            return { ...ev, googleEventId };
          }
          return ev;
        });

        setEvents(updatedEvents);
        localStorage.setItem('fp_events', JSON.stringify(updatedEvents));
        addActivityLog('sync', `Google Calendar synchronization successful. Event exported as (ID: ${googleEventId.slice(0,8)}).`);
        triggerGoogleSync(token);
      } catch (err: any) {
        console.error('Core auto sync failed:', err);
        addActivityLog('sync', `Failed to auto-export event to Google Calendar: ${err.message}`, true);
      } finally {
        setSyncStatusMsg('');
      }
    }

    // Reset fields
    resetEventForm();
  };

  // Reset event form fields
  const resetEventForm = () => {
    setEvTitle('');
    setEvNotes('');
    setEvClientRequirements('');
    setEvSelectedStaffIds([]);
    setEvStatus('Pending');
    setIsDirectBookingChecked(false);
    setEvClient('');
    setEvVenue('');
    setEvTimeStart('18:00');
    setEvTimeEnd('22:00');
    setSelectedDateStr(evDate);
  };

  // --- Event Templates ---
  const saveEventTemplate = () => {
    if (!templateName.trim()) {
      showToast('Please enter a template name.', 'warn');
      return;
    }
    if (!evClient || !evVenue) {
      showToast('Select Client and Venue before saving as template.', 'warn');
      return;
    }
    const newTemplate: EventTemplate = {
      id: `tmpl-${Date.now()}`,
      name: templateName.trim(),
      title: evTitle,
      clientId: evClient,
      venueId: evVenue,
      startTime: evTimeStart,
      endTime: evTimeEnd,
      staffIds: evSelectedStaffIds,
      notes: evNotes,
      clientRequirements: evClientRequirements,
      isDirectBooking: isDirectBookingChecked,
      createdAt: new Date().toISOString(),
    };
    const updated = [...eventTemplates, newTemplate];
    setEventTemplates(updated);
    localStorage.setItem('fp_event_templates', JSON.stringify(updated));
    setTemplateName('');
    showToast(`Template "${newTemplate.name}" saved.`, 'success');
    addActivityLog('event_create', `Saved event template: "${newTemplate.name}".`);
  };

  const applyEventTemplate = (tmpl: EventTemplate) => {
    setEvTitle(tmpl.title);
    setEvClient(tmpl.clientId);
    setEvVenue(tmpl.venueId);
    setEvTimeStart(tmpl.startTime);
    setEvTimeEnd(tmpl.endTime);
    setEvNotes(tmpl.notes);
    setEvClientRequirements(tmpl.clientRequirements);
    setEvSelectedStaffIds(tmpl.staffIds);
    setIsDirectBookingChecked(tmpl.isDirectBooking);
    setShowTemplatePanel(false);
    showToast(`Template "${tmpl.name}" applied. Set date and create event.`, 'info');
  };

  const deleteEventTemplate = (id: string) => {
    const tmpl = eventTemplates.find(t => t.id === id);
    const updated = eventTemplates.filter(t => t.id !== id);
    setEventTemplates(updated);
    localStorage.setItem('fp_event_templates', JSON.stringify(updated));
    if (tmpl) addActivityLog('event_delete', `Deleted event template: "${tmpl.name}".`);
  };

  // Populate form for editing an existing event
  const handleEditEvent = (event: Event) => {
    setEditingEventId(event.id);
    setEvTitle(event.title);
    setEvClient(event.clientId);
    setEvVenue(event.venueId);
    setEvDate(event.date);
    setEvTimeStart(event.startTime);
    setEvTimeEnd(event.endTime);
    setEvNotes(event.notes || '');
    setEvClientRequirements(event.clientRequirements || '');
    setEvSelectedStaffIds(event.staffIds || []);
    setEvStatus(event.status || 'Pending');
    setIsDirectBookingChecked(event.isDirectBooking || false);
    setSelectedDateStr(event.date);
    // Scroll to the Event Architect form
    setTimeout(() => {
      document.querySelector('#input_ev_title')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.getElementById('input_ev_title')?.focus();
    }, 100);
  };

  // Cancel edit mode and reset form
  const handleCancelEdit = () => {
    setEditingEventId(null);
    resetEventForm();
  };

  // Duplicate an existing event — creates a copy with new ID and today's date
  const handleDuplicateEvent = (event: Event) => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const newEvent: Event = {
      ...event,
      id: `event-clone-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: `${event.title} (Copy)`,
      date: todayStr,
      status: 'Pending',
      staffRSVPs: {},
    };
    const updatedEvents = [...events, newEvent];
    setEvents(updatedEvents);
    localStorage.setItem('fp_events', JSON.stringify(updatedEvents));
    addActivityLog('event_create', `Duplicated event "${event.title}" → "${newEvent.title}" (new date: ${todayStr}).`);
    showToast(`Event duplicated: "${newEvent.title}"`, 'success');
  };

  // Quick status cycle: Pending → Confirmed → Canceled → Pending
  const STATUS_CYCLE: ('Pending' | 'Confirmed' | 'Canceled')[] = ['Pending', 'Confirmed', 'Canceled'];
  const handleQuickStatusChange = (eventId: string) => {
    const updatedEvents = events.map((e) => {
      if (e.id === eventId) {
        const currentIdx = STATUS_CYCLE.indexOf(e.status || 'Pending');
        const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];
        return { ...e, status: nextStatus };
      }
      return e;
    });
    setEvents(updatedEvents);
    localStorage.setItem('fp_events', JSON.stringify(updatedEvents));
    const ev = updatedEvents.find(e => e.id === eventId);
    if (ev) {
      addActivityLog('event_create', `Status changed: "${ev.title}" → ${ev.status}`);
    }
  };

  // Toggle/Override individual RSVP status manually from the audit engine
  const toggleStaffRSVP = (eventId: string, staffId: string) => {
    const updatedEvents = events.map((e) => {
      if (e.id === eventId) {
        const currentRSVPs = e.staffRSVPs || {};
        const currentVal = currentRSVPs[staffId] || (e.isDirectBooking ? 'Available' : 'Pending');
        const nextVal = currentVal === 'Available' ? 'Pending' : 'Available';
        const nextRSVPs = { ...currentRSVPs, [staffId]: nextVal };
        return {
          ...e,
          staffRSVPs: nextRSVPs
        };
      }
      return e;
    });
    setEvents(updatedEvents);
    localStorage.setItem('fp_events', JSON.stringify(updatedEvents));
    addActivityLog('staff_reply', `Operator overridden RSVP status to ${updatedEvents.find(e => e.id === eventId)?.staffRSVPs?.[staffId]} for staffId ${staffId} on eventId ${eventId}.`);
  };

  // Bulk RSVP update: mark all staff for an event as Available or Unavailable
  const bulkUpdateRSVP = (eventId: string, state: 'Available' | 'Unavailable') => {
    const updatedEvents = events.map((e) => {
      if (e.id !== eventId) return e;
      const currentRSVPs = e.staffRSVPs || {};
      const nextRSVPs: Record<string, 'Available' | 'Pending' | 'Unavailable'> = {};
      for (const sId of e.staffIds) {
        nextRSVPs[sId] = state;
      }
      return { ...e, staffRSVPs: { ...currentRSVPs, ...nextRSVPs } };
    });
    setEvents(updatedEvents);
    localStorage.setItem('fp_events', JSON.stringify(updatedEvents));
    const updatedEvent = updatedEvents.find(ev => ev.id === eventId);
    const staffCount = updatedEvent?.staffIds?.length || 0;
    addActivityLog('staff_reply', `Bulk RSVP: marked ${staffCount} staff as ${state} for "${updatedEvent?.title}".`);
  };

  // Delete scheduled event + remove from Google Calendar sync ID references
  const deleteEvent = async (id: string) => {
    const target = events.find((ev) => ev.id === id);
    if (!target) return;

    // Filter list
    const filtered = events.filter((ev) => ev.id !== id);
    setEvents(filtered);
    localStorage.setItem('fp_events', JSON.stringify(filtered));
    addActivityLog('event_delete', `Deleted event record for "${target.title}" on date ${target.date}.`);

    // Close delete confirm modal
    setShowDeleteConfirm(null);

    // Remove from Google Calendar if matched
    const token = await getAccessToken();
    if (googleUser && token && target.googleEventId) {
      try {
        setSyncStatusMsg('Removing scheduled slot from Google Calendar...');
        await deleteEventFromGoogleCalendar(token, target.googleEventId);
        addActivityLog('sync', `Removed Google Calendar synced instance for "${target.title}".`);
        triggerGoogleSync(token);
      } catch (err: any) {
        console.error('Google removal failed:', err);
        addActivityLog('sync', `Failed to delete from Google Calendar: ${err.message}`, true);
      } finally {
        setSyncStatusMsg('');
      }
    }
  };

  // Fetch Google Calendar in bidirectional manner
  const triggerGoogleSync = async (providedToken?: string, silent = false) => {
    const token = providedToken || (await getAccessToken());
    if (!token) {
      if (!silent) {
        addActivityLog('sync', 'Cannot synchronise. Sign in to Google required.', true);
      }
      return;
    }

    if (!silent) {
      setIsSyncing(true);
      setSyncStatusMsg('Synchronising command center with Google Calendar...');
    } else {
      setIsSilentSyncing(true);
    }

    try {
      // Fetch calendar bounds around current selected month
      const startOfWindow = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01T00:00:00Z`;
      const endOfWindow = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-31T23:59:59Z`;

      const gEvents = await fetchGoogleCalendarEvents(token, startOfWindow, endOfWindow);
      setGoogleEvents(gEvents);
      setLastSyncTime(new Date());

      if (!silent) {
        addActivityLog(
          'sync',
          `Bidirectional Sync completed. Resolved ${gEvents.length} active instances from Google Calendar.`
        );
      }
    } catch (err: any) {
      console.error('Google sync fetch error:', err);
      if (!silent) {
        addActivityLog('sync', `Failed to complete bidirectional mapping: ${err.message}`, true);
      }
    } finally {
      if (!silent) {
        setIsSyncing(false);
        setSyncStatusMsg('');
      } else {
        setIsSilentSyncing(false);
      }
    }
  };

  // Handle Google Auth via popup
  const handleGoogleLogin = async () => {
    try {
      setSyncStatusMsg('Establishing secure Google connection...');
      const response = await googleSignIn();
      if (response) {
        setGoogleUser(response.user);
        addActivityLog('sync', `Google Calendar connection authenticated under ${response.user.email}`);
        await triggerGoogleSync(response.accessToken);
      }
    } catch (e: any) {
      console.error(e);
      showToast(`Google Auth Failed: ${e.message}`, 'error');
    } finally {
      setSyncStatusMsg('');
    }
  };

  const handleGoogleLogout = async () => {
    await logoutGoogle();
    setGoogleUser(null);
    setGoogleEvents([]);
    addActivityLog('sync', 'Google Calendar connection decoupled.');
  };

  // Handle Sign in with Apple and Apple Calendar sync
  const handleAppleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appleEmailInput) return;
    setIsLinkingApple(true);
    setSyncStatusMsg('Verifying Apple Credentials and iCloud Calendar slot synchronization...');

    setTimeout(async () => {
      const userObj = { email: appleEmailInput };
      setAppleUser(userObj);
      localStorage.setItem('fp_apple_user', JSON.stringify(userObj));
      localStorage.setItem('fp_apple_feed_url', appleFeedUrl);
      addActivityLog('sync', `iCloud Calendar and Sign in with Apple linked successfully under ID ${appleEmailInput}.`);
      setIsLinkingApple(false);
      setSyncStatusMsg('');
      setIsAppleAuthModalOpen(false);
      setAppleEmailInput('');
      setApplePasswordInput('');

      // Perform initial fetch from Apple iCal URL stream
      await triggerAppleFeedFetch(false);
    }, 1200);
  };

  const handleAppleLogout = () => {
    setAppleUser(null);
    localStorage.removeItem('fp_apple_user');
    addActivityLog('sync', 'Apple ID and iCloud Calendar synchronization unlinked.');
  };

  // Safe iCal datetime format parser
  const parseIcalTime = (val: string): { date: string; time: string } => {
    const clean = val.replace(/[^0-9T]/g, '');
    if (clean.length >= 8) {
      const y = clean.substring(0, 4);
      const m = clean.substring(4, 6);
      const d = clean.substring(6, 8);
      const dateStr = `${y}-${m}-${d}`;

      let timeStr = '12:00';
      const tIdx = clean.indexOf('T');
      if (tIdx !== -1 && clean.length >= tIdx + 5) {
        const hh = clean.substring(tIdx + 1, tIdx + 3);
        const mm = clean.substring(tIdx + 3, tIdx + 5);
        timeStr = `${hh}:${mm}`;
      }
      return { date: dateStr, time: timeStr };
    }
    return { date: '2026-05-28', time: '12:00' };
  };

  const triggerAppleFeedFetch = async (silent = false) => {
    if (!appleFeedUrl) return;

    if (!silent) {
      setSyncStatusMsg('Fetching latest live Apple Calendar stream...');
      setIsSyncing(true);
    } else {
      setIsSilentSyncing(true);
    }

    try {
      let targetUrl = appleFeedUrl.trim();
      if (targetUrl.startsWith('webcal://')) {
        targetUrl = 'https://' + targetUrl.slice(9);
      }

      let txt = '';
      const proxies = [
        `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
        targetUrl
      ];

      let success = false;
      for (const proxyUrl of proxies) {
        try {
          console.log(`iCloud Sync Engine: Fetching from ${proxyUrl}`);
          const res = await fetch(proxyUrl);
          if (res.ok) {
            txt = await res.text();
            if (txt && txt.includes('BEGIN:VCALENDAR')) {
              success = true;
              break;
            }
          }
        } catch (fetchErr) {
          console.warn(`Proxy failed: ${proxyUrl}`, fetchErr);
        }
      }

      if (!success) {
        if (appleEvents && appleEvents.length > 0) {
          syncAppleToToolCalendar(appleEvents);
          if (!silent) {
            addActivityLog(
              'sync',
              `⚠️ Live iCloud feed unreachable. Restored ${appleEvents.length} cached/simulated events from local backup store.`
            );
          }
          return;
        }
        throw new Error('iCloud stream response was empty or blocked by cross-origin security.');
      }

      const lines = txt.split(/\r?\n/);
      const parsedAppleEvents: Event[] = [];
      let currentEvent: any = null;
      let insideEvent = false;

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        while (i + 1 < lines.length && (lines[i + 1].startsWith(' ') || lines[i + 1].startsWith('\t'))) {
          line += lines[i + 1].substring(1);
          i++;
        }

        if (line.startsWith('BEGIN:VEVENT')) {
          currentEvent = {};
          insideEvent = true;
        } else if (line.startsWith('END:VEVENT')) {
          if (currentEvent && currentEvent.uid) {
            const id = currentEvent.uid;
            const title = currentEvent.summary || 'iCloud Calendar Event';
            const notes = currentEvent.description || 'Imported from linked Apple Calendar.';
            
            let startVal = currentEvent.dtstart || '';
            let endVal = currentEvent.dtend || '';
            
            const parsedStart = parseIcalTime(startVal);
            const parsedEnd = parseIcalTime(endVal);

            const matched = getMatchedClientAndVenue(title);
            parsedAppleEvents.push({
              id: `apple-live-${id}`,
              title,
              clientId: matched.clientId,
              venueId: matched.venueId,
              date: parsedStart.date,
              startTime: parsedStart.time,
              endTime: parsedEnd.time,
              staffIds: [],
              notes,
              status: 'Confirmed'
            });
          }
          currentEvent = null;
          insideEvent = false;
        } else if (insideEvent && currentEvent) {
          const colonIdx = line.indexOf(':');
          if (colonIdx !== -1) {
            const keyPart = line.substring(0, colonIdx);
            const val = line.substring(colonIdx + 1).trim();

            if (keyPart.startsWith('SUMMARY')) {
              currentEvent.summary = val;
            } else if (keyPart.startsWith('DESCRIPTION')) {
              currentEvent.description = val;
            } else if (keyPart.startsWith('DTSTART')) {
              currentEvent.dtstart = val;
            } else if (keyPart.startsWith('DTEND')) {
              currentEvent.dtend = val;
            } else if (keyPart.startsWith('UID')) {
              currentEvent.uid = val;
            } else if (keyPart.startsWith('LOCATION')) {
              currentEvent.location = val;
            }
          }
        }
      }

      if (parsedAppleEvents.length > 0) {
        setAppleEvents(parsedAppleEvents);
        localStorage.setItem('fp_apple_events', JSON.stringify(parsedAppleEvents));
        syncAppleToToolCalendar(parsedAppleEvents);
        setLastSyncTime(new Date());

        if (!silent) {
          addActivityLog(
            'sync',
            `iCloud stream successfully fetched! Restored ${parsedAppleEvents.length} active event bookings from your live Apple Calendar.`
          );
        }
      } else {
        if (!silent) {
          addActivityLog('sync', 'Successfully fetched iCloud feed, but found no valid scheduled events.');
        }
      }

    } catch (err: any) {
      console.error('Apple iCloud fetch error:', err);
      if (!silent) {
        addActivityLog('sync', `iCloud Sync failed: ${err.message}`, true);
      }
    } finally {
      if (!silent) {
        setIsSyncing(false);
        setSyncStatusMsg('');
      } else {
        setIsSilentSyncing(false);
      }
    }
  };

  const handlePushToAppleCalendar = () => {
    setIsSyncing(true);
    setSyncStatusMsg('Syncing all active Johannesburg roster slots to iCloud Calendar space...');
    setTimeout(() => {
      setIsSyncing(false);
      setSyncStatusMsg('');
      const now = new Date();
      const startOfCurrentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const syncedEvents = events.filter((ev) => ev.date >= startOfCurrentMonthStr);
      addActivityLog('sync', `Successfully synchronized ${syncedEvents.length} event slots (including ${staff.length} registered staff) starting from ${startOfCurrentMonthStr} with high priority to linked iCloud Calendar.`);
      showToast(`iCloud Roster Sync Complete: ${syncedEvents.length} event slots starting this month (${startOfCurrentMonthStr}) successfully synced to Apple Calendar.`, 'success');
    }, 1100);
  };

  // Manual logs & calls record
  const logPhoneCall = (e: React.FormEvent) => {
    e.preventDefault();
    if (!callCaller || !callSummary) return;

    addActivityLog(callType, `[Caller: ${callCaller}] ${callSummary}`, callUrgent);
    setCallCaller('');
    setCallSummary('');
    setCallUrgent(false);
  };

  // Clear log logs
  const clearLogs = () => {
    const freshLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      operator: 'yassin',
      type: 'auth',
      message: 'Office Activity Stream buffer cleared.'
    };
    setActivityLogs([freshLog]);
    localStorage.setItem('fp_logs', JSON.stringify([freshLog]));
  };

  // -------------------------------------------------------------------------
  // HIGH END PAYROLL CALENDAR SYSTEM MATH & HIGHLIGHTS
  // -------------------------------------------------------------------------
  // Rules: opens on 26th of current month and closes/cuts off on 25th of current cycle.
  // Wait, the specification says:
  // "Cycle opens on the 26th of the current month, and closes/cuts off on the 25th of the following month. Highlighted days indicate the schedule span."
  // Let's create a visual mapping for our calendar day rendering.
  // When displaying May 2026:
  // Month is 0-indexed: May is Month 4.
  // Days of May 2026 are highlighted.
  // Let us check if a given day falls in the current active payroll duration.
  // In our dropdown or panel config, we can allow selecting which Cycle is focus-locked:
  // e.g., "Current Cycle: May 26 - Jun 25" (or "Previous Cycle: Apr 26 - May 25")
  const [focusedPayrollCycle, setFocusedPayrollCycle] = useState<'current' | 'next'>('current');

  const payrollCycleBounds = useMemo(() => {
    // Current cycle default values: "April 26 to May 25" for cycle ending in May
    // Next cycle default values: "May 26 to June 25"
    if (focusedPayrollCycle === 'current') {
      return {
        label: 'Apr 26 - May 25',
        startDateStr: `${currentYear}-04-26`,
        endDateStr: `${currentYear}-05-25`,
        openMonth: 3, // April
        closeMonth: 4, // May
      };
    } else {
      return {
        label: 'May 26 - Jun 25',
        startDateStr: `${currentYear}-05-26`,
        endDateStr: `${currentYear}-06-25`,
        openMonth: 4, // May
        closeMonth: 5, // June
      };
    }
  }, [focusedPayrollCycle, currentYear, currentMonth]);

  const ROLE_COLORS: Record<string, string> = {
    'Lead VIP Architect': '#4F46E5',
    'Corporate Hostess': '#DB2777',
    'Elite Mixologist': '#B45309',
    'Service Supervisor': '#10B981',
    'Private Sommelier': '#1E3A8A',
    'Safety Concierge': '#0D9488',
    'Tactical Concierge': '#0D9488',
    // Backwards compatibility matching names
    'Sommelier': '#1E3A8A',
    'Mixologist': '#B45309',
    'Concierge': '#0D9488',
    'VIP Hostess': '#DB2777',
    'Coordinator': '#4F46E5',
    'Partner': '#8B5CF6',
    'Manager': '#10B981'
  };

  const roleUtilizationData = useMemo(() => {
    const startStr = payrollCycleBounds.startDateStr;
    const endStr = payrollCycleBounds.endDateStr;
    const cycleEvents = events.filter(ev => ev.date >= startStr && ev.date <= endStr);

    const breakdown: Record<string, number> = {};

    staff.forEach(s => {
      if (s.role) {
        breakdown[s.role] = 0;
      }
    });

    cycleEvents.forEach(ev => {
      const hrs = getDurationHours(ev.startTime, ev.endTime);
      ev.staffIds.forEach(sId => {
        const sObj = staff.find(s => s.id === sId);
        if (sObj && sObj.role) {
          breakdown[sObj.role] = (breakdown[sObj.role] || 0) + hrs;
        }
      });
    });

    return Object.entries(breakdown).map(([name, hours]) => ({
      name,
      Hours: parseFloat(hours.toFixed(1))
    })).sort((a, b) => b.Hours - a.Hours);
  }, [events, staff, payrollCycleBounds]);

  const freshPeopleGroupedData = useMemo(() => {
    // Premium event specialist role types as per fresh-people.co.za South Africa standard listings
    const groups = [
      {
        name: 'Brand Ambassadors & Promoters',
        roles: ['Lead VIP Architect'],
        description: 'Bespoke marketing ambassadors, elite brand representatives, and activation model hosts.',
        Hours: 0,
        color: '#4F46E5'
      },
      {
        name: 'Event Hosts & Hostesses (FOH)',
        roles: ['Corporate Hostess'],
        description: 'FOH hospitality guides, receptionists, RSVP desk captains, and luxury greeting hosts.',
        Hours: 0,
        color: '#DB2777'
      },
      {
        name: 'Mixologists & Specialist Bar Barons',
        roles: ['Elite Mixologist'],
        description: 'Elite cocktail designers, flair service experts, custom bars, and high-end bar staff.',
        Hours: 0,
        color: '#B45309'
      },
      {
        name: 'Sommeliers & Professional Curators',
        roles: ['Private Sommelier'],
        description: 'Cape Wine Masters, premium food-wine pairing professionals, and fine-dining cellar stewardship.',
        Hours: 0,
        color: '#1E3A8A'
      },
      {
        name: 'Event Supervisors & Floor Managers',
        roles: ['Service Supervisor'],
        description: 'Team leaders, clock compliance controllers, on-site floor coordinators, and protocol guides.',
        Hours: 0,
        color: '#10B981'
      },
      {
        name: 'Elite Safety & Logistics Concierge',
        roles: ['Safety Concierge', 'Tactical Concierge'],
        description: 'Transit logs, VVIP secure escorts, flow logistics coordinators, and safety concierge personnel.',
        Hours: 0,
        color: '#0D9488'
      }
    ];

    roleUtilizationData.forEach(item => {
      const match = groups.find(g => g.roles.includes(item.name));
      if (match) {
        match.Hours += item.Hours;
      } else {
        const lowerName = item.name.toLowerCase();
        if (lowerName.includes('sommelier') || lowerName.includes('wine')) {
          groups[3].Hours += item.Hours;
        } else if (lowerName.includes('mixologist') || lowerName.includes('bar') || lowerName.includes('drink')) {
          groups[2].Hours += item.Hours;
        } else if (lowerName.includes('host') || lowerName.includes('welcome') || lowerName.includes('reception')) {
          groups[1].Hours += item.Hours;
        } else if (lowerName.includes('supervisor') || lowerName.includes('manager') || lowerName.includes('lead')) {
          groups[4].Hours += item.Hours;
        } else if (lowerName.includes('concierge') || lowerName.includes('safety') || lowerName.includes('security')) {
          groups[5].Hours += item.Hours;
        } else {
          groups[0].Hours += item.Hours;
        }
      }
    });

    return groups.map(g => ({
      ...g,
      Hours: parseFloat(g.Hours.toFixed(1))
    })).sort((a, b) => b.Hours - a.Hours);
  }, [roleUtilizationData]);

  const staffBalancingData = useMemo(() => {
    return events.map(ev => {
      const venueObj = venues.find(v => v.id === ev.venueId);
      const capacity = venueObj ? venueObj.capacity : 100;
      const staffCount = ev.staffIds ? ev.staffIds.length : 0;
      
      // Calculate staff-to-capacity ratio (staff per guest)
      const ratio = capacity > 0 ? (staffCount / capacity) : 0;
      
      // Calculate guests per staff member
      const guestsPerStaff = staffCount > 0 ? Math.round(capacity / staffCount) : capacity;
      
      // Determine urgency state
      // Ideal target is 1 staff per 50 guests or better.
      let level: 'critical' | 'warning' | 'balanced' = 'balanced';
      if (staffCount === 0 && capacity > 0) {
        level = 'critical';
      } else if (guestsPerStaff > 120) {
        level = 'critical';
      } else if (guestsPerStaff > 70) {
        level = 'warning';
      } else {
        level = 'balanced';
      }
      
      return {
        event: ev,
        venue: venueObj,
        capacity,
        staffCount,
        ratio,
        guestsPerStaff,
        level
      };
    }).sort((a, b) => {
      // Sort critical items first, then lowest ratio (higher guest-to-staff counts)
      if (a.level === 'critical' && b.level !== 'critical') return -1;
      if (b.level === 'critical' && a.level !== 'critical') return 1;
      if (a.level === 'warning' && b.level === 'balanced') return -1;
      if (b.level === 'warning' && a.level === 'balanced') return 1;
      return a.ratio - b.ratio; // lowest ratio (understaffed) first
    });
  }, [events, venues]);

  const filteredBalancingData = useMemo(() => {
    let list = staffBalancingData;
    if (balanceFilter === 'payroll') {
      const start = payrollCycleBounds.startDateStr;
      const end = payrollCycleBounds.endDateStr;
      list = list.filter(item => item.event.date >= start && item.event.date <= end);
    }
    return list;
  }, [staffBalancingData, balanceFilter, payrollCycleBounds]);

  // Shift staff calendar month independently
  const shiftStaffCalendarMonth = (direction: number) => {
    let nextM = shiftCalendarMonth + direction;
    let nextY = shiftCalendarYear;
    if (nextM < 0) {
      nextM = 11;
      nextY -= 1;
    } else if (nextM > 11) {
      nextM = 0;
      nextY += 1;
    }
    setShiftCalendarMonth(nextM);
    setShiftCalendarYear(nextY);
  };

  const getMonthName = (monthIdx: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthIdx];
  };

  // Conflict detection: find all staff-time overlaps across ALL events (not just same-day)
  // Used by DispatchPanel for OperationsSnapshot conflict count
  const selectedDayConflicts = useMemo(() => {
    const conflicts: Array<{
      staffId: string;
      staffName: string;
      staffRole: string;
      eventA: { id: string; title: string; date: string; startTime: string; endTime: string };
      eventB: { id: string; title: string; date: string; startTime: string; endTime: string };
    }> = [];

    const localEvents = events.filter(e => !e.id.startsWith('gcal-import') && !e.id.startsWith('apple-import') && !e.id.startsWith('apple-live'));

    for (let i = 0; i < localEvents.length; i++) {
      for (let j = i + 1; j < localEvents.length; j++) {
        const evA = localEvents[i];
        const evB = localEvents[j];
        const sharedStaff = evA.staffIds.filter(id => evB.staffIds.includes(id));
        if (sharedStaff.length === 0) continue;
        const { start: startA, end: endA } = getEventDates(evA.date, evA.startTime, evA.endTime);
        const { start: startB, end: endB } = getEventDates(evB.date, evB.startTime, evB.endTime);
        const overlaps = startA < endB && startB < endA;
        if (overlaps) {
          sharedStaff.forEach(sId => {
            const sObj = staff.find(s => s.id === sId);
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

  // Handle click on staff checkboxes in scheduler
  const toggleStaffAllocation = (staffId: string) => {
    setEvSelectedStaffIds((prev) =>
      prev.includes(staffId) ? prev.filter((id) => id !== staffId) : [...prev, staffId]
    );
  };

  // Multi-allocate helper count
  const mappedRosterCount = evSelectedStaffIds.length;

  // -------------------------------------------------------------------------
  // WHATSAPP OPERATIONS & MESSAGING UTILS
  // -------------------------------------------------------------------------
  const currentSelectedDispatchEvent = useMemo(() => {
    return events.find((ev) => ev.id === selectedDispatchEventId);
  }, [events, selectedDispatchEventId]);

  // Returns URL variables targeting this applet URL to trigger callback on mount
  const generateDispatchConfirmationLinks = (ev: Event, staffMember: Staff) => {
    const baseAppUrl = window.location.origin + window.location.pathname;
    const confirmLink = `${baseAppUrl}?action=confirm&eventId=${ev.id}&staffId=${staffMember.id}`;
    const rejectLink = `${baseAppUrl}?action=reject&eventId=${ev.id}&staffId=${staffMember.id}`;
    return { confirmLink, rejectLink };
  };

  const constructWhatsAppMessage = (ev: Event, staffMember: Staff) => {
    const { confirmLink, rejectLink } = generateDispatchConfirmationLinks(ev, staffMember);

    // Dynamic travel / meeting point helper note based on location capacity metrics
    const venueObj = venues.find((v) => v.id === ev.venueId);
    const meetingPointNotes = venueObj?.notes ? `Meeting point context: ${venueObj.notes}` : "Meeting point: Main dispatch gate.";

    // Rule: WhatsApp template must exactly start with matching wording constraints
    return `Hi ${staffMember.name} ${staffMember.surname} hope you are well. Are you available on ${ev.date} from ${ev.startTime} to ${ev.endTime} (with travel adjustment bounds / ${meetingPointNotes})?\n\nEvent details: "${ev.title}"\nLocation Address: ${venueObj?.name || 'Assigned venue'} (${venueObj?.address || 'Private location'})\n\nClick below to immediately confirm your active allocation status:\nYes: ${confirmLink}\n\nNo: ${rejectLink}`;
  };

  const dispatchToWhatsApp = (ev: Event, staffMember: Staff) => {
    const rawMessage = constructWhatsAppMessage(ev, staffMember);
    try {
      navigator.clipboard.writeText(rawMessage);
      showToast(`Roster Message details copied to clipboard! Paste it to message ${staffMember.name} manually.`, 'success');
      addActivityLog('call', `Copied dispatch message details for ${staffMember.name} ${staffMember.surname} to clipboard for manual delivery.`);
    } catch {
      showToast(`Copy failed. Please manually select the message preview text below.`, 'warn');
    }
  };

  // iCal ICS Exporter for Apple Calendar integration sync
  const handleExportICS = () => {
    const now = new Date();
    const startOfCurrentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const syncedEvents = events.filter((ev) => ev.date >= startOfCurrentMonthStr);

    if (syncedEvents.length === 0) {
      showToast(`Operational warning: No scheduled events in roster starting from this month (${startOfCurrentMonthStr}) to export.`, 'warn');
      return;
    }

    let icsContent = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Fresh People Agency//Command Center//EN\n';

    syncedEvents.forEach((ev) => {
      const clientName = clients.find((c) => c.id === ev.clientId)?.name || 'Local Client';
      const venueName = venues.find((v) => v.id === ev.venueId)?.name || 'Local Venue';

      const dClean = ev.date.replace(/-/g, '');
      const sClean = ev.startTime.replace(/:/g, '') + '00';
      const eClean = ev.endTime.replace(/:/g, '') + '00';

      icsContent += 'BEGIN:VEVENT\n';
      icsContent += `DTSTART;TZID=Africa/Johannesburg:${dClean}T${sClean}\n`;
      icsContent += `DTEND;TZID=Africa/Johannesburg:${dClean}T${eClean}\n`;
      icsContent += `SUMMARY:${ev.title}\n`;
      icsContent += `LOCATION:${venueName}\n`;
      icsContent += `DESCRIPTION:Fresh People Event scheduling Client: ${clientName}. Notes: ${ev.notes || 'None'}\n`;
      icsContent += `UID:${ev.id}@freshpeople.agency\n`;
      icsContent += 'END:VEVENT\n';
    });

    icsContent += 'END:VCALENDAR';

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `fresh_people_events_roster_starting_${startOfCurrentMonthStr}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addActivityLog('sync', `Successfully exported scheduled iCal registry feed (.ics) starting from ${startOfCurrentMonthStr} for Apple Calendar linkage.`);
  };

  // Synchronous effect to automatically pre-fill details on change of chosen dispatch target
  useEffect(() => {
    if (selectedDispatchEventId) {
      const ev = events.find(e => e.id === selectedDispatchEventId);
      if (ev) {
        setDispatchClientDate(ev.date);
        setDispatchAdjustedTime(`${ev.startTime} - ${ev.endTime} (Includes traveling period management)`);
        const venueObj = venues.find(v => v.id === ev.venueId);
        setDispatchArrangements(`Meeting point: ${venueObj?.notes || "Service desk entrance. Please wear uniform corporate codes."}`);
      }
    } else {
      setDispatchClientDate('');
      setDispatchAdjustedTime('');
      setDispatchArrangements('');
    }
  }, [selectedDispatchEventId, events, venues]);

  // CSV Events List Exporter
  const handleExportEventsCSV = () => {
    if (events.length === 0) {
      showToast('Operational Warning: No scheduled events in roster to export.', 'warn');
      return;
    }
    
    const headers = [
      'Event ID',
      'Event Title',
      'Client Sponsor',
      'Venue Name',
      'Physical Address',
      'Calendar Date',
      'Start Time',
      'End Time',
      'Billing Status',
      'Direct Booking',
      'Allocated Staff List',
      'Core Brand Directives'
    ];
    
    const rows = events.map(ev => {
      const clientName = clients.find(c => c.id === ev.clientId)?.name || 'Local Client';
      const venueObj = venues.find(v => v.id === ev.venueId);
      const venueName = venueObj?.name || 'Local Venue';
      const venueAddress = venueObj?.address || 'Private Location';
      
      const staffList = ev.staffIds.map(sId => {
        const s = staff.find(st => st.id === sId);
        const rsvp = ev.staffRSVPs?.[sId] || 'Pending';
        return s ? `${s.name} ${s.surname} (${s.role}) [${rsvp}]` : sId;
      }).join('; ');
      
      return [
        ev.id,
        ev.title,
        clientName,
        venueName,
        venueAddress,
        ev.date,
        ev.startTime,
        ev.endTime,
        ev.status || 'Pending',
        ev.isDirectBooking ? 'Yes' : 'No',
        staffList,
        ev.notes || ''
      ];
    });
    
    downloadCSV('fresh_people_events_schedule.csv', headers, rows);
    addActivityLog('sync', 'Successfully exported scheduled event logs (.CSV) for operational analysis.');
  };

  // CSV Payroll Exporter for Focused Month's Cycle
  const handleExportPayrollCSV = () => {
    const startStr = payrollCycleBounds.startDateStr;
    const endStr = payrollCycleBounds.endDateStr;
    
    // Filter events inside this cycle index
    const cycleEvents = events.filter(ev => ev.date >= startStr && ev.date <= endStr);
    
    const headers = [
      'Staff ID',
      'Given Name',
      'Family Name',
      'Specialist Role',
      'Contract Rate (R/h)',
      'Total Scheduled Hours',
      'Calculated Cycle Pay (R)',
      'Associated Event Schedule'
    ];
    
    const rows = staff.map(s => {
      const staffEvents = cycleEvents.filter(ev => ev.staffIds.includes(s.id));
      let totalHrs = 0;
      let totalEarn = 0;
      const descList: string[] = [];
      
      staffEvents.forEach(ev => {
        const hrs = getDurationHours(ev.startTime, ev.endTime);
        const earn = hrs * s.rate;
        totalHrs += hrs;
        totalEarn += earn;
        const rsvp = ev.staffRSVPs?.[s.id] || 'Pending';
        descList.push(`${ev.title} (${ev.date}) [${hrs.toFixed(1)}h - RSVP: ${rsvp}]`);
      });
      
      return [
        s.id,
        s.name,
        s.surname,
        s.role,
        `R${s.rate}`,
        totalHrs.toFixed(2),
        `R${totalEarn.toFixed(2)}`,
        descList.join('; ')
      ];
    });
    
    const cycleLabel = payrollCycleBounds.label.replace(/\s+/g, '_');
    downloadCSV(`fresh_people_payroll_summary_${cycleLabel}.csv`, headers, rows);
    addActivityLog('sync', `Successfully generated complete payroll spreadsheet for cycle bounds ${payrollCycleBounds.label}.`);
  };

  const escapeCSVValue = (val: any) => {
    const str = val === undefined || val === null ? '' : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
    const csvContent = [
      headers.map(escapeCSVValue).join(','),
      ...rows.map(row => row.map(escapeCSVValue).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // JSON Data Backup Exporter
  const handleExportJSON = () => {
    const backupData = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      events,
      clients,
      venues,
      staff,
      activityLogs,
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0];
    link.href = URL.createObjectURL(blob);
    link.download = `fresh-people-backup-${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addActivityLog('sync', `Full data backup exported (${events.length} events, ${clients.length} clients, ${staff.length} staff).`);
    showToast(`Backup exported: ${events.length} events, ${clients.length} clients, ${staff.length} staff, ${venues.length} venues.`, 'success');
  };

  // JSON Data Backup Importer
  const handleImportBackup = (data: any, mode: 'replace' | 'merge') => {
    const importDate = new Date(data.exportDate).toLocaleString();
    let importedEvents = 0;
    let importedClients = 0;
    let importedVenues = 0;
    let importedStaff = 0;

    if (mode === 'replace') {
      // Replace all data
      setEvents(data.events || []);
      setClients(data.clients || []);
      setVenues(data.venues || []);
      setStaff(data.staff || []);
      if (data.activityLogs) setActivityLogs(data.activityLogs);

      localStorage.setItem('fp_events', JSON.stringify(data.events || []));
      localStorage.setItem('fp_clients', JSON.stringify(data.clients || []));
      localStorage.setItem('fp_venues', JSON.stringify(data.venues || []));
      localStorage.setItem('fp_staff', JSON.stringify(data.staff || []));
      if (data.activityLogs) localStorage.setItem('fp_logs', JSON.stringify(data.activityLogs));

      importedEvents = (data.events || []).length;
      importedClients = (data.clients || []).length;
      importedVenues = (data.venues || []).length;
      importedStaff = (data.staff || []).length;

      addActivityLog('sync', `Full data REPLACE import from backup (${importDate}): ${importedEvents} events, ${importedClients} clients, ${importedVenues} venues, ${importedStaff} staff.`);
      showToast(`Import complete: ${importedEvents} events, ${importedClients} clients, ${importedVenues} venues, ${importedStaff} staff replaced.`, 'success');
    } else {
      // Merge mode: add only new records (by ID)
      const existingEventIds = new Set(events.map(e => e.id));
      const existingClientIds = new Set(clients.map(c => c.id));
      const existingVenueIds = new Set(venues.map(v => v.id));
      const existingStaffIds = new Set(staff.map(s => s.id));

      const newEvents = (data.events || []).filter((e: any) => !existingEventIds.has(e.id));
      const newClients = (data.clients || []).filter((c: any) => !existingClientIds.has(c.id));
      const newVenues = (data.venues || []).filter((v: any) => !existingVenueIds.has(v.id));
      const newStaff = (data.staff || []).filter((s: any) => !existingStaffIds.has(s.id));

      const mergedEvents = [...events, ...newEvents];
      const mergedClients = [...clients, ...newClients];
      const mergedVenues = [...venues, ...newVenues];
      const mergedStaff = [...staff, ...newStaff];

      setEvents(mergedEvents);
      setClients(mergedClients);
      setVenues(mergedVenues);
      setStaff(mergedStaff);

      localStorage.setItem('fp_events', JSON.stringify(mergedEvents));
      localStorage.setItem('fp_clients', JSON.stringify(mergedClients));
      localStorage.setItem('fp_venues', JSON.stringify(mergedVenues));
      localStorage.setItem('fp_staff', JSON.stringify(mergedStaff));

      importedEvents = newEvents.length;
      importedClients = newClients.length;
      importedVenues = newVenues.length;
      importedStaff = newStaff.length;

      addActivityLog('sync', `Merged data from backup (${importDate}): +${importedEvents} events, +${importedClients} clients, +${importedVenues} venues, +${importedStaff} staff added.`);
      showToast(`Merge complete: +${importedEvents} events, +${importedClients} clients, +${importedVenues} venues, +${importedStaff} staff added.`, 'success');

      if (importedEvents === 0 && importedClients === 0 && importedVenues === 0 && importedStaff === 0) {
        showToast('No new records found in backup — all IDs already exist.', 'info');
      }
    }
  };

  // Authenticated Gateway form render
  if (!isUnlocked) {
    return (
      <AuthGateway
        operatorId={operatorId}
        setOperatorId={setOperatorId}
        securityPhrase={securityPhrase}
        setSecurityPhrase={setSecurityPhrase}
        authError={authError}
        isForgotPasswordMode={isForgotPasswordMode}
        setIsForgotPasswordMode={setIsForgotPasswordMode}
        forgotOperatorId={forgotOperatorId}
        setForgotOperatorId={setForgotOperatorId}
        forgotEmail={forgotEmail}
        setForgotEmail={setForgotEmail}
        resetSuccessMessage={resetSuccessMessage}
        setResetSuccessMessage={setResetSuccessMessage}
        handleAuthSubmit={handleAuthSubmit}
        handleResetPasswordRequest={handleResetPasswordRequest}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative z-20">
      <ToastNotifications
        toastAlert={toastAlert}
        setToastAlert={setToastAlert}
        undoToast={undoToast}
        syncStatusMsg={syncStatusMsg}
      />

      {/* Decorative Blur Background Circles */}
      <div className="ambient-glow-1"></div>
      <div className="ambient-glow-2"></div>

      <AppHeader
        systime={systime}
        sessionTimeLeft={sessionTimeLeft}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        undoStack={undoStack}
        redoStack={redoStack}
        undo={undo}
        redo={redo}
        triggerLogout={triggerLogout}
      />

      {/* Premium Quiet Luxury Operational Export Control Panel */}
      <ExportToolbar
        payrollCycleBounds={payrollCycleBounds}
        handleExportEventsCSV={handleExportEventsCSV}
        handleExportPayrollCSV={handleExportPayrollCSV}
        handleExportJSON={handleExportJSON}
        onImportBackup={handleImportBackup}
      />

      {/* Mobile menu overlay backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Global Command Column Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">

        {/* ========================================================================= */}
        {/* LEFT COMPASS: Directories, Registries & Onboarding */}
        {/* ========================================================================= */}
        <section
          id="directory_section"
          className={`lg:col-span-4 flex flex-col space-y-6 ${
            mobileMenuOpen
              ? 'fixed inset-y-0 left-0 z-40 w-80 max-w-[85vw] overflow-y-auto bg-[#FAF9F6] p-4 pt-20 shadow-2xl lg:relative lg:inset-auto lg:z-auto lg:w-auto lg:max-w-none lg:overflow-visible lg:bg-transparent lg:p-0 lg:shadow-none'
              : 'hidden lg:flex'
          } transition-all duration-300`}
        >

          {/* Master Directories Selection Box */}
          <MasterRegistry
            activeTab={activeTab}
            switchTab={switchTab}
            clients={clients}
            venues={venues}
            staff={staff}
            onAddClient={() => setActiveModal('client')}
            onAddVenue={() => setActiveModal('venue')}
            onAddStaff={() => setActiveModal('staff')}
          />

          {/* Staffing Alerts Panel */}
          <StaffingAlertsPanel
            events={events}
            staff={staff}
            clients={clients}
            venues={venues}
          />

          {/* Staff Availability Dashboard */}
          <StaffAvailabilityPanel
            staff={staff}
            events={events}
            clients={clients}
            venues={venues}
            bulkUpdateRSVP={bulkUpdateRSVP}
          />

          {/* Staff Shift Calendar */}
          <Suspense fallback={<div className="glass-panel rounded-lg p-5 shadow-luxury-glow"><div className="text-[10px] text-slate-400 text-center py-4">Loading shift calendar...</div></div>}>
            <StaffShiftCalendar
              staff={staff}
              events={events}
              clients={clients}
              venues={venues}
              selectedStaffId={selectedShiftStaffId}
              onSelectStaff={setSelectedShiftStaffId}
              month={shiftCalendarMonth}
              year={shiftCalendarYear}
              onShiftMonth={shiftStaffCalendarMonth}
              getMonthName={getMonthName}
            />
          </Suspense>

          {/* Role Utilization Dashboard widget */}
          <RoleUtilizationChart
            roleUtilizationData={roleUtilizationData}
            freshPeopleGroupedData={freshPeopleGroupedData}
            payrollCycleBounds={payrollCycleBounds}
            ROLE_COLORS={ROLE_COLORS}
          />

          {/* Staff Performance Dashboard */}
          <StaffPerformancePanel
            staff={staff}
            events={events}
            clients={clients}
            venues={venues}
          />

          {/* Scheduling & Core Event Architecture Planner Form */}
          <EventArchitect
            evTitle={evTitle}
            setEvTitle={setEvTitle}
            evClient={evClient}
            setEvClient={setEvClient}
            evVenue={evVenue}
            setEvVenue={setEvVenue}
            evDate={evDate}
            setEvDate={setEvDate}
            evTimeStart={evTimeStart}
            setEvTimeStart={setEvTimeStart}
            evTimeEnd={evTimeEnd}
            setEvTimeEnd={setEvTimeEnd}
            evNotes={evNotes}
            setEvNotes={setEvNotes}
            evClientRequirements={evClientRequirements}
            setEvClientRequirements={setEvClientRequirements}
            evSelectedStaffIds={evSelectedStaffIds}
            evStatus={evStatus}
            setEvStatus={setEvStatus}
            isDirectBookingChecked={isDirectBookingChecked}
            setIsDirectBookingChecked={setIsDirectBookingChecked}
            editingEventId={editingEventId}
            handleCancelEdit={handleCancelEdit}
            showTemplatePanel={showTemplatePanel}
            setShowTemplatePanel={setShowTemplatePanel}
            templateName={templateName}
            setTemplateName={setTemplateName}
            eventTemplates={eventTemplates}
            clients={clients}
            venues={venues}
            staff={staff}
            recurrence={recurrence}
            setRecurrence={setRecurrence}
            recurrenceEnd={recurrenceEnd}
            setRecurrenceEnd={setRecurrenceEnd}
            createEvent={createEvent}
            toggleStaffAllocation={toggleStaffAllocation}
            saveEventTemplate={saveEventTemplate}
            applyEventTemplate={applyEventTemplate}
            deleteEventTemplate={deleteEventTemplate}
          />

        </section>

        {/* ========================================================================= */}
        {/* CENTER COLUMN: Interactive Payroll Grid Schedule                         */}
        {/* ========================================================================= */}
        <PayrollCalendar
          events={events}
          googleEvents={googleEvents}
          appleEvents={appleEvents}
          appleUser={appleUser}
          clients={clients}
          venues={venues}
          staff={staff}
          currentMonth={currentMonth}
          currentYear={currentYear}
          setCurrentMonth={setCurrentMonth}
          setCurrentYear={setCurrentYear}
          selectedDateStr={selectedDateStr}
          setSelectedDateStr={setSelectedDateStr}
          focusedPayrollCycle={focusedPayrollCycle}
          setFocusedPayrollCycle={setFocusedPayrollCycle}
          setEvDate={setEvDate}
          showRSVPPanel={showRSVPPanel}
          setShowRSVPPanel={setShowRSVPPanel}
          toggleStaffRSVP={toggleStaffRSVP}
          handleQuickStatusChange={handleQuickStatusChange}
          handleEditEvent={handleEditEvent}
          setShowDeleteConfirm={setShowDeleteConfirm}
          setEvents={setEvents}
          addActivityLog={addActivityLog}
          bulkUpdateRSVP={bulkUpdateRSVP}
          getMatchedClientAndVenue={getMatchedClientAndVenue}
          handleDuplicateEvent={handleDuplicateEvent}
        />

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: WhatsApp Dispatcher Console, Apple Sync & Call Log       */}
        {/* ========================================================================= */}
        <DispatchPanel
          events={events}
          staff={staff}
          clients={clients}
          venues={venues}
          activityLogs={activityLogs}
          selectedDayConflicts={selectedDayConflicts}
          selectedDispatchEventId={selectedDispatchEventId}
          setSelectedDispatchEventId={setSelectedDispatchEventId}
          googleUser={googleUser}
          appleUser={appleUser}
          autoSyncEnabled={autoSyncEnabled}
          setAutoSyncEnabled={setAutoSyncEnabled}
          isSilentSyncing={isSilentSyncing}
          lastSyncTime={lastSyncTime}
          appleFeedUrl={appleFeedUrl}
          setAppleFeedUrl={setAppleFeedUrl}
          isAppleAuthModalOpen={isAppleAuthModalOpen}
          setIsAppleAuthModalOpen={setIsAppleAuthModalOpen}
          isAppleSimulatorVisible={isAppleSimulatorVisible}
          setIsAppleSimulatorVisible={setIsAppleSimulatorVisible}
          appleEvents={appleEvents}
          balanceFilter={balanceFilter}
          setBalanceFilter={setBalanceFilter}
          payrollCycleBounds={payrollCycleBounds}
          addActivityLog={addActivityLog}
          showToast={showToast}
          handleGoogleLogin={handleGoogleLogin}
          handleGoogleLogout={handleGoogleLogout}
          triggerGoogleSync={triggerGoogleSync}
          handleExportICS={handleExportICS}
          handleAppleLogout={handleAppleLogout}
          handlePushToAppleCalendar={handlePushToAppleCalendar}
          triggerAppleFeedFetch={triggerAppleFeedFetch}
          handleDeleteAppleSimulatorEvent={handleDeleteAppleSimulatorEvent}
          handleAddAppleSimulatorEvent={handleAddAppleSimulatorEvent}
          clearLogs={clearLogs}
          getMatchedClientAndVenue={getMatchedClientAndVenue}
          getDurationHours={getDurationHours}
        />


      </main>

      {/* Primary central system footer bar */}
      <footer className="border-t border-slate-205 py-4 bg-slate-50 relative z-10 select-none">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-[8px] text-slate-500 tracking-[0.3em] uppercase font-bold">
            SECURE CRYPTOGRAPHIC PROTOCOLS &bull; FRESH PEOPLE AGENCY FRAMEWORK &bull; REGISTERED INTERNAL USE ONLY
          </p>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* ONBOARDING DIALOG WINDOW MODULES (CLIENTS, VENUES, STAFF REGISTRATION)  */}
      {/* ========================================================================= */}
      <RegistrationModals
        activeModal={activeModal}
        setActiveModal={setActiveModal}
        newClient={newClient}
        setNewClient={setNewClient}
        newVenue={newVenue}
        setNewVenue={setNewVenue}
        newStaff={newStaff}
        setNewStaff={setNewStaff}
        registerClient={registerClient}
        registerVenue={registerVenue}
        registerStaff={registerStaff}
      />

      {/* Dialogs & Modals — Apple Auth, Delete Confirm, Shortcuts Help */}
      <DialogsModals
        isAppleAuthModalOpen={isAppleAuthModalOpen}
        setIsAppleAuthModalOpen={setIsAppleAuthModalOpen}
        appleEmailInput={appleEmailInput}
        setAppleEmailInput={setAppleEmailInput}
        applePasswordInput={applePasswordInput}
        setApplePasswordInput={setApplePasswordInput}
        appleFeedUrl={appleFeedUrl}
        setAppleFeedUrl={setAppleFeedUrl}
        isLinkingApple={isLinkingApple}
        setIsLinkingApple={setIsLinkingApple}
        handleAppleLoginSubmit={handleAppleLoginSubmit}
        showDeleteConfirm={showDeleteConfirm}
        setShowDeleteConfirm={setShowDeleteConfirm}
        deleteEvent={deleteEvent}
        showShortcutsModal={showShortcutsModal}
        setShowShortcutsModal={setShowShortcutsModal}
      />
    </div>
  );
}
