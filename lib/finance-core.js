// Shared finance helpers for FPCC serverless and local Express APIs.
// Keeps invoice/quotation/statement and staff-hours calculations in one place.

const DEFAULT_TAX_RATE = 15;
const MIN_EVENT_HOURS = 5;

export async function createFinancePool() {
  const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!databaseUrl) {
    const err = new Error('DATABASE_URL or SUPABASE_DATABASE_URL not set');
    err.code = 'DATABASE_URL_MISSING';
    throw err;
  }

  const { Pool } = await import('pg');
  return new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 1,
    idleTimeoutMillis: 100,
  });
}

export async function ensureFinanceSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS staff (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      role TEXT DEFAULT '',
      rate NUMERIC DEFAULT 0,
      department TEXT DEFAULT '',
      uniform BOOLEAN DEFAULT false,
      email TEXT DEFAULT '',
      pin TEXT DEFAULT '',
      total_hours NUMERIC DEFAULT 0
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      name TEXT DEFAULT '',
      email TEXT DEFAULT '',
      vat_no TEXT DEFAULT '',
      address TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      hourly_rate NUMERIC DEFAULT 90
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT,
      date TEXT,
      duration NUMERIC DEFAULT 5,
      staff_assigned TEXT,
      venue TEXT DEFAULT '',
      client_id INTEGER,
      start_time TEXT DEFAULT '',
      end_time TEXT DEFAULT '',
      staff_ids TEXT,
      color TEXT DEFAULT '',
      notes TEXT DEFAULT ''
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS finance_documents (
      id SERIAL PRIMARY KEY,
      doc_no TEXT UNIQUE,
      doc_type TEXT,
      client_id INTEGER,
      event_id TEXT,
      issue_date TEXT,
      due_date TEXT,
      valid_until TEXT,
      status TEXT DEFAULT 'draft',
      include_tax BOOLEAN DEFAULT true,
      tax_rate NUMERIC DEFAULT 15,
      lines JSONB DEFAULT '[]'::jsonb,
      notes TEXT DEFAULT '',
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS staff_hours (
      id SERIAL PRIMARY KEY,
      staff_id INTEGER,
      staff_name TEXT,
      cycle_start TEXT,
      cycle_end TEXT,
      hours NUMERIC DEFAULT 0,
      earnings NUMERIC DEFAULT 0,
      assignments_count INTEGER DEFAULT 0,
      event_ids JSONB DEFAULT '[]'::jsonb,
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);

  await ensureColumn(pool, 'staff', 'rate', 'NUMERIC DEFAULT 0');
  await ensureColumn(pool, 'staff', 'department', 'TEXT DEFAULT \'\'');
  await ensureColumn(pool, 'staff', 'uniform', 'BOOLEAN DEFAULT false');
  await ensureColumn(pool, 'staff', 'email', 'TEXT DEFAULT \'\'');
  await ensureColumn(pool, 'staff', 'pin', 'TEXT DEFAULT \'\'');
  await ensureColumn(pool, 'staff', 'total_hours', 'NUMERIC DEFAULT 0');

  await ensureColumn(pool, 'clients', 'name', 'TEXT DEFAULT \'\'');
  await ensureColumn(pool, 'clients', 'email', 'TEXT DEFAULT \'\'');
  await ensureColumn(pool, 'clients', 'vat_no', 'TEXT DEFAULT \'\'');
  await ensureColumn(pool, 'clients', 'address', 'TEXT DEFAULT \'\'');
  await ensureColumn(pool, 'clients', 'phone', 'TEXT DEFAULT \'\'');
  await ensureColumn(pool, 'clients', 'hourly_rate', 'NUMERIC DEFAULT 90');

  await ensureColumn(pool, 'events', 'venue', 'TEXT DEFAULT \'\'');
  await ensureColumn(pool, 'events', 'client_id', 'INTEGER');
  await ensureColumn(pool, 'events', 'start_time', 'TEXT DEFAULT \'\'');
  await ensureColumn(pool, 'events', 'end_time', 'TEXT DEFAULT \'\'');
  await ensureColumn(pool, 'events', 'staff_ids', 'TEXT');
  await ensureColumn(pool, 'events', 'color', 'TEXT DEFAULT \'\'');
  await ensureColumn(pool, 'events', 'notes', 'TEXT DEFAULT \'\'');
  await ensureColumn(pool, 'events', 'duration', 'NUMERIC DEFAULT 5');

  await ensureColumn(pool, 'finance_documents', 'doc_no', 'TEXT UNIQUE');
  await ensureColumn(pool, 'finance_documents', 'doc_type', 'TEXT');
  await ensureColumn(pool, 'finance_documents', 'client_id', 'INTEGER');
  await ensureColumn(pool, 'finance_documents', 'event_id', 'TEXT');
  await ensureColumn(pool, 'finance_documents', 'issue_date', 'TEXT');
  await ensureColumn(pool, 'finance_documents', 'due_date', 'TEXT');
  await ensureColumn(pool, 'finance_documents', 'valid_until', 'TEXT');
  await ensureColumn(pool, 'finance_documents', 'status', 'TEXT DEFAULT \'draft\'');
  await ensureColumn(pool, 'finance_documents', 'include_tax', 'BOOLEAN DEFAULT true');
  await ensureColumn(pool, 'finance_documents', 'tax_rate', 'NUMERIC DEFAULT 15');
  await ensureColumn(pool, 'finance_documents', 'lines', 'JSONB DEFAULT \'[]\'::jsonb');
  await ensureColumn(pool, 'finance_documents', 'notes', 'TEXT DEFAULT \'\'');
  await ensureColumn(pool, 'finance_documents', 'metadata', 'JSONB DEFAULT \'{}\'::jsonb');
  await ensureColumn(pool, 'finance_documents', 'created_at', 'TIMESTAMPTZ DEFAULT now()');
  await ensureColumn(pool, 'finance_documents', 'updated_at', 'TIMESTAMPTZ DEFAULT now()');

  await ensureColumn(pool, 'staff_hours', 'staff_id', 'INTEGER');
  await ensureColumn(pool, 'staff_hours', 'staff_name', 'TEXT');
  await ensureColumn(pool, 'staff_hours', 'cycle_start', 'TEXT');
  await ensureColumn(pool, 'staff_hours', 'cycle_end', 'TEXT');
  await ensureColumn(pool, 'staff_hours', 'hours', 'NUMERIC DEFAULT 0');
  await ensureColumn(pool, 'staff_hours', 'earnings', 'NUMERIC DEFAULT 0');
  await ensureColumn(pool, 'staff_hours', 'assignments_count', 'INTEGER DEFAULT 0');
  await ensureColumn(pool, 'staff_hours', 'event_ids', 'JSONB DEFAULT \'[]\'::jsonb');
  await ensureColumn(pool, 'staff_hours', 'updated_at', 'TIMESTAMPTZ DEFAULT now()');

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS staff_hours_cycle_idx
    ON staff_hours (staff_id, cycle_start, cycle_end)
  `).catch(e => {
    if (!String(e.message || '').includes('already exists')) throw e;
  });
}

async function ensureColumn(pool, table, column, definition) {
  try {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${definition}`);
  } catch (e) {
    const msg = String(e.message || '');
    if (msg.includes('already exists') || msg.includes('duplicate column')) return;
    throw e;
  }
}

