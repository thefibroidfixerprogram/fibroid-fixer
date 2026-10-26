import { api } from '../app/lib/api.js';
import { renderChrome, pageHero, link, esc, $, params, money, dateRange, openDialog, toast } from '../app/lib/core.js';
import { classCardHTML } from '../app/lib/class-card.js';

const main = $('#main');
const { user } = await renderChrome();
const classId = params().get('class');
const settings = await api.getPublicSettings();

if (!classId) {
  // All open classes (also used by "Register for another class").
  const classes = await api.listPublicClasses();
  main.innerHTML = pageHero({ eyebrow: 'Live classes', title: 'Make space for<br> a new <span>beginning.</span>', lead: 'Learn with Brother Long from wherever you are. Live online classes bring the practice into your own space.', sun: true })
    + `<div class="wrap page-body">${classes.length
      ? `<div class="grid-2">${classes.map(c => classCardHTML(c, { settings })).join('')}</div>`
      : `<div class="empty-state"><h3>Registration opens soon.</h3><p>No classes are open right now. Sign up for updates and we’ll email you when registration opens.</p><a class="button button-yellow" href="${link('#newsletter')}">Notify Me <span aria-hidden="true">↗</span></a></div>`}</div>`;
} else {
  const c = await api.getPublicClass(classId);
  if (!c) {
    main.innerHTML = pageHero({ eyebrow: 'Live classes', title: 'This class isn’t <span>open.</span>', lead: 'It may have been closed or the link may be out of date.', narrow: true })
      + `<div class="wrap-narrow page-body"><a class="button button-yellow" href="${link('register/')}">See open classes <span aria-hidden="true">↗</span></a></div>`;
  } else renderClass(c);
}

function renderClass(c) {
  const full = c.status === 'full' || c.seats_left === 0;
  main.innerHTML = pageHero({ eyebrow: 'Register', title: 'Your first class,<br> one step at a <span>time.</span>', lead: `${esc(c.title)} · ${esc(dateRange(c.sessions))}`, sun: true })
    + `<div class="wrap page-body"><div class="grid-2">
      <div>${classCardHTML(c, { settings, action: 'none' })}</div>
      <div class="card stack-lg" id="steps-card">
        <ol class="progress-steps" aria-label="Registration steps">
          <li class="${user ? 'done' : ''}"${user ? '' : ' aria-current="step"'}><span class="num">${user ? '✓' : '1'}</span>Sign in</li>
          <li${user ? ' aria-current="step"' : ''}><span class="num">2</span>Pay what you can</li>
          <li><span class="num">3</span>Intake</li>
        </ol>
        ${full ? `<div class="alert alert-info"><span class="alert-icon" aria-hidden="true">ⓘ</span><p><strong>This class is full.</strong> Sign up for updates and we’ll let you know when the next class opens.</p></div><a class="button button-ghost" href="${link('#newsletter')}">Full — get notified <span aria-hidden="true">↗</span></a>`
        : user ? `<div><h2>Pay what you can.</h2><p class="small">Choose any amount from ${money(c.price_min)} to ${money(c.price_max)} on the secure payment page. Your receipt goes to <strong>${esc(user.email)}</strong>.</p></div>
          <button type="button" class="button button-yellow button-block" id="pay">Continue to payment <span aria-hidden="true">↗</span></button>
          <p class="small">Payments are handled securely by Stripe. Your seat is held for 30 minutes while you pay.</p>
          ${settings.refund_policy ? `<details><summary class="text-link">Refund policy</summary><p class="small">${esc(settings.refund_policy)}</p></details>` : ''}
          <p class="form-status" role="status" aria-live="polite" id="pay-status"></p>`
        : `<div><h2>First, sign in.</h2><p class="small">Sign in with Google or your email so we can send your receipt, intake and Zoom link to the right place. No password needed.</p></div>
          <a class="button button-yellow button-block" href="${link(`signin/?next=${encodeURIComponent(location.pathname + location.search)}`)}">Sign in to continue <span aria-hidden="true">↗</span></a>`}
      </div></div></div>`;

  $('#pay')?.addEventListener('click', async () => {
    const status = $('#pay-status');
    let amount;
    if (api.sample) {
      // Stand-in for Stripe's payment page so the flow can be tried end to end.
      const r = await openDialog({ title: 'Stripe payment page (sample)', body: `<p class="small">In the live site this is Stripe’s secure checkout, with the amount pre-filled at ${money(c.price_suggested)}. Nothing is charged in preview.</p>
        <div class="field"><label for="amount">Amount (USD)</label><input class="input" id="amount" name="amount" type="number" min="${c.price_min / 100}" max="${c.price_max / 100}" step="1" value="${c.price_suggested / 100}" required><span class="hint">Any amount from ${money(c.price_min)} to ${money(c.price_max)}.</span></div>`,
        actions: [{ label: 'Cancel', value: 'cancel' }, { label: 'Pay (sample)', value: 'pay', className: 'button-navy' }] });
      if (r.value !== 'pay') return;
      amount = Math.round(Number(r.data.amount) * 100);
    }
    status.textContent = 'Opening the secure payment page…';
    try {
      const { registration_id, url } = await api.startCheckout(c.id, { amount_cents: amount });
      location.href = url || link(`welcome/?reg=${encodeURIComponent(registration_id)}`);
    } catch (err) { status.textContent = err.message; toast(err.message); }
  });
}
