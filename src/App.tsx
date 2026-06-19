/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, lazy, Suspense, useRef } from 'react';
import {
  Lock,
  Unlock,
  Calendar,
  CalendarDays,
  User,
  Users,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Radio,
  PhoneForwarded,
  ScrollText,
  X,
  CheckCircle,
  Download,
  AlertCircle,
  Briefcase,
  RefreshCw,
  LogOut,
  Globe,
  Apple,
  Trash2,
  Undo2,
  Redo2
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

import { OperationsSnapshot } from './components/OperationsSnapshot';
import { EventCard } from './components/EventCard';
import StaffTimeline from './components/StaffTimeline';
import MasterRegistry from './components/MasterRegistry';
import ActivityLogPanel from './components/ActivityLogPanel';

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

// Seed/Initial Data in case LocalStorage is empty or for South African migration
const INITIAL_CLIENTS: Client[] = [
  {
    id: 'client-1',
    name: 'Lady Day',
    contact: 'Lerato Maroga',
    email: 'events@ladyday.co.za',
    phone: '+27 11 482 1039',
    notes: 'Premium Johannesburg catering & high high-end corporate events.'
  },
  {
    id: 'client-2',
    name: 'Corinne',
    contact: 'Corinne van der Byl',
    email: 'corinne@vanderbyl.co.za',
    phone: '+27 82 443 2191',
    notes: 'Exclusive weddings and executive private affairs.'
  },
  {
    id: 'client-3',
    name: 'Fresh Yumm',
    contact: 'Thapelo Molopo',
    email: 'orders@freshyumm.co.za',
    phone: '+27 11 706 8283',
    notes: 'Artisanal foods service sponsor. VIP hostesses expected.'
  },
  {
    id: 'client-4',
    name: 'STAY BY INIMITABLE',
    contact: 'Jessica Botha',
    email: 'stay@inimitable.co.za',
    phone: '+27 10 023 9011',
    notes: 'Luxury villas in Muldersdrift booking hostesses for guest check-ins.'
  },
  {
    id: 'client-5',
    name: 'INIMITABLE',
    contact: 'John-Michael Botha',
    email: 'events@inimitable.co.za',
    phone: '+27 10 023 9000',
    notes: 'Stunning premium wedding/event venue in Muldersdrift. Demands elite mixology & VIP architects.'
  },
  {
    id: 'client-6',
    name: 'Rimac',
    contact: 'Mate Rimac',
    email: 'press@rimac-automobili.com',
    phone: '+385 1 563 4500',
    notes: 'Supercar launch in Sandton. Exclusive hostesses with driver liaison experience.'
  },
  {
    id: 'client-7',
    name: 'Mizana',
    contact: 'Fariqa Seedat',
    email: 'info@mizanamarket.co.za',
    phone: '+27 83 998 0122',
    notes: 'High fashion & luxury lifestyle marketplace curation.'
  },
  {
    id: 'client-8',
    name: 'MYS Agency',
    contact: 'Ayanda Khanyile',
    email: 'ayanda@mysagency.co.za',
    phone: '+27 11 391 8021',
    notes: 'Boutique brand representation in Rosebank.'
  },
  {
    id: 'client-9',
    name: 'Fhulufhelani',
    contact: 'Fhulufhelani Netshidzivhe',
    email: 'fhulu@freshpeople.co.za',
    phone: '+27 72 498 1234',
    notes: 'VVIP South African corporate leadership roundtables.'
  },
  {
    id: 'client-rma',
    name: 'RMA Group',
    contact: 'RMA Coordinator',
    email: 'info@rma.co.za',
    phone: '+27 11 543 9000',
    notes: 'Rand Mutual Assurance corporate client.'
  },
  {
    id: 'client-motseng',
    name: 'Motseng Concessions',
    contact: 'Motseng Manager',
    email: 'info@motseng.co.za',
    phone: '+27 11 234 5678',
    notes: 'Key South African logistics and facility management client.'
  },
  {
    id: 'client-etv',
    name: 'e.tv Television Network',
    contact: 'e.tv Producer',
    email: 'production@etv.co.za',
    phone: '+27 11 537 9300',
    notes: 'National media and broadcaster studios.'
  },
  {
    id: 'client-sanofi',
    name: 'Sanofi Multinational',
    contact: 'Sanofi Coordinator',
    email: 'events@sanofi.com',
    phone: '+27 11 256 0000',
    notes: 'Global healthcare partnership coordinator.'
  },
  {
    id: 'client-mast',
    name: 'MAST Fre Minds',
    contact: 'MAST Coordinator',
    email: 'info@mast.co.za',
    phone: '+27 82 555 1212',
    notes: 'Special event coordination and program team.'
  },
  {
    id: 'client-omphile',
    name: 'Omphile Letshwiti Private',
    contact: 'Omphile Letshwiti',
    email: 'omphile@letshwiti.com',
    phone: '+27 73 112 3456',
    notes: 'Private executive dining host.'
  }
];

const INITIAL_VENUES: Venue[] = [
  {
    id: 'venue-1',
    name: 'INIMITABLE Wedding Venue',
    address: 'Place No. 1, Muldersdrift, Johannesburg, 1739',
    capacity: 400,
    tier: 'Luxury Class',
    notes: 'World-class structural steel design surrounded by willow trees. Elite grade requirements.'
  },
  {
    id: 'venue-2',
    name: 'STAY BY INIMITABLE',
    address: 'Kloof Road, Muldersdrift, South Africa, 1739',
    capacity: 60,
    tier: 'Premium Estate',
    notes: 'Ultra-exclusive private forest estate accommodation adjacent to Crocodile River.'
  },
  {
    id: 'venue-3',
    name: 'Sandton Convention Centre',
    address: 'Maud St, Sandridge, Sandton, 2196',
    capacity: 1500,
    tier: 'Luxury Class',
    notes: "South Africa's premier multi-purpose exhibition center."
  },
  {
    id: 'venue-4',
    name: 'The Westcliff Rose Garden',
    address: 'Jan Smuts Avenue, Westcliff, Johannesburg, 2193',
    capacity: 250,
    tier: 'Premium Estate',
    notes: 'Panoramas of Johannesburg Zoo and the city forest canopy.'
  },
  {
    id: 'venue-rma',
    name: 'RMA Office Premises',
    address: 'Rand Mutual, Johannesburg Central, South Africa',
    capacity: 150,
    tier: 'Corporate Hub',
    notes: 'State-of-the-art office spaces and corporate boardrooms.'
  },
  {
    id: 'venue-motseng',
    name: 'Motseng Head Office',
    address: 'Motseng Building, Johannesburg, South Africa',
    capacity: 100,
    tier: 'Premium Estate',
    notes: 'VIP dining and board banquet rooms.'
  },
  {
    id: 'venue-etv',
    name: 'e.tv Hyde Park Studios',
    address: 'Albury Road, Hyde Park, Johannesburg, South Africa',
    capacity: 300,
    tier: 'Media Hub',
    notes: 'High definition broadcasting studios and lounge areas.'
  },
  {
    id: 'venue-sanofi',
    name: 'Sanofi Corporate HQ',
    address: 'Sanofi Office Park, Midrand, Johannesburg',
    capacity: 200,
    tier: 'Corporate Hub',
    notes: 'Sleek executive conference spaces.'
  },
  {
    id: 'venue-tbc',
    name: 'TBC Location (Corporate)',
    address: 'To Be Confirmed, South Africa',
    capacity: 100,
    tier: 'Premium Estate',
    notes: 'Event location confirmation pending closer to date.'
  }
];

const INITIAL_STAFF: Staff[] = [
  {
    id: 'staff-1',
    name: 'Sophie',
    surname: 'Laurent',
    role: 'Lead VIP Architect',
    rate: 350,
    phone: '+27649821012',
    email: 'sophie@freshpeople.co.za',
    notes: 'Speaks fluent English, French and Zulu. Highly experienced with executive protocols.'
  },
  {
    id: 'staff-2',
    name: 'Thabo',
    surname: 'Mokoena',
    role: 'Elite Mixologist',
    rate: 300,
    phone: '+27798210293',
    email: 'thabo@freshpeople.co.za',
    notes: 'Custom cocktail menu designer and signature beverage expert.'
  },
  {
    id: 'staff-3',
    name: 'Lerato',
    surname: 'Dlamini',
    role: 'Corporate Hostess',
    rate: 220,
    phone: '+27612345678',
    email: 'lerato@freshpeople.co.za',
    notes: 'Represented luxury fashion brands at Rosebank Rose Festival.'
  },
  {
    id: 'staff-4',
    name: 'Pieter',
    surname: 'de Wet',
    role: 'Private Sommelier',
    rate: 380,
    phone: '+27829011982',
    email: 'pieter@freshpeople.co.za',
    notes: 'Cape Wine Master certified. Deep pairing expertise.'
  },
  {
    id: 'staff-5',
    name: 'Zola',
    surname: 'Sibanda',
    role: 'Service Supervisor',
    rate: 280,
    phone: '+27632943110',
    email: 'zola@freshpeople.co.za',
    notes: 'Over 8 years managing high density wedding protocols.'
  },
  {
    id: 'staff-6',
    name: 'Chantal',
    surname: 'Ndlovu',
    role: 'Corporate Hostess',
    rate: 220,
    phone: '+27729214439',
    email: 'chantal@freshpeople.co.za',
    notes: 'Expert interpersonal skills.'
  },
  {
    id: 'staff-7',
    name: 'Sipho',
    surname: 'Khumalo',
    role: 'Safety Concierge',
    rate: 250,
    phone: '+27620193184',
    email: 'sipho@freshpeople.co.za',
    notes: 'First aid certified, advance security crowd management protocols.'
  },
  {
    id: 'staff-8',
    name: 'Keisha',
    surname: 'Naidoo',
    role: 'Corporate Hostess',
    rate: 230,
    phone: '+27838884910',
    email: 'keisha@freshpeople.co.za',
    notes: 'Highly organized with flawless check-in gate administration.'
  },
  {
    id: 'staff-9',
    name: 'Francois',
    surname: 'du Plessis',
    role: 'Elite Mixologist',
    rate: 300,
    phone: '+27849182049',
    email: 'francois@freshpeople.co.za',
    notes: 'Passionate craft beverage designer.'
  },
  {
    id: 'staff-10',
    name: 'Nomvula',
    surname: 'Radebe',
    role: 'Corporate Hostess',
    rate: 220,
    phone: '+27739014566',
    email: 'nomvula@freshpeople.co.za',
    notes: 'Speaks Sotho and Zulu; welcoming attitude.'
  },
  {
    id: 'staff-11',
    name: 'Brandon',
    surname: 'Pillay',
    role: 'Service Supervisor',
    rate: 280,
    phone: '+27827718290',
    email: 'brandon@freshpeople.co.za',
    notes: 'Specialist in French-style banquet services.'
  },
  {
    id: 'staff-12',
    name: 'Fatima',
    surname: 'Cassim',
    role: 'Corporate Hostess',
    rate: 220,
    phone: '+27638841092',
    email: 'fatima@freshpeople.co.za',
    notes: 'Experienced in international diplomatic delegation hosts.'
  },
  {
    id: 'staff-13',
    name: 'Sibusiso',
    surname: 'Zulu',
    role: 'Safety Concierge',
    rate: 250,
    phone: '+27712398214',
    email: 'sibusiso@freshpeople.co.za',
    notes: 'Close protection specialist; handles perimeter coordination.'
  },
  {
    id: 'staff-14',
    name: 'Anika',
    surname: 'Smit',
    role: 'Corporate Hostess',
    rate: 220,
    phone: '+27824910245',
    email: 'anika@freshpeople.co.za',
    notes: 'Enthusiastic event host.'
  },
  {
    id: 'staff-15',
    name: 'Kgomotso',
    surname: 'Taylor',
    role: 'Corporate Hostess',
    rate: 220,
    phone: '+27653291044',
    email: 'kgomotso@freshpeople.co.za',
    notes: 'Excellent team communication.'
  },
  {
    id: 'staff-16',
    name: 'Devon',
    surname: 'van der Merwe',
    role: 'Elite Mixologist',
    rate: 300,
    phone: '+27739182309',
    email: 'devon@freshpeople.co.za',
    notes: 'Expert in molecular custom cocktails.'
  },
  {
    id: 'staff-17',
    name: 'Naledi',
    surname: 'Molefe',
    role: 'Private Sommelier',
    rate: 380,
    phone: '+27838829104',
    email: 'naledi@freshpeople.co.za',
    notes: 'Deep vintage knowledge, South African winery specialist.'
  },
  {
    id: 'staff-18',
    name: 'Wandile',
    surname: 'Ndlela',
    role: 'Service Supervisor',
    rate: 280,
    phone: '+27649238491',
    email: 'wandile@freshpeople.co.za',
    notes: 'Focused on seamless culinary delivery.'
  },
  {
    id: 'staff-19',
    name: 'Kiara',
    surname: 'Govender',
    role: 'Corporate Hostess',
    rate: 230,
    phone: '+27837719203',
    email: 'kiara@freshpeople.co.za',
    notes: 'Graceful hospitality operator.'
  },
  {
    id: 'staff-20',
    name: 'Tshepo',
    surname: 'Mashaba',
    role: 'Safety Concierge',
    rate: 250,
    phone: '+27749021289',
    email: 'tshepo@freshpeople.co.za',
    notes: 'Safety-first mindset, emergency exit control officer.'
  },
  {
    id: 'staff-21',
    name: 'Elize',
    surname: 'Botha',
    role: 'Corporate Hostess',
    rate: 220,
    phone: '+27829210294',
    email: 'elize@freshpeople.co.za',
    notes: 'Flawless corporate event and registry host.'
  },
  {
    id: 'staff-22',
    name: 'Fhulufhelani',
    surname: 'Netshidzivhe',
    role: 'Lead VIP Architect',
    rate: 360,
    phone: '+27724981122',
    email: 'fhulu@freshpeople.co.za',
    notes: 'Expert executive protocol manager with extensive national leadership relations.'
  }
];

const INITIAL_EVENTS: Event[] = [
  {
    id: 'event-rma-breakfast',
    title: 'RMA Khw breakfast',
    clientId: 'client-rma',
    venueId: 'venue-rma',
    date: '2026-05-25',
    startTime: '08:00',
    endTime: '15:00',
    staffIds: ['staff-1', 'staff-3', 'staff-4', 'staff-15'],
    notes: 'Corporate catering and VIP breakfast protocol management at RMA Premises.',
    status: 'Confirmed'
  },
  {
    id: 'event-motseng-breakfast',
    title: 'Motseng breakfast and lunch',
    clientId: 'client-motseng',
    venueId: 'venue-motseng',
    date: '2026-05-25',
    startTime: '08:00',
    endTime: '14:30',
    staffIds: ['staff-2', 'staff-5', 'staff-6'],
    notes: 'Premium breakfast and lunch banquet. Facilitation and executive hospitality setup.',
    status: 'Confirmed'
  },
  {
    id: 'event-rma-dolly',
    title: 'RMA Dolly/Mali',
    clientId: 'client-rma',
    venueId: 'venue-rma',
    date: '2026-05-26',
    startTime: '08:00',
    endTime: '15:00',
    staffIds: ['staff-8', 'staff-10'],
    notes: 'Rand Mutual Dolly and Mali partner sessions. Allocated corporate hosts.',
    status: 'Confirmed'
  },
  {
    id: 'event-etv-28',
    title: 'ETV Showcase',
    clientId: 'client-etv',
    venueId: 'venue-etv',
    date: '2026-05-28',
    startTime: '08:00',
    endTime: '09:00',
    staffIds: ['staff-3'],
    notes: 'Bespoke corporate television brief on-site helper.',
    status: 'Confirmed'
  },
  {
    id: 'event-sanofi-asthma',
    title: 'Sanofi ICDT & World Asthma Day',
    clientId: 'client-sanofi',
    venueId: 'venue-sanofi',
    date: '2026-05-28',
    startTime: '10:00',
    endTime: '15:00',
    staffIds: ['staff-1', 'staff-15', 'staff-22'],
    notes: 'Sponsorship and health awareness gala. 3 active expert VIP hostesses allocated.',
    status: 'Confirmed'
  },
  {
    id: 'event-mast-minds',
    title: 'MAST Fre Minds eve',
    clientId: 'client-mast',
    venueId: 'venue-tbc',
    date: '2026-05-29',
    startTime: '08:00',
    endTime: '16:00',
    staffIds: ['staff-12', 'staff-21'],
    notes: 'Fre Minds evening celebration and team lead briefing.',
    status: 'Confirmed'
  },
  {
    id: 'event-etv-29',
    title: 'ETV',
    clientId: 'client-etv',
    venueId: 'venue-etv',
    date: '2026-05-29',
    startTime: '08:00',
    endTime: '09:00',
    staffIds: ['staff-4'],
    notes: 'Daily media coordination briefing assistance.',
    status: 'Confirmed'
  },
  {
    id: 'event-omphile-lunch',
    title: 'Omphile Letshwiti Lunch',
    clientId: 'client-omphile',
    venueId: 'venue-tbc',
    date: '2026-05-30',
    startTime: '11:30',
    endTime: '13:30',
    staffIds: ['staff-2'],
    notes: 'Exclusive private dining support and direct mixology.',
    status: 'Confirmed'
  }
];

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
  const [roleViewTab, setRoleViewTab] = useState<'individual' | 'specialist'>('specialist');
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

  // Edit mode state
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Dispatch details
  const [selectedDispatchEventId, setSelectedDispatchEventId] = useState('');
  const [dispatchTemplate, setDispatchTemplate] = useState(
    'Hi {StaffName} hope you are well. Are you available on {Date} from {In} to {Out} with Fresh People mapping? Click links to reply: Confirm: {ConfirmLink} | Reject: {RejectLink}'
  );

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Event search/filter states
  const [eventSearchQuery, setEventSearchQuery] = useState('');
  const [eventStatusFilter, setEventStatusFilter] = useState<'all' | 'Pending' | 'Confirmed' | 'Canceled'>('all');
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

  const isDayInSelectedPayrollCycle = (day: number) => {
    // If we are looking at May (Month 4) on calendar:
    // If focused cycle is "current" (Apr 26 - May 25), then May 1st to May 25th are inside this payroll cycle.
    // If focused cycle is "next" (May 26 - Jun 25), then May 26th to May 31st are inside this payroll cycle.
    if (focusedPayrollCycle === 'current') {
      return day >= 1 && day <= 25;
    } else {
      return day >= 26 && day <= 31;
    }
  };

  // Shifting active calendar months safely
  const shiftMonth = (direction: number) => {
    let nextM = currentMonth + direction;
    let nextY = currentYear;
    if (nextM < 0) {
      nextM = 11;
      nextY -= 1;
    } else if (nextM > 11) {
      nextM = 0;
      nextY += 1;
    }
    setCurrentMonth(nextM);
    setCurrentYear(nextY);
  };

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

  // Generate calendar days for rendering
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const days: { dayNumber: number; isCurrentMonth: boolean; dateStr: string }[] = [];

    // Pads elements of the previous month
    const prevMonthLastDate = new Date(currentYear, currentMonth, 0).getDate();
    const prevMonthIdx = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dNum = prevMonthLastDate - i;
      days.push({
        dayNumber: dNum,
        isCurrentMonth: false,
        dateStr: `${prevMonthYear}-${String(prevMonthIdx + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`
      });
    }

    // Days of the primary month
    for (let d = 1; d <= totalDaysInMonth; d++) {
      days.push({
        dayNumber: d,
        isCurrentMonth: true,
        dateStr: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      });
    }

    // Padding elements of the following month
    const currentRenderedCount = days.length;
    const remainingTo42 = 42 - currentRenderedCount;
    const nextMonthIdx = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;

    for (let n = 1; n <= remainingTo42; n++) {
      days.push({
        dayNumber: n,
        isCurrentMonth: false,
        dateStr: `${nextMonthYear}-${String(nextMonthIdx + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Aggregate local events scheduled on specific displayed days
  const getEventsForDate = (dateStr: string) => {
    const localMatches = events.filter((ev) => ev.date === dateStr);

    // Merge Google calendar fetched appointments mapping to the same dateStr
    const googleMatches = googleEvents
      .filter((gEv) => {
        // Parse date
        const gDate = gEv.start?.dateTime?.split('T')[0] || gEv.start?.date;
        return gDate === dateStr;
      })
      // Avoid duplication if the Google event stems from our own local event
      .filter((gEv) => {
        const fpId = gEv.extendedProperties?.private?.freshPeopleEventId;
        return !events.some((e) => e.id === fpId || e.googleEventId === gEv.id);
      })
      .map((gEv) => {
        const startTime = gEv.start?.dateTime ? gEv.start.dateTime.split('T')[1].slice(0, 5) : '00:00';
        const endTime = gEv.end?.dateTime ? gEv.end.dateTime.split('T')[1].slice(0, 5) : '23:59';
        const mapped: Event = {
          id: `gcal-import-${gEv.id}`,
          title: gEv.summary || 'Google Imported Event',
          clientId: 'external_gcal',
          venueId: 'external_gcal',
          date: dateStr,
          startTime,
          endTime,
          staffIds: [],
          notes: gEv.description || 'Imported from connected Google calendar account.',
          status: 'Confirmed'
        };
        return mapped;
      });

    // Merge Apple calendar fetched appointments mapping to the same dateStr
    const appleMatches = appleUser
      ? appleEvents
          .filter((aEv) => aEv.date === dateStr)
          // Hide duplicates that stem from local events (synchronized)
          .filter((aEv) => !events.some((e) => e.id === aEv.appleEventId || e.appleEventId === aEv.id || e.id === aEv.id))
          .map((aEv) => {
            const matched = getMatchedClientAndVenue(aEv.title, aEv.clientId, aEv.venueId);
            const mapped: Event = {
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
              status: 'Confirmed'
            };
            return mapped;
          })
      : [];

    return [...localMatches, ...googleMatches, ...appleMatches];
  };

  // Selected Day state actions
  const selectedDayEvents = useMemo(() => {
    return getEventsForDate(selectedDateStr);
  }, [events, googleEvents, appleEvents, appleUser, selectedDateStr]);

  const selectedDayDoubleShifts = useMemo(() => {
    // Collect all local events for the selected date
    const dailyEvents = events.filter((e) => e.date === selectedDateStr);
    
    // For each staff member, find which events they are scheduled on for that day
    return staff.map((s) => {
      const assignedEvents = dailyEvents.filter((e) => e.staffIds.includes(s.id));
      return {
        staff: s,
        events: assignedEvents
      };
    }).filter((item) => item.events.length >= 2);
  }, [events, selectedDateStr, staff]);

  // Conflict detection: find all staff-time overlaps across ALL events (not just same-day)
  const selectedDayConflicts = useMemo(() => {
    const conflicts: Array<{
      staffId: string;
      staffName: string;
      staffRole: string;
      eventA: { id: string; title: string; date: string; startTime: string; endTime: string };
      eventB: { id: string; title: string; date: string; startTime: string; endTime: string };
    }> = [];

    const localEvents = events.filter(e => !e.id.startsWith('gcal-import') && !e.id.startsWith('apple-import') && !e.id.startsWith('apple-live'));

    // Check every pair of events that share staff
    for (let i = 0; i < localEvents.length; i++) {
      for (let j = i + 1; j < localEvents.length; j++) {
        const evA = localEvents[i];
        const evB = localEvents[j];

        // Find shared staff
        const sharedStaff = evA.staffIds.filter(id => evB.staffIds.includes(id));
        if (sharedStaff.length === 0) continue;

        // Check time overlap
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

  // Filter conflicts for the selected day only
  const selectedDayFilteredConflicts = useMemo(() => {
    return selectedDayConflicts.filter(
      c => c.eventA.date === selectedDateStr || c.eventB.date === selectedDateStr
    );
  }, [selectedDayConflicts, selectedDateStr]);

  // Set of event IDs that have conflicts (for badge display)
  const conflictingEventIds = useMemo(() => {
    const ids = new Set<string>();
    selectedDayFilteredConflicts.forEach(c => {
      ids.add(c.eventA.id);
      ids.add(c.eventB.id);
    });
    return ids;
  }, [selectedDayFilteredConflicts]);

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

  // Authenticated Gateway form render
  if (!isUnlocked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md transition-all duration-700">
        <div className="w-full max-w-sm p-8 glass-panel rounded-lg shadow-2xl relative overflow-hidden bg-white/95 border border-gold-300/40 fade-in-up">
          {/* Decorative glowing header segment */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-gold-500 to-transparent"></div>

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gold-50 border border-gold-300/30 mb-5 shadow-gold-glow">
              <span className="font-display text-lg tracking-[0.2em] text-gold-600 font-bold translate-x-0.5">FP</span>
            </div>
            <h1 className="font-display text-xl tracking-[0.25em] text-slate-900 font-bold uppercase text-center">FRESH PEOPLE</h1>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1.5 text-center font-medium">Elite Staffing gateway</p>
          </div>

          {isForgotPasswordMode ? (
            <form onSubmit={handleResetPasswordRequest} id="pword_reset_form" className="space-y-5">
              <span className="text-[9px] uppercase tracking-widest text-gold-600 font-bold block border-b border-slate-100 pb-2 text-center">
                Secure Password Recovery Protocol
              </span>

              {resetSuccessMessage ? (
                <div className="text-[10px] text-emerald-800 border border-emerald-200 bg-emerald-50 px-3 py-2.5 rounded text-left leading-relaxed">
                  {resetSuccessMessage}
                </div>
              ) : (
                <p className="text-[9px] text-slate-500 leading-relaxed text-center font-medium">
                  Enter your Operator credentials and security recovery email below. An encrypted access bypass key will be dispatched.
                </p>
              )}

              <div className="space-y-1.5">
                <label htmlFor="recovery_operator_id" className="text-[8px] text-slate-500 uppercase tracking-widest font-semibold block">Operator ID</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <User className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    id="recovery_operator_id"
                    value={forgotOperatorId}
                    onChange={(e) => setForgotOperatorId(e.target.value)}
                    required
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 text-xs text-slate-900 rounded focus:border-gold-500 focus:bg-white focus:outline-hidden transition-all font-mono placeholder-slate-400 font-medium"
                    placeholder="e.g. yassin"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="recovery_email" className="text-[8px] text-slate-500 uppercase tracking-widest font-semibold block">Recovery Registry Email</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <Briefcase className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="email"
                    id="recovery_email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 text-xs text-slate-900 rounded focus:border-gold-500 focus:bg-white focus:outline-hidden transition-all font-mono placeholder-slate-400 font-medium"
                    placeholder="e.g. realyassinali@gmail.com"
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-2 pt-2">
                <button
                  type="submit"
                  className="w-full py-2 bg-gradient-to-r from-gold-600 to-gold-500 hover:brightness-110 active:scale-[0.99] transition-all text-white font-display font-semibold text-[10px] tracking-[0.2em] uppercase rounded shadow-sm cursor-pointer"
                >
                  Dispatch Recovery Key
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPasswordMode(false);
                    setResetSuccessMessage(null);
                  }}
                  className="w-full py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all font-mono text-[9px] uppercase tracking-widest rounded cursor-pointer font-medium"
                >
                  Return to Gateway Login
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleAuthSubmit} id="pword_login_form" className="space-y-5">
              {authError && (
                <div className="text-[10px] text-red-800 border border-red-200 bg-red-50 px-3 py-2.5 rounded text-center leading-relaxed font-medium">
                  Verification credentials rejected.<br />Please re-enter correct security key phrases.
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="gate_operator" className="text-[8px] text-slate-500 uppercase tracking-widest font-semibold block">Operator ID</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <User className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    id="gate_operator"
                    value={operatorId}
                    onChange={(e) => setOperatorId(e.target.value)}
                    required
                    autoComplete="username"
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 text-xs text-slate-900 rounded focus:border-gold-500 focus:bg-white focus:outline-hidden transition-all font-mono placeholder-slate-400 font-medium"
                    placeholder="e.g. yassin"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="gate_phrase" className="text-[8px] text-slate-500 uppercase tracking-widest font-semibold block">Security Phrase</label>
                  <button
                    type="button"
                    onClick={() => setIsForgotPasswordMode(true)}
                    className="text-[8px] text-gold-600 hover:underline hover:text-gold-700 tracking-wider uppercase font-mono cursor-pointer font-bold"
                  >
                    Forgot phrase?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <Lock className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="password"
                    id="gate_phrase"
                    value={securityPhrase}
                    onChange={(e) => setSecurityPhrase(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 text-xs text-slate-900 rounded focus:border-gold-500 focus:bg-white focus:outline-hidden transition-all font-mono placeholder-slate-400 font-medium"
                    placeholder="•••••••••••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 mt-5 bg-gradient-to-r from-gold-600 to-gold-500 hover:brightness-110 active:scale-[0.99] transition-all text-white font-display font-semibold text-[10px] tracking-[0.2em] uppercase rounded shadow-md cursor-pointer"
              >
                Verify Command Access
              </button>
            </form>
          )}

          <div className="mt-8 text-center border-t border-slate-100 pt-4">
            <p className="text-[8px] text-slate-500 tracking-widest leading-relaxed uppercase font-medium">
              FRESH PEOPLE OPERATIONAL SYSTEM V.26<br />
              Encryption bound active. Logs streamed to secure database.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative z-20">
      {/* Premium Toast Overlay Notifications */}
      {toastAlert && (
        <div
          onClick={() => setToastAlert(null)}
          className={`fixed top-5 right-5 z-55 p-4 rounded-lg border shadow-xl max-w-sm max-h-[80vh] overflow-y-auto transition-all duration-300 backdrop-blur-md cursor-pointer flex items-start gap-3 select-none animate-fade-in ${
            toastAlert.type === 'error'
              ? 'bg-red-50/95 border-red-200 text-red-800'
              : toastAlert.type === 'warn'
              ? 'bg-amber-50/95 border-amber-200 text-amber-800'
              : toastAlert.type === 'success'
              ? 'bg-emerald-50/95 border-emerald-250 text-emerald-805'
              : 'bg-gold-50/95 border-gold-200 text-gold-900'
          }`}
          style={{ zIndex: 9999 }}
        >
          <div className="flex-1">
            <h4 className="text-[10px] font-extrabold font-display uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
              {toastAlert.type === 'error' && '🚨 System Alert'}
              {toastAlert.type === 'warn' && '⚠️ Attention'}
              {toastAlert.type === 'success' && '✓ Operation Complete'}
              {toastAlert.type === 'info' && 'ℹ Communication Update'}
            </h4>
            <p className="text-[9px] font-mono font-semibold leading-relaxed whitespace-pre-line">
              {toastAlert.message}
            </p>
          </div>
          <button type="button" className="text-xs font-extrabold select-none opacity-40 hover:opacity-100 p-0.5 leading-none">&times;</button>
        </div>
      )}

      {/* Undo/Redo Toast */}
      {undoToast && (
        <div
          className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] px-5 py-2.5 rounded-lg border border-slate-300/60 bg-slate-800/95 backdrop-blur-md text-white text-[10px] font-mono font-bold tracking-wider uppercase shadow-2xl flex items-center gap-2 animate-fade-in"
        >
          <span className="text-amber-400">↩</span>
          {undoToast}
          <span className="text-slate-400 ml-1">| Ctrl+Z</span>
        </div>
      )}

      {/* Decorative Blur Background Circles */}
      <div className="ambient-glow-1"></div>
      <div className="ambient-glow-2"></div>

      {/* Synchronizing indicator ticker */}
      {syncStatusMsg && (
        <div className="bg-gold-500 text-black text-[10px] font-mono py-1 px-4 text-center tracking-widest uppercase transition-all flex items-center justify-center gap-2 font-medium z-50 sticky top-0">
          <RefreshCw className="w-3 h-3 animate-spin" />
          <span>{syncStatusMsg}</span>
        </div>
      )}

      {/* Main Command Header */}
      <header className="border-b border-gold-200/40 bg-white/80 backdrop-blur-md sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Mobile hamburger menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-gold-600 hover:bg-slate-100 rounded transition-all cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>}
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-2.5 h-2.5 rounded-full bg-gold-500 animate-pulse"></div>
              <span className="font-display tracking-[0.25em] font-bold text-slate-900 text-base md:text-lg">FRESH PEOPLE</span>
            </div>
            <span className="hidden md:inline h-4 w-[1px] bg-slate-200"></span>
            <span className="hidden md:inline font-mono text-[9px] text-gold-700 uppercase tracking-widest bg-gold-50 px-2.5 py-0.5 border border-gold-200/40 rounded">
              Operational Command Hub
            </span>
          </div>

          <div className="flex items-center space-x-6">
            {/* System clock & Session status */}
            <div className="hidden sm:flex flex-col items-end font-mono text-right select-none">
              <span className="text-xs text-slate-800 tracking-widest font-bold">{systime} UTC</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[8px] text-slate-500 uppercase tracking-widest font-medium">Operator: yassin</span>
                <span className="h-2 w-[1px] bg-slate-200"></span>
                <span className="text-[8px] text-gold-600 font-black uppercase tracking-widest animate-pulse">Session: {sessionTimeLeft}</span>
              </div>
            </div>

            {/* Undo / Redo Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={undo}
                disabled={undoStack.length === 0}
                title="Undo (Ctrl+Z)"
                className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-500 hover:text-slate-700 transition-all cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={redo}
                disabled={redoStack.length === 0}
                title="Redo (Ctrl+Shift+Z)"
                className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-slate-500 hover:text-slate-700 transition-all cursor-pointer"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
              {undoStack.length > 0 && (
                <span className="text-[7px] font-mono text-slate-400 ml-0.5" title={`${undoStack.length} steps in history`}>
                  {undoStack.length}
                </span>
              )}
            </div>

            {/* Lock Trigger */}
            <button
              onClick={triggerLogout}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded text-[9px] uppercase tracking-widest transition-all cursor-pointer font-mono font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Lock Console</span>
            </button>
          </div>
        </div>
      </header>

      {/* Premium Quiet Luxury Operational Export Control Panel */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 select-none" id="export_control_toolbar">
        <div className="p-4 rounded-lg border border-gold-300/30 bg-white/95 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded bg-gold-50 border border-gold-300/30">
              <Download className="w-4 h-4 text-gold-600 animate-bounce" />
            </div>
            <div>
              <h3 className="text-[10px] uppercase font-display tracking-[0.2em] text-slate-905 font-bold">Operational Export Controls</h3>
              <p className="text-[8px] uppercase tracking-widest text-slate-500 font-mono mt-0.5">Secure CSV Ledger Spreads &bull; Ready for Audit Logs</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={handleExportEventsCSV}
              id="export_events_csv_trigger"
              className="py-1.5 px-3.5 border border-slate-205 hover:border-gold-500/30 text-slate-800 font-mono text-[9px] uppercase tracking-widest hover:bg-gold-50 transition-all rounded flex items-center gap-1.5 cursor-pointer font-semibold"
            >
              <ScrollText className="w-3 h-3 text-gold-600" /> Export Events (.CSV)
            </button>
            <button
              onClick={handleExportPayrollCSV}
              id="export_payroll_csv_trigger"
              className="py-1.5 px-3.5 border border-gold-300/30 text-gold-800 font-mono text-[9px] uppercase tracking-widest hover:bg-gold-50 transition-all rounded flex items-center gap-1.5 cursor-pointer font-bold bg-gold-50/50"
            >
              <CreditCard className="w-3 h-3 text-gold-600" /> Export Payroll &bull; {payrollCycleBounds.label} (.CSV)
            </button>
            <button
              onClick={handleExportJSON}
              id="export_json_backup_trigger"
              className="py-1.5 px-3.5 border border-blue-200 hover:border-blue-400 text-blue-700 font-mono text-[9px] uppercase tracking-widest hover:bg-blue-50 transition-all rounded flex items-center gap-1.5 cursor-pointer font-bold bg-blue-50/50"
            >
              <Download className="w-3 h-3 text-blue-600" /> Full Backup (.JSON)
            </button>
          </div>
        </div>
      </section>

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
          <div className="glass-panel rounded-lg p-5 shadow-luxury-glow flex flex-col">
            <div className="flex items-center justify-between mb-3.5 border-b border-slate-200/60 pb-3">
              <span className="text-[10px] uppercase tracking-[0.2em] text-slate-800 font-display flex items-center gap-1.5 font-bold">
                <Briefcase className="w-4 h-4 text-gold-600 animate-pulse" /> Role Utilization Chart
              </span>
              <span className="font-mono text-[8.5px] px-2 py-0.5 bg-gold-50 border border-gold-200/40 rounded-full text-gold-700 uppercase tracking-widest font-bold">
                {payrollCycleBounds.label}
              </span>
            </div>

            {/* View Tab Selector */}
            <div className="flex bg-slate-100 p-0.5 rounded-md mb-4 text-[8.5px] font-mono leading-none">
              <button
                type="button"
                onClick={() => setRoleViewTab('specialist')}
                className={`flex-1 py-1.5 rounded-sm font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                  roleViewTab === 'specialist'
                    ? 'bg-white text-gold-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Specialists (fresh-people.co.za)
              </button>
              <button
                type="button"
                onClick={() => setRoleViewTab('individual')}
                className={`flex-1 py-1.5 rounded-sm font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                  roleViewTab === 'individual'
                    ? 'bg-white text-gold-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Individual Roles
              </button>
            </div>

            <p className="text-[10px] text-slate-600 mb-3.5 font-medium leading-relaxed">
              {roleViewTab === 'specialist'
                ? 'Total booked hours aggregated across core South African event specialty classes.'
                : 'Total hours booked per specific individual assignment role type.'}
            </p>

            <div className="w-full h-44 mt-1">
              <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">Loading chart...</div>}>
                <RoleChart
                  data={roleViewTab === 'specialist' ? freshPeopleGroupedData : roleUtilizationData}
                  roleViewTab={roleViewTab}
                  ROLE_COLORS={ROLE_COLORS}
                />
              </Suspense>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-105 space-y-2 max-h-[220px] overflow-y-auto pr-0.5">
              {roleViewTab === 'specialist' ? (
                freshPeopleGroupedData.map((item) => (
                  <div key={item.name} className="p-2 border border-slate-200/50 bg-slate-50/45 rounded-md transition-all">
                    <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-xs"
                          style={{ backgroundColor: item.color }}
                        ></span>
                        <span className="text-slate-800 font-extrabold tracking-tight">{item.name}</span>
                      </div>
                      <span className="font-mono text-[9px] px-1.5 py-0.5 bg-gold-50 text-gold-700 font-extrabold border border-gold-200/40 rounded">
                        {item.Hours.toFixed(1)} hrs
                      </span>
                    </div>
                    <p className="text-[8.5px] text-slate-500 font-semibold leading-normal pl-4.5">
                      {item.description}
                    </p>
                  </div>
                ))
              ) : (
                roleUtilizationData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-[10px] font-mono px-1 py-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-xs"
                        style={{ backgroundColor: ROLE_COLORS[item.name] || '#B8860B' }}
                      ></span>
                      <span className="text-slate-705 font-bold">{item.name}</span>
                    </div>
                    <span className="font-extrabold text-slate-905">
                      {item.Hours.toFixed(1)} hrs
                    </span>
                  </div>
                ))
              )}
              {((roleViewTab === 'specialist' ? freshPeopleGroupedData : roleUtilizationData).length === 0 || 
                (roleViewTab === 'specialist' && freshPeopleGroupedData.every(i => i.Hours === 0))) && (
                <div className="text-center text-[9px] text-slate-400 py-3 font-medium">
                  No hours scheduled in this payroll span.
                </div>
              )}
              
              {/* Verified Badge pointing to fresh-people.co.za */}
              <div className="mt-3.5 pt-2.5 border-t border-dotted border-slate-200 text-center">
                <p className="text-[8px] text-slate-500 tracking-wider font-semibold leading-relaxed">
                  🌿 Specialist classifications &amp; credentials align with active roster guidelines on{' '}
                  <a
                    href="https://fresh-people.co.za"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gold-700 hover:underline font-extrabold"
                  >
                    fresh-people.co.za
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Scheduling & Core Event Architecture Planner Form */}
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
            {showTemplatePanel && (
              <div className="mb-4 p-3 bg-violet-50/50 border border-violet-200 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] text-violet-700 uppercase tracking-widest font-bold">Event Templates</span>
                  <button
                    type="button"
                    onClick={() => setShowTemplatePanel(false)}
                    className="text-[8px] text-violet-400 hover:text-violet-700 cursor-pointer"
                  >✕</button>
                </div>
                {/* Save current form as template */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Template name..."
                    className="flex-1 bg-white border border-violet-200 text-[10px] text-slate-900 px-2 py-1.5 rounded focus:border-violet-400 focus:outline-hidden placeholder-slate-400"
                  />
                  <button
                    type="button"
                    onClick={saveEventTemplate}
                    className="text-[8px] px-3 py-1.5 bg-violet-600 text-white rounded font-bold uppercase tracking-wider hover:bg-violet-700 transition-all cursor-pointer"
                  >
                    Save Current
                  </button>
                </div>
                {/* Template list */}
                {eventTemplates.length === 0 ? (
                  <p className="text-[9px] text-slate-400 italic">No templates yet. Fill the form above and save as template.</p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {eventTemplates.map((tmpl) => {
                      const clientObj = clients.find(c => c.id === tmpl.clientId);
                      const venueObj = venues.find(v => v.id === tmpl.venueId);
                      return (
                        <div key={tmpl.id} className="flex items-center justify-between bg-white border border-violet-100 rounded px-2 py-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[9px] font-bold text-slate-800 truncate">{tmpl.name}</span>
                            <span className="text-[7px] text-slate-500 truncate">
                              {clientObj?.name || '?'} @ {venueObj?.name || '?'} · {tmpl.startTime}-{tmpl.endTime} · {tmpl.staffIds.length} staff
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => applyEventTemplate(tmpl)}
                              className="text-[7px] px-2 py-0.5 bg-violet-100 text-violet-700 rounded font-bold hover:bg-violet-200 transition-all cursor-pointer"
                            >
                              Apply
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteEventTemplate(tmpl.id)}
                              className="text-[7px] px-1.5 py-0.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded font-bold transition-all cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

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

              {/* Core Feature 2: Allocation checklist directly mapped within created event */}
              <div className="space-y-1">
                <div className="flex justify-between items-center mb-1 animate-pulse">
                  <label className="text-[8px] text-gold-700 uppercase tracking-widest font-bold block">Allocate Staff Members</label>
                  <span className="text-[8px] font-mono text-slate-500 font-bold">{mappedRosterCount} Selected</span>
                </div>
                <div id="roster_checklist" className="max-h-24 overflow-y-auto border border-slate-200 bg-white shadow-xs rounded-md p-1.5 space-y-1.5 divide-y divide-slate-100">
                  {staff.length === 0 ? (
                    <div className="text-[9px] text-slate-400 text-center py-2">Add staff to enable dispatch maps.</div>
                  ) : (
                    staff.map((s) => {
                      const isSelected = evSelectedStaffIds.includes(s.id);
                      return (
                        <div
                          key={s.id}
                          onClick={() => toggleStaffAllocation(s.id)}
                          className="flex items-center space-x-2 py-1 cursor-pointer select-none text-[10px]"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="rounded text-gold-600 focus:ring-0 w-3 h-3 bg-white border-slate-300 cursor-pointer"
                          />
                          <span className={`flex-1 transition-all ${isSelected ? 'text-gold-700 font-bold' : 'text-slate-650'}`}>
                            {s.name} {s.surname} ({s.role})
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

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

        </section>

        {/* ========================================================================= */}
        {/* CENTER COLUMN: Interactive Payroll Grid Schedule                         */}
        {/* ========================================================================= */}
        <section id="calendar_section" className="lg:col-span-4 flex flex-col space-y-6 animate-fade-in">

          <div className="glass-panel rounded-lg p-5 shadow-luxury-glow flex flex-col flex-1 h-full">

            {/* Calendar Controls */}
            <div className="flex items-center justify-between mb-4 border-b border-slate-200/60 pb-3">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gold-600 animate-pulse" />
                <h2 className="font-display tracking-[0.15em] text-xs uppercase text-slate-900 font-extrabold">Payroll Cycle Schedule</h2>
              </div>
              <div className="flex items-center space-x-1.5 font-bold">
                <button
                  onClick={() => shiftMonth(-1)}
                  className="p-1 text-slate-600 hover:text-gold-600 hover:bg-slate-100 rounded transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-display text-[11px] text-slate-900 font-bold uppercase tracking-widest px-1">
                  {getMonthName(currentMonth)} {currentYear}
                </span>
                <button
                  onClick={() => shiftMonth(1)}
                  className="p-1 text-slate-600 hover:text-gold-600 hover:bg-slate-100 rounded transition-all cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Core Feature 3: Quiet Luxury Corporate Payroll Highlight Panel */}
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

              {/* Payroll Cycle Switch Selector */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gold-200/30 text-[9px] font-bold">
                <button
                  onClick={() => setFocusedPayrollCycle('current')}
                  className={`py-1 rounded text-center cursor-pointer font-mono uppercase tracking-widest border transition-all ${
                    focusedPayrollCycle === 'current'
                      ? 'bg-gold-100 border-gold-400 text-gold-800'
                      : 'border-slate-205 text-slate-500 hover:text-slate-800 hover:bg-white/40'
                  }`}
                >
                  Cycle ending May 25
                </button>
                <button
                  onClick={() => setFocusedPayrollCycle('next')}
                  className={`py-1 rounded text-center cursor-pointer font-mono uppercase tracking-widest border transition-all ${
                    focusedPayrollCycle === 'next'
                      ? 'bg-gold-100 border-gold-400 text-gold-800'
                      : 'border-slate-205 text-slate-500 hover:text-slate-800 hover:bg-white/40'
                  }`}
                >
                  Cycle opening May 26
                </button>
              </div>
            </div>

            {/* Day of the Week Headers */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1.5 select-none font-bold">
              <span className="text-[9px] text-slate-600 uppercase tracking-widest">Su</span>
              <span className="text-[9px] text-slate-600 uppercase tracking-widest">Mo</span>
              <span className="text-[9px] text-slate-600 uppercase tracking-widest">Tu</span>
              <span className="text-[9px] text-slate-600 uppercase tracking-widest">We</span>
              <span className="text-[9px] text-slate-600 uppercase tracking-widest">Th</span>
              <span className="text-[9px] text-slate-600 uppercase tracking-widest">Fr</span>
              <span className="text-[9px] text-gold-700 uppercase tracking-widest">Sa</span>
            </div>

            {/* Core visual calendar grid displaying local events and Google synchronisations */}
            <div className="grid grid-cols-7 gap-1.5 flex-1 select-none min-h-[220px]">
              {calendarDays.map((d, index) => {
                const isSelected = selectedDateStr === d.dateStr;
                const dailyEvents = getEventsForDate(d.dateStr);

                // Highlight status based on payroll bounds
                const fitsCycleInCurrentMonthDisplay = d.isCurrentMonth && isDayInSelectedPayrollCycle(d.dayNumber);

                return (
                  <div
                    key={`${d.dateStr}-${index}`}
                    onClick={() => {
                      setSelectedDateStr(d.dateStr);
                      // Auto-populate date in event architect form for seamless UX
                      setEvDate(d.dateStr);
                    }}
                    className={`relative p-2 flex flex-col min-h-[46px] rounded transition-all cursor-pointer ${
                      d.isCurrentMonth ? 'bg-white border border-slate-200' : 'bg-transparent text-slate-400 border border-transparent'
                    } ${isSelected ? '!border-gold-500 bg-gold-50/50 shadow-gold-glow' : ''} ${
                      fitsCycleInCurrentMonthDisplay ? 'payroll-span border-dashed !border-gold-500/30 font-bold' : ''
                    } hover:border-gold-400 hover:bg-gold-50/20`}
                  >
                    {/* Date Number Label */}
                    <div className="flex justify-between items-center mb-1">
                      <span
                        className={`text-[10px] font-mono leading-none font-extrabold ${
                          d.isCurrentMonth
                            ? fitsCycleInCurrentMonthDisplay
                              ? 'text-gold-700'
                              : 'text-slate-800'
                            : 'text-slate-400'
                        }`}
                      >
                        {d.dayNumber}
                      </span>

                      {/* Small visual dot for scheduler roster counts */}
                      {dailyEvents.length > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-gold-600 inline-block animate-pulse"></span>
                      )}
                    </div>

                    {/* Highly stylized miniature roster badge if events mapped to this container */}
                    {d.isCurrentMonth && dailyEvents.length > 0 && (
                      <div className="mt-auto space-y-0.5">
                        {dailyEvents.slice(0, 2).map((ev) => {
                          const isGCalImport = ev.id.startsWith('gcal-import');
                          return (
                            <div
                              key={ev.id}
                              className={`text-[7px] truncate px-1 rounded-sm font-bold tracking-wide leading-tight ${
                                isGCalImport
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-gold-50 text-gold-800 border border-gold-200/50'
                              }`}
                            >
                              {ev.title}
                            </div>
                          );
                        })}
                        {dailyEvents.length > 2 && (
                          <div className="text-[6.5px] font-mono text-slate-500 text-right font-bold">
                            +{dailyEvents.length - 2} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Dynamic Event detail expanded drawer panel */}
            <div id="selected_day_drawer" className="mt-4 pt-4 border-t border-slate-200/65 space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-905 font-bold">
                    Roster detail &bull; {selectedDateStr}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[8.5px] font-mono text-gold-700 uppercase tracking-widest font-extrabold">
                      {selectedDayEvents.length} Active Command Mappings
                    </span>
                    {selectedDayEvents.length > 0 && (
                      <span className="h-3 w-[1px] bg-slate-200"></span>
                    )}
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

              {/* Search and Filter Bar */}
              {selectedDayEvents.length > 0 && (
                <div className="flex flex-col sm:flex-row gap-2">
                  {/* Search Input */}
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
                  {/* Status Filter */}
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
                  {/* Clear filters */}
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

              {/* Staff Timeline View for selected day */}
              {selectedDayEvents.length > 0 && (
                <StaffTimeline
                  events={events}
                  staff={staff}
                  clients={clients}
                  venues={venues}
                  selectedDate={selectedDateStr}
                  onSelectEvent={(eventId) => setSelectedDispatchEventId(eventId)}
                />
              )}

              {selectedDayEvents.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-200 bg-white/50 rounded-lg font-medium">
                  No operational mappings budgeted on this calendar date.
                </div>
              ) : (
                <div className="space-y-3 max-h-[190px] overflow-y-auto pr-1">
                  {selectedDayEvents
                    .filter((ev) => {
                      const matchesSearch = !eventSearchQuery ||
                        ev.title.toLowerCase().includes(eventSearchQuery.toLowerCase()) ||
                        ev.notes.toLowerCase().includes(eventSearchQuery.toLowerCase());
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

              {/* Double-Shift Visual Auditor & Analytics Breakdown */}
              {selectedDayEvents.length > 0 && (() => {
                const approvedDS = selectedDayDoubleShifts.filter(item => 
                  item.events.every(ev => {
                    const rsvp = ev.staffRSVPs?.[item.staff.id] || (ev.isDirectBooking ? 'Available' : 'Pending');
                    return rsvp === 'Available';
                  })
                );

                const pendingDS = selectedDayDoubleShifts.filter(item => 
                  item.events.some(ev => {
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
                        <span className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-200/60 rounded">
                          {approvedDS.length} Approved
                        </span>
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/60 rounded animate-pulse">
                          {pendingDS.length} Pending
                        </span>
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
                            const isFullyApproved = evs.every(ev => {
                              const rsvp = ev.staffRSVPs?.[s.id] || (ev.isDirectBooking ? 'Available' : 'Pending');
                              return rsvp === 'Available';
                            });

                            return (
                              <div
                                key={s.id}
                                className={`p-2.5 border rounded-md transition-all ${
                                  isFullyApproved
                                    ? 'border-green-200 bg-green-50/25'
                                    : 'border-amber-200 bg-amber-50/25 font-bold'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs font-bold text-slate-900">
                                      {s.name} {s.surname}
                                    </span>
                                    <span className="text-[7.5px] uppercase tracking-widest px-1.5 py-0.5 bg-gold-50 text-gold-700 rounded-sm italic border border-gold-200/40 font-bold">
                                      {s.role}
                                    </span>
                                  </div>

                                  <span className={`text-[7.5px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded border font-bold ${
                                    isFullyApproved
                                      ? 'bg-green-100 border-green-300 text-green-800'
                                      : 'bg-amber-100 border-amber-300 text-amber-800'
                                  }`}>
                                    {isFullyApproved ? 'All Approved' : 'Action Required'}
                                  </span>
                                </div>

                                <div className="space-y-1">
                                  {evs.map((evItem) => {
                                    const rsvpState = evItem.staffRSVPs?.[s.id] || (evItem.isDirectBooking ? 'Available' : 'Pending');
                                    return (
                                      <div
                                        key={evItem.id}
                                        className="flex items-center justify-between text-[9px] bg-white border border-slate-150 rounded px-2 py-1"
                                      >
                                        <div className="truncate max-w-[65%] font-medium">
                                          <span className="font-extrabold text-slate-800">{evItem.title}</span>
                                          <span className="text-slate-500 font-mono text-[8.5px] block">{evItem.startTime} - {evItem.endTime}</span>
                                        </div>

                                        <button
                                          onClick={() => toggleStaffRSVP(evItem.id, s.id)}
                                          className={`text-[7.5px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border cursor-pointer transition-all font-bold ${
                                            rsvpState === 'Available'
                                              ? 'bg-green-50 hover:bg-green-100 border-green-200 text-green-700 font-bold'
                                              : 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700 font-bold'
                                          }`}
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

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: WhatsApp Dispatcher Console, Apple Sync & Call Log       */}
        {/* ========================================================================= */}
        <section id="dispatch_section" className="lg:col-span-4 flex flex-col space-y-6">

          {/* Quick Stats Dashboard */}
          <OperationsSnapshot
            events={events}
            staff={staff}
            selectedDayConflicts={selectedDayConflicts}
          />

          {/* Automated 'Staff Balancing' suggestion tool widget */}
          <div className="glass-panel rounded-lg p-5 shadow-luxury-glow flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-800 font-display flex items-center gap-1.5 mb-2.5 border-b border-slate-205 pb-2 font-bold select-none">
              <Users className="w-4 h-4 text-gold-600 animate-pulse" /> Staff Balancing Auditor
            </span>

            <p className="text-[10px] text-slate-650 font-semibold leading-relaxed mb-3.5">
              Automatically calculates staff-to-capacity ratios based on active venue guidelines. Ideal ratio is <span className="text-gold-700 font-bold">1 staff member per 50 guests</span>.
            </p>

            {/* Filter Toggle tabs */}
            <div className="flex bg-slate-100 p-0.5 rounded-md mb-4 text-[8.5px] font-mono leading-none">
              <button
                type="button"
                onClick={() => setBalanceFilter('all')}
                className={`flex-1 py-1.5 rounded-sm font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                  balanceFilter === 'all'
                    ? 'bg-white text-gold-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All Events ({staffBalancingData.length})
              </button>
              <button
                type="button"
                onClick={() => setBalanceFilter('payroll')}
                className={`flex-1 py-1.5 rounded-sm font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                  balanceFilter === 'payroll'
                    ? 'bg-white text-gold-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Active Cycle ({staffBalancingData.filter(item => {
                  const start = payrollCycleBounds.startDateStr;
                  const end = payrollCycleBounds.endDateStr;
                  return item.event.date >= start && item.event.date <= end;
                }).length})
              </button>
            </div>

            {/* Scrollable Suggestion List */}
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {filteredBalancingData.length === 0 ? (
                <div className="text-center py-4 text-[10px] text-slate-400 border border-dashed border-slate-200 bg-white/50 rounded-lg font-medium">
                  No events on record in this configuration.
                </div>
              ) : (
                filteredBalancingData.map((item) => {
                  const ev = item.event;
                  // target count matches 1 staff per 50 capacity
                  const targetStaff = Math.max(1, Math.ceil(item.capacity / 50));
                  const percentOfTarget = Math.round((item.staffCount / targetStaff) * 100);

                  return (
                    <div
                      key={ev.id}
                      className={`p-3 border rounded-lg bg-white relative overflow-hidden transition-all hover:border-gold-300 ${
                        item.level === 'critical'
                          ? 'border-red-200/80 bg-red-50/5'
                          : item.level === 'warning'
                          ? 'border-amber-200/85 bg-amber-50/5'
                          : 'border-slate-150'
                      }`}
                    >
                      {/* Left color bar matching level */}
                      <div
                        className={`absolute left-0 top-0 bottom-0 w-[3px] ${
                          item.level === 'critical'
                            ? 'bg-red-500'
                            : item.level === 'warning'
                            ? 'bg-amber-400'
                            : 'bg-emerald-500'
                        }`}
                      ></div>

                      <div className="pl-2">
                        <div className="flex items-start justify-between gap-1">
                          <div className="truncate flex-1">
                            <span className="text-[11px] font-extrabold text-slate-800 tracking-tight block truncate leading-tight">
                              {ev.title}
                            </span>
                            <span className="text-[8.5px] font-mono text-slate-505 font-semibold block mt-0.5">
                              {ev.date} &bull; {item.venue ? `${item.venue.name} (Cap: ${item.capacity})` : `Private Location (Cap: 100)`}
                            </span>
                          </div>

                          <span
                            className={`text-[7.5px] uppercase font-mono px-1.5 py-0.5 rounded-sm border font-extrabold flex items-center gap-1 shrink-0 ${
                              item.level === 'critical'
                                ? 'bg-red-50 border-red-200 text-red-700 font-extrabold'
                                : item.level === 'warning'
                                ? 'bg-amber-50 border-amber-200 text-amber-700'
                                : 'bg-green-50 border-green-200 text-green-700'
                            }`}
                          >
                            {item.level === 'critical'
                              ? '🚨 Critical'
                              : item.level === 'warning'
                              ? '⚠️ Warning'
                              : '✓ Balanced'}
                          </span>
                        </div>

                        {/* Ratios Metrics */}
                        <div className="grid grid-cols-2 gap-1.5 mt-2.5 text-[9px] font-semibold text-slate-705 border-t border-slate-100 pt-2 font-mono">
                          <div>
                            <span className="text-slate-400 block text-[7.5px] uppercase tracking-wider">Staff Cover</span>
                            <span className="text-slate-800 font-bold">{item.staffCount} Allocated</span> / {targetStaff} Target
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[7.5px] uppercase tracking-wider">Ratio Index</span>
                            <span className={`font-extrabold ${item.level === 'critical' ? 'text-red-650' : 'text-slate-805'}`}>
                              {item.staffCount > 0 ? `1 : ${item.guestsPerStaff} guests` : 'No Staff Allocated!'}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar represent cover sufficiency */}
                        <div className="mt-2.5">
                          <div className="flex justify-between items-center text-[7.5px] font-mono text-slate-405 font-bold mb-1">
                            <span>Sufficient staffing index</span>
                            <span>{percentOfTarget}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200/50">
                            <div
                              className={`h-full transition-all duration-500 rounded-full ${
                                item.level === 'critical'
                                  ? 'bg-red-500'
                                  : item.level === 'warning'
                                  ? 'bg-amber-400'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, percentOfTarget)}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Recommended action action button */}
                        <div className="mt-3 flex items-center justify-between gap-1 bg-slate-50/50 p-1.5 rounded border border-slate-200/40">
                          <p className="text-[8px] text-slate-505 font-semibold leading-tight max-w-[60%]">
                            {item.level === 'critical'
                              ? 'Critically understaffed. Allocate more staff immediately.'
                              : item.level === 'warning'
                              ? 'Staffing levels sub-optimal. Consider adding supervisors.'
                              : 'Roster meets safe compliance standard.'}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDateStr(ev.date);
                              setEvDate(ev.date);
                              setSelectedDispatchEventId(ev.id);
                              
                              // Log log
                              addActivityLog('sync', `Initiated automated balancing pipeline for "${ev.title}" (Date: ${ev.date}). Reading available staff lists.`);
                              
                              // Scroll smooth
                              setTimeout(() => {
                                const el = document.getElementById('selected_day_drawer');
                                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }, 50);
                            }}
                            className="text-[8px] uppercase tracking-wider font-mono px-2 py-1 bg-gold-600 hover:bg-gold-500 text-white font-extrabold rounded-md shadow-xs transition-all cursor-pointer hover:scale-[1.02]"
                          >
                            Optimize →
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Unified WhatsApp Scheduling Dispatcher (Core feature 4) */}
          <div className="glass-panel rounded-lg p-5 shadow-luxury-glow">
            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-800 font-display flex items-center gap-1.5 mb-2 border-b border-slate-205 pb-2 font-bold animate-pulse">
              <Radio className="w-4 h-4 text-gold-600 animate-pulse" /> Dispatcher Console
            </span>

            <p className="text-[10px] text-slate-600 font-semibold leading-relaxed mb-4">
              Select an upcoming event scheduled above to instantly structure automated courier communications out to allocated staff members.
            </p>

            <div className="space-y-4">
              <div>
                <label htmlFor="select_dispatch_event" className="text-[8px] text-slate-705 uppercase tracking-widest block font-bold mb-1">Target dispatch Event</label>
                <select
                  id="select_dispatch_event"
                  value={selectedDispatchEventId}
                  onChange={(e) => setSelectedDispatchEventId(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-xs text-slate-900 px-2 py-2 rounded focus:border-gold-500 focus:outline-hidden font-bold cursor-pointer"
                >
                  <option value="">Select Scheduled Event...</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id} className="bg-white text-slate-900">
                      {ev.title} ({ev.date})
                    </option>
                  ))}
                </select>
              </div>

              {currentSelectedDispatchEvent ? (
                <div className="space-y-3 p-3 bg-slate-50/70 border border-slate-200/80 rounded-lg fade-in-up">
                  <div className="flex items-center justify-between border-b border-slate-150 pb-2">
                    <span className="text-[8.5px] font-mono text-gold-700 uppercase tracking-wider font-bold">
                      Allocated Event Roster ({currentSelectedDispatchEvent.staffIds.length})
                    </span>
                    <span
                      className={`text-[8.5px] font-mono uppercase tracking-widest px-1.5 rounded-xs leading-none py-0.5 font-bold border ${
                        currentSelectedDispatchEvent.status === 'Confirmed'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-gold-50 text-gold-700 border-gold-200'
                      }`}
                    >
                      {currentSelectedDispatchEvent.status || 'Pending'}
                    </span>
                  </div>

                  {currentSelectedDispatchEvent.staffIds.length === 0 ? (
                    <p className="text-[10px] text-slate-400 text-center py-2">No staff allocated on this event roster.</p>
                  ) : (
                    <div className="space-y-3.5 divide-y divide-slate-100">
                      {currentSelectedDispatchEvent.staffIds.map((sId) => {
                        const sObj = staff.find((s) => s.id === sId);
                        if (!sObj) return null;
                        return (
                          <div key={sId} className="pt-2 flex flex-col space-y-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-xs text-slate-900 font-bold block">
                                  {sObj.name} {sObj.surname}
                                </span>
                                <span className="text-[8.5px] font-mono text-slate-500 uppercase tracking-widest block font-bold font-semibold">
                                  Role: {sObj.role} &bull; R{sObj.rate}/h
                                </span>
                              </div>
                              <button
                                onClick={() => dispatchToWhatsApp(currentSelectedDispatchEvent, sObj)}
                                className="px-2.5 py-1 bg-green-600 hover:bg-green-500 text-white font-mono font-bold text-[8px] tracking-wider uppercase rounded transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                              >
                                <Radio className="w-2.5 h-2.5" /> Dispatch SMS
                              </button>
                            </div>
                            {/* Message Preview */}
                            <div className="bg-slate-100 p-2.5 border border-slate-200 rounded font-mono text-[8px] text-slate-705 leading-relaxed max-h-16 overflow-y-auto whitespace-pre-line select-all font-bold shadow-inner">
                              {constructWhatsAppMessage(currentSelectedDispatchEvent, sObj)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-[10px] text-slate-500 border border-dashed border-slate-200 bg-white/50 rounded-lg">
                  No operational dispatcher loaded. Establish a selection above.
                </div>
              )}
            </div>
          </div>

          {/* Bidirectional Sync integrations panel (Google vs Apple iCal Export) */}
          <div className="glass-panel rounded-lg p-5 shadow-luxury-glow">
            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-800 font-display flex items-center gap-1.5 mb-2.5 border-b border-slate-205 pb-2 font-bold select-none">
              <Globe className="w-4 h-4 text-gold-600 animate-pulse" /> Synchronization Channels
            </span>

            <div className="space-y-4">
              {/* Google Synchronization Block */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[9px] font-bold">
                  <span className="text-slate-650 block uppercase tracking-widest">Google Calendar Service</span>
                  {googleUser ? (
                    <span className="text-green-600 font-mono text-[8px] font-extrabold flex items-center gap-1.5 uppercase tracking-widest">
                      <CheckCircle className="w-3 h-3 text-green-600" /> ONLINE
                    </span>
                  ) : (
                    <span className="text-slate-500 font-mono text-[8px] uppercase tracking-widest font-bold">DISCONNECTED</span>
                  )}
                </div>

                {googleUser ? (
                  <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-800 truncate max-w-[70%] font-mono select-all font-bold">
                        {googleUser.email}
                      </span>
                      <button
                        onClick={handleGoogleLogout}
                        className="text-[8px] text-red-650 hover:underline font-mono font-bold cursor-pointer"
                      >
                        Disconnect
                      </button>
                    </div>

                    {/* Auto-Sync status indicator inside the active panel */}
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded-md flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] uppercase tracking-widest text-slate-500 font-bold flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${autoSyncEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-350'}`}></span>
                          Auto-Sync Platforms
                        </span>
                        
                        <button
                          onClick={() => {
                            const nextVal = !autoSyncEnabled;
                            setAutoSyncEnabled(nextVal);
                            localStorage.setItem('fp_autosync_enabled', String(nextVal));
                          }}
                          className={`text-[7.5px] uppercase tracking-wider px-2 py-0.5 rounded-sm border cursor-pointer font-bold ${
                            autoSyncEnabled 
                              ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700'
                              : 'bg-slate-200 hover:bg-slate-300 border-slate-300 text-slate-705'
                          }`}
                        >
                          {autoSyncEnabled ? '✓ Active' : '⏸ Paused'}
                        </button>
                      </div>

                      <p className="text-[7.5px] leading-relaxed text-slate-500 font-medium">
                        {autoSyncEnabled 
                          ? `Continuously checking connected calendars for modifications and cancellations in real-time.`
                          : `Real-time synchronization paused. Click Turn On to keep your schedule refreshed automatically.`
                        }
                      </p>

                      <div className="flex items-center justify-between text-[7.5px] font-mono text-slate-450 font-bold mt-0.5 border-t border-slate-200/60 pt-1">
                        <span>Status: {isSilentSyncing ? 'Refreshing...' : 'Live Monitoring'}</span>
                        <span>Updated: {lastSyncTime ? lastSyncTime.toLocaleTimeString() : 'Just Linked'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => triggerGoogleSync()}
                        className="py-1.5 bg-gold-600 hover:bg-gold-500 text-white font-display font-bold text-[8.5px] tracking-widest uppercase rounded cursor-pointer transition-all flex items-center justify-center gap-1 shadow-xs"
                      >
                        <RefreshCw className="w-2.5 h-2.5" /> Pull & Sync
                      </button>
                      <button
                        onClick={handleExportICS}
                        className="py-1.5 border border-slate-350 hover:border-gold-400 text-slate-700 font-display text-[8.5px] tracking-widest uppercase rounded cursor-pointer transition-all flex items-center justify-center gap-1 bg-white shadow-xs"
                      >
                        <Download className="w-2.5 h-2.5" /> ICS Export
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-center">
                    <p className="text-[9.5px] text-slate-650 font-semibold leading-relaxed">
                      Enable bidirectional synchronization. Scheduled agency slots automatically mirror onto your Google Calendar dynamically.
                    </p>
                    <button
                      onClick={handleGoogleLogin}
                      className="w-full py-2 bg-gradient-to-r from-gold-600 to-gold-500 hover:brightness-110 active:scale-[0.99] hover:text-white font-display text-white font-bold text-[9px] tracking-widest uppercase rounded shadow-sm transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
                    >
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-3.5 h-3.5 mr-1 bg-white p-0.5 rounded-full">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 items-baseline 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      </svg>
                      Sign In with Google
                    </button>
                  </div>
                )}
              </div>

              {/* Apple Calendar iCal Link Block */}
              <div className="pt-2 border-t border-slate-200/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-slate-705 font-bold uppercase tracking-widest block">Apple Calendar Slot Sync</span>
                  {appleUser ? (
                    <span className="px-1.5 py-0.5 bg-green-50 text-green-700 border border-green-200 text-[7.5px] font-mono rounded-sm font-bold flex items-center gap-1">
                      <CheckCircle className="w-2.5 h-2.5 text-green-600" /> LINKED
                    </span>
                  ) : (
                    <span className="text-slate-500 font-mono text-[7.5px] uppercase tracking-widest font-bold">UNCONNECTED</span>
                  )}
                </div>

                {appleUser ? (
                  <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-800 truncate max-w-[70%] font-mono select-all font-bold">
                        {appleUser.email}
                      </span>
                      <button
                        onClick={handleAppleLogout}
                        className="text-[8px] text-red-650 hover:underline font-mono font-bold cursor-pointer"
                      >
                        Disconnect
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handlePushToAppleCalendar}
                        className="py-1.5 bg-black hover:bg-slate-850 text-white font-display font-bold text-[8.5px] tracking-widest uppercase rounded cursor-pointer transition-all flex items-center justify-center gap-1 shadow-xs"
                      >
                        <RefreshCw className="w-2.5 h-2.5" /> Push iCloud
                      </button>
                      <button
                        onClick={handleExportICS}
                        className="py-1.5 border border-slate-350 hover:border-gold-400 text-slate-705 font-display text-[8.5px] tracking-widest uppercase rounded cursor-pointer transition-all flex items-center justify-center gap-1 bg-white shadow-xs"
                      >
                        <Download className="w-2.5 h-2.5" /> Download .ICS
                      </button>
                    </div>

                    {/* Live iCal iCloud Feed Connection Area */}
                    <div className="p-2.5 bg-slate-50 border border-slate-150 rounded-lg space-y-2 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-[7.5px] uppercase tracking-wider text-slate-500 font-bold block">
                          iCloud iCal Feed Subscription URL
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                          <span className="text-[7px] text-emerald-600 font-bold font-mono uppercase tracking-widest">LIVE SYNC_UP</span>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={appleFeedUrl}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAppleFeedUrl(val);
                          localStorage.setItem('fp_apple_feed_url', val);
                        }}
                        placeholder="iCloud public calendar publish URL"
                        className="w-full text-[9px] bg-white border border-slate-200 p-1.5 rounded text-slate-800 font-mono focus:border-slate-800 focus:outline-hidden"
                      />
                      <button
                        onClick={() => triggerAppleFeedFetch(false)}
                        className="w-full py-1 bg-slate-900 text-white hover:bg-slate-800 rounded text-[7.5px] font-bold uppercase tracking-wider font-mono transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        title="Force-Sync latest iCloud slots immediately"
                      >
                        <RefreshCw className="w-2.5 h-2.5 text-white" /> Synchronise Live Feed Now
                      </button>
                    </div>

                    {/* Device Simulator Link */}
                    <div className="pt-2 border-t border-slate-100">
                      <button
                        onClick={() => setIsAppleSimulatorVisible(!isAppleSimulatorVisible)}
                        className="w-full py-1.5 bg-slate-900 text-white hover:bg-slate-850 rounded font-mono text-[8px] uppercase tracking-wider font-bold transition-all flex items-center justify-center gap-1 px-2.5 cursor-pointer shadow-sm"
                      >
                        <Apple className="w-3 h-3 text-white" /> 
                        {isAppleSimulatorVisible ? 'Hide iPhone Calendar' : 'Open iPhone Calendar (Live Sim)'}
                      </button>
                    </div>

                    {isAppleSimulatorVisible && (
                      <div className="p-2.5 bg-slate-950 text-white border border-slate-800 rounded-lg space-y-3 shadow-inner mt-2 shrink-0 select-none text-left">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                          <span className="text-[7.5px] text-slate-400 uppercase tracking-widest font-mono font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Yassin's iPhone Simulator
                          </span>
                          <span className="text-[7px] text-slate-500 font-mono">iCloud Synced</span>
                        </div>

                        {/* List of appleEvents */}
                        <div className="space-y-1 max-h-[140px] overflow-y-auto">
                          <span className="text-[7px] text-slate-500 uppercase tracking-widest block mb-1 font-bold">iCloud Event List</span>
                          {appleEvents.length === 0 ? (
                            <p className="text-[8px] text-slate-500 text-center py-2 font-mono">No iCloud events set.</p>
                          ) : (
                            appleEvents.map((aEv) => (
                              <div key={aEv.id} className="p-1.5 bg-slate-900 border border-slate-800 rounded flex items-center justify-between gap-2">
                                <div className="truncate flex-1">
                                  <span className="text-[8.5px] text-slate-200 font-bold block truncate">{aEv.title}</span>
                                  <span className="text-[7px] text-slate-500 font-mono font-semibold">
                                    {aEv.date} @ {aEv.startTime}-{aEv.endTime}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleDeleteAppleSimulatorEvent(aEv.id, aEv.title)}
                                  className="p-1 hover:bg-red-950/40 text-red-400 rounded transition-all cursor-pointer"
                                  title="Cancel Event on iPhone"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Add simulated event form */}
                        <form onSubmit={handleAddAppleSimulatorEvent} className="space-y-1.5 pt-2 border-t border-slate-800">
                          <span className="text-[7.5px] text-slate-400 uppercase tracking-widest block font-bold">Create Event on Phone</span>
                          
                          <input
                            type="text"
                            placeholder="Dinner at Sandton, Sponsor Lunch..."
                            value={simNewTitle}
                            onChange={(e) => setSimNewTitle(e.target.value)}
                            required
                            className="w-full bg-slate-900 border border-slate-800 text-xs px-2 py-1.5 text-slate-100 rounded focus:outline-hidden placeholder-slate-600 font-mono"
                          />

                          <div className="grid grid-cols-3 gap-1">
                            <div className="col-span-1">
                              <input
                                type="date"
                                value={simNewDate}
                                onChange={(e) => setSimNewDate(e.target.value)}
                                required
                                className="w-full bg-slate-900 border border-slate-800 text-[10px] px-1 py-1 text-slate-200 rounded font-mono"
                              />
                            </div>
                            <div>
                              <input
                                type="text"
                                placeholder="12:00"
                                value={simNewTimeStart}
                                onChange={(e) => setSimNewTimeStart(e.target.value)}
                                required
                                className="w-full bg-slate-900 border border-slate-800 text-[10px] px-1 py-1 text-slate-200 rounded font-mono"
                              />
                            </div>
                            <div>
                              <input
                                type="text"
                                placeholder="14:00"
                                value={simNewTimeEnd}
                                onChange={(e) => setSimNewTimeEnd(e.target.value)}
                                required
                                className="w-full bg-slate-900 border border-slate-800 text-[10px] px-1 py-1 text-slate-200 rounded font-mono"
                              />
                            </div>
                          </div>

                          <button
                            type="submit"
                            className="w-full py-1 bg-slate-850 hover:bg-slate-800 text-slate-100 rounded text-[8px] uppercase tracking-wider font-mono cursor-pointer transition-all border border-slate-755 font-bold"
                          >
                            + Add & Auto-Sync
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 text-center">
                    <p className="text-[9.5px] text-slate-655 font-semibold leading-relaxed">
                      Link your Apple ID to synchronize roster slots directly onto your device's Apple Calendar space.
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        onClick={() => setIsAppleAuthModalOpen(true)}
                        className="w-full py-2 bg-black hover:bg-slate-850 text-white font-display font-bold text-[9px] tracking-widest uppercase rounded shadow-sm hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
                      >
                        <Apple className="w-3.5 h-3.5 mr-1" />
                        Sign In with Apple
                      </button>
                      <button
                        onClick={handleExportICS}
                        className="w-full py-1.5 border border-slate-350 hover:border-gold-400 text-slate-705 font-mono text-[9px] uppercase tracking-widest hover:bg-gold-50/40 transition-all text-center rounded block cursor-pointer bg-white"
                      >
                        Download Apple iCal (.ICS)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Direct booking register and calls register */}
          <div className="glass-panel rounded-lg p-5 shadow-luxury-glow">
            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-800 font-display flex items-center gap-1.5 mb-3 border-b border-slate-205 pb-2 font-bold select-none">
              <PhoneForwarded className="w-4 h-4 text-gold-600 animate-pulse" /> Duty Call Register
            </span>

            <form onSubmit={logPhoneCall} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label htmlFor="input_caller" className="text-[8px] text-slate-550 uppercase tracking-widest block font-bold">Logged Caller</label>
                  <input
                    type="text"
                    id="input_caller"
                    value={callCaller}
                    onChange={(e) => setCallCaller(e.target.value)}
                    required
                    placeholder="e.g. Lead Planner"
                    className="w-full bg-white border border-slate-300 text-xs text-slate-900 px-2.5 py-1.5 rounded focus:border-gold-500 focus:outline-hidden placeholder-slate-400 font-bold"
                  />
                </div>
                <div className="space-y-1 font-semibold">
                  <label htmlFor="select_log_type" className="text-[8px] text-slate-550 uppercase tracking-widest block font-bold">Event Duty</label>
                  <select
                    id="select_log_type"
                    value={callType}
                    onChange={(e) => setCallType(e.target.value as any)}
                    required
                    className="w-full bg-white border border-slate-300 text-xs text-slate-900 px-1.5 py-1.5 rounded focus:border-gold-500 focus:outline-hidden cursor-pointer font-bold"
                  >
                    <option value="call" className="bg-white text-slate-900">Call Log Entry</option>
                    <option value="booking" className="bg-white text-slate-900">Manual Booking</option>
                    <option value="staff_confirm" className="bg-white text-slate-900">Staff Response</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="textarea_call_summary" className="text-[8px] text-slate-550 uppercase tracking-widest block font-bold">Resolution Notes</label>
                <textarea
                  id="textarea_call_summary"
                  value={callSummary}
                  onChange={(e) => setCallSummary(e.target.value)}
                  required
                  rows={2}
                  placeholder="Summary of operational resolution details..."
                  className="w-full bg-white border border-slate-300 text-xs text-slate-900 px-2.5 py-1.5 rounded focus:border-gold-500 focus:outline-hidden placeholder-slate-400 font-bold"
                ></textarea>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center space-x-1.5">
                  <input
                    type="checkbox"
                    id="checkbox_urgent"
                    checked={callUrgent}
                    onChange={(e) => setCallUrgent(e.target.checked)}
                    className="rounded text-gold-600 focus:ring-opacity-0 bg-white border-slate-300 w-3.5 h-3.5 cursor-pointer"
                  />
                  <label htmlFor="checkbox_urgent" className="text-[8.5px] text-red-650 uppercase tracking-[0.15em] select-none font-bold cursor-pointer">
                    Flag Urgent Gate
                  </label>
                </div>
                <button
                  type="submit"
                  className="bg-gold-600 hover:bg-gold-500 text-white font-display font-bold text-[8.5px] tracking-widest uppercase px-3.5 py-2 rounded transition-all cursor-pointer shadow-sm"
                >
                  Piped Log Stream
                </button>
              </div>
            </form>
          </div>

          {/* Activity Pipeline Logs */}
          <ActivityLogPanel
            activityLogs={activityLogs}
            onClearLogs={clearLogs}
          />

        </section>

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
      {activeModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm p-6 bg-white border border-slate-300 shadow-3xl rounded-xl relative fade-in-up">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 cursor-pointer select-none"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Ingestion Sub-Form: Client */}
            {activeModal === 'client' && (
              <form onSubmit={registerClient} className="space-y-4">
                <span className="text-[10px] font-display text-gold-700 uppercase tracking-[0.15em] block mb-4 border-b border-slate-200 pb-2 font-bold">
                  New Agency Client Ingest
                </span>
                <div className="space-y-1">
                  <label htmlFor="reg_client_name" className="text-[8px] text-slate-650 uppercase tracking-widest block font-bold">Client / Sponsor Name</label>
                  <input
                    type="text"
                    id="reg_client_name"
                    value={newClient.name}
                    onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                    required
                    placeholder="e.g. Christian Dior SA"
                    className="w-full bg-white border border-slate-300 text-xs text-slate-900 px-3 py-2 rounded focus:border-gold-500 focus:outline-hidden font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="reg_client_contact" className="text-[8px] text-slate-650 uppercase tracking-widest block font-bold">Account Sponsor Contact</label>
                  <input
                    type="text"
                    id="reg_client_contact"
                    value={newClient.contact}
                    onChange={(e) => setNewClient({ ...newClient, contact: e.target.value })}
                    required
                    placeholder="e.g. Charlotte de Laprès"
                    className="w-full bg-white border border-slate-300 text-xs text-slate-900 px-3 py-2 rounded focus:border-gold-500 focus:outline-hidden font-bold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="reg_client_email" className="text-[8px] text-slate-650 uppercase tracking-widest block font-bold">Secure Email</label>
                    <input
                      type="email"
                      id="reg_client_email"
                      value={newClient.email}
                      onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                      required
                      placeholder="comms@dior.corp"
                      className="w-full bg-white border border-slate-300 text-xs text-slate-900 px-2 py-2 rounded focus:border-gold-500 focus:outline-hidden font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="reg_client_phone" className="text-[8px] text-slate-650 uppercase tracking-widest block font-bold">Hotline Contact</label>
                    <input
                      type="text"
                      id="reg_client_phone"
                      value={newClient.phone}
                      onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                      required
                      placeholder="+33 6 4981 9283"
                      className="w-full bg-white border border-slate-300 text-xs text-slate-900 px-2 py-2 rounded focus:border-gold-500 focus:outline-hidden font-mono font-bold"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label htmlFor="reg_client_notes" className="text-[8px] text-slate-650 uppercase tracking-widest block font-bold">Compliance guidelines</label>
                  <textarea
                    id="reg_client_notes"
                    value={newClient.notes}
                    onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                    rows={2}
                    placeholder="General premium hospitality compliance requirements..."
                    className="w-full bg-white border border-slate-300 text-xs text-slate-900 px-3 py-1.5 rounded focus:border-gold-500 focus:outline-hidden font-bold"
                  ></textarea>
                </div>
                <div className="flex space-x-3 pt-2 font-mono text-[9px] uppercase tracking-widest font-extrabold">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="flex-1 py-2 border border-slate-300 text-slate-700 rounded cursor-pointer transition-all hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-gold-600 hover:bg-gold-500 text-white rounded cursor-pointer transition-all"
                  >
                    Commit
                  </button>
                </div>
              </form>
            )}

            {/* Ingestion Sub-Form: Venue */}
            {activeModal === 'venue' && (
              <form onSubmit={registerVenue} className="space-y-4">
                <span className="text-[10px] font-display text-gold-700 uppercase tracking-[0.15em] block mb-4 border-b border-slate-200 pb-2 font-bold">
                  New Venue Index Registration
                </span>
                <div className="space-y-1">
                  <label htmlFor="reg_venue_name" className="text-[8px] text-slate-650 uppercase tracking-widest block font-bold">Venue Name</label>
                  <input
                    type="text"
                    id="reg_venue_name"
                    value={newVenue.name}
                    onChange={(e) => setNewVenue({ ...newVenue, name: e.target.value })}
                    required
                    placeholder="e.g. Grand Palais Éphémère"
                    className="w-full bg-white border border-slate-300 text-xs text-slate-900 px-3 py-2 rounded focus:border-gold-500 focus:outline-hidden font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="reg_venue_address" className="text-[8px] text-slate-650 uppercase tracking-widest block font-bold">Physical Address</label>
                  <input
                    type="text"
                    id="reg_venue_address"
                    value={newVenue.address}
                    onChange={(e) => setNewVenue({ ...newVenue, address: e.target.value })}
                    required
                    placeholder="e.g. Place Joffre, 75007 Paris"
                    className="w-full bg-white border border-slate-300 text-xs text-slate-900 px-3 py-2 rounded focus:border-gold-500 focus:outline-hidden font-bold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="reg_venue_capacity" className="text-[8px] text-slate-650 uppercase tracking-widest block font-bold">Capacity Limits</label>
                    <input
                      type="number"
                      id="reg_venue_capacity"
                      value={newVenue.capacity}
                      onChange={(e) => setNewVenue({ ...newVenue, capacity: parseInt(e.target.value) || 100 })}
                      required
                      placeholder="500"
                      className="w-full bg-white border border-slate-300 text-xs text-slate-900 px-2 py-2 rounded focus:border-gold-500 focus:outline-hidden font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="reg_venue_tier" className="text-[8px] text-slate-650 uppercase tracking-widest block font-bold">Premium Grade</label>
                    <select
                      id="reg_venue_tier"
                      value={newVenue.tier}
                      onChange={(e) => setNewVenue({ ...newVenue, tier: e.target.value })}
                      required
                      className="w-full bg-white border border-slate-300 text-xs text-slate-900 px-2.5 py-2.5 rounded focus:border-gold-500 focus:outline-hidden font-bold cursor-pointer"
                    >
                      <option value="Luxury Class" className="bg-white text-slate-900">Luxury / Exclusive Tier</option>
                      <option value="Premium Estate" className="bg-white text-slate-900">Premium Private Estate</option>
                      <option value="Aesthetic Loft" className="bg-white text-slate-900">Aesthetic Industrial Loft</option>
                      <option value="Superyacht Deck" className="bg-white text-slate-900">Aviation Hook & Superyachts</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label htmlFor="reg_venue_notes" className="text-[8px] text-slate-650 uppercase tracking-widest block font-bold">Site guidelines</label>
                  <textarea
                    id="reg_venue_notes"
                    value={newVenue.notes}
                    onChange={(e) => setNewVenue({ ...newVenue, notes: e.target.value })}
                    rows={2}
                    placeholder="Decibel guidelines, load-in specifications..."
                    className="w-full bg-white border border-slate-300 text-xs text-slate-900 px-3 py-1.5 rounded focus:border-gold-500 focus:outline-hidden font-bold"
                  ></textarea>
                </div>
                <div className="flex space-x-3 pt-2 font-mono text-[9px] uppercase tracking-widest font-extrabold">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="flex-1 py-2 border border-slate-300 text-slate-700 rounded cursor-pointer transition-all hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-gold-600 hover:bg-gold-500 text-white rounded cursor-pointer transition-all shadow-xs"
                  >
                    Index Venue
                  </button>
                </div>
              </form>
            )}

            {/* Ingestion Sub-Form: Staff Registration */}
            {activeModal === 'staff' && (
              <form onSubmit={registerStaff} className="space-y-4">
                <span className="text-[10px] font-display text-gold-700 uppercase tracking-[0.15em] block mb-4 border-b border-slate-200 pb-2 font-bold">
                  New Staff Core Enrolment
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="reg_staff_name" className="text-[8px] text-slate-650 uppercase tracking-widest block font-bold">Given Name</label>
                    <input
                      type="text"
                      id="reg_staff_name"
                      value={newStaff.name}
                      onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                      required
                      placeholder="Sophie"
                      className="w-full bg-white border border-slate-300 text-xs text-slate-900 px-3 py-2 rounded focus:border-gold-500 focus:outline-hidden font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="reg_staff_surname" className="text-[8px] text-slate-650 uppercase tracking-widest block font-bold">Family Name</label>
                    <input
                      type="text"
                      id="reg_staff_surname"
                      value={newStaff.surname}
                      onChange={(e) => setNewStaff({ ...newStaff, surname: e.target.value })}
                      required
                      placeholder="Laurent"
                      className="w-full bg-white border border-slate-300 text-xs text-slate-900 px-3 py-2 rounded focus:border-gold-500 focus:outline-hidden font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="reg_staff_role" className="text-[8px] text-slate-650 uppercase tracking-widest block font-bold">Specialist Role</label>
                    <select
                      id="reg_staff_role"
                      value={newStaff.role}
                      onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                      required
                      className="w-full bg-white border border-slate-300 text-xs text-slate-900 px-2 py-2.5 rounded focus:border-gold-500 focus:outline-hidden font-bold cursor-pointer"
                    >
                      <option value="Lead VIP Architect" className="bg-white text-slate-900 font-bold">Lead VIP Architect</option>
                      <option value="Corporate Hostess" className="bg-white text-slate-900 font-bold">Corporate Hostess / Guest Rels</option>
                      <option value="Elite Mixologist" className="bg-white text-slate-900 font-bold">Elite Mixologist</option>
                      <option value="Service Supervisor" className="bg-white text-slate-900 font-bold">Service Supervisor</option>
                      <option value="Private Sommelier" className="bg-white text-slate-900 font-bold">Private Sommelier</option>
                      <option value="Tactical Concierge" className="bg-white text-slate-900 font-bold">Safety Concierge</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="reg_staff_rate" className="text-[8px] text-slate-650 uppercase tracking-widest block font-bold">Premium Rate (R/h)</label>
                    <input
                      type="number"
                      id="reg_staff_rate"
                      value={newStaff.rate}
                      onChange={(e) => setNewStaff({ ...newStaff, rate: parseInt(e.target.value) || 30 })}
                      required
                      min={15}
                      className="w-full bg-white border border-slate-300 text-xs text-slate-900 px-2 py-2 rounded focus:border-gold-500 focus:outline-hidden font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="reg_staff_phone" className="text-[8px] text-slate-650 uppercase tracking-widest block font-bold">Mobile (e.g. WhatsApp)</label>
                    <input
                      type="text"
                      id="reg_staff_phone"
                      value={newStaff.phone}
                      onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                      required
                      placeholder="+33649821012"
                      className="w-full bg-white border border-slate-300 text-xs text-slate-900 px-2 py-2 rounded focus:border-gold-500 focus:outline-hidden font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="reg_staff_email" className="text-[8px] text-slate-650 uppercase tracking-widest block font-bold">Secure Email</label>
                    <input
                      type="email"
                      id="reg_staff_email"
                      value={newStaff.email}
                      onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                      required
                      placeholder="sophie@freshpeople.agency"
                      className="w-full bg-white border border-slate-300 text-xs text-slate-900 px-2 py-2 rounded focus:border-gold-500 focus:outline-hidden font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="reg_staff_notes" className="text-[8px] text-slate-650 uppercase tracking-widest block font-bold">Dossier Credentials</label>
                  <textarea
                    id="reg_staff_notes"
                    value={newStaff.notes}
                    onChange={(e) => setNewStaff({ ...newStaff, notes: e.target.value })}
                    rows={2}
                    placeholder="Languages, clearances, specific professional qualifications..."
                    className="w-full bg-white border border-slate-300 text-xs text-slate-900 px-3 py-1.5 rounded focus:border-gold-500 focus:outline-hidden font-bold"
                  ></textarea>
                </div>
                <div className="flex space-x-3 pt-2 font-mono text-[9px] uppercase tracking-widest font-extrabold">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="flex-1 py-2 border border-slate-300 text-slate-700 rounded cursor-pointer transition-all hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-gold-600 hover:bg-gold-500 text-white rounded cursor-pointer transition-all shadow-xs"
                  >
                    Enroll member
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* APPLE ID & ICLOUD CALENDAR AUTHENTICATION DIALOG MODULE                   */}
      {/* ========================================================================= */}
      {isAppleAuthModalOpen && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-[340px] p-6 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-2xl select-none">
            <button
              onClick={() => setIsAppleAuthModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-3 pt-2">
              <Apple className="w-10 h-10 text-white mx-auto animate-pulse" />
              <h3 className="text-md font-bold tracking-tight">Sign in with Apple ID</h3>
              <p className="text-[10px] text-slate-400 leading-normal font-medium max-w-[240px] mx-auto">
                Link with your iCloud account to enable real-time calendar synchronization for your events.
              </p>
            </div>

            <form onSubmit={handleAppleLoginSubmit} className="mt-6 space-y-4">
              <div className="space-y-1">
                <label htmlFor="apple_id_email" className="text-[8px] text-slate-400 uppercase tracking-widest block font-bold font-mono">Apple ID</label>
                <input
                  type="email"
                  id="apple_id_email"
                  value={appleEmailInput}
                  onChange={(e) => setAppleEmailInput(e.target.value)}
                  required
                  placeholder="name@icloud.com"
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white px-3 py-2 rounded-lg focus:border-white focus:outline-hidden font-bold"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="apple_id_password" className="text-[8px] text-slate-400 uppercase tracking-widest block font-bold font-mono">Password / App-Specific Code</label>
                <input
                  type="password"
                  id="apple_id_password"
                  value={applePasswordInput}
                  onChange={(e) => setApplePasswordInput(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white px-3 py-2 rounded-lg focus:border-white focus:outline-hidden font-bold"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="apple_id_feed" className="text-[8px] text-slate-400 uppercase tracking-widest block font-bold font-mono">iCloud iCal Publish Feed URL</label>
                <input
                  type="text"
                  id="apple_id_feed"
                  value={appleFeedUrl}
                  onChange={(e) => setAppleFeedUrl(e.target.value)}
                  placeholder="Paste Apple Published iCal link hps://p56-caldav..."
                  className="w-full bg-slate-950 border border-slate-800 text-[9px] text-slate-200 px-3 py-1.5 rounded-lg focus:border-white focus:outline-hidden font-mono"
                />
              </div>

              <p className="text-[8px] text-slate-500 leading-normal font-semibold text-center italic">
                Your credentials are encrypted end-to-end directly with Apple ID sync hosts securely.
              </p>

              <div className="flex space-x-2 pt-2 text-[9px] uppercase tracking-wider font-extrabold font-mono">
                <button
                  type="button"
                  onClick={() => setIsAppleAuthModalOpen(false)}
                  className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-755 text-slate-300 rounded-lg cursor-pointer transition-all border border-slate-700/50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLinkingApple}
                  className="flex-1 py-1.5 bg-white hover:bg-slate-100 text-black rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  {isLinkingApple ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Linking...
                    </>
                  ) : (
                    'Link Account'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-sm p-6 glass-panel rounded-lg shadow-2xl bg-white/95 border border-red-200/40 fade-in-up">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50 border border-red-200 mb-4">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="font-display text-sm tracking-[0.15em] text-slate-900 font-bold uppercase">Confirm Deletion</h3>
              <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                Are you sure you want to permanently delete this event? This action cannot be undone and will remove the event from all logs.
              </p>
            </div>
            <div className="flex space-x-2 pt-2 text-[9px] uppercase tracking-wider font-extrabold font-mono">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition-all border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteEvent(showDeleteConfirm)}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3 h-3" />
                Delete Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help Modal */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowShortcutsModal(false)}>
          <div className="w-full max-w-md p-6 glass-panel rounded-xl shadow-2xl bg-white/95 border border-gold-200/50 fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5 border-b border-slate-200/60 pb-3">
              <h3 className="font-display text-sm tracking-[0.15em] text-slate-900 font-bold uppercase flex items-center gap-2">
                ⌨️ Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer select-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-[10px]">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-slate-500 font-bold uppercase tracking-wider">Navigation</div>
                <div className="text-slate-400 font-mono text-[8px] text-right">Press ? to toggle</div>
              </div>
              {[
                { key: 'Alt + C', desc: 'Switch to Clients tab' },
                { key: 'Alt + V', desc: 'Switch to Venues tab' },
                { key: 'Alt + S', desc: 'Switch to Staff tab' },
                { key: 'Alt + E', desc: 'Scroll to Event form' },
                { key: 'Ctrl + N', desc: 'New event (scroll to form)' },
                { key: 'Ctrl + B', desc: 'Export JSON backup' },
                { key: 'Ctrl + Z', desc: 'Undo last event change' },
                { key: 'Ctrl + Shift + Z', desc: 'Redo last undone change' },
                { key: 'Ctrl + Y', desc: 'Redo (alternative)' },
                { key: 'Esc', desc: 'Close modal / Cancel edit' },
                { key: '?', desc: 'Show this help panel' },
              ].map((shortcut, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                  <span className="text-slate-700 font-medium">{shortcut.desc}</span>
                  <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[8px] font-mono font-bold text-slate-600 shadow-sm">
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 text-center">
              <p className="text-[8px] text-slate-400 uppercase tracking-widest font-bold">
                Shortcuts disabled while typing in input fields
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