export function parseJson(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function toYMD(date) {
  return date.toISOString().slice(0, 10);
}

export function getFinanceCycle(start, end) {
  if (start && end) return { start, end };

  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth();
  const year = now.getFullYear();

  let cycleStart;
  let cycleEnd;
  if (day >= 26) {
    cycleStart = new Date(year, month, 26);
    cycleEnd = new Date(year, month + 1, 25, 23, 59, 59, 999);
  } else {
    cycleStart = new Date(year, month - 1, 26);
    cycleEnd = new Date(year, month, 25, 23, 59, 59, 999);
  }

  return { start: toYMD(cycleStart), end: toYMD(cycleEnd) };
}

export function normalizeStaff(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    name: row.name || row.fullName || '',
    phone: row.phone || '',
    role: row.role || '',
    rate: Number(row.rate ?? 0),
    department: row.department || '',
    uniform: Boolean(row.uniform),
    email: row.email || '',
    pin: row.pin || '',
    totalHours: Number(row.total_hours ?? row.totalHours ?? 0),
  };
}

export function normalizeClient(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    name: row.name || '',
    email: row.email || '',
    vatNo: row.vat_no || row.vatNo || '',
    address: row.address || '',
    phone: row.phone || '',
    hourlyRate: Number(row.hourly_rate ?? row.hourlyRate ?? 90),
  };
}

