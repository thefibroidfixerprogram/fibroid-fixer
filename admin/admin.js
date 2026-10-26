// Admin area for Brother Long and assistants. One page, with screens chosen by the address hash:
// #/ dashboard · #/classes · #/classes/new · #/class/ID · #/class/ID/edit · #/student/ID · #/payments · #/team · #/settings · #/activity
import { api, PERMISSIONS } from '../app/lib/api.js';
import { renderChrome, link, esc, $, $$, money, dateRange, formatDate, formatDateTime, timeZoneLabel, sessionListHTML, requireSignIn, toast, openDialog, confirmDialog, downloadFile, wave } from '../app/lib/core.js';
import { classCardHTML } from '../app/lib/class-card.js';
import { answersReadonlyHTML, consentReadonlyHTML } from '../app/lib/intake-forms.js';

const main = $('#main');
const { user, staff } = await renderChrome({ active: 'admin' });

const P = perm => !!staff?.perms?.[perm];
const view = () => $('#view');
const dollars = cents => (cents / 100).toFixed(0);
const toCents = v => Math.round(Number(v) * 100);
const statusPill = s => ({ draft: '<span class="status-pill pill-muted">Draft</span>', published: '<span class="status-pill pill-success">Open for registration</span>', full: '<span class="status-pill pill-warn">Full</span>', closed: '<span class="status-pill pill-muted">Registration closed</span>', cancelled: '<span class="status-pill pill-danger">Cancelled</span>', completed: '<span class="status-pill pill-muted">Completed</span>' }[s] || esc(s));
const yesNo = (v, label) => v ? `<span class="yes" aria-label="${label}: yes">✓</span>` : `<span class="no" aria-label="${label}: no">✗</span>`;

function navHTML(current) {
  const item = (href, label, key) => `<a href="${href}"${current === key ? ' aria-current="page"' : ''}>${label}</a>`;
  return [
    item('#/', 'Dashboard', 'dashboard'),
    item('#/classes', 'Classes', 'classes'),
    P('view_payments') ? item('#/payments', 'Payments', 'payments') : '',
    staff.role === 'owner' ? '<span class="nav-section">Owner</span>' : '',
    P('manage_team') ? item('#/team', 'Team', 'team') : '',
    P('manage_settings') ? item('#/settings', 'Settings', 'settings') : '',
    item('#/activity', 'Activity log', 'activity'),
  ].join('');
}

async function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const [a, b, c] = parts;
  const key = !a ? 'dashboard' : a === 'class' || a === 'classes' ? 'classes' : a === 'student' ? 'classes' : a;
  $('#admin-nav').innerHTML = navHTML(key);
  view().innerHTML = '<p role="status" class="small">Loading…</p>';
  try {
    if (!a) await dashboard();
    else if (a === 'classes' && b === 'new') await classForm(null);
    else if (a === 'classes') await classes();
    else if (a === 'class' && c === 'edit') await classForm(b);
    else if (a === 'class') await classDetail(b);
    else if (a === 'student') await studentDetail(b);
    else if (a === 'payments') await payments();
    else if (a === 'team') await team();
    else if (a === 'settings') await settings();
    else if (a === 'activity') await activity();
    else view().innerHTML = '<h2>Page not found.</h2>';
  } catch (err) {
    view().innerHTML = `<div class="alert alert-danger"><span class="alert-icon" aria-hidden="true">!</span><p>${esc(err.message)}</p></div>`;
  }
  view().focus({ preventScroll: true });
  if (parts.length || location.hash) scrollTo({ top: $('#admin-nav').getBoundingClientRect().top + scrollY - 110 });
  main.querySelectorAll('a[href^="#sample"]').forEach(x => x.addEventListener('click', e => { e.preventDefault(); toast('Preview: in the live site this opens the real link.'); }));
}

// ---------- Dashboard ----------
async function dashboard() {
  const { upcoming, alerts } = await api.adminDashboard();
  const live = upcoming.filter(c => c.status !== 'draft');
  const students = live.reduce((n, c) => n + c.filled, 0);
  const intake = live.reduce((n, c) => n + c.intake_done, 0);
  view().innerHTML = `<div class="stack-lg">
    <div class="row-between"><h2>Dashboard</h2>${P('manage_classes') ? '<a class="button button-yellow button-small" href="#/classes/new">Add a class <span aria-hidden="true">↗</span></a>' : ''}</div>
    ${alerts.length ? `<div class="stack">${alerts.map(al => `<div class="alert ${al.level === 'action' ? 'alert-action' : 'alert-info'}"><span class="alert-icon" aria-hidden="true">${al.level === 'action' ? '●' : 'ⓘ'}</span><p>${esc(al.text)} ${al.href ? `<a class="inline-link" href="${al.href}">${al.level === 'action' ? 'See who' : 'Open settings'}</a>` : ''}</p></div>`).join('')}</div>` : ''}
    <div class="stat-row">
      <div class="stat"><p class="stat-label">Upcoming classes</p><p class="stat-value">${live.length}</p><p class="stat-sub">${upcoming.length - live.length} draft</p></div>
      <div class="stat"><p class="stat-label">Students registered</p><p class="stat-value">${students}</p><p class="stat-sub">in upcoming classes</p></div>
      <div class="stat"><p class="stat-label">Intake complete</p><p class="stat-value">${intake} of ${students}</p><div class="meter" aria-hidden="true"><i data-w="${students ? Math.round(intake / students * 100) : 0}"></i></div></div>
      <div class="stat"><p class="stat-label">Zoom links sent</p><p class="stat-value">${live.reduce((n, c) => n + c.zoom_sent, 0)}</p><p class="stat-sub">sent automatically 48 hours before</p></div>
    </div>
    <section><h3>Upcoming classes</h3><div class="stack"><div></div>
      ${upcoming.length ? `<div class="list-card">${upcoming.map(classRow).join('')}</div>` : emptyClasses()}</div></section>
  </div>`;
  setMeters();
}

