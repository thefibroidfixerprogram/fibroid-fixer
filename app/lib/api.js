// Data layer used by every page. Pages only ever call `api.*`.
// Right now this is a SAMPLE implementation that keeps made-up data in the browser,
// and applies the same permission rules the real database will enforce.
// When Supabase is connected, these functions are re-pointed at Supabase and Edge Functions
// with the same names and return shapes, so the pages do not change.

const STORE_KEY = 'ffp-sample-v2';
const HOUR = 3600e3, DAY = 24 * HOUR;
const ZOOM_RELEASE_HOURS = 48;

export const PERMISSIONS = [
  { key: 'manage_classes', label: 'Create and edit classes', help: 'Add classes, change dates, publish, close or cancel them.' },
  { key: 'manage_roster', label: 'Manage class lists', help: 'Add a student late, move a student to another class, remove a student.' },
  { key: 'view_roster_contact', label: 'See student contact details', help: 'Names, emails, phone numbers and whether intake is complete (yes or no).' },
  { key: 'view_payments', label: 'See payments', help: 'Amounts paid, receipts and totals.' },
  { key: 'view_intake_answers', label: 'See intake answers', help: 'The private health survey answers. Only turn this on for people who truly need it.' },
];
const ASSISTANT_DEFAULTS = { manage_classes: true, manage_roster: true, view_roster_contact: true, view_payments: false, view_intake_answers: false };
const OWNER_PERMS = { manage_classes: true, manage_roster: true, view_roster_contact: true, view_payments: true, view_intake_answers: true, manage_team: true, manage_settings: true };

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
const clone = v => JSON.parse(JSON.stringify(v));
const nowISO = () => new Date().toISOString();

function seed() {
  // Sample weekends: first day 4:00 PM, then two mornings at 9:00 AM (viewer's local time).
  const weekend = (daysFromToday) => [[0, 16], [1, 9], [2, 9]].map(([d, h]) => {
    const s = new Date(); s.setHours(0, 0, 0, 0); s.setDate(s.getDate() + daysFromToday + d); s.setHours(h);
    return { id: uid(), starts_at: s.toISOString(), ends_at: new Date(s.getTime() + 2.5 * HOUR).toISOString() };
  });
  const people = [
    ['u-owner', 'Brother Long (sample)', 'owner@example.com', ''],
    ['u-assistant', 'Sample Assistant', 'assistant@example.com', ''],
    ['u-student', 'Jordan Sample', 'student@example.com', '555-0100'],
    ['u-s1', 'Alicia Example', 'alicia@example.com', '555-0101'],
    ['u-s2', 'Bria Example', 'bria@example.com', ''],
    ['u-s3', 'Carmen Example', 'carmen@example.com', '555-0103'],
    ['u-s4', 'Dana Example', 'dana@example.com', ''],
    ['u-s5', 'Erin Example', 'erin@example.com', '555-0105'],
    ['u-s6', 'Faith Example', 'faith@example.com', ''],
    ['u-s7', 'Gina Example', 'gina@example.com', '555-0107'],
  ];
  const profiles = Object.fromEntries(people.map(([id, full_name, email, phone]) => [id, { id, full_name, email, phone, created_at: nowISO() }]));
  const base = { title: 'The Fibroid Fixer Program', description: '', capacity: 20, price_min: 18000, price_max: 48000, price_suggested: 18000, notes: '', created_by: 'u-owner', created_at: nowISO(), updated_at: nowISO() };
  const classes = [
    { ...base, id: 'c-soon', status: 'published', sessions: weekend(1) },
    { ...base, id: 'c-next', status: 'published', sessions: weekend(30) },
    { ...base, id: 'c-draft', status: 'draft', sessions: weekend(58) },
    { ...base, id: 'c-past', status: 'completed', sessions: weekend(-45) },
  ];
  const registrations = [], payments = [], intake = {}, consents = {};
  const reg = (class_id, user_id, { amount = 18000, source = 'stripe', intakeDone = false, status } = {}) => {
    const id = uid();
    registrations.push({ id, class_id, user_id, status: status || (source === 'manual' ? 'manual' : 'paid'), source, added_by: source === 'manual' ? 'u-assistant' : null, intake_completed_at: intakeDone ? nowISO() : null, consent_completed_at: intakeDone ? nowISO() : null, zoom_sent_at: null, zoom_links: [], created_at: nowISO() });
    if (source === 'stripe') payments.push({ id: uid(), registration_id: id, user_id, amount_cents: amount, currency: 'usd', status: 'paid', receipt_url: '#sample-receipt', invoice_pdf_url: '#sample-invoice', paid_at: new Date(Date.now() - 5 * DAY).toISOString(), refunded_at: null });
    if (intakeDone) { intake[id] = { answers: { age: '41', diagnosed: 'Yes' }, submitted_at: nowISO(), updated_at: nowISO(), survey_version: '1' }; consents[id] = { choices: {}, name: profiles[user_id].full_name, signature: profiles[user_id].full_name, contact: profiles[user_id].email, signed_at: nowISO(), form_version: '1' }; }
    return id;
  };
  reg('c-soon', 'u-student', { amount: 25000 });
  reg('c-soon', 'u-s1', { intakeDone: true });
  reg('c-soon', 'u-s2', { amount: 30000, intakeDone: true });
  reg('c-soon', 'u-s3', { source: 'manual' });
  reg('c-soon', 'u-s4', { amount: 18000, intakeDone: true });
  reg('c-next', 'u-s5', { amount: 48000, intakeDone: true });
  reg('c-next', 'u-s6');
  reg('c-past', 'u-student', { amount: 18000, intakeDone: true });
  reg('c-past', 'u-s7', { amount: 22000, intakeDone: true });
  return {
    version: 1, currentUserId: null,
    profiles,
    staff: {
      'u-owner': { user_id: 'u-owner', role: 'owner', perms: OWNER_PERMS, invited_by: null, created_at: nowISO() },
      'u-assistant': { user_id: 'u-assistant', role: 'assistant', perms: ASSISTANT_DEFAULTS, invited_by: 'u-owner', created_at: nowISO() },
    },
    invites: [],
    classes, registrations, payments, intake, consents,
    audit: [{ id: uid(), actor: 'u-owner', action: 'Added assistant', target: 'Sample Assistant', details: '', created_at: nowISO() }],
    settings: { price_min: 18000, price_max: 48000, price_suggested: 18000, default_capacity: 20, sender_name: 'The Fibroid Fixer', afford_line: '', refund_policy: '', stripe_connected: false, zoom_connected: false },
  };
}

