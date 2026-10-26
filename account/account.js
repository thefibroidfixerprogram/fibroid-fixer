import { api } from '../app/lib/api.js';
import { renderChrome, pageHero, link, esc, $, money, dateRange, formatDate, formatDateTime, formatSession, sessionListHTML, requireSignIn, toast, downloadFile } from '../app/lib/core.js';

const main = $('#main');
const { user } = await renderChrome({ active: 'account' });
if (requireSignIn(user)) {
  await render();
  try { const note = sessionStorage.getItem('ffp-toast'); if (note) { sessionStorage.removeItem('ffp-toast'); toast(note); } } catch { /* storage blocked */ }
}

async function render() {
  const [regs, payments] = await Promise.all([api.myRegistrations(), api.myPayments()]);
  const now = Date.now();
  const upcoming = regs.filter(r => new Date(r.last_session_end) > now && r.status !== 'refunded');
  const past = regs.filter(r => new Date(r.last_session_end) <= now);
  const needed = upcoming.filter(r => !(r.intake_completed_at && r.consent_completed_at) && !r.intake_locked);
  const first = (user.full_name || '').split(' ')[0];

  main.innerHTML = pageHero({ eyebrow: 'My account', title: `Hello${first ? `, <span>${esc(first)}.</span>` : '.'}`, lead: 'Your classes, Zoom details, intake and receipts, all in one place.' })
    + `<div class="wrap page-body stack-lg">
      ${needed.length ? `<section aria-labelledby="action-h"><h2 id="action-h" class="visually-hidden">Action needed</h2>${needed.map(r => `
        <div class="alert alert-action"><span class="alert-icon" aria-hidden="true">●</span><div class="row-between"><p><strong>Action needed:</strong> complete your intake for ${esc(r.class.title)} (${esc(dateRange(r.class.sessions))}).</p>
        <a class="button button-yellow button-small" href="${link(`account/intake/?reg=${encodeURIComponent(r.id)}`)}">Complete your intake <span aria-hidden="true">↗</span></a></div></div>`).join('')}</section>` : ''}

      <section aria-labelledby="upcoming-h">
        <div class="row-between"><h2 id="upcoming-h">Upcoming classes</h2><a class="button button-ghost button-small" href="${link('register/')}">Register for another class <span aria-hidden="true">↗</span></a></div>
        <div class="stack"><div></div>${upcoming.length ? upcoming.map(classCard).join('') : `<div class="empty-state"><h3>No upcoming classes.</h3><p>When you register for a class, it will show up here with your Zoom details.</p><a class="button button-yellow" href="${link('register/')}">Help Me Fix Myself <span aria-hidden="true">↗</span></a></div>`}</div>
      </section>

      ${past.length ? `<section aria-labelledby="past-h"><h2 id="past-h">Past classes</h2><div class="stack"><div></div><div class="list-card">${past.map(r => `<div class="class-row"><div><h3>${esc(r.class.title)}</h3><p class="small">${esc(dateRange(r.class.sessions))}</p></div><div class="small">${r.class.sessions.length} sessions</div><div></div><div><a class="text-link" href="${link(`account/intake/?reg=${encodeURIComponent(r.id)}`)}">View my intake <span aria-hidden="true">↗</span></a></div></div>`).join('')}</div></div></section>` : ''}

      <section aria-labelledby="pay-h"><h2 id="pay-h">Payments</h2><div class="stack"><div></div>
        ${payments.length ? `<div class="table-wrap"><table><caption class="visually-hidden">Your payments</caption><thead><tr><th scope="col">Date</th><th scope="col">Class</th><th scope="col" class="num-cell">Amount</th><th scope="col">Status</th><th scope="col">Documents</th></tr></thead><tbody>
          ${payments.map(p => `<tr><td>${esc(formatDate(p.paid_at))}</td><td>${esc(dateRange(p.class.sessions))}</td><td class="num-cell">${esc(money(p.amount_cents))}</td><td>${p.status === 'refunded' ? '<span class="status-pill pill-muted">Refunded</span>' : '<span class="status-pill pill-success">Paid</span>'}</td>
          <td><div class="row"><a class="text-link" href="${esc(p.receipt_url)}" data-doc>Receipt <span aria-hidden="true">↗</span></a><a class="text-link" href="${esc(p.invoice_pdf_url)}" data-doc>Invoice <span aria-hidden="true">↗</span></a></div></td></tr>`).join('')}
        </tbody></table></div>` : '<p class="small">No payments yet.</p>'}</div></section>

      <section aria-labelledby="profile-h" class="grid-2"><div class="card"><h2 id="profile-h">Profile</h2>
        <form id="profile-form" class="stack" novalidate><div></div>
          <div class="field"><label for="full_name">Full name</label><input class="input" id="full_name" autocomplete="name" maxlength="120" required value="${esc(user.full_name)}"></div>
          <div class="field"><label for="phone">Phone <span class="muted">(optional)</span></label><input class="input" id="phone" type="tel" autocomplete="tel" maxlength="40" value="${esc(user.phone)}"></div>
          <div class="field"><span class="label">Email</span><p class="small">${esc(user.email)}</p><span class="hint">Your receipts and Zoom links go to this address. To change it, email us.</span></div>
          <div class="row"><button class="button button-navy button-small" type="submit">Save changes</button><p class="form-status" role="status" aria-live="polite"></p></div>
        </form></div>
        <div class="panel-pale stack"><h3>Need help?</h3><p class="small">Questions about your class, payment or intake? Email <a class="inline-link" href="mailto:TheFibroidFixer@gmail.com">TheFibroidFixer@gmail.com</a>.</p><button type="button" class="button button-ghost button-small" data-sign-out-2>Sign out</button></div>
      </section>
    </div>`;

  $('#profile-form').addEventListener('submit', async e => {
    e.preventDefault();
    const status = e.target.querySelector('.form-status');
    try { await api.updateProfile({ full_name: $('#full_name').value, phone: $('#phone').value }); status.textContent = 'Saved.'; }
    catch (err) { status.textContent = err.message; }
  });
  $('[data-sign-out-2]').addEventListener('click', async () => { await api.signOut(); location.href = link(''); });
  main.querySelectorAll('[data-ics]').forEach(b => b.addEventListener('click', () => {
    const r = upcoming.find(x => x.id === b.dataset.ics);
    downloadFile('fibroid-fixer-class.ics', icsFor(r), 'text/calendar');
  }));
  main.querySelectorAll('a[href^="#sample"]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); toast('Preview: in the live site this opens the real link.'); }));
}

function classCard(r) {
  const c = r.class;
  const intakeDone = r.intake_completed_at && r.consent_completed_at;
  const zoom = r.zoom_sent_at
    ? `<ul class="session-list">${c.sessions.map(s => { const f = formatSession(s); const z = r.zoom_links.find(l => l.session_id === s.id); return `<li><span>${esc(f.day)} · ${esc(f.time)}</span>${z ? `<a class="button button-navy button-small" href="${esc(z.url)}" rel="noopener">Join on Zoom <span aria-hidden="true">↗</span></a>` : ''}</li>`; }).join('')}</ul>
       <p class="tz-note">These links are personal to you. Please don’t share them.</p>`
    : `${sessionListHTML(c.sessions)}<div class="alert alert-info"><span class="alert-icon" aria-hidden="true">ⓘ</span><p>Your Zoom link arrives 48 hours before class (${esc(formatDateTime(r.zoom_release_at))}). We’ll email it and it will show here.</p></div>`;
  return `<article class="card card-accent">
    <div class="card-header"><div><h3>${esc(c.title)}</h3><p class="small">${esc(dateRange(c.sessions))} · Live on Zoom</p></div>
      <div class="row">${r.status === 'pending_payment' ? '<span class="status-pill pill-warn">Payment pending</span>' : '<span class="status-pill pill-success">Registered</span>'}
      ${intakeDone ? '<span class="status-pill pill-success">Intake complete</span>' : '<span class="status-pill pill-warn">Intake needed</span>'}</div></div>
    ${zoom}
    <div class="stack"><div></div><div class="row">
      ${intakeDone || r.intake_locked ? `<a class="button button-ghost button-small" href="${link(`account/intake/?reg=${encodeURIComponent(r.id)}`)}">${r.intake_locked ? 'View my intake' : 'Review or edit my intake'}</a>` : `<a class="button button-yellow button-small" href="${link(`account/intake/?reg=${encodeURIComponent(r.id)}`)}">Complete your intake <span aria-hidden="true">↗</span></a>`}
      <button type="button" class="button button-ghost button-small" data-ics="${esc(r.id)}">Add to calendar</button>
    </div></div>
  </article>`;
}

// Calendar file with one event per session. Zoom links are only included once released.
function icsFor(r) {
  const stamp = d => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const escText = s => String(s).replace(/[\\;,]/g, m => '\\' + m).replace(/\n/g, '\\n');
  const events = r.class.sessions.map((s, i) => {
    const z = r.zoom_links.find(l => l.session_id === s.id);
    return ['BEGIN:VEVENT', `UID:${r.id}-${i}@thefibroidfixer`, `DTSTAMP:${stamp(Date.now())}`, `DTSTART:${stamp(s.starts_at)}`, `DTEND:${stamp(s.ends_at)}`,
      `SUMMARY:${escText(`${r.class.title} (session ${i + 1} of ${r.class.sessions.length})`)}`,
      `DESCRIPTION:${escText(z && !z.url.startsWith('#') ? `Join on Zoom: ${z.url}` : 'Your personal Zoom link is in your account at The Fibroid Fixer website.')}`,
      'LOCATION:Zoom', 'END:VEVENT'].join('\r\n');
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//The Fibroid Fixer//Classes//EN', 'CALSCALE:GREGORIAN', ...events, 'END:VCALENDAR'].join('\r\n');
}