function classRow(c) {
  return `<div class="class-row">
    <div><h3><a href="#/class/${esc(c.id)}">${esc(dateRange(c.sessions))}</a></h3><p class="small">${esc(c.title)} · ${c.sessions.length} session${c.sessions.length === 1 ? '' : 's'}</p></div>
    <div><p class="small"><strong>${c.filled} of ${c.capacity}</strong> seats filled</p><div class="meter" aria-hidden="true"><i data-w="${Math.round(c.filled / c.capacity * 100)}"></i></div></div>
    <div class="small">${c.intake_done !== undefined ? `Intake ${c.intake_done} of ${c.filled}<br>${c.zoom_sent ? `Zoom sent to ${c.zoom_sent}` : c.zoom_due ? 'Zoom links due now' : 'Zoom links: 48h before'}` : ''}</div>
    <div class="row">${statusPill(c.status)}<a class="text-link" href="#/class/${esc(c.id)}">Open <span aria-hidden="true">↗</span></a></div>
  </div>`;
}
const emptyClasses = () => `<div class="empty-state"><h3>No classes yet.</h3><p>Add Brother Long’s first class weekend. It stays a draft until you publish it.</p>${P('manage_classes') ? '<a class="button button-yellow" href="#/classes/new">Add a class <span aria-hidden="true">↗</span></a>' : ''}</div>`;
// Meter widths are set from script so the page needs no inline styles (keeps the security policy strict).
const setMeters = () => $$('.meter>i[data-w]').forEach(i => { i.style.width = `${Math.min(100, Number(i.dataset.w))}%`; });

// ---------- Classes ----------
async function classes() {
  const list = await api.adminListClasses();
  const upcoming = list.filter(c => !['completed', 'cancelled'].includes(c.status)).reverse();
  const past = list.filter(c => ['completed', 'cancelled'].includes(c.status));
  view().innerHTML = `<div class="stack-lg">
    <div class="row-between"><h2>Classes</h2>${P('manage_classes') ? '<a class="button button-yellow button-small" href="#/classes/new">Add a class <span aria-hidden="true">↗</span></a>' : ''}</div>
    <section><h3>Upcoming and drafts</h3><div class="stack"><div></div>${upcoming.length ? `<div class="list-card">${upcoming.map(classRow).join('')}</div>` : emptyClasses()}</div></section>
    ${past.length ? `<section><h3>Past and cancelled</h3><div class="stack"><div></div><div class="list-card">${past.map(classRow).join('')}</div></div></section>` : ''}
  </div>`;
  setMeters();
}