let memory = null;
function load() {
  if (memory) return memory;
  try { const raw = localStorage.getItem(STORE_KEY); if (raw) memory = JSON.parse(raw); } catch { /* storage blocked: keep in memory */ }
  if (!memory || memory.version !== 1) memory = seed();
  return memory;
}
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(memory)); } catch { /* ignore */ } }
const delay = (v) => new Promise(r => setTimeout(() => r(clone(v)), 120));
const fail = (message) => Promise.reject(new Error(message));

// ---- internal rules (mirror what the database will enforce) ----
const ACTIVE = ['pending_payment', 'paid', 'manual'];
const me = () => { const s = load(); return s.currentUserId ? s.profiles[s.currentUserId] : null; };
const myStaffRec = () => { const s = load(); return s.currentUserId ? s.staff[s.currentUserId] || null : null; };
const can = perm => !!myStaffRec()?.perms?.[perm];
const need = perm => { if (!can(perm)) throw new Error('You do not have permission to do that.'); };
const classById = id => load().classes.find(c => c.id === id);
const firstStart = c => c.sessions.length ? new Date(c.sessions[0].starts_at).getTime() : Infinity;
const lastEnd = c => c.sessions.length ? new Date(c.sessions[c.sessions.length - 1].ends_at).getTime() : -Infinity;
const activeRegs = classId => load().registrations.filter(r => r.class_id === classId && ACTIVE.includes(r.status));
const seatsLeft = c => Math.max(0, c.capacity - activeRegs(c.id).length);
function audit(action, target, details = '') {
  load().audit.unshift({ id: uid(), actor: load().currentUserId, action, target, details, created_at: nowISO() });
}
function nameOf(userId) { return load().profiles[userId]?.full_name || load().profiles[userId]?.email || 'Unknown'; }

