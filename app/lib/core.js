// Shared helpers for every app page: links, escaping, dates, money, header/footer, dialogs.
import { CONFIG, SAMPLE_MODE } from '../config.js';
import { api } from './api.js';

// Site root, worked out from this file's location, so links work both under
// /fibroid-fixer/ (GitHub Pages) and at the root of the custom domain later.
export const BASE = new URL('../../', import.meta.url);
export const link = path => new URL(path, BASE).href;

export const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
export const params = () => new URLSearchParams(location.search);

// ---- Dates: always shown in the viewer's own time zone, with the zone named ----
export const viewerTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const fmt = (options) => new Intl.DateTimeFormat(undefined, options);
// "Eastern Time" rather than "Eastern Daylight Time", so the label is right in every season.
export const timeZoneLabel = (date = new Date()) => {
  const name = style => { try { return fmt({ timeZoneName: style }).formatToParts(date).find(p => p.type === 'timeZoneName')?.value; } catch { return null; } };
  return name('longGeneric') || name('long') || viewerTimeZone();
};

export function formatSession(session) {
  const start = new Date(session.starts_at), end = new Date(session.ends_at);
  const day = fmt({ weekday: 'long', month: 'long', day: 'numeric' }).format(start);
  const from = fmt({ hour: 'numeric', minute: '2-digit' }).format(start);
  const to = fmt({ hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(end);
  return { day, time: `${from} – ${to}` };
}
export const formatDate = iso => fmt({ month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso));
export const formatDateTime = iso => fmt({ month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
export function dateRange(sessions) {
  if (!sessions?.length) return 'Dates to be announced';
  const first = new Date(sessions[0].starts_at), last = new Date(sessions[sessions.length - 1].starts_at);
  const f = fmt({ month: 'long', day: 'numeric', year: 'numeric' });
  return f.formatRange ? f.formatRange(first, last) : `${f.format(first)} – ${f.format(last)}`;
}
export const money = cents => (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: cents % 100 ? 2 : 0 });

export function sessionListHTML(sessions) {
  return `<ul class="session-list">${sessions.map(s => { const f = formatSession(s); return `<li><span>${esc(f.day)}</span><span>${esc(f.time)}</span></li>`; }).join('')}</ul>
  <p class="tz-note">Times shown in your time zone (${esc(timeZoneLabel())}).</p>`;
}

// ---- Page chrome: header + footer copied from the landing page ----
const WAVE = '<div class="section-wave wave-bottom" aria-hidden="true"><svg viewBox="0 0 1440 100" preserveAspectRatio="none"><path d="M0 35C250 98 440 -12 720 30S1200 96 1440 30V100H0Z"/></svg></div>';
export const wave = () => WAVE;

export async function renderChrome({ active = '' } = {}) {
  const user = await api.currentUser();
  const staff = user ? await api.myStaff() : null;
  const items = [
    `<a href="${link('#program')}">Program</a>`,
    `<a href="${link('#classes')}">Classes</a>`,
    `<a href="${link('#faq')}">FAQ</a>`,
  ];
  if (user) {
    items.push(`<a href="${link('account/')}"${active === 'account' ? ' aria-current="page"' : ''}>My account</a>`);
    if (staff) items.push(`<a href="${link('admin/')}"${active === 'admin' ? ' aria-current="page"' : ''}>Admin</a>`);
    items.push('<button type="button" class="nav-link" data-sign-out>Sign out</button>');
  } else {
    items.push(`<a href="${link('signin/')}"${active === 'signin' ? ' aria-current="page"' : ''}>Sign in</a>`);
  }
  items.push(`<a class="button button-small button-navy" href="${link('#classes')}">Help Me Fix Myself <span aria-hidden="true">↗</span></a>`);

  const header = document.createElement('div');
  header.innerHTML = `${SAMPLE_MODE ? previewBannerHTML(user, staff) : ''}
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header"><div class="header-inner">
    <a class="wordmark" href="${link('')}" aria-label="The Fibroid Fixer home">The Fibroid Fixer<span class="wordmark-dot" aria-hidden="true">.</span></a>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="navigation">Menu <span aria-hidden="true">＋</span></button>
    <nav id="navigation" aria-label="Main navigation">${items.join('')}</nav>
  </div></header>`;
  document.body.prepend(...header.children);

  const footer = document.createElement('footer');
  footer.className = 'footer';
  footer.innerHTML = `<div class="wrap"><div class="footer-top"><a class="wordmark" href="${link('')}">The Fibroid Fixer<span class="wordmark-dot" aria-hidden="true">.</span></a><a class="email-link" href="mailto:${CONFIG.contactEmail}">${CONFIG.contactEmail} <span aria-hidden="true">↗</span></a></div>
  <div class="footer-middle"><p>Healing still happens.</p><nav aria-label="Footer navigation"><a href="${link('')}">Home</a><a href="${link('#program')}">Program</a><a href="${link('#about')}">About</a><a href="${link('#classes')}">Classes</a><a href="${link('#faq')}">FAQ</a><a href="${link('privacy/')}">Privacy Policy</a></nav></div>
  <div class="disclaimer"><h2>Health disclaimer</h2><p>The Fibroid Fixer Program offers Qigong-based education and practices intended to support health and well-being. The program is not a substitute for medical diagnosis, treatment or advice from a licensed healthcare provider.</p><p>Individual experiences and results may vary. Participants are encouraged to continue working with their healthcare providers regarding any medical concerns or treatment decisions.</p></div>
  <div class="footer-bottom"><span>© 2026 The Fibroid Fixer. All rights reserved.</span><span><a href="${link('privacy/')}">Privacy Policy</a></span></div></div>`;
  document.body.append(footer);

  const menu = $('.menu-toggle'), nav = $('#navigation');
  const close = () => { menu.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open'); };
  menu.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', String(open)); nav.classList.toggle('is-open', open); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { close(); menu.focus(); } });
  document.addEventListener('click', e => { if (!e.target.closest('.site-header')) close(); });
  $('[data-sign-out]')?.addEventListener('click', async () => { await api.signOut(); location.href = link(''); });

  const roleSelect = $('#preview-role');
  roleSelect?.addEventListener('change', async () => { await api.sampleSwitchRole(roleSelect.value); location.reload(); });
  $('#preview-reset')?.addEventListener('click', async () => { await api.sampleReset(); location.reload(); });
  return { user, staff };
}

function previewBannerHTML(user, staff) {
  const current = !user ? 'visitor' : staff ? staff.role : 'student';
  const opt = (value, label) => `<option value="${value}"${value === current ? ' selected' : ''}>${label}</option>`;
  return `<div class="preview-banner" role="region" aria-label="Preview mode"><div class="wrap">
    <p><strong>Preview with sample data.</strong> Nothing here is real; no payments or emails are sent.</p>
    <div class="row"><label for="preview-role">View as</label><select id="preview-role">${opt('visitor', 'Visitor (signed out)')}${opt('student', 'Student')}${opt('owner', 'Brother Long (owner)')}${opt('assistant', 'Assistant')}</select>
    <button type="button" class="text-link" id="preview-reset">Reset sample data</button></div>
  </div></div>`;
}

export function pageHero({ eyebrow, title, lead = '', narrow = false, sun = false }) {
  return `<section class="page-hero">${sun ? '<div class="page-hero-sun" aria-hidden="true"></div>' : ''}<div class="${narrow ? 'wrap-narrow' : 'wrap'}">
    <p class="eyebrow"><span class="small-sun" aria-hidden="true"></span> ${esc(eyebrow)}</p>
    <h1>${title}</h1>${lead ? `<p class="lead">${lead}</p>` : ''}
  </div>${WAVE}</section>`;
}

// ---- Feedback ----
export function toast(message) {
  $('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = message;
  document.body.append(el);
  setTimeout(() => el.remove(), 3800);
}

// Opens a modal dialog. `body` is trusted markup built by the caller (escape user values first).
export function openDialog({ title, body, actions = [] }) {
  return new Promise(resolve => {
    const dialog = document.createElement('dialog');
    dialog.className = 'app-dialog';
    dialog.setAttribute('aria-labelledby', 'dialog-title');
    dialog.innerHTML = `<form method="dialog" class="dialog-inner"><h2 id="dialog-title">${esc(title)}</h2>${body}
      <div class="dialog-actions">${actions.map(a => `<button class="button button-small ${a.className || 'button-ghost'}" value="${esc(a.value)}"${a.value === 'cancel' ? ' formnovalidate' : ''}>${esc(a.label)}</button>`).join('')}</div></form>`;
    document.body.append(dialog);
    const form = dialog.querySelector('form');
    dialog.addEventListener('close', () => {
      const data = Object.fromEntries(new FormData(form));
      resolve({ value: dialog.returnValue || 'cancel', data });
      dialog.remove();
    });
    dialog.showModal();
  });
}
export const confirmDialog = ({ title, body, confirmLabel = 'Confirm', danger = false }) =>
  openDialog({ title, body: `<p>${esc(body)}</p>`, actions: [{ label: 'Cancel', value: 'cancel' }, { label: confirmLabel, value: 'ok', className: danger ? 'button-danger' : 'button-navy' }] })
    .then(r => r.value === 'ok');

export function requireSignIn(user) {
  if (user) return true;
  location.replace(link(`signin/?next=${encodeURIComponent(location.pathname + location.search + location.hash)}`));
  return false;
}

export function downloadFile(filename, content, type = 'text/csv') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