async function classForm(id) {
  if (!P('manage_classes')) throw new Error('You do not have permission to create or edit classes.');
  const defaults = await api.getDefaults();
  const c = id ? await api.adminGetClass(id) : { title: 'The Fibroid Fixer Program', description: '', capacity: defaults.capacity, price_min: defaults.price_min, price_max: defaults.price_max, price_suggested: defaults.price_suggested, notes: '', status: 'draft', sessions: [] };
  if (!c) throw new Error('Class not found.');
  const pad = n => String(n).padStart(2, '0');
  const local = iso => { const d = new Date(iso); return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` }; };
  const sessionRow = (s = {}) => { const a = s.starts_at ? local(s.starts_at) : {}, b = s.ends_at ? local(s.ends_at) : {}; return `<div class="session-editor" data-session="${esc(s.id || '')}">
      <div class="field session-date"><label>Date<input class="input" type="date" name="date" value="${esc(a.date || '')}" required></label></div>
      <div class="field"><label>Starts<input class="input" type="time" name="start" value="${esc(a.time || '')}" step="900" required></label></div>
      <div class="field"><label>Ends<input class="input" type="time" name="end" value="${esc(b.time || '')}" step="900" required></label></div>
      <button type="button" class="button button-ghost button-small" data-remove-session aria-label="Remove this session">Remove</button></div>`; };
  const isLive = ['published', 'full'].includes(c.status);
  view().innerHTML = `<form id="class-form" class="stack-lg" novalidate>
    <div><a class="text-link" href="${id ? `#/class/${esc(id)}` : '#/classes'}">← Back</a><h2>${id ? 'Edit class' : 'Add a class'}</h2>${id ? statusPill(c.status) : '<p class="small">Fill this in, check the preview, then publish. It stays hidden from the website until you publish.</p>'}</div>
    <div class="grid-2 class-form-grid">
      <div class="stack-lg">
        <div class="card"><h3>About the class</h3><div class="stack"><div></div>
          <div class="field"><label for="f-title">Class name</label><input class="input" id="f-title" name="title" required maxlength="140" value="${esc(c.title)}"></div>
          <div class="field"><label for="f-desc">Short description <span class="muted">(optional, shown on the website)</span></label><textarea class="textarea" id="f-desc" name="description" maxlength="2000">${esc(c.description)}</textarea></div></div></div>
        <div class="card"><h3>Dates and times</h3><p class="small">Add one row for each live session (for example Friday, Saturday and Sunday). Times are in your time zone (${esc(timeZoneLabel())}). Students will see them in their own time zone.</p>
          <div id="sessions">${(c.sessions.length ? c.sessions : [{}]).map(sessionRow).join('')}</div>
          <button type="button" class="button button-ghost button-small" id="add-session">+ Add a session</button></div>
        <div class="card"><h3>Seats and price</h3><div class="stack"><div></div>
          <div class="field"><label for="f-cap">Number of seats</label><input class="input" id="f-cap" name="capacity" type="number" min="1" max="500" step="1" required value="${esc(c.capacity)}"></div>
          <div class="grid-3">
            <div class="field"><label for="f-min">Lowest amount ($)</label><input class="input" id="f-min" name="price_min" type="number" min="1" step="1" value="${dollars(c.price_min)}"></div>
            <div class="field"><label for="f-max">Highest amount ($)</label><input class="input" id="f-max" name="price_max" type="number" min="1" step="1" value="${dollars(c.price_max)}"></div>
            <div class="field"><label for="f-sug">Suggested ($)</label><input class="input" id="f-sug" name="price_suggested" type="number" min="1" step="1" value="${dollars(c.price_suggested)}"></div>
          </div><span class="hint">Students pay any amount in this range. The suggested amount is pre-filled on the payment page.</span></div></div>
        <div class="card"><h3>Private notes</h3><div class="field"><label for="f-notes">Notes for the team <span class="muted">(never shown to students)</span></label><textarea class="textarea" id="f-notes" name="notes" maxlength="2000">${esc(c.notes)}</textarea></div>
          <p class="small">Zoom meetings for each session are created automatically when the class is published.</p></div>
      </div>
      <div><div class="site-preview" aria-live="polite"><p class="preview-label">Preview · how it will look on the website</p><div id="preview"></div></div></div>
    </div>
    <p class="form-error" id="form-error" role="alert"></p>
    <div class="sticky-actions"><div class="row">
      ${isLive ? '<button class="button button-yellow" type="submit" value="published">Save changes <span aria-hidden="true">↗</span></button>' : '<button class="button button-yellow" type="submit" value="published">Publish to website <span aria-hidden="true">↗</span></button><button class="button button-ghost" type="submit" value="draft">Save as draft</button>'}
      <a class="text-link" href="${id ? `#/class/${esc(id)}` : '#/classes'}">Cancel</a></div></div>
  </form>`;

  const form = $('#class-form'), sessionsEl = $('#sessions');
  const read = () => {
    const sessions = $$('.session-editor', sessionsEl).map(row => {
      const date = row.querySelector('[name=date]').value, start = row.querySelector('[name=start]').value, end = row.querySelector('[name=end]').value;
      if (!date || !start || !end) return null;
      return { id: row.dataset.session || undefined, starts_at: new Date(`${date}T${start}`).toISOString(), ends_at: new Date(`${date}T${end}`).toISOString() };
    }).filter(Boolean);
    const f = new FormData(form);
    return { id, title: f.get('title'), description: f.get('description'), capacity: Number(f.get('capacity')), price_min: toCents(f.get('price_min')), price_max: toCents(f.get('price_max')), price_suggested: toCents(f.get('price_suggested')), notes: f.get('notes'), sessions };
  };
  const preview = () => { const d = read(); d.sessions.sort((x, y) => new Date(x.starts_at) - new Date(y.starts_at)); $('#preview').innerHTML = classCardHTML({ ...d, title: d.title || 'Class name', seats_left: (c.seats_left ?? d.capacity), capacity: d.capacity || 0, status: 'published' }, { action: 'preview', preview: true }); };
  form.addEventListener('input', preview);
  $('#add-session').addEventListener('click', () => { sessionsEl.insertAdjacentHTML('beforeend', sessionRow()); sessionsEl.lastElementChild.querySelector('input').focus(); });
  sessionsEl.addEventListener('click', e => { const b = e.target.closest('[data-remove-session]'); if (!b) return; if ($$('.session-editor', sessionsEl).length > 1) b.closest('.session-editor').remove(); else b.closest('.session-editor').querySelectorAll('input').forEach(i => { i.value = ''; }); preview(); });
  preview();
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const status = e.submitter?.value || 'draft';
    const err = $('#form-error'); err.textContent = '';
    const incomplete = $$('.session-editor', sessionsEl).some(r => { const vals = [...r.querySelectorAll('input')].map(i => i.value); return vals.some(Boolean) && !vals.every(Boolean); });
    if (incomplete) { err.textContent = 'One of the sessions is missing a date or time.'; return; }
    try {
      const { id: savedId } = await api.saveClass({ ...read(), status: status === 'published' ? 'published' : isLive ? c.status : 'draft' });
      toast(status === 'published' ? (isLive ? 'Changes saved.' : 'Published. The class now shows on the website.') : 'Saved as a draft. It isn’t on the website yet.');
      location.hash = `#/class/${savedId}`;
    } catch (x) { err.textContent = x.message; }
  });
}