export function normalizeEvent(row) {
  if (!row) return null;
  const staffIds = parseJson(row.staff_ids, null);
  const staffAssigned = parseJson(row.staff_assigned, null);
  return {
    id: String(row.id),
    title: row.title || '',
    date: row.date || '',
    venue: row.venue || '',
    clientId: Number(row.client_id ?? row.clientId ?? 0),
    startTime: row.start_time || row.startTime || '',
    endTime: row.end_time || row.endTime || '',
    duration: Number(row.duration ?? (eventHoursFromTimes(row.start_time || row.startTime, row.end_time || row.endTime) || 5)),
    staffIds: Array.isArray(staffIds) ? staffIds.map(Number) : [],
    staffNames: Array.isArray(staffAssigned) ? staffAssigned : [],
    color: row.color || '',
    notes: row.notes || '',
  };
}

export function normalizeDoc(row) {
  if (!row) return null;
  const lines = parseJson(row.lines, []);
  return {
    id: Number(row.id),
    docNo: row.doc_no || row.docNo || '',
    type: row.doc_type || row.type || 'invoice',
    clientId: Number(row.client_id ?? row.clientId ?? 0),
    eventId: row.event_id || row.eventId || '',
    issueDate: row.issue_date || row.issueDate || '',
    dueDate: row.due_date || row.dueDate || '',
    validUntil: row.valid_until || row.validUntil || '',
    status: row.status || 'draft',
    includeTax: row.include_tax ?? row.includeTax ?? true,
    taxRate: Number(row.tax_rate ?? row.taxRate ?? DEFAULT_TAX_RATE),
    lines: Array.isArray(lines) ? lines.map(normalizeDocLine) : [],
    notes: row.notes || '',
    metadata: parseJson(row.metadata, {}) || {},
  };
}

export function normalizeDocLine(line) {
  const qty = Number(line?.qty ?? line?.quantity ?? 0);
  const rate = Number(line?.rate ?? line?.unitRate ?? 0);
  return {
    desc: line?.desc || line?.description || '',
    qty,
    rate,
    total: Number(line?.total ?? qty * rate),
    kind: line?.kind || 'manual',
    staffId: line?.staffId ? Number(line.staffId) : undefined,
  };
}

export function docSubtotal(lines) {
  return (Array.isArray(lines) ? lines : []).reduce((sum, line) => {
    const qty = Number(line?.qty ?? line?.quantity ?? 0);
    const rate = Number(line?.rate ?? line?.unitRate ?? 0);
    return sum + qty * rate;
  }, 0);
}

export function docTotals(doc) {
  const subtotal = docSubtotal(doc?.lines || []);
  const includeTax = doc?.includeTax !== false;
  const taxRate = Number(doc?.taxRate ?? DEFAULT_TAX_RATE);
  const tax = includeTax ? subtotal * (taxRate / 100) : 0;
  return {
    subtotal,
    tax,
    total: subtotal + tax,
  };
}

