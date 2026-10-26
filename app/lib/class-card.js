// The public class card. Same look as the Live Classes card on the landing page.
import { esc, money, dateRange, sessionListHTML, link } from './core.js';

export function priceLine(c) {
  return `${money(c.price_min)} – ${money(c.price_max)}`;
}

export function classCardHTML(c, { settings = {}, action = 'register', preview = false } = {}) {
  const full = c.status === 'full' || c.seats_left === 0;
  const pill = full ? 'Full' : c.seats_left <= 5 ? `${c.seats_left} ${c.seats_left === 1 ? 'seat' : 'seats'} left` : 'Registration open';
  let button = '';
  if (action === 'register') {
    button = full
      ? `<a class="button button-ghost button-block" href="${link('#newsletter')}">Full — get notified <span aria-hidden="true">↗</span></a>`
      : `<a class="button button-yellow button-block" href="${link(`register/?class=${encodeURIComponent(c.id)}`)}">Help Me Fix Myself <span aria-hidden="true">↗</span></a>`;
  } else if (action === 'preview') {
    button = `<span class="button button-yellow button-block" aria-hidden="true">Help Me Fix Myself <span>↗</span></span>`;
  }
  return `<article class="class-card"${preview ? ' aria-label="Preview of the class card"' : ''}>
    <span class="status-pill">${esc(pill)}</span>
    <h3>${esc(c.title)}</h3>
    <p>${esc(dateRange(c.sessions))}</p>
    ${c.sessions?.length ? sessionListHTML(c.sessions) : ''}
    <dl class="class-details">
      <div><dt>Format</dt><dd>Live on Zoom</dd></div>
      <div><dt>Sliding scale</dt><dd>${esc(priceLine(c))}</dd></div>
      <div><dt>Seats left</dt><dd>${esc(c.seats_left ?? c.capacity)} of ${esc(c.capacity)}</dd></div>
    </dl>
    <p class="small">Sliding scale / no one turned away due to lack of resources.</p>
    <div class="stack"><div></div>${button}</div>
    ${settings.afford_line ? `<p class="afford">${esc(settings.afford_line)}</p>` : ''}
  </article>`;
}