async function classDetail(id) {
  const [c, roster, all] = await Promise.all([api.adminGetClass(id), api.roster(id), api.adminListClasses()]);
  if (!c) throw new Error('Class not found.');
  const rows = roster.rows;
  const amountsTotal = roster.can_see_amounts ? rows.reduce((n, r) => n + (r.amount_cents || 0), 0) : 0;
  const statusLabel = r => ({ paid: 'Paid online', manual: 'Added by team', pending_payment: 'Waiting for payment', refunded: 'Refunded' }[r.status] || r.status);
  const canEdit = P('manage_classes');
  view().innerHTML = `<div class="stack-lg">
    <div><a class="text-link" href="#/classes">← All classes</a></div>
    <div class="card-header"><div><h2>${esc(dateRange(c.sessions))}</h2><p class="small">${esc(c.title)}</p><div class="stack"><div></div>${statusPill(c.status)}</div></div>
      <div class="row">${canEdit ? `<a class="button button-ghost button-small" href="#/class/${esc(id)}/edit">Edit class</a>` : ''}
        ${canEdit && c.status === 'draft' ? '<button class="button button-yellow button-small" data-status="published">Publish <span aria-hidden="true">↗</span></button>' : ''}
        ${canEdit && ['published', 'full'].includes(c.status) ? '<button class="button button-ghost button-small" data-status="closed">Close registration</button>' : ''}
        ${canEdit && c.status === 'closed' ? '<button class="button button-ghost button-small" data-status="published">Reopen registration</button>' : ''}
        ${canEdit && !['cancelled', 'completed'].includes(c.status) ? '<button class="button button-danger button-small" data-status="cancelled">Cancel class</button>' : ''}</div></div>
    <div class="grid-2">
      <div class="card"><h3>Sessions</h3>${c.sessions.length ? sessionListHTML(c.sessions) : '<p class="small">No dates yet.</p>'}</div>
      <div class="card"><h3>At a glance</h3><dl class="class-details">
        <div><dt>Seats filled</dt><dd>${c.filled} of ${c.capacity}</dd></div>
        <div><dt>Intake complete</dt><dd>${rows.filter(r => r.intake_done).length} of ${rows.length}</dd></div>
        <div><dt>Zoom links sent</dt><dd>${rows.filter(r => r.zoom_sent).length} of ${rows.length}</dd></div>
        <div><dt>Sliding scale</dt><dd>${money(c.price_min)} – ${money(c.price_max)} (suggested ${money(c.price_suggested)})</dd></div>
        ${roster.can_see_amounts ? `<div><dt>Total paid</dt><dd>${money(amountsTotal)}</dd></div>` : ''}
      </dl>${c.notes ? `<p class="small"><strong>Notes:</strong> ${esc(c.notes)}</p>` : ''}</div>
    </div>
    <section><div class="row-between"><h3>Students (${rows.length})</h3><div class="row">
      ${roster.can_manage && !['cancelled', 'completed'].includes(c.status) ? '<button class="button button-yellow button-small" id="add-student">Add a student <span aria-hidden="true">↗</span></button>' : ''}
      <button class="button button-ghost button-small" id="export">Export list (CSV)</button></div></div>
      <div class="stack"><div></div>${rows.length ? `<div class="table-wrap"><table><caption class="visually-hidden">Students in this class</caption><thead><tr>
        <th scope="col">Name</th><th scope="col" class="hide-mobile">Email</th><th scope="col" class="hide-mobile">Phone</th><th scope="col">Status</th><th scope="col">Intake</th><th scope="col">Zoom</th>${roster.can_see_amounts ? '<th scope="col" class="num-cell">Paid</th>' : ''}${roster.can_manage ? '<th scope="col"><span class="visually-hidden">Actions</span></th>' : ''}</tr></thead><tbody>
        ${rows.map(r => `<tr><td><a class="inline-link" href="#/student/${esc(r.user_id)}">${esc(r.name)}</a></td><td class="hide-mobile">${esc(r.email)}</td><td class="hide-mobile nowrap">${esc(r.phone || "—")}</td>
          <td class="small">${esc(statusLabel(r))}</td><td>${yesNo(r.intake_done, 'Intake complete')}</td><td>${yesNo(r.zoom_sent, 'Zoom link sent')}</td>
          ${roster.can_see_amounts ? `<td class="num-cell">${r.amount_cents == null ? '—' : money(r.amount_cents)}</td>` : ''}
          ${roster.can_manage ? `<td><div class="row"><button class="text-link" data-move="${esc(r.registration_id)}" data-name="${esc(r.name)}">Move</button><button class="text-link" data-zoom="${esc(r.registration_id)}">Resend Zoom</button><button class="text-link" data-remove="${esc(r.registration_id)}" data-name="${esc(r.name)}">Remove</button></div></td>` : ''}</tr>`).join('')}
      </tbody></table></div>` : '<div class="empty-state"><h3>No students yet.</h3><p>Students appear here as soon as they pay. You can also add someone yourself.</p></div>'}</div></section>
  </div>`;

  $$('[data-status]').forEach(b => b.addEventListener('click', async () => {
    const s = b.dataset.status;
    const msg = { published: 'The class will show on the website and people can register.', closed: 'The class stays on the website but nobody new can register.', cancelled: 'The class will be removed from the website. Registered students will need to be contacted and refunded in Stripe. This can’t be undone here.' }[s];
    if (!(await confirmDialog({ title: { published: 'Publish this class?', closed: 'Close registration?', cancelled: 'Cancel this class?' }[s], body: msg, confirmLabel: { published: 'Publish', closed: 'Close registration', cancelled: 'Cancel class' }[s], danger: s === 'cancelled' }))) return;
    try { await api.setClassStatus(id, s); toast('Updated.'); route(); } catch (x) { toast(x.message); }
  }));
  $('#export').addEventListener('click', () => {
    const cell = v => { let s = String(v ?? ''); if (/^[=+\-@]/.test(s)) s = `'${s}`; return `"${s.replace(/"/g, '""')}"`; };
    const head = ['Name', 'Email', 'Phone', 'Status', 'Intake complete', 'Zoom link sent', ...(roster.can_see_amounts ? ['Amount paid'] : [])];
    const lines = rows.map(r => [r.name, r.email, r.phone, statusLabel(r), r.intake_done ? 'Yes' : 'No', r.zoom_sent ? 'Yes' : 'No', ...(roster.can_see_amounts ? [r.amount_cents == null ? '' : (r.amount_cents / 100).toFixed(2)] : [])].map(cell).join(','));
    downloadFile(`class-list-${(c.sessions[0]?.starts_at || '').slice(0, 10)}.csv`, [head.map(cell).join(','), ...lines].join('\r\n'));
  });
  $('#add-student')?.addEventListener('click', async () => {
    const r = await openDialog({ title: 'Add a student', body: `<p class="small">For a late registration, or someone paying another way. They’ll get an email with their next steps.</p>
      <div class="stack"><div></div><div class="field"><label for="s-name">Full name</label><input class="input" id="s-name" name="full_name" required maxlength="120"></div>
      <div class="field"><label for="s-email">Email</label><input class="input" id="s-email" name="email" type="email" required></div>
      <div class="field"><label for="s-phone">Phone <span class="muted">(optional)</span></label><input class="input" id="s-phone" name="phone" type="tel"></div>
      <fieldset class="field"><legend>Payment</legend><div class="choice-group">
        <label class="choice"><input type="radio" name="payment" value="outside" checked><span>Paid outside the site</span></label>
        <label class="choice"><input type="radio" name="payment" value="comp"><span>Complimentary</span></label>
        <label class="choice"><input type="radio" name="payment" value="link"><span>Send payment link</span></label></div>
        <span class="hint">“Send payment link” emails them a link to pay for this class. Their seat is held until then.</span></fieldset></div>`,
      actions: [{ label: 'Cancel', value: 'cancel' }, { label: 'Add student', value: 'add', className: 'button-navy' }] });
    if (r.value !== 'add') return;
    try { const res = await api.addStudent(id, r.data); toast(res.message); route(); } catch (x) { toast(x.message); }
  });
  $$('[data-move]').forEach(b => b.addEventListener('click', async () => {
    const options = all.filter(x => x.id !== id && ['published', 'full', 'closed', 'draft'].includes(x.status));
    if (!options.length) { toast('There’s no other upcoming class to move to yet.'); return; }
    const r = await openDialog({ title: `Move ${b.dataset.name}`, body: `<p class="small">Their payment and intake move with them. Their old Zoom links stop working, and new ones are sent for the new class.</p>
      <div class="field"><label for="m-to">Move to</label><select class="select" id="m-to" name="to">${options.map(x => `<option value="${esc(x.id)}">${esc(dateRange(x.sessions))} (${x.seats_left} seats left)</option>`).join('')}</select></div>`,
      actions: [{ label: 'Cancel', value: 'cancel' }, { label: 'Move student', value: 'move', className: 'button-navy' }] });
    if (r.value !== 'move') return;
    try { await api.moveStudent(b.dataset.move, r.data.to); toast('Student moved.'); route(); } catch (x) { toast(x.message); }
  }));
  $$('[data-remove]').forEach(b => b.addEventListener('click', async () => {
    const r = await openDialog({ title: `Remove ${b.dataset.name}?`, body: `<p class="small">They’ll be taken off this class and their Zoom links will stop working. If they paid online, refund them in Stripe — the app updates automatically when you do.</p>
      <label class="switch"><span class="switch-label"><strong>Free up their seat</strong><span>Let someone else register in their place.</span></span><input type="checkbox" name="free" checked></label>`,
      actions: [{ label: 'Cancel', value: 'cancel' }, { label: 'Remove student', value: 'remove', className: 'button-danger' }] });
    if (r.value !== 'remove') return;
    try { await api.removeStudent(b.dataset.remove, { freeSeat: r.data.free === 'on' }); toast('Student removed.'); route(); } catch (x) { toast(x.message); }
  }));
  $$('[data-zoom]').forEach(b => b.addEventListener('click', async () => {
    try { await api.resendZoom(b.dataset.zoom); toast('Zoom links emailed again.'); } catch (x) { toast(x.message); }
  }));
}