// Stand-in for the scheduled Zoom job: release personal links 48 hours before the first session.
function runZoomJob() {
  const s = load(); let changed = false;
  for (const r of s.registrations) {
    if (!['paid', 'manual'].includes(r.status) || r.zoom_sent_at) continue;
    const c = classById(r.class_id);
    if (!c || c.status === 'cancelled') continue;
    if (firstStart(c) - Date.now() <= ZOOM_RELEASE_HOURS * HOUR) {
      r.zoom_links = c.sessions.map(sess => ({ session_id: sess.id, url: '#sample-zoom-link' }));
      r.zoom_sent_at = nowISO(); changed = true;
    }
  }
  // Classes whose last session has ended become "completed".
  for (const c of s.classes) if (['published', 'full', 'closed'].includes(c.status) && lastEnd(c) < Date.now()) { c.status = 'completed'; changed = true; }
  if (changed) save();
}

function publicClass(c) {
  const left = seatsLeft(c);
  return { id: c.id, title: c.title, description: c.description, sessions: c.sessions.map(({ id, starts_at, ends_at }) => ({ id, starts_at, ends_at })), capacity: c.capacity, seats_left: left, price_min: c.price_min, price_max: c.price_max, price_suggested: c.price_suggested, status: left === 0 && c.status === 'published' ? 'full' : c.status };
}

function studentRegistration(r) {
  const c = classById(r.class_id);
  const s = load();
  const p = s.payments.find(x => x.registration_id === r.id);
  return {
    id: r.id, status: r.status, class: publicClass(c),
    first_session_at: c.sessions[0]?.starts_at, last_session_end: c.sessions[c.sessions.length - 1]?.ends_at,
    intake_completed_at: r.intake_completed_at, consent_completed_at: r.consent_completed_at,
    intake_locked: Date.now() >= firstStart(c),
    zoom_sent_at: r.zoom_sent_at, zoom_links: r.zoom_links,
    zoom_release_at: new Date(firstStart(c) - ZOOM_RELEASE_HOURS * HOUR).toISOString(),
    amount_cents: p?.amount_cents ?? null,
  };
}