export function serializeDocForDb(doc) {
  const lines = (doc.lines || []).map(normalizeDocLine);
  return {
    docNo: doc.docNo || doc.doc_no || '',
    docType: doc.type || doc.docType || 'invoice',
    clientId: Number(doc.clientId ?? doc.client_id ?? 0) || null,
    eventId: doc.eventId || doc.event_id || null,
    issueDate: doc.issueDate || doc.issue_date || toYMD(new Date()),
    dueDate: doc.dueDate || doc.due_date || null,
    validUntil: doc.validUntil || doc.valid_until || null,
    status: doc.status || 'draft',
    includeTax: doc.includeTax ?? doc.include_tax ?? true,
    taxRate: Number(doc.taxRate ?? doc.tax_rate ?? DEFAULT_TAX_RATE),
    lines,
    notes: doc.notes || '',
    metadata: doc.metadata || {},
  };
}

export function eventHoursFromTimes(startTime, endTime) {
  if (!startTime || !endTime) return 0;
  const parse = value => {
    const parts = String(value).split(':').map(Number);
    return Number.isFinite(parts[0]) && Number.isFinite(parts[1]) ? parts[0] * 60 + parts[1] : null;
  };
  const start = parse(startTime);
  const end = parse(endTime);
  if (start === null || end === null) return 0;
  let minutes = end - start;
  if (minutes < 0) minutes += 24 * 60;
  return minutes / 60;
}

export function normalizeStaffHoursResult(result) {
  return {
    success: true,
    cycleStart: result.cycleStart,
    cycleEnd: result.cycleEnd,
    summary: result.summary,
    staff: result.staff,
    events: result.events,
  };
}

export async function calculateStaffHours(pool, start, end, staffMapOverride = null) {
  await ensureFinanceSchema(pool);

  const cycle = getFinanceCycle(start, end);
  const staffRows = await pool.query(`
    SELECT id, name, phone, role, rate, department, uniform, email, pin, total_hours
    FROM staff
    ORDER BY name ASC
  `);
  const staff = staffRows.rows.map(normalizeStaff);
  const staffById = new Map(staff.map(s => [s.id, s]));
  const staffByName = new Map(staff.map(s => [s.name.toLowerCase(), s.id]));

  const eventsResult = await pool.query(`
    SELECT id, title, date, venue, client_id, start_time, end_time, duration, staff_ids, staff_assigned, color, notes
    FROM events
    WHERE date >= $1 AND date <= $2
    ORDER BY date ASC, start_time ASC, id ASC
  `, [cycle.start, cycle.end]);

  const events = eventsResult.rows.map(normalizeEvent);
  const totals = new Map(staff.map(s => [
    s.id,
    {
      staffId: s.id,
      fullName: s.name,
      phone: s.phone,
      role: s.role,
      rate: s.rate,
      assignmentsCount: 0,
      totalHours: 0,
      totalEarned: 0,
      eventIds: [],
      paymentStatus: 'PAID',
      pendingAmount: 0,
      paidAmount: 0,
    },
  ]));

  for (const event of events) {
    const hours = Math.max(Number(event.duration) || eventHoursFromTimes(event.startTime, event.endTime) || MIN_EVENT_HOURS, MIN_EVENT_HOURS);
    const ids = event.staffIds?.length ? event.staffIds : event.staffNames?.map(name => staffByName.get(String(name).toLowerCase())).filter(Boolean) || [];

    for (const staffId of [...new Set(ids.map(Number))]) {
      const record = totals.get(staffId);
      if (!record) continue;
      record.assignmentsCount += 1;
      record.totalHours = Number((record.totalHours + hours).toFixed(2));
      record.totalEarned = Number((record.totalHours * (record.rate || 0)).toFixed(2));
      record.pendingAmount = record.totalEarned;
      record.paidAmount = 0;
      record.paymentStatus = record.totalEarned > 0 ? 'UNPAID' : 'PAID';
      if (!record.eventIds.includes(event.id)) record.eventIds.push(event.id);
    }
  }

  for (const [staffId, item] of totals) {
    await pool.query(`
      INSERT INTO staff_hours (staff_id, staff_name, cycle_start, cycle_end, hours, earnings, assignments_count, event_ids, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
      ON CONFLICT (staff_id, cycle_start, cycle_end)
      DO UPDATE SET
        staff_name = EXCLUDED.staff_name,
        hours = EXCLUDED.hours,
        earnings = EXCLUDED.earnings,
        assignments_count = EXCLUDED.assignments_count,
        event_ids = EXCLUDED.event_ids,
        updated_at = now()
    `, [
      staffId,
      item.fullName,
      cycle.start,
      cycle.end,
      item.totalHours,
      item.totalEarned,
      item.assignmentsCount,
      JSON.stringify(item.eventIds),
    ]);

    await pool.query('UPDATE staff SET total_hours = $1 WHERE id = $2', [item.totalHours, staffId]);
  }

  const staffList = staff.map(s => ({
    staffId: s.id,
    fullName: s.name,
    phone: s.phone,
    role: s.role,
    rate: s.rate,
    assignmentsCount: totals.get(s.id)?.assignmentsCount || 0,
    totalHours: totals.get(s.id)?.totalHours || 0,
    totalEarned: totals.get(s.id)?.totalEarned || 0,
    eventIds: totals.get(s.id)?.eventIds || [],
    paymentStatus: totals.get(s.id)?.paymentStatus || 'PAID',
    pendingAmount: totals.get(s.id)?.pendingAmount || 0,
    paidAmount: totals.get(s.id)?.paidAmount || 0,
  }));

  const summary = {
    totalStaff: staff.length,
    staffWithHours: staffList.filter(s => s.totalHours > 0).length,
    totalHours: Number(staffList.reduce((sum, s) => sum + s.totalHours, 0).toFixed(2)),
    totalEarnings: Number(staffList.reduce((sum, s) => sum + s.totalEarned, 0).toFixed(2)),
    paidAmount: Number(staffList.reduce((sum, s) => sum + (s.paidAmount || 0), 0).toFixed(2)),
    pendingAmount: Number(staffList.reduce((sum, s) => sum + (s.pendingAmount || 0), 0).toFixed(2)),
    overdueCount: staffList.filter(s => s.paymentStatus === 'OVERDUE').length,
  };

  return {
    success: true,
    cycleStart: cycle.start,
    cycleEnd: cycle.end,
    summary,
    staff: staffList,
    events,
  };
}

