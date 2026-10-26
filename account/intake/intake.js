import { api } from '../../app/lib/api.js';
import { renderChrome, pageHero, link, esc, $, params, dateRange, requireSignIn, toast } from '../../app/lib/core.js';
import { SURVEY, CONSENT, surveyHTML, collectAnswers, wireConditional, answeredCount, answersReadonlyHTML, consentReadonlyHTML } from '../../app/lib/intake-forms.js';

const main = $('#main');
const { user } = await renderChrome({ active: 'account' });
if (requireSignIn(user)) await start();

async function start() {
  const regId = params().get('reg');
  const reg = regId ? await api.getMyRegistration(regId) : null;
  if (!reg) {
    main.innerHTML = `<div class="wrap-narrow page-body stack"><h1>Registration not found.</h1><a class="button button-yellow" href="${link('account/')}">Back to my account <span aria-hidden="true">↗</span></a></div>`;
    return;
  }
  const { intake, consent } = await api.getIntake(reg.id);
  const autofill = { participant_id: reg.id.slice(0, 8).toUpperCase(), date: new Date(intake?.submitted_at || Date.now()).toLocaleDateString() };
  const hero = (lead) => pageHero({ eyebrow: 'Intake', title: 'Before your <span>first class.</span>', lead, narrow: true });
  const classLine = `${esc(reg.class.title)} · ${esc(dateRange(reg.class.sessions))}`;

  if (reg.intake_locked) {
    main.innerHTML = hero(`${classLine}. Your class has started, so your intake can no longer be changed. Here is a copy for your records.`)
      + `<div class="wrap-narrow page-body stack-lg"><div class="card"><h2>${esc(CONSENT.title)}</h2>${consentReadonlyHTML(consent)}</div>
        <div class="card"><h2>${esc(SURVEY.title)}</h2>${intake ? answersReadonlyHTML(intake.answers, autofill) : '<p class="muted">Not completed.</p>'}</div>
        <a class="text-link" href="${link('account/')}">Back to my account <span aria-hidden="true">↗</span></a></div>`;
    return;
  }

  const steps = (current) => `<ol class="progress-steps" aria-label="Intake steps">
    <li class="${consent ? 'done' : ''}"${current === 1 ? ' aria-current="step"' : ''}><span class="num">${consent ? '✓' : '1'}</span>Consent form</li>
    <li class="${intake?.submitted_at ? 'done' : ''}"${current === 2 ? ' aria-current="step"' : ''}><span class="num">${intake?.submitted_at ? '✓' : '2'}</span>Pre-Class Survey</li></ol>`;

  const showConsent = !consent || params().get('step') === 'consent';
  if (showConsent) renderConsent(); else renderSurvey();

  function renderConsent() {
    const prev = consent || {};
    main.innerHTML = hero(`${classLine}. Step 1 of 2. Please read the form and choose YES or NO for each item.`)
      + `<div class="wrap-narrow page-body">${steps(1)}
      <form class="card" id="consent-form" novalidate>
        <h2>${esc(CONSENT.title)}</h2>
        <div class="consent-text stack">${CONSENT.body}</div>
        <h3 class="q-group-label">${esc(CONSENT.choicesIntro)}</h3>
        ${CONSENT.choices.map((c, i) => `<fieldset class="consent-choice"><legend><h4>${i + 1}. ${esc(c.title)}</h4></legend><p>${esc(c.text)}</p>
          <div class="choice-group">${['YES', 'NO'].map(v => `<label class="choice"><input type="radio" name="${c.id}" value="${v}" required${prev.choices?.[c.id] === v ? ' checked' : ''}><span>${v}</span></label>`).join('')}</div>
          ${c.note ? `<p class="note">${c.note}</p>` : ''}</fieldset>`).join('')}
        <div class="consent-text stack">${CONSENT.after}</div>
        <div class="stack"><div></div>
          <div class="field"><label for="c-name">Participant Name</label><input class="input" id="c-name" name="name" required maxlength="120" autocomplete="name" value="${esc(prev.name || user.full_name)}"></div>
          <div class="field"><label for="c-sig">Participant Signature</label><input class="input" id="c-sig" name="signature" required maxlength="120" value="${esc(prev.signature || '')}" aria-describedby="sig-hint"><span class="hint" id="sig-hint">Type your full name. This counts as your signature.</span></div>
          <dl class="autofill"><dt>Date</dt><dd>${esc(new Date().toLocaleDateString())}</dd></dl>
          <div class="field"><label for="c-contact">Preferred Email/Phone for Follow-Up</label><input class="input" id="c-contact" name="contact" maxlength="160" value="${esc(prev.contact || user.email)}"></div>
        </div>
        <p class="form-error" id="consent-error" role="alert"></p>
        <div class="row"><button class="button button-yellow" type="submit">Sign and continue <span aria-hidden="true">↗</span></button>${consent ? `<a class="text-link" href="${link(`account/intake/?reg=${encodeURIComponent(reg.id)}`)}">Back to survey</a>` : ''}</div>
      </form></div>`;
    $('#consent-form').addEventListener('submit', async e => {
      e.preventDefault();
      const form = e.target, data = new FormData(form), err = $('#consent-error');
      const missing = CONSENT.choices.filter(c => !data.get(c.id));
      if (missing.length) { err.textContent = `Please choose YES or NO for item${missing.length > 1 ? 's' : ''} ${missing.map(m => CONSENT.choices.indexOf(m) + 1).join(', ')}.`; form.querySelector(`[name="${missing[0].id}"]`).focus(); return; }
      if (!String(data.get('name')).trim()) { err.textContent = 'Please enter your name.'; $('#c-name').focus(); return; }
      if (!String(data.get('signature')).trim()) { err.textContent = 'Please type your full name as your signature.'; $('#c-sig').focus(); return; }
      try {
        await api.saveConsent(reg.id, { choices: Object.fromEntries(CONSENT.choices.map(c => [c.id, data.get(c.id)])), name: String(data.get('name')).trim(), signature: String(data.get('signature')).trim(), contact: String(data.get('contact') || '').trim() });
        location.href = link(`account/intake/?reg=${encodeURIComponent(reg.id)}`);
      } catch (x) { err.textContent = x.message; }
    });
  }

  function renderSurvey() {
    const answers = intake?.answers || {};
    main.innerHTML = hero(`${classLine}. Step 2 of 2. Every question is optional, and your answers save as you go. You can come back and change them until class starts.`)
      + `<div class="wrap-narrow page-body">${steps(2)}
      <form class="card" id="survey-form" novalidate>
        <h2>${esc(SURVEY.title)}</h2><p class="section-note">${esc(SURVEY.intro)}</p>
        <div class="stack-lg"><div></div>${surveyHTML(answers, { autofill, readonly: false })}</div>
        <div class="sticky-actions"><div class="row-between"><span class="save-indicator" id="save-state" role="status" aria-live="polite">${intake?.updated_at ? 'All changes saved' : ''}</span>
          <div class="row"><a class="text-link" href="?reg=${encodeURIComponent(reg.id)}&step=consent">Review consent form</a><button class="button button-yellow" type="submit">${intake?.submitted_at ? 'Save and finish' : 'Submit intake'} <span aria-hidden="true">↗</span></button></div></div></div>
      </form></div>`;
    const form = $('#survey-form'), state = $('#save-state');
    wireConditional(form);
    let timer, saving = Promise.resolve();
    const save = (submit = false) => {
      clearTimeout(timer);
      state.textContent = 'Saving…';
      saving = saving.then(() => api.saveIntake(reg.id, collectAnswers(form), { submit }))
        .then(() => { state.textContent = 'All changes saved'; })
        .catch(err => { state.textContent = `Not saved: ${err.message}`; throw err; });
      return saving;
    };
    form.addEventListener('input', () => { clearTimeout(timer); state.textContent = 'Unsaved changes'; timer = setTimeout(() => save().catch(() => {}), 900); });
    form.addEventListener('change', () => { clearTimeout(timer); timer = setTimeout(() => save().catch(() => {}), 300); });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const { answered, total } = answeredCount(collectAnswers(form));
      try {
        await save(true);
        sessionStorageSafe('ffp-toast', answered < total ? `Intake submitted. You answered ${answered} of ${total} questions — you can come back and add more until class starts.` : 'Intake submitted. Thank you!');
        location.href = link('account/');
      } catch { /* message already shown */ }
    });
    addEventListener('beforeunload', e => { if (state.textContent === 'Unsaved changes' || state.textContent === 'Saving…') e.preventDefault(); });
  }
}

function sessionStorageSafe(key, value) { try { sessionStorage.setItem(key, value); } catch { toast(value); } }