export const api = {
  sample: true,

  // ---------- auth ----------
  async currentUser() { return delay(me()); },
  async myStaff() { return delay(myStaffRec()); },
  async signInWithEmail(email) {
    email = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Please enter a valid email address, such as you@example.com.');
    return delay({ sent: true, email });
  },
  // Sample only: pretend the emailed link was clicked.
  async sampleCompleteEmailSignIn(email) {
    const s = load();
    let profile = Object.values(s.profiles).find(p => p.email === email);
    if (!profile) { profile = { id: uid(), full_name: '', email, phone: '', created_at: nowISO() }; s.profiles[profile.id] = profile; }
    s.currentUserId = profile.id; save();
    return delay(profile);
  },
  async signInWithGoogle() { const s = load(); s.currentUserId = 'u-student'; save(); return delay({ ok: true }); },
  async signOut() { const s = load(); s.currentUserId = null; save(); return delay({ ok: true }); },
  async updateProfile({ full_name, phone }) {
    const p = me(); if (!p) return fail('Please sign in.');
    if (!String(full_name || '').trim()) return fail('Please enter your full name.');
    p.full_name = String(full_name).trim().slice(0, 120); p.phone = String(phone || '').trim().slice(0, 40); save();
    return delay(p);
  },
  async sampleSwitchRole(role) {
    const s = load();
    s.currentUserId = { visitor: null, student: 'u-student', owner: 'u-owner', assistant: 'u-assistant' }[role] ?? null;
    save(); return delay({ ok: true });
  },
  async sampleReset() { memory = seed(); save(); return delay({ ok: true }); },

  // ---------- public ----------
  async listPublicClasses() {
    runZoomJob();
    const list = load().classes.filter(c => ['published', 'full'].includes(c.status) && firstStart(c) > Date.now()).sort((a, b) => firstStart(a) - firstStart(b)).map(publicClass);
    return delay(list);
  },
  async getPublicClass(id) {
    const c = classById(id);
    if (!c || !['published', 'full'].includes(c.status)) return delay(null);
    return delay(publicClass(c));
  },
  async getPublicSettings() { const { price_min, price_max, price_suggested, afford_line, refund_policy } = load().settings; return delay({ price_min, price_max, price_suggested, afford_line, refund_policy }); },

  // ---------- registration + payment ----------
  // Real version: an Edge Function holds a seat and returns a Stripe Checkout URL.
  // Sample version: records a paid registration at the chosen amount and goes straight to the welcome page.
  async startCheckout(classId, { amount_cents } = {}) {
    const user = me(); if (!user) return fail('Please sign in first.');
    const c = classById(classId);
    if (!c || c.status !== 'published' || firstStart(c) <= Date.now()) return fail('Registration for this class is closed.');
    if (activeRegs(classId).some(r => r.user_id === user.id)) return fail('You are already registered for this class.');
    if (seatsLeft(c) <= 0) return fail('Sorry — this class just filled up.');
    const amount = Math.round(Number(amount_cents ?? c.price_suggested));
    if (!(amount >= c.price_min && amount <= c.price_max)) return fail('Please choose an amount within the sliding scale.');
    const s = load(); const id = uid();
    s.registrations.push({ id, class_id: classId, user_id: user.id, status: 'paid', source: 'stripe', added_by: null, intake_completed_at: null, consent_completed_at: null, zoom_sent_at: null, zoom_links: [], created_at: nowISO() });
    s.payments.push({ id: uid(), registration_id: id, user_id: user.id, amount_cents: amount, currency: 'usd', status: 'paid', receipt_url: '#sample-receipt', invoice_pdf_url: '#sample-invoice', paid_at: nowISO(), refunded_at: null });
    save(); runZoomJob();
    return delay({ registration_id: id });
  },

  // ---------- student ----------
  async myRegistrations() {
    runZoomJob();
    const user = me(); if (!user) return fail('Please sign in.');
    const list = load().registrations.filter(r => r.user_id === user.id && r.status !== 'cancelled').map(studentRegistration).sort((a, b) => new Date(a.first_session_at) - new Date(b.first_session_at));
    return delay(list);
  },
  async getMyRegistration(id) {
    runZoomJob();
    const user = me(); const r = load().registrations.find(x => x.id === id && x.user_id === user?.id);
    return delay(r ? studentRegistration(r) : null);
  },
  async myPayments() {
    const user = me(); if (!user) return fail('Please sign in.');
    const s = load();
    return delay(s.payments.filter(p => p.user_id === user.id).map(p => { const r = s.registrations.find(x => x.id === p.registration_id); return { ...p, class: publicClass(classById(r.class_id)) }; }).sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at)));
  },
  async getIntake(registrationId) {
    const user = me(); const r = load().registrations.find(x => x.id === registrationId && x.user_id === user?.id);
    if (!r) return fail('Registration not found.');
    return delay({ intake: load().intake[registrationId] || null, consent: load().consents[registrationId] || null });
  },
  async saveIntake(registrationId, answers, { submit = false } = {}) {
    const user = me(); const r = load().registrations.find(x => x.id === registrationId && x.user_id === user?.id);
    if (!r) return fail('Registration not found.');
    if (Date.now() >= firstStart(classById(r.class_id))) return fail('Your class has started, so the intake can no longer be changed.');
    const s = load(); const prev = s.intake[registrationId];
    s.intake[registrationId] = { answers, survey_version: '1', updated_at: nowISO(), submitted_at: submit ? nowISO() : prev?.submitted_at || null };
    if (submit && !r.intake_completed_at) r.intake_completed_at = nowISO();
    save(); return delay({ ok: true, saved_at: s.intake[registrationId].updated_at });
  },
  async saveConsent(registrationId, consent) {
    const user = me(); const r = load().registrations.find(x => x.id === registrationId && x.user_id === user?.id);
    if (!r) return fail('Registration not found.');
    if (Date.now() >= firstStart(classById(r.class_id))) return fail('Your class has started, so this form can no longer be changed.');
    if (!String(consent.signature || '').trim()) return fail('Please type your full name as your signature.');
    load().consents[registrationId] = { ...consent, signed_at: nowISO(), form_version: '1' };
    r.consent_completed_at = nowISO(); save();
    return delay({ ok: true });
  },

  // ---------- admin ----------
  async adminDashboard() {
    runZoomJob();
    if (!myStaffRec()) return fail('Staff only.');
    const s = load();
    const upcoming = s.classes.filter(c => !['completed', 'cancelled'].includes(c.status)).sort((a, b) => firstStart(a) - firstStart(b)).map(c => {
      const regs = activeRegs(c.id);
      return { ...publicClass(c), filled: regs.length, intake_done: regs.filter(r => r.intake_completed_at).length, zoom_sent: regs.filter(r => r.zoom_sent_at).length, zoom_due: firstStart(c) - Date.now() <= ZOOM_RELEASE_HOURS * HOUR };
    });
    const alerts = [];
    for (const c of upcoming) {
      const missing = c.filled - c.intake_done;
      if (c.status !== 'draft' && missing > 0 && firstStart(classById(c.id)) - Date.now() <= 72 * HOUR) alerts.push({ level: 'action', text: `${missing} ${missing === 1 ? 'student hasn’t' : 'students haven’t'} completed intake for the class starting ${c.sessions[0] ? new Date(c.sessions[0].starts_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric' }) : ''}.`, href: `#/class/${c.id}` });
    }
    if (!s.settings.zoom_connected) alerts.push({ level: 'info', text: 'Zoom isn’t connected yet, so Zoom links can’t be created automatically.', href: myStaffRec().role === 'owner' ? '#/settings' : null });
    if (!s.settings.stripe_connected) alerts.push({ level: 'info', text: 'Stripe isn’t connected yet, so the site can’t take payments.', href: myStaffRec().role === 'owner' ? '#/settings' : null });
    return delay({ upcoming, alerts });
  },
  async adminListClasses() {
    if (!myStaffRec()) return fail('Staff only.');
    return delay(load().classes.slice().sort((a, b) => firstStart(b) - firstStart(a)).map(c => ({ ...publicClass(c), filled: activeRegs(c.id).length })));
  },
  async adminGetClass(id) {
    if (!myStaffRec()) return fail('Staff only.');
    const c = classById(id); return delay(c ? { ...c, seats_left: seatsLeft(c), filled: activeRegs(c.id).length } : null);
  },
  async getDefaults() { const { price_min, price_max, price_suggested, default_capacity } = load().settings; return delay({ price_min, price_max, price_suggested, capacity: default_capacity }); },
  async saveClass(input) {
    need('manage_classes');
    const sessions = (input.sessions || []).filter(x => x.starts_at && x.ends_at).sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
    if (!String(input.title || '').trim()) return fail('Please give the class a name.');
    if (input.status === 'published' && !sessions.length) return fail('Add at least one session date before publishing.');
    if (sessions.some(x => new Date(x.ends_at) <= new Date(x.starts_at))) return fail('Each session must end after it starts.');
    const capacity = Math.round(Number(input.capacity));
    if (!(capacity >= 1 && capacity <= 500)) return fail('Seats must be a number from 1 to 500.');
    const { price_min, price_max, price_suggested } = input;
    if (!(price_min > 0 && price_max >= price_min && price_suggested >= price_min && price_suggested <= price_max)) return fail('Check the prices: the suggested amount must be between the lowest and highest amounts.');
    const s = load();
    let c = input.id ? classById(input.id) : null;
    if (c && capacity < activeRegs(c.id).length) return fail(`This class already has ${activeRegs(c.id).length} students, so seats can’t be lower than that.`);
    const fields = { title: String(input.title).trim().slice(0, 140), description: String(input.description || '').slice(0, 2000), capacity, price_min, price_max, price_suggested, notes: String(input.notes || '').slice(0, 2000), status: input.status, sessions: sessions.map(x => ({ id: x.id || uid(), starts_at: x.starts_at, ends_at: x.ends_at })), updated_at: nowISO() };
    if (c) { Object.assign(c, fields); audit(input.status === 'published' ? 'Updated and published class' : 'Updated class', c.title, dateRangeText(c)); }
    else { c = { id: uid(), created_by: s.currentUserId, created_at: nowISO(), ...fields }; s.classes.push(c); audit(c.status === 'published' ? 'Created and published class' : 'Created draft class', c.title, dateRangeText(c)); }
    save(); return delay({ id: c.id });
  },
  async setClassStatus(id, status) {
    need('manage_classes');
    const c = classById(id); if (!c) return fail('Class not found.');
    if (status === 'published' && !c.sessions.length) return fail('Add at least one session date before publishing.');
    c.status = status; c.updated_at = nowISO();
    if (status === 'cancelled') audit('Cancelled class', c.title, dateRangeText(c)); else audit(`Set class to ${status}`, c.title, dateRangeText(c));
    save(); return delay({ ok: true });
  },
  async roster(classId) {
    runZoomJob();
    if (!can('view_roster_contact') && !can('manage_roster')) return fail('You do not have permission to see this class list.');
    const s = load(); const showPay = can('view_payments'); const showContact = can('view_roster_contact');
    const rows = s.registrations.filter(r => r.class_id === classId && r.status !== 'cancelled').map(r => {
      const p = s.profiles[r.user_id]; const pay = s.payments.find(x => x.registration_id === r.id);
      const row = { registration_id: r.id, user_id: r.user_id, name: p.full_name || p.email, email: showContact ? p.email : '', phone: showContact ? p.phone : '', status: r.status, source: r.source, intake_done: !!r.intake_completed_at, consent_done: !!r.consent_completed_at, zoom_sent: !!r.zoom_sent_at };
      if (showPay) row.amount_cents = pay?.amount_cents ?? null;
      return row;
    }).sort((a, b) => a.name.localeCompare(b.name));
    return delay({ rows, can_see_amounts: showPay, can_manage: can('manage_roster') });
  },
  async addStudent(classId, { full_name, email, phone, payment }) {
    need('manage_roster');
    email = String(email || '').trim().toLowerCase();
    if (!String(full_name || '').trim()) return fail('Please enter the student’s name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Please enter a valid email address.');
    const c = classById(classId); if (!c) return fail('Class not found.');
    const s = load();
    let p = Object.values(s.profiles).find(x => x.email === email);
    if (!p) { p = { id: uid(), full_name: String(full_name).trim(), email, phone: String(phone || '').trim(), created_at: nowISO() }; s.profiles[p.id] = p; }
    if (activeRegs(classId).some(r => r.user_id === p.id)) return fail('That student is already in this class.');
    if (seatsLeft(c) <= 0) return fail('This class is full. Raise the number of seats first, or move someone out.');
    const status = payment === 'link' ? 'pending_payment' : 'manual';
    s.registrations.push({ id: uid(), class_id: classId, user_id: p.id, status, source: 'manual', added_by: s.currentUserId, payment_note: payment, intake_completed_at: null, consent_completed_at: null, zoom_sent_at: null, zoom_links: [], created_at: nowISO() });
    audit('Added student', p.full_name, `${{ outside: 'Paid outside the site', comp: 'Complimentary', link: 'Payment link sent' }[payment] || ''} · ${dateRangeText(c)}`);
    save(); runZoomJob();
    return delay({ ok: true, message: payment === 'link' ? `${p.full_name} was added and will be emailed a payment link.` : `${p.full_name} was added and will get a welcome email with the next steps.` });
  },
  async moveStudent(registrationId, toClassId) {
    need('manage_roster');
    const s = load(); const r = s.registrations.find(x => x.id === registrationId); const to = classById(toClassId);
    if (!r || !to) return fail('Not found.');
    if (activeRegs(toClassId).some(x => x.user_id === r.user_id)) return fail('That student is already in the other class.');
    if (seatsLeft(to) <= 0) return fail('The other class is full.');
    const from = classById(r.class_id);
    r.class_id = toClassId; r.zoom_sent_at = null; r.zoom_links = [];
    audit('Moved student', nameOf(r.user_id), `${dateRangeText(from)} → ${dateRangeText(to)}`);
    save(); runZoomJob(); return delay({ ok: true });
  },
  async removeStudent(registrationId, { freeSeat = true } = {}) {
    need('manage_roster');
    const s = load(); const r = s.registrations.find(x => x.id === registrationId);
    if (!r) return fail('Not found.');
    r.status = 'cancelled'; r.seat_kept = !freeSeat; r.zoom_links = [];
    audit('Removed student', nameOf(r.user_id), freeSeat ? 'Seat freed' : 'Seat kept closed');
    save(); return delay({ ok: true });
  },
  async resendZoom(registrationId) {
    need('manage_roster');
    const r = load().registrations.find(x => x.id === registrationId);
    if (!r?.zoom_sent_at) return fail('Zoom links haven’t been released for this student yet. They go out automatically 48 hours before class.');
    audit('Resent Zoom link', nameOf(r.user_id)); save();
    return delay({ ok: true });
  },
  async studentDetail(userId) {
    if (!can('view_roster_contact')) return fail('You do not have permission to see student details.');
    const s = load(); const p = s.profiles[userId]; if (!p) return fail('Student not found.');
    const regs = s.registrations.filter(r => r.user_id === userId).map(r => {
      const c = classById(r.class_id); const pay = s.payments.find(x => x.registration_id === r.id);
      return { id: r.id, status: r.status, source: r.source, class: publicClass(c), intake_done: !!r.intake_completed_at, consent_done: !!r.consent_completed_at, zoom_sent: !!r.zoom_sent_at,
        intake: can('view_intake_answers') ? (s.intake[r.id] || null) : undefined,
        consent: can('view_intake_answers') ? (s.consents[r.id] || null) : undefined,
        payment: can('view_payments') ? (pay || null) : undefined };
    });
    return delay({ profile: p, registrations: regs, can_see_intake: can('view_intake_answers'), can_see_payments: can('view_payments') });
  },
  async listPayments() {
    need('view_payments');
    const s = load();
    const rows = s.payments.map(p => { const r = s.registrations.find(x => x.id === p.registration_id); const c = classById(r.class_id); return { ...p, student: nameOf(p.user_id), class: publicClass(c) }; }).sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at));
    return delay(rows);
  },
  async listTeam() {
    need('manage_team');
    const s = load();
    return delay({ staff: Object.values(s.staff).map(x => ({ ...x, name: nameOf(x.user_id), email: s.profiles[x.user_id]?.email })), invites: s.invites });
  },
  async inviteStaff(email, perms) {
    need('manage_team');
    email = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Please enter a valid email address.');
    const s = load();
    const existing = Object.values(s.profiles).find(p => p.email === email);
    if (existing && s.staff[existing.id]) return fail('That person is already on the team.');
    const clean = Object.fromEntries(PERMISSIONS.map(p => [p.key, !!perms[p.key]]));
    if (existing) s.staff[existing.id] = { user_id: existing.id, role: 'assistant', perms: clean, invited_by: s.currentUserId, created_at: nowISO() };
    else s.invites = [...s.invites.filter(i => i.email !== email), { email, perms: clean, invited_at: nowISO() }];
    audit('Invited assistant', email); save();
    return delay({ ok: true });
  },
  async updateStaff(userId, perms) {
    need('manage_team');
    const st = load().staff[userId]; if (!st || st.role === 'owner') return fail('The owner’s access can’t be changed here.');
    const before = st.perms;
    st.perms = Object.fromEntries(PERMISSIONS.map(p => [p.key, !!perms[p.key]]));
    const changes = PERMISSIONS.filter(p => before[p.key] !== st.perms[p.key]).map(p => `${p.label}: ${st.perms[p.key] ? 'on' : 'off'}`).join(', ');
    audit('Changed permissions', nameOf(userId), changes); save();
    return delay({ ok: true });
  },
  async removeStaff(userId) {
    need('manage_team');
    const s = load(); if (s.staff[userId]?.role === 'owner') return fail('The owner can’t be removed.');
    delete s.staff[userId]; audit('Removed team access', nameOf(userId)); save();
    return delay({ ok: true });
  },
  async cancelInvite(email) { need('manage_team'); const s = load(); s.invites = s.invites.filter(i => i.email !== email); audit('Cancelled invitation', email); save(); return delay({ ok: true }); },
  async getSettings() { need('manage_settings'); return delay(load().settings); },
  async saveSettings(input) {
    need('manage_settings');
    const st = load().settings;
    const { price_min, price_max, price_suggested } = input;
    if (!(price_min > 0 && price_max >= price_min && price_suggested >= price_min && price_suggested <= price_max)) return fail('Check the prices: the suggested amount must be between the lowest and highest amounts.');
    Object.assign(st, { price_min, price_max, price_suggested, default_capacity: Math.max(1, Math.round(Number(input.default_capacity) || 20)), sender_name: String(input.sender_name || '').slice(0, 80), afford_line: String(input.afford_line || '').slice(0, 300), refund_policy: String(input.refund_policy || '').slice(0, 3000) });
    audit('Changed settings', 'Settings'); save();
    return delay({ ok: true });
  },
  async auditLog() {
    if (!myStaffRec()) return fail('Staff only.');
    return delay(load().audit.slice(0, 100).map(a => ({ ...a, actor_name: nameOf(a.actor) })));
  },
  can: perm => can(perm),
};

function dateRangeText(c) {
  if (!c?.sessions?.length) return 'no dates yet';
  return new Date(c.sessions[0].starts_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
