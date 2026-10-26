import { api } from '../app/lib/api.js';
import { renderChrome, pageHero, link, esc, $, params } from '../app/lib/core.js';

const main = $('#main');
// Only allow returning to pages on this site.
const nextURL = (() => { try { const u = new URL(params().get('next') || '', location.href); return u.origin === location.origin ? u.href : link('account/'); } catch { return link('account/'); } })();

const { user } = await renderChrome({ active: 'signin' });
main.innerHTML = pageHero({ eyebrow: 'Your account', title: 'Welcome<br> <span>in.</span>', lead: 'Sign in to register for a class, complete your intake and find your Zoom details. No password needed.', narrow: true, sun: true })
  + '<div class="wrap-narrow page-body"><div class="card card-accent" id="signin-card"></div></div>';
const card = $('#signin-card');

if (user && user.full_name) location.replace(nextURL);
else if (user) showProfileStep(user);
else showSignIn();

function showSignIn() {
  card.innerHTML = `<h2>Sign in or create your account</h2>
    <p class="small">New here? The same steps create your account.</p>
    <div class="stack-lg">
      <div></div>
      <button type="button" class="button button-google button-block" id="google"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7h-4a12 12 0 0 0 0 10.8l4-3.1z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8z"/></svg>Continue with Google</button>
      <div class="row muted small" aria-hidden="true"><span class="divider-line"></span>or use your email<span class="divider-line"></span></div>
      <form id="email-form" novalidate>
        <div class="field"><label for="email">Email address</label>
          <input class="input" id="email" type="email" autocomplete="email" inputmode="email" placeholder="you@example.com" required aria-describedby="email-hint email-status">
          <span class="hint" id="email-hint">We’ll email you a one-time link. Use the email you want your receipts and Zoom link sent to.</span></div>
        <div class="stack"><div></div><button class="button button-yellow button-block" type="submit">Email me a sign-in link <span aria-hidden="true">↗</span></button></div>
        <p class="form-status" id="email-status" role="status" aria-live="polite"></p>
      </form>
      <p class="small">By continuing you agree to how we handle your information in our <a class="inline-link" href="${link('privacy/')}">Privacy Policy</a>.</p>
    </div>`;
  $('#google').addEventListener('click', async () => {
    await api.signInWithGoogle();
    const u = await api.currentUser();
    if (u.full_name) location.href = nextURL; else showProfileStep(u);
  });
  const form = $('#email-form'), input = $('#email'), status = $('#email-status');
  input.addEventListener('input', () => { input.removeAttribute('aria-invalid'); status.textContent = ''; });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const button = form.querySelector('button'); button.disabled = true; status.textContent = 'Sending…';
    try {
      const { email } = await api.signInWithEmail(input.value);
      showCheckEmail(email);
    } catch (err) {
      input.setAttribute('aria-invalid', 'true'); status.textContent = err.message; input.focus();
    } finally { button.disabled = false; }
  });
}

function showCheckEmail(email) {
  card.innerHTML = `<p class="eyebrow">Check your email</p><h2>We sent you a sign-in link.</h2>
    <div class="stack"><p>Open the email we sent to <strong>${esc(email)}</strong> and tap the link. It works once and expires in one hour. You can close this page.</p>
    <p class="small">Not there after a few minutes? Check your spam or promotions folder, or <button type="button" class="text-link" id="again">try again</button>.</p>
    ${api.sample ? `<div class="alert alert-info"><span class="alert-icon" aria-hidden="true">ⓘ</span><p>Preview mode: no email is sent. <button type="button" class="text-link" id="sample-link">Pretend I opened the link <span aria-hidden="true">↗</span></button></p></div>` : ''}</div>`;
  card.querySelector('h2').setAttribute('tabindex', '-1'); card.querySelector('h2').focus();
  $('#again').addEventListener('click', showSignIn);
  $('#sample-link')?.addEventListener('click', async () => {
    const u = await api.sampleCompleteEmailSignIn(email);
    if (u.full_name) location.href = nextURL; else showProfileStep(u);
  });
}

function showProfileStep(u) {
  card.innerHTML = `<p class="eyebrow">One last thing</p><h2>Tell us your name.</h2>
    <p class="small">This is how your name will appear on your class registration.</p>
    <form id="profile-form" class="stack-lg" novalidate><div></div>
      <div><div class="field"><label for="full_name">Full name</label><input class="input" id="full_name" autocomplete="name" required maxlength="120" value="${esc(u.full_name)}"></div>
      <div class="field"><label for="phone">Phone <span class="muted">(optional)</span></label><input class="input" id="phone" type="tel" autocomplete="tel" maxlength="40" value="${esc(u.phone)}"><span class="hint">Only used if we need to reach you about a class.</span></div></div>
      <button class="button button-yellow button-block" type="submit">Continue <span aria-hidden="true">↗</span></button>
      <p class="form-status" role="status" aria-live="polite"></p></form>`;
  const form = $('#profile-form');
  $('#full_name').focus();
  form.addEventListener('submit', async e => {
    e.preventDefault();
    try { await api.updateProfile({ full_name: $('#full_name').value, phone: $('#phone').value }); location.href = nextURL; }
    catch (err) { form.querySelector('.form-status').textContent = err.message; }
  });
}