async function studentDetail(userId) {
  const d = await api.studentDetail(userId);
  const p = d.profile;
  view().innerHTML = `<div class="stack-lg"><div><button type="button" class="text-link" data-back>← Back</button></div>
    <div><h2>${esc(p.full_name || p.email)}</h2><p class="small">${esc(p.email)}${p.phone ? ` · ${esc(p.phone)}` : ''}</p></div>
    ${d.registrations.map(r => `<div class="card"><div class="card-header"><div><h3>${esc(dateRange(r.class.sessions))}</h3><p class="small">${esc(r.class.title)}</p></div><div class="row">${statusPill(r.class.status)}</div></div>
      <dl class="class-details"><div><dt>Registration</dt><dd>${esc({ paid: 'Paid online', manual: 'Added by team', pending_payment: 'Waiting for payment', cancelled: 'Removed', refunded: 'Refunded' }[r.status] || r.status)}</dd></div>
      <div><dt>Consent form</dt><dd>${yesNo(r.consent_done, 'Consent signed')}</dd></div><div><dt>Intake survey</dt><dd>${yesNo(r.intake_done, 'Intake complete')}</dd></div><div><dt>Zoom link sent</dt><dd>${yesNo(r.zoom_sent, 'Zoom sent')}</dd></div>
      ${d.can_see_payments ? `<div><dt>Payment</dt><dd>${r.payment ? `${money(r.payment.amount_cents)} on ${esc(formatDate(r.payment.paid_at))} · <a class="inline-link" href="${esc(r.payment.receipt_url)}">Receipt</a>` : '—'}</dd></div>` : ''}</dl>
      ${d.can_see_intake ? `<details class="stack"><summary class="text-link">View consent and intake answers <span aria-hidden="true">↓</span></summary><div class="alert alert-info"><span class="alert-icon" aria-hidden="true">ⓘ</span><p>Private health information. Please don’t copy it into emails or messages.</p></div>
        <h4>Consent choices</h4>${consentReadonlyHTML(r.consent)}<h4>Pre-Class Survey</h4>${r.intake ? answersReadonlyHTML(r.intake.answers, { participant_id: r.id.slice(0, 8).toUpperCase(), date: r.intake.submitted_at ? new Date(r.intake.submitted_at).toLocaleDateString() : 'Not submitted' }) : '<p class="muted">Not started.</p>'}</details>` : ''}
    </div>`).join('')}
  </div>`;
  $('[data-back]').addEventListener('click', () => history.back());
}