export async function handleFinanceRequest(req, res) {
  const { checkAuth } = await import('./auth.js');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  let pool;
  try {
    pool = await createFinancePool();
    await ensureFinanceSchema(pool);

    const resource = String(req.query?.resource || req.query?.endpoint || 'docs');
    const financeResource = resource === 'finance'
      ? String(req.query?.financeResource || req.query?.finance || 'docs')
      : resource;
    if (financeResource === 'staff-hours') {
      return handleStaffHours(req, res, pool);
    }
    if (financeResource === 'statement') {
      return handleStatement(req, res, pool);
    }
    if (financeResource === 'docs') {
      return handleDocs(req, res, pool);
    }
    if (financeResource === 'convert') {
      return handleConvertQuote(req, res, pool);
    }

    await pool.end();
    return res.status(400).json({ success: false, error: `Unknown finance resource: ${financeResource}` });
  } catch (error) {
    if (pool) await pool.end().catch(() => {});
    console.error('[Finance API]', error);
    return res.status(error?.code === 'DATABASE_URL_MISSING' ? 500 : 500).json({
      success: false,
      error: error?.message || 'Server error',
    });
  }
}

async function handleStaffHours(req, res, pool) {
  if (req.method === 'POST') {
    const authed = checkAuth(req, res);
    if (!authed) {
      await pool.end();
      return;
    }
  }

  if (!['GET', 'POST'].includes(req.method)) {
    await pool.end();
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const body = req.body || {};
  const result = await calculateStaffHours(pool, body.start, body.end);
  await pool.end();
  return res.json(result);
}

async function handleDocs(req, res, pool) {
  if (req.method === 'GET') {
    const docsResult = await pool.query(`
      SELECT * FROM finance_documents
      ORDER BY issue_date DESC, created_at DESC
    `);
    const docs = docsResult.rows.map(normalizeDoc);
    const clientsResult = await pool.query(`SELECT * FROM clients ORDER BY name ASC`);
    const eventsResult = await pool.query(`SELECT * FROM events ORDER BY date ASC, start_time ASC`);
    const staffResult = await pool.query(`SELECT * FROM staff ORDER BY name ASC`);

    const clients = clientsResult.rows.map(normalizeClient);
    const events = eventsResult.rows.map(normalizeEvent);
    const staff = staffResult.rows.map(normalizeStaff);
    const invoices = docs.filter(d => d.type === 'invoice');
    const quotes = docs.filter(d => d.type === 'quote');
    const summary = buildDocSummary(invoices);

    await pool.end();
    return res.json({
      success: true,
      docs,
      invoices,
      quotes,
      clients,
      events,
      staff,
      summary,
    });
  }

  const authed = checkAuth(req, res);
  if (!authed) {
    await pool.end();
    return;
  }

  if (req.method === 'POST') {
    const doc = await createFinanceDocument(pool, req.body || {});
    await pool.end();
    return res.status(201).json({ success: true, doc });
  }

  if (req.method === 'PATCH') {
    const id = req.query?.id || req.body?.id;
    if (!id) {
      await pool.end();
      return res.status(400).json({ success: false, error: 'id is required' });
    }
    const doc = await updateFinanceDocument(pool, Number(id), req.body || {});
    await pool.end();
    return res.json({ success: true, doc });
  }

  if (req.method === 'DELETE') {
    const id = req.query?.id || req.body?.id;
    if (!id) {
      await pool.end();
      return res.status(400).json({ success: false, error: 'id is required' });
    }
    await pool.query('DELETE FROM finance_documents WHERE id = $1', [Number(id)]);
    await pool.end();
    return res.json({ success: true, deleted: Number(id) });
  }

  await pool.end();
  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

async function handleStatement(req, res, pool) {
  const clientId = Number(req.query?.clientId || req.body?.clientId);
  if (!clientId) {
    await pool.end();
    return res.status(400).json({ success: false, error: 'clientId is required' });
  }

  const docsResult = await pool.query(`
    SELECT * FROM finance_documents
    WHERE client_id = $1 AND doc_type = 'invoice'
    ORDER BY issue_date ASC, created_at ASC
  `, [clientId]);

  const docs = docsResult.rows.map(normalizeDoc);
  const totals = docs.reduce((acc, doc) => {
    const total = docTotals(doc).total;
    if (doc.status === 'paid') acc.paid += total;
    else acc.outstanding += total;
    acc.total += total;
    return acc;
  }, { total: 0, paid: 0, outstanding: 0 });

  await pool.end();
  return res.json({
    success: true,
    statement: {
      docNo: `FP-STMT-${new Date().getFullYear()}-${String(clientId).padStart(3, '0')}`,
      clientId,
      issueDate: toYMD(new Date()),
      status: 'statement',
      lines: [],
      notes: 'Account statement generated from invoices.',
    },
    docs,
    summary: {
      totalInvoiced: totals.total,
      paid: totals.paid,
      balanceDue: totals.outstanding,
    },
  });
}

async function handleConvertQuote(req, res, pool) {
  const authed = checkAuth(req, res);
  if (!authed) {
    await pool.end();
    return;
  }

  if (req.method !== 'POST') {
    await pool.end();
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const id = Number(req.query?.id || req.body?.id);
  if (!id) {
    await pool.end();
    return res.status(400).json({ success: false, error: 'id is required' });
  }

  const invoice = await convertQuoteToInvoice(pool, id);
  await pool.end();
  return res.json({ success: true, invoice });
}

async function buildDocSummary(invoices) {
  const rows = Array.isArray(invoices) ? invoices : [];
  const invoiced = rows.reduce((sum, doc) => sum + docTotals(doc).total, 0);
  const paid = rows.filter(doc => doc.status === 'paid').reduce((sum, doc) => sum + docTotals(doc).total, 0);
  const overdueCount = rows.filter(doc => doc.status === 'overdue').length;
  return {
    invoiced,
    paid,
    outstanding: invoiced - paid,
    overdueCount,
    count: rows.length,
  };
}

async function createFinanceDocument(pool, input) {
  const type = input.type || input.docType || 'invoice';
  if (!['invoice', 'quote'].includes(type)) {
    throw new Error('Document type must be invoice or quote');
  }

  const doc = serializeDocForDb({ ...input, type });
  if (!doc.docNo) {
    doc.docNo = await nextDocNo(pool, type);
  }

  const result = await pool.query(`
    INSERT INTO finance_documents
      (doc_no, doc_type, client_id, event_id, issue_date, due_date, valid_until, status, include_tax, tax_rate, lines, notes, metadata)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13::jsonb)
    RETURNING *
  `, [
    doc.docNo,
    doc.docType,
    doc.clientId,
    doc.eventId,
    doc.issueDate,
    doc.dueDate,
    doc.validUntil,
    doc.status,
    doc.includeTax,
    doc.taxRate,
    JSON.stringify(doc.lines),
    doc.notes,
    JSON.stringify(doc.metadata),
  ]);

  return normalizeDoc(result.rows[0]);
}

async function updateFinanceDocument(pool, id, patch) {
  const currentResult = await pool.query('SELECT * FROM finance_documents WHERE id = $1', [id]);
  if (currentResult.rows.length === 0) {
    throw new Error('Document not found');
  }

  const current = normalizeDoc(currentResult.rows[0]);
  const next = serializeDocForDb({
    ...current,
    ...patch,
    type: patch.type || patch.docType || current.type,
  });

  const result = await pool.query(`
    UPDATE finance_documents
    SET doc_no = $1,
        doc_type = $2,
        client_id = $3,
        event_id = $4,
        issue_date = $5,
        due_date = $6,
        valid_until = $7,
        status = $8,
        include_tax = $9,
        tax_rate = $10,
        lines = $11::jsonb,
        notes = $12,
        metadata = $13::jsonb,
        updated_at = now()
    WHERE id = $14
    RETURNING *
  `, [
    next.docNo,
    next.docType,
    next.clientId,
    next.eventId,
    next.issueDate,
    next.dueDate,
    next.validUntil,
    next.status,
    next.includeTax,
    next.taxRate,
    JSON.stringify(next.lines),
    next.notes,
    JSON.stringify(next.metadata),
    id,
  ]);

  return normalizeDoc(result.rows[0]);
}

async function convertQuoteToInvoice(pool, quoteId) {
  const quoteResult = await pool.query('SELECT * FROM finance_documents WHERE id = $1', [quoteId]);
  if (quoteResult.rows.length === 0) {
    throw new Error('Quote not found');
  }

  const quote = normalizeDoc(quoteResult.rows[0]);
  if (quote.type !== 'quote') {
    throw new Error('Document is not a quotation');
  }

  await pool.query('UPDATE finance_documents SET status = $1, updated_at = now() WHERE id = $2', ['accepted', quoteId]);

  const invoice = await createFinanceDocument(pool, {
    ...quote,
    type: 'invoice',
    docNo: '',
    issueDate: toYMD(new Date()),
    dueDate: toYMD(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    validUntil: '',
    status: 'sent',
  });

  return invoice;
}

async function nextDocNo(pool, type) {
  const prefix = type === 'invoice' ? 'FP-INV' : 'FP-QTE';
  const year = new Date().getFullYear();
  const result = await pool.query(`
    SELECT COALESCE(MAX(CAST(split_part(doc_no, '-', 3) AS INTEGER)), 0) + 1 AS next_no
    FROM finance_documents
    WHERE doc_no LIKE $1 || '-${year}-%'
  `, [prefix]);
  return `${prefix}-${year}-${String(result.rows[0].next_no).padStart(3, '0')}`;
}
