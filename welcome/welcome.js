import { api } from '../app/lib/api.js';
import { renderChrome, pageHero, link, esc, $, params, dateRange, sessionListHTML, requireSignIn } from '../app/lib/core.js';

const main = $('#main');
const { user } = await renderChrome();
if (requireSignIn(user)) {
  const regId = params().get('reg');
  // The payment webhook can take a few seconds, so wait briefly for the registration to show as paid.
  let reg = null;
  for (let i = 0; i < 10; i++) {
    reg = regId ? await api.getMyRegistration(regId) : null;
    if (reg && reg.status !== 'pending_payment') break;
    if (i === 0) main.innerHTML = '<div class="wrap-narrow page-body"><p role="status">Confirming your payment…</p></div>';
    await new Promise(r => setTimeout(r, 1500));
  }
  if (!reg) {
    main.innerHTML = pageHero({ eyebrow: 'Registration', title: 'We couldn’t find that <span>registration.</span>', narrow: true })
      + `<div class="wrap-narrow page-body stack"><p>If you just paid, it can take a minute to show up. Your account page always has the latest.</p><a class="button button-yellow" href="${link('account/')}">Go to my account <span aria-hidden="true">↗</span></a></div>`;
  } else {
    const c = reg.class;
    const intakeDone = reg.intake_completed_at && reg.consent_completed_at;
    main.innerHTML = pageHero({ eyebrow: 'You’re registered', title: 'A new student<br> has <span>emerged.</span>', lead: `You’re registered for <strong>${esc(c.title)}</strong>, ${esc(dateRange(c.sessions))}. A confirmation email is on its way to ${esc(user.email)}.`, sun: true })
      + `<div class="wrap page-body"><div class="grid-2">
        <div class="card card-accent stack-lg">
          <h2>What happens next</h2>
          <ol class="next-steps">
            <li><span class="step-number">01</span><div><h3>Complete your intake</h3><p>A short consent form and the Pre-Class Survey. It saves as you go, and you can change your answers until class starts.</p>
              <div class="stack"><div></div>${intakeDone ? '<span class="status-pill pill-success">Intake complete</span>' : `<a class="button button-yellow" href="${link(`account/intake/?reg=${encodeURIComponent(reg.id)}`)}">Complete your intake <span aria-hidden="true">↗</span></a>`}</div></div></li>
            <li><span class="step-number">02</span><div><h3>Receive your Zoom link</h3><p>Your personal Zoom link arrives by email 48 hours before your first session. It will also be in your account.</p></div></li>
            <li><span class="step-number">03</span><div><h3>Join the live session</h3><p>Meet Brother Long online to learn and practice together.</p></div></li>
          </ol>
        </div>
        <div class="card"><p class="eyebrow">Your class</p><h3>${esc(c.title)}</h3>${sessionListHTML(c.sessions)}
          <div class="stack"><div></div><a class="text-link" href="${link('account/')}">Go to my account <span aria-hidden="true">↗</span></a></div></div>
      </div></div>`;
  }
}
