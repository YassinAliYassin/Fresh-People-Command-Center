import { supabase, isSupabaseEnabled } from './supabaseClient';

// ─── Local storage fallback ──────────────────────────────────────────────────
const KEY = 'fpcc_local_store_v1';

interface LocalStore {
  staff: any[];
  clients: any[];
  events: any[];
  invoices: any[];
  quotes: any[];
  messages: any[];
}

const DEFAULT_STAFF = [
  { id:1, name:"Amara Diallo",   role:"Bar Staff",   rate:40, pin:"1111", uniform:true,  department:"Bar",        email:"amara@freshpeople.co.za",   phone:"+27 71 001 0001" },
  { id:2, name:"Themba Nkosi",   role:"Floor Staff", rate:40, pin:"2222", uniform:true,  department:"Floor",      email:"themba@freshpeople.co.za",   phone:"+27 71 001 0002" },
  { id:3, name:"Priya Moodley",  role:"Supervisor",  rate:55, pin:"3333", uniform:false, department:"Management", email:"priya@freshpeople.co.za",    phone:"+27 71 001 0003" },
  { id:4, name:"Lerato Khumalo", role:"Bar Staff",   rate:40, pin:"4444", uniform:true,  department:"Bar",        email:"lerato@freshpeople.co.za",   phone:"+27 71 001 0004" },
  { id:5, name:"Sipho Dlamini",  role:"Security",    rate:45, pin:"5555", uniform:true,  department:"Security",   email:"sipho@freshpeople.co.za",    phone:"+27 71 001 0005" },
  { id:6, name:"Naledi Tau",     role:"Floor Staff", rate:40, pin:"6666", uniform:false, department:"Floor",      email:"naledi@freshpeople.co.za",   phone:"+27 71 001 0006" },
];

const seedStore = (): LocalStore => {
  const today = new Date();
  const ymd = (d: Date) => d.toISOString().slice(0, 10);
  const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

  return {
    staff: DEFAULT_STAFF,
    clients: [
      { id:1, name:"Sandton Events Co",  email:"ops@sandtonevents.co.za",  vatNo:"4130265178", address:"14 Maude St, Sandton, 2196",   phone:"+27 11 555 0100", hourlyRate: 90 },
      { id:2, name:"MTN Group Ltd",      email:"procurement@mtn.com",      vatNo:"4000109388", address:"216 14th Ave, Fairland, 2195", phone:"+27 11 912 3000", hourlyRate: 120 },
      { id:3, name:"Priya & Dev Khumalo",email:"priya.khumalo@gmail.com",  vatNo:"",           address:"Private, KwaZulu-Natal",       phone:"+27 82 333 0001", hourlyRate: 95 },
    ],
    events: [
      { id:1, title:"Sandton Jazz Festival",    date:ymd(addDays(today,2)),  venue:"Sandton Convention Centre", staffIds:[1,2,5],   startTime:"17:00", endTime:"23:00", clientId:1, color:"#00e5a0", notes:"Smart dress code. Parking in basement." },
      { id:2, title:"Corporate Gala — MTN",     date:ymd(addDays(today,5)),  venue:"Hyatt Regency JHB",         staffIds:[3,4,6],   startTime:"18:00", endTime:"22:00", clientId:2, color:"#7c6af7", notes:"Formal." },
      { id:3, title:"Wedding: Khumalo/Singh",   date:ymd(addDays(today,8)),  venue:"Zimbali Estate",            staffIds:[1,2,3,4], startTime:"12:00", endTime:"20:00", clientId:3, color:"#f78c6c", notes:"Outdoor." },
    ],
    invoices: [
      { id:1, docNo:"FP-INV-2025-001", type:"invoice", clientId:2, eventId:4, issueDate:ymd(addDays(today,-2)), dueDate:ymd(addDays(today,28)), status:"sent", includeTax:true, taxRate:15, lines:[{desc:"Floor Staff × 3 (5h)",qty:15,rate:40},{desc:"Supervision fee",qty:1,rate:500}], notes:"Thank you for your business." },
    ],
    quotes: [
      { id:1, docNo:"FP-QTE-2025-001", clientId:1, eventId:1, issueDate:ymd(today), validUntil:ymd(addDays(today,30)), status:"draft", includeTax:true, taxRate:15, lines:[{desc:"Bar Staff × 3 (6h)",qty:18,rate:40},{desc:"Security × 2 (6h)",qty:12,rate:45},{desc:"Setup & breakdown fee",qty:1,rate:800}], notes:"Valid for 30 days from issue date." },
    ],
    messages: [],
  };
};