// ---------- Payments ----------
async function payments() {
  const rows = await api.listPayments();
  const byClass = new Map();
  for (const r of rows) { const k = r.class.id; const e = byClass.get(k) || { class: r.class, total: 0, count: 0 }; if (r.status !== 'refunded') { e.total += r.amount_cents; e.count++; } byClass.set(k, e); }
  view().innerHTML = `<div class="stack-lg"><h2>Payments</h2>
    <div class="alert alert-info"><span class="alert-icon" aria-hidden="true">ⓘ</span><p>Refunds are done in the Stripe dashboard. When you refund someone there, this page, their seat and their Zoom link update automatically, and they get an email.</p></div>
    <section><h3>Totals by class</h3><div class="stack"><div></div><div class="list-card">${[...byClass.values()].map(e => `<div class="class-row"><div><h3>${esc(dateRange(e.class.sessions))}</h3><p class="small">${esc(e.class.title)}</p></div><div class="small">${e.count} payment${e.count === 1 ? '' : 's'}</div><div></div><div><strong>${money(e.total)}</strong></div></div>`).join('') || '<p class="small">No payments yet.</p>'}</div></div></section>
    <section><h3>All payments</h3><div class="stack"><div></div><div class="table-wrap"><table><caption class="visually-hidden">All payments</caption><thead><tr><th scope="col">Date</th><th scope="col">Student</th><th scope="col">Class</th><th scope="col" class="num-cell">Amount</th><th scope="col">Status</th><th scope="col">Receipt</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td>${esc(formatDate(r.paid_at))}</td><td><a class="inline-link" href="#/student/${esc(r.user_id)}">${esc(r.student)}</a></td><td>${esc(dateRange(r.class.sessions))}</td><td class="num-cell">${money(r.amount_cents)}</td><td>${r.status === 'refunded' ? '<span class="status-pill pill-muted">Refunded</span>' : '<span class="status-pill pill-success">Paid</span>'}</td><td><a class="text-link" href="${esc(r.receipt_url)}">Receipt <span aria-hidden="true">↗</span></a></td></tr>`).join('')}
    </tbody></table></div></div></section></div>`;
}

// ---------- Team ----------
function permSwitches(perms, prefix, disabled = false) {
  return PERMISSIONS.map(p => `<label class="switch"><span class="switch-label"><strong>${esc(p.label)}</strong><span>${esc(p.help)}</span></span><input type="checkbox" name="${prefix}${p.key}" ${perms[p.key] ? 'checked' : ''}${disabled ? ' disabled' : ''}></label>`).join('');
}
async function team() {
  const { staff: members, invites } = await api.listTeam();
  const defaults = { manage_classes: true, manage_roster: true, view_roster_contact: true, view_payments: false, view_intake_answers: false };
  view().innerHTML = `<div class="stack-lg"><div><h2>Team</h2><p class="small">Invite people who help run classes, and choose exactly what each person can see and do.</p></div>
    <form class="card" id="invite-form" novalidate><h3>Invite someone</h3><div class="stack"><div></div>
      <div class="field"><label for="inv-email">Their email address</label><div class="input-row"><input class="input" id="inv-email" name="email" type="email" required placeholder="name@example.com"></div><span class="hint">They’ll get an email with a link to sign in. They don’t need a password.</span></div>
      <div>${permSwitches(defaults, 'p_')}</div>
      <div class="row"><button class="button button-yellow button-small" type="submit">Send invitation <span aria-hidden="true">↗</span></button><p class="form-status" role="status" aria-live="polite"></p></div></div></form>
    ${invites.length ? `<section><h3>Waiting to accept</h3><div class="stack"><div></div><div class="list-card">${invites.map(i => `<div class="class-row"><div><h3>${esc(i.email)}</h3><p class="small">Invited ${esc(formatDate(i.invited_at))}</p></div><div></div><div></div><div><button class="text-link" data-cancel-invite="${esc(i.email)}">Cancel invitation</button></div></div>`).join('')}</div></div></section>` : ''}
    <section><h3>People with access</h3><div class="stack"><div></div>
      ${members.map(m => `<div class="card"><div class="card-header"><div><h3>${esc(m.name)}</h3><p class="small">${esc(m.email)}</p></div>${m.role === 'owner' ? '<span class="status-pill">Owner · full access</span>' : '<span class="status-pill pill-muted">Assistant</span>'}</div>
        ${m.role === 'owner' ? '<p class="small">The owner can see and do everything, including payments, intake answers, team and settings.</p>' : `<form data-perms="${esc(m.user_id)}">${permSwitches(m.perms, 'p_')}<div class="row"><button class="button button-navy button-small" type="submit">Save changes</button><button type="button" class="button button-danger button-small" data-remove-staff="${esc(m.user_id)}" data-name="${esc(m.name)}">Remove access</button></div></form>`}</div>`).join('')}
    </div></section></div>`;
  const readPerms = form => Object.fromEntries(PERMISSIONS.map(p => [p.key, form.querySelector(`[name="p_${p.key}"]`).checked]));
  $('#invite-form').addEventListener('submit', async e => {
    e.preventDefault(); const form = e.target;
    try { await api.inviteStaff(form.email.value, readPerms(form)); toast('Invitation sent.'); route(); } catch (x) { form.querySelector('.form-status').textContent = x.message; }
  });
  $$('[data-perms]').forEach(form => form.addEventListener('submit', async e => {
    e.preventDefault();
    try { await api.updateStaff(form.dataset.perms, readPerms(form)); toast('Permissions saved.'); } catch (x) { toast(x.message); }
  }));
  $$('[data-remove-staff]').forEach(b => b.addEventListener('click', async () => {
    if (!(await confirmDialog({ title: `Remove ${b.dataset.name}?`, body: 'They will no longer be able to open the admin area. Their own student account, if any, is not affected.', confirmLabel: 'Remove access', danger: true }))) return;
    try { await api.removeStaff(b.dataset.removeStaff); toast('Access removed.'); route(); } catch (x) { toast(x.message); }
  }));
  $$('[data-cancel-invite]').forEach(b => b.addEventListener('click', async () => { await api.cancelInvite(b.dataset.cancelInvite); route(); }));
}

// ---------- Settings ----------
async function settings() {
  const s = await api.getSettings();
  const conn = (ok, name, help) => `<div class="switch"><span class="switch-label"><strong>${name}</strong><span>${help}</span></span>${ok ? '<span class="status-pill pill-success">Connected</span>' : '<span class="status-pill pill-warn">Not connected</span>'}</div>`;
  view().innerHTML = `<form class="stack-lg" id="settings-form" novalidate><h2>Settings</h2>
    <div class="card"><h3>Connections</h3>${conn(s.stripe_connected, 'Stripe (payments)', 'Takes payments and sends receipts. Kye sets this up.')}${conn(s.zoom_connected, 'Zoom (live classes)', 'Creates the class meetings and each student’s personal link.')}</div>
    <div class="card"><h3>Defaults for new classes</h3><div class="stack"><div></div>
      <div class="grid-3"><div class="field"><label for="d-min">Lowest amount ($)</label><input class="input" id="d-min" name="price_min" type="number" min="1" value="${dollars(s.price_min)}"></div>
      <div class="field"><label for="d-max">Highest amount ($)</label><input class="input" id="d-max" name="price_max" type="number" min="1" value="${dollars(s.price_max)}"></div>
      <div class="field"><label for="d-sug">Suggested ($)</label><input class="input" id="d-sug" name="price_suggested" type="number" min="1" value="${dollars(s.price_suggested)}"></div></div>
      <div class="field"><label for="d-cap">Seats per class</label><input class="input" id="d-cap" name="default_capacity" type="number" min="1" max="500" value="${esc(s.default_capacity)}"></div></div></div>
    <div class="card"><h3>Wording</h3><div class="stack"><div></div>
      <div class="field"><label for="d-sender">Email sender name</label><input class="input" id="d-sender" name="sender_name" maxlength="80" value="${esc(s.sender_name)}"></div>
      <div class="field"><label for="d-afford">“Can’t afford it” line on the class card <span class="muted">(leave blank to hide)</span></label><input class="input" id="d-afford" name="afford_line" maxlength="300" value="${esc(s.afford_line)}"></div>
      <div class="field"><label for="d-refund">Refund policy <span class="muted">(shown before payment)</span></label><textarea class="textarea" id="d-refund" name="refund_policy" maxlength="3000">${esc(s.refund_policy)}</textarea>${s.refund_policy ? '' : '<span class="hint">Needed before launch.</span>'}</div></div></div>
    <p class="form-error" id="settings-error" role="alert"></p>
    <div><button class="button button-yellow" type="submit">Save settings <span aria-hidden="true">↗</span></button></div></form>`;
  $('#settings-form').addEventListener('submit', async e => {
    e.preventDefault(); const f = new FormData(e.target);
    try { await api.saveSettings({ price_min: toCents(f.get('price_min')), price_max: toCents(f.get('price_max')), price_suggested: toCents(f.get('price_suggested')), default_capacity: f.get('default_capacity'), sender_name: f.get('sender_name'), afford_line: f.get('afford_line'), refund_policy: f.get('refund_policy') }); toast('Settings saved.'); }
    catch (x) { $('#settings-error').textContent = x.message; }
  });
}

// ---------- Activity ----------
async function activity() {
  const rows = await api.auditLog();
  view().innerHTML = `<div class="stack-lg"><div><h2>Activity log</h2><p class="small">A record of changes made by the team: classes, students and permissions. Health information is never recorded here.</p></div>
    <div class="table-wrap"><table><caption class="visually-hidden">Recent activity</caption><thead><tr><th scope="col">When</th><th scope="col">Who</th><th scope="col">What</th><th scope="col" class="hide-mobile">Details</th></tr></thead><tbody>
    ${rows.map(r => `<tr><td>${esc(formatDateTime(r.created_at))}</td><td>${esc(r.actor_name)}</td><td>${esc(r.action)}: ${esc(r.target)}</td><td class="hide-mobile small">${esc(r.details)}</td></tr>`).join('')}
    </tbody></table></div></div>`;
}

// Start-up runs last so every helper above is defined.
if (requireSignIn(user)) {
  if (!staff) {
    main.innerHTML = `<div class="wrap-narrow page-body stack"><h1>This area is for the program team.</h1><p>If you help run classes and need access, ask Brother Long to invite you.</p><a class="button button-yellow" href="${link('account/')}">Go to my account <span aria-hidden="true">↗</span></a></div>`;
  } else {
    main.innerHTML = `<section class="page-hero page-hero-compact"><div class="wrap"><p class="eyebrow"><span class="small-sun" aria-hidden="true"></span> ${staff.role === 'owner' ? 'Owner' : 'Team'} · Admin</p><h1>Hello${user.full_name ? `, <span>${esc(user.full_name)}.</span>` : '.'}</h1></div>${wave()}</section>
      <div class="wrap page-body"><div class="admin-shell"><nav class="admin-nav" aria-label="Admin sections" id="admin-nav"></nav><div id="view" tabindex="-1"></div></div></div>`;
    addEventListener('hashchange', route);
    route();
  }
}