const loadLocal = (): LocalStore => {
  if (typeof localStorage === 'undefined') return seedStore();
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    const fresh = seedStore();
    localStorage.setItem(KEY, JSON.stringify(fresh));
    return fresh;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return seedStore();
  }
};

const saveLocal = (s: LocalStore) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(KEY, JSON.stringify(s));
  }
};

// ─── Public service API ──────────────────────────────────────────────────────
// Always works locally; transparently syncs to Supabase when configured.

const store = loadLocal();

const update = (mutator: (s: LocalStore) => void): LocalStore => {
  mutator(store);
  saveLocal(store);
  if (isSupabaseEnabled()) {
    // Fire-and-forget sync of the entire store to Supabase.
    syncToSupabase().catch((e) => console.warn('Supabase sync failed', e));
  }
  return store;
};

const syncToSupabase = async () => {
  if (!supabase) return;
  await Promise.all([
    supabase.from('staff').upsert(store.staff),
    supabase.from('clients').upsert(store.clients),
    supabase.from('events').upsert(store.events),
    supabase.from('invoices').upsert(store.invoices),
    supabase.from('quotes').upsert(store.quotes),
  ]);
};

// Staff
export const listStaff = () => store.staff;
export const addStaff = (s: any) => {
  const id = (store.staff.at(-1)?.id ?? 0) + 1;
  return update(s => { s.staff = [...s.staff, { ...s, id }]; }).staff.at(-1);
};
export const updateStaff = (id: number, patch: any) => {
  return update(s => { s.staff = s.staff.map(x => x.id === id ? { ...x, ...patch } : x); }).staff.find(x => x.id === id);
};

// Clients
export const listClients = () => store.clients;
export const addClient = (c: any) => {
  const id = (store.clients.at(-1)?.id ?? 0) + 1;
  return update(s => { s.clients = [...s.clients, { ...c, id, hourlyRate: c.hourlyRate ?? 90 }]; }).clients.at(-1);
};
export const updateClient = (id: number, patch: any) => {
  return update(s => { s.clients = s.clients.map(x => x.id === id ? { ...x, ...patch } : x); }).clients.find(x => x.id === id);
};

// Events
export const listEvents = () => store.events;
export const addEvent = (e: any) => {
  const id = (store.events.at(-1)?.id ?? 0) + 1;
  return update(s => { s.events = [...s.events, { ...e, id }]; }).events.at(-1);
};
export const updateEvent = (id: number, patch: any) => {
  return update(s => { s.events = s.events.map(x => x.id === id ? { ...x, ...patch } : x); }).events.find(x => x.id === id);
};

// Invoices
export const listInvoices = () => store.invoices;
export const addInvoice = (inv: any) => {
  const id = (store.invoices.at(-1)?.id ?? 0) + 1;
  const docNo = `FP-INV-${new Date().getFullYear()}-${String(id).padStart(3,'0')}`;
  const record = { ...inv, id, docNo, type: 'invoice' };
  return update(s => { s.invoices = [...s.invoices, record]; }).invoices.at(-1);
};

// Quotes
export const listQuotes = () => store.quotes;
export const addQuote = (q: any) => {
  const id = (store.quotes.at(-1)?.id ?? 0) + 1;
  const docNo = `FP-QTE-${new Date().getFullYear()}-${String(id).padStart(3,'0')}`;
  const record = { ...q, id, docNo, type: 'quote' };
  return update(s => { s.quotes = [...s.quotes, record]; }).quotes.at(-1);
};
export const convertQuoteToInvoice = (quoteId: number) => {
  const q = store.quotes.find(x => x.id === quoteId);
  if (!q) return null;
  return addInvoice({
    clientId: q.clientId,
    eventId: q.eventId,
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    status: 'sent',
    lines: q.lines,
    notes: q.notes,
    includeTax: q.includeTax,
    taxRate: q.taxRate,
  });
};

// Messages (for WhatsApp)
export const addMessage = (m: any) => {
  const id = (store.messages.length ? Math.max(...store.messages.map(x => x.id)) : 0) + 1;
  return update(s => { s.messages = [...s.messages, { ...m, id, createdAt: new Date().toISOString() }]; }).messages.at(-1);
};
export const listMessages = () => store.messages;

export const resetStore = () => {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(KEY);
  const fresh = seedStore();
  saveLocal(fresh);
  Object.assign(store, fresh);
};
