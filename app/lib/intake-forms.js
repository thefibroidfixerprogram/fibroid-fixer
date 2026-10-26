// Intake content, verbatim from Sonia's documents "FFP: Pre-Class Survey" and
// "FFP: Participant Consent & Authorization". Do not add, remove or reword questions.
// Question ids are stable keys for stored answers; never rename an id once answers exist.
import { esc } from './core.js';

const YES_NO = ['Yes', 'No'];
const NO_YES = ['No', 'Yes'];
const FREQ = ['Never', 'Rarely', 'Sometimes', 'Often', 'Very often'];
const SYMPTOM_SCALE = { lo: 'No symptom at all', hi: 'Most severe you can imagine' };
const LIFE_SCALE = { lo: 'Not at all', hi: 'Extremely' };

export const SURVEY = {
  version: '1',
  title: 'Pre-Class Survey',
  intro: 'This survey gives us a picture of your health, fibroid symptoms and quality of life before beginning the Fibroid Fixer Program. Please answer based on what you are experiencing now and, where indicated, your most recent menstrual cycle.',
  sections: [
    { id: 'about', title: 'About You', questions: [
      { id: 'participant_id', type: 'autofill', label: 'Participant ID' },
      { id: 'date', type: 'autofill', label: 'Date' },
      { id: 'age', type: 'short', label: 'Age', inputmode: 'numeric' },
      { id: 'diagnosed', type: 'single', label: 'Have you been diagnosed with uterine fibroids by a healthcare provider?', options: ['Yes', 'No', 'Unsure'] },
      { id: 'year_diagnosed', type: 'short', label: 'Year first diagnosed', inputmode: 'numeric' },
      { id: 'diagnosis_method', type: 'single', label: 'How were your fibroids diagnosed?', options: ['Ultrasound', 'MRI', 'Other:', 'I don’t know'], otherOption: 'Other:' },
      { id: 'recent_imaging_date', type: 'short', label: 'Date of your most recent imaging, if known' },
      { type: 'group', label: 'If known:', questions: [
        { id: 'fibroid_count', type: 'short', label: 'Number of fibroids' },
        { id: 'largest_fibroid_size', type: 'short', label: 'Size of largest fibroid' },
        { id: 'fibroid_location_type', type: 'short', label: 'Location/type of fibroids' },
        { id: 'uterine_size', type: 'short', label: 'Uterine size or measurement' },
      ] },
    ] },
    { id: 'cycle', title: 'Menstrual Cycle', questions: [
      { id: 'having_periods', type: 'single', label: 'Are you currently having menstrual periods?', options: ['Yes', 'No', 'Irregularly'] },
      { id: 'days_between_periods', type: 'short', label: 'Typical number of days between periods', inputmode: 'numeric' },
      { id: 'typical_bleeding_days', type: 'short', label: 'Typical number of bleeding days', inputmode: 'numeric' },
      { type: 'group', label: 'During your most recent menstrual cycle:', questions: [
        { id: 'recent_bleeding_days', type: 'short', label: 'Number of bleeding days', inputmode: 'numeric' },
        { id: 'recent_heavy_days', type: 'short', label: 'Number of days you considered your bleeding heavy', inputmode: 'numeric' },
      ] },
      { id: 'flooding', type: 'single', label: 'Did you experience flooding or sudden gushes of blood?', options: FREQ },
      { id: 'clots', type: 'single', label: 'Did you pass blood clots?', options: FREQ },
      { id: 'clot_size', type: 'short', label: 'If yes, describe the approximate size of the largest clots', showIf: { q: 'clots', in: ['Rarely', 'Sometimes', 'Often', 'Very often'] } },
      { id: 'product_change_frequency', type: 'short', label: 'On your heaviest day, approximately how often did you need to change your menstrual product?' },
      { id: 'double_product', type: 'single', label: 'Did you need to use more than one menstrual product at the same time to control bleeding?', options: YES_NO },
      { id: 'sleep_interference', type: 'single', label: 'Did bleeding interfere with your sleep or require you to get up during the night?', options: YES_NO },
      { id: 'activities_affected', type: 'single', label: 'Did bleeding cause you to cancel, avoid or change work, social activities, exercise, travel or other normal activities?', options: YES_NO },
      { id: 'activities_affected_details', type: 'long', label: 'If yes, please describe', showIf: { q: 'activities_affected', in: ['Yes'] } },
    ] },
    { id: 'symptoms', title: 'Current Symptoms', note: 'Please rate each symptom based on your experience during your most recent menstrual cycle.', scaleKey: '0 = No symptom at all · 10 = Most severe you can imagine', questions: [
      ['sym_heavy_bleeding', 'Heavy menstrual bleeding'],
      ['sym_menstrual_pain', 'Menstrual pain or cramping'],
      ['sym_pelvic_pain', 'Pelvic pain outside your menstrual period'],
      ['sym_pelvic_pressure', 'Pelvic pressure or heaviness'],
      ['sym_bloating', 'Abdominal bloating or fullness'],
      ['sym_enlargement', 'Visible abdominal enlargement'],
      ['sym_lower_back_pain', 'Lower back pain'],
      ['sym_urinary', 'Urinary frequency or urgency'],
      ['sym_bowel', 'Constipation or difficulty with bowel movements'],
      ['sym_fatigue', 'Fatigue or low energy'],
      ['sym_sex_pain', 'Pain or discomfort during sex, if applicable'],
    ].map(([id, label]) => ({ id, type: 'scale', label, ...SYMPTOM_SCALE })).concat([
      { id: 'sym_other_1', type: 'scale_other', label: 'Other symptom', ...SYMPTOM_SCALE },
      { id: 'sym_other_2', type: 'scale_other', label: 'Other symptom', ...SYMPTOM_SCALE },
      { id: 'sym_overall', type: 'scale', label: 'Overall, how severe have your fibroid-related symptoms been?', ...SYMPTOM_SCALE },
    ]) },
    { id: 'life', title: 'Effect on Your Life', note: 'Please rate how much your fibroid symptoms currently interfere with each area.', scaleKey: '0 = Not at all · 10 = Extremely', questions: [
      ['life_daily', 'Daily activities'],
      ['life_work_school', 'Work or school'],
      ['life_sleep', 'Sleep'],
      ['life_exercise', 'Exercise or physical activity'],
      ['life_social', 'Social activities'],
      ['life_intimacy', 'Sexual activity or intimacy, if applicable'],
      ['life_mood', 'Mood or emotional well-being'],
      ['life_energy', 'Energy'],
      ['life_plans', 'Ability to make plans without worrying about your period or symptoms'],
      ['life_overall', 'Overall quality of life'],
    ].map(([id, label]) => ({ id, type: 'scale', label, ...LIFE_SCALE })) },
    { id: 'medical', title: 'Medical History and Current Care', questions: [
      { id: 'prior_treatment', type: 'single', label: 'Have you previously received treatment for fibroids?', options: NO_YES },
      { id: 'prior_treatment_types', type: 'multi', label: 'If yes, please check all that apply', showIf: { q: 'prior_treatment', in: ['Yes'] },
        options: ['Medication', 'Hormonal treatment or birth control', 'Myomectomy', 'Uterine fibroid embolization', 'Ablation or focused ultrasound procedure', 'Other procedure:', 'Other:'], otherOptions: ['Other procedure:', 'Other:'] },
      { id: 'current_medications', type: 'single', label: 'Are you currently taking medications, hormones or supplements that may affect your menstrual cycle or fibroid symptoms?', options: NO_YES },
      { id: 'current_medications_list', type: 'long', label: 'If yes, please list', showIf: { q: 'current_medications', in: ['Yes'] } },
      { id: 'other_conditions', type: 'single', label: 'Do you have other gynecological or health conditions that may affect your menstrual cycle, pelvic symptoms, bleeding, pain or energy?', options: NO_YES },
      { id: 'other_conditions_details', type: 'long', label: 'If yes, please describe', showIf: { q: 'other_conditions', in: ['Yes'] } },
      { id: 'procedure_recommended', type: 'single', label: 'Has a healthcare provider recommended a medical procedure or surgery for your fibroids?', options: ['No', 'Yes', 'A procedure has been discussed but not recommended', 'Prefer not to answer'] },
      { id: 'procedure_recommended_details', type: 'short', label: 'If yes, what was recommended?', showIf: { q: 'procedure_recommended', in: ['Yes'] } },
    ] },
    { id: 'goals', title: 'Your Goals', questions: [
      { type: 'group', label: 'What are the THREE fibroid-related symptoms you most want to see change?', questions: [
        { id: 'goal_symptom_1', type: 'short', label: '1.' },
        { id: 'goal_symptom_2', type: 'short', label: '2.' },
        { id: 'goal_symptom_3', type: 'short', label: '3.' },
      ] },
      { id: 'hoped_changes', type: 'long', label: 'If this program is helpful to you, what changes would you personally hope to notice?' },
      { id: 'worthwhile', type: 'long', label: 'What would make you consider your participation in this program worthwhile?' },
      { id: 'anything_else', type: 'long', label: 'Is there anything else about your experience with fibroids that you believe is important for us to know before you begin?' },
    ] },
  ],
};

export const CONSENT = {
  version: '1',
  title: 'Fibroid Fixer Program — Participant Consent and Authorization',
  body: `
<p>The Fibroid Fixer Program is a 12-hour Qigong-based program for women living with uterine fibroids. As part of the program, we would like to document participants’ experiences before and after participation so we can better understand what changes, if any, occur over time.</p>
<p>Please read the information below and ask any questions you have before signing.</p>
<h3>Participation and Medical Care</h3>
<p>I understand that participation in the Fibroid Fixer Program is voluntary and may include Qigong movement, breathing, meditation, visualization and related practices. I may choose not to participate in any activity that I am uncomfortable doing.</p>
<p>I understand that the Fibroid Fixer Program is intended to complement, not replace, appropriate medical care. Participation does not establish a medical provider-patient relationship with Brother Long or the Fibroid Fixer Program. I am responsible for seeking appropriate medical care and discussing decisions about medications, procedures, surgery or other medical treatment with a licensed healthcare provider.</p>
<h3>Outcome Tracking</h3>
<p>To understand participants’ experiences, the program may collect information through:</p>
<ul><li>A Pre-Class Survey</li><li>An Immediate Post-Class Survey</li><li>A follow-up after my next menstrual cycle</li><li>A follow-up approximately three months after the program</li></ul>
<p>These surveys may ask about my fibroid history, menstrual cycles, symptoms, quality of life, Qigong practice, medical treatments and other factors that could affect my experience.</p>
<p>I understand that there is no “right” outcome to report. My symptoms may improve, remain the same, change in different ways or worsen. I am encouraged to report my experience accurately.</p>
<p>I may also voluntarily provide information from medical care I receive outside the program, such as ultrasound/MRI findings or relevant laboratory results. I am not required to provide medical records or test results to participate.</p>
<h3>Privacy and Use of Information</h3>
<p>Information collected through the program will be handled with care. When information is used in a de-identified case study, reasonable efforts will be made to remove information that directly identifies me. I understand that complete anonymity cannot always be guaranteed, particularly if my circumstances are unusual or recognizable to someone who knows me.</p>
<p>My decision about the optional uses below will <strong>not affect my ability to participate in the Fibroid Fixer Program.</strong></p>`,
  choicesIntro: 'My Choices — Please check YES or NO for each item.',
  choices: [
    { id: 'outcome_tracking', title: 'Program outcome tracking and follow-up', text: 'I agree to complete program surveys and be contacted for follow-up after my next menstrual cycle and approximately three months after the program.' },
    { id: 'case_study', title: 'De-identified case study', text: 'My de-identified information may be used to create a case study documenting my experience and outcomes.' },
    { id: 'education', title: 'Education and presentations', text: 'My de-identified information may be used in educational materials or presentations about the program.' },
    { id: 'website_promo', title: 'Website and promotional use', text: 'My de-identified information may be used on the program’s website, social media or other informational/promotional materials.' },
    { id: 'anonymous_quotes', title: 'Anonymous quotations', text: 'Statements I make about my experience may be quoted without my name or other direct identifying information.' },
    { id: 'publication', title: 'Possible future case reports or publication', text: 'My de-identified program information may be considered for future case reports or publication, subject to any additional consent, authorization, review or other requirements that may apply at that time.' },
    { id: 'testimonial_contact', title: 'Identifiable testimonial', text: 'I may be contacted in the future to ask whether I would like to provide a testimonial using my name, photograph, voice or video.', note: 'Checking YES only gives permission to <strong>contact me about a testimonial.</strong> It does not give permission to publish my identity, photograph, voice or video. Separate permission will be requested before identifiable material is used.' },
  ],
  after: `
<h3>Changing My Mind</h3>
<p>I may decline to answer individual survey questions or stop participating in follow-up surveys.</p>
<p>I may also withdraw permission for future optional use of my information by contacting the Fibroid Fixer Program in writing. I understand that information already published, presented or distributed may not be able to be withdrawn.</p>
<h3>Participant Acknowledgment</h3>
<p>By signing below, I confirm that I have read this form, had an opportunity to ask questions and understand my choices regarding participation and use of my information.</p>`,
};

// ---------- rendering ----------
const flat = qs => qs.flatMap(q => q.type === 'group' ? q.questions : [q]);
export const allQuestions = () => SURVEY.sections.flatMap(s => flat(s.questions));

function scaleHTML(name, value, q, disabled) {
  const cells = Array.from({ length: 11 }, (_, n) => `<label class="choice"><input type="radio" name="${name}" value="${n}"${String(value) === String(n) ? ' checked' : ''}${disabled}><span>${n}</span></label>`).join('');
  return `<div class="scale" role="radiogroup" aria-label="${esc(q.label)}, 0 to 10">${cells}</div><div class="scale-ends" aria-hidden="true"><span>0 · ${esc(q.lo)}</span><span>10 · ${esc(q.hi)}</span></div>`;
}

function questionHTML(q, answers, ctx) {
  const v = answers[q.id];
  const dis = ctx.readonly ? ' disabled' : '';
  const hidden = q.showIf && !q.showIf.in.includes(answers[q.showIf.q]) ? ' hidden' : '';
  const show = q.showIf ? ` data-show-q="${q.showIf.q}" data-show-in="${esc(q.showIf.in.join('|'))}"` : '';
  const cls = `q${q.showIf ? ' q-sub' : ''}`;
  const fid = `q-${q.id}`;
  switch (q.type) {
    case 'autofill':
      return `<dl class="autofill"><dt>${esc(q.label)}</dt><dd>${esc(ctx.autofill[q.id] || '')}</dd></dl>`;
    case 'short':
      return `<div class="${cls}"${show}${hidden}><label class="q-label" for="${fid}">${esc(q.label)}</label><input class="input" id="${fid}" name="${q.id}" value="${esc(v || '')}" maxlength="300"${q.inputmode ? ` inputmode="${q.inputmode}"` : ''}${dis}></div>`;
    case 'long':
      return `<div class="${cls}"${show}${hidden}><label class="q-label" for="${fid}">${esc(q.label)}</label><textarea class="textarea" id="${fid}" name="${q.id}" maxlength="4000"${dis}>${esc(v || '')}</textarea></div>`;
    case 'single': {
      const other = q.otherOption ? `<div class="q-other" data-other-for="${q.id}"${v === q.otherOption ? '' : ' hidden'}><label class="visually-hidden" for="${fid}-other">Other, please specify</label><input class="input" id="${fid}-other" name="${q.id}__other" value="${esc(answers[q.id + '__other'] || '')}" placeholder="Please specify" maxlength="300"${dis}></div>` : '';
      return `<fieldset class="${cls}"${show}${hidden}><legend class="q-label">${esc(q.label)}</legend><div class="choice-group">${q.options.map(o => `<label class="choice"><input type="radio" name="${q.id}" value="${esc(o)}"${v === o ? ' checked' : ''}${dis}><span>${esc(o)}</span></label>`).join('')}</div>${other ? `<div class="q-other-wrap">${other}</div>` : ''}</fieldset>`;
    }
    case 'multi': {
      const chosen = Array.isArray(v) ? v : [];
      const others = (q.otherOptions || []).map((o, i) => `<div class="q-other" data-other-for="${q.id}" data-other-option="${esc(o)}"${chosen.includes(o) ? '' : ' hidden'}><label class="small" for="${fid}-other${i}">${esc(o)}</label><input class="input" id="${fid}-other${i}" name="${q.id}__other${i}" value="${esc(answers[`${q.id}__other${i}`] || '')}" maxlength="300"${dis}></div>`).join('');
      return `<fieldset class="${cls}"${show}${hidden}><legend class="q-label">${esc(q.label)}</legend><div class="choice-group">${q.options.map(o => `<label class="choice"><input type="checkbox" name="${q.id}" value="${esc(o)}"${chosen.includes(o) ? ' checked' : ''}${dis}><span>${esc(o)}</span></label>`).join('')}</div>${others ? `<div class="stack">${others}</div>` : ''}</fieldset>`;
    }
    case 'scale':
      return `<fieldset class="${cls}"${show}${hidden}><legend class="q-label">${esc(q.label)}</legend>${scaleHTML(q.id, v, q, dis)}</fieldset>`;
    case 'scale_other':
      return `<fieldset class="${cls}"><legend class="q-label">${esc(q.label)}</legend><label class="visually-hidden" for="${fid}-name">Describe the other symptom</label><input class="input" id="${fid}-name" name="${q.id}__name" value="${esc(answers[q.id + '__name'] || '')}" placeholder="Describe the symptom" maxlength="200"${dis}><div class="stack"><div></div>${scaleHTML(q.id, v, q, dis)}</div></fieldset>`;
    default: return '';
  }
}

export function surveyHTML(answers, ctx) {
  return SURVEY.sections.map(s => `<section class="survey-section" aria-labelledby="sec-${s.id}">
    <h2 id="sec-${s.id}">${esc(s.title)}</h2>
    ${s.note ? `<p class="section-note">${esc(s.note)}</p>` : ''}${s.scaleKey ? `<p class="scale-key">${esc(s.scaleKey)}</p>` : ''}
    ${s.questions.map(q => q.type === 'group'
      ? `<div class="q"><p class="q-group-label">${esc(q.label)}</p>${q.questions.map(sub => questionHTML(sub, answers, ctx)).join('')}</div>`
      : questionHTML(q, answers, ctx)).join('')}
  </section>`).join('');
}

// Reads every answer from the form. Hidden follow-ups are dropped so a changed "Yes" -> "No" doesn't keep stale details.
export function collectAnswers(form) {
  const data = new FormData(form);
  const answers = {};
  for (const q of allQuestions()) {
    if (q.type === 'autofill') continue;
    const wrap = form.querySelector(`[name="${q.id}"]`)?.closest('[data-show-q]');
    if (wrap?.hidden) continue;
    if (q.type === 'multi') { const vals = data.getAll(q.id); if (vals.length) answers[q.id] = vals; (q.otherOptions || []).forEach((o, i) => { const t = data.get(`${q.id}__other${i}`); if (vals.includes(o) && t) answers[`${q.id}__other${i}`] = String(t).trim(); }); continue; }
    const v = data.get(q.id);
    if (v !== null && String(v).trim() !== '') answers[q.id] = q.type === 'scale' || q.type === 'scale_other' ? Number(v) : String(v).trim();
    if (q.otherOption && v === q.otherOption && data.get(q.id + '__other')) answers[q.id + '__other'] = String(data.get(q.id + '__other')).trim();
    if (q.type === 'scale_other' && data.get(q.id + '__name')) answers[q.id + '__name'] = String(data.get(q.id + '__name')).trim();
  }
  return answers;
}

// Keeps "If yes" follow-ups and "Other:" boxes in sync with the answers above them.
export function wireConditional(form) {
  const sync = () => {
    form.querySelectorAll('[data-show-q]').forEach(el => {
      const picked = form.querySelector(`[name="${el.dataset.showQ}"]:checked`)?.value;
      el.hidden = !el.dataset.showIn.split('|').includes(picked);
    });
    form.querySelectorAll('[data-other-for]').forEach(el => {
      const name = el.dataset.otherFor;
      const option = el.dataset.otherOption;
      const checked = [...form.querySelectorAll(`[name="${name}"]:checked`)].map(i => i.value);
      const q = allQuestions().find(x => x.id === name);
      el.hidden = !checked.includes(option || q?.otherOption);
    });
  };
  form.addEventListener('change', sync);
  sync();
}

export function answeredCount(answers) {
  const visible = allQuestions().filter(q => q.type !== 'autofill' && (!q.showIf || q.showIf.in.includes(answers[q.showIf.q])));
  return { answered: visible.filter(q => answers[q.id] !== undefined).length, total: visible.length };
}

// Read-only view for the student's own copy and for staff with intake-answer access.
export function answersReadonlyHTML(answers, autofill) {
  const show = (q) => {
    if (q.type === 'autofill') return `<div><dt>${esc(q.label)}</dt><dd>${esc(autofill[q.id] || '')}</dd></div>`;
    if (q.showIf && !q.showIf.in.includes(answers[q.showIf.q])) return '';
    let v = answers[q.id];
    if (Array.isArray(v)) v = v.map((x) => { const i = (q.otherOptions || []).indexOf(x); return i >= 0 && answers[`${q.id}__other${i}`] ? `${x} ${answers[`${q.id}__other${i}`]}` : x; }).join(', ');
    if (q.otherOption && v === q.otherOption && answers[q.id + '__other']) v = `${v} ${answers[q.id + '__other']}`;
    if (q.type === 'scale_other' && answers[q.id + '__name']) v = `${answers[q.id + '__name']}: ${v ?? '—'}/10`;
    else if (q.type === 'scale' && v !== undefined) v = `${v}/10`;
    return `<div><dt>${esc(q.label)}</dt><dd>${v === undefined || v === '' ? '<span class="muted">Not answered</span>' : esc(v)}</dd></div>`;
  };
  return SURVEY.sections.map(s => `<h3 class="q-group-label">${esc(s.title)}</h3><dl class="class-details">${s.questions.map(q => q.type === 'group' ? `<div><dt><strong>${esc(q.label)}</strong></dt><dd></dd></div>${q.questions.map(show).join('')}` : show(q)).join('')}</dl>`).join('');
}

export function consentReadonlyHTML(consent) {
  if (!consent) return '<p class="muted">Not signed yet.</p>';
  return `<dl class="class-details">${CONSENT.choices.map((c, i) => `<div><dt>${i + 1}. ${esc(c.title)}</dt><dd>${esc(consent.choices?.[c.id] || '—')}</dd></div>`).join('')}
    <div><dt>Participant name</dt><dd>${esc(consent.name)}</dd></div><div><dt>Signature (typed)</dt><dd>${esc(consent.signature)}</dd></div>
    <div><dt>Date</dt><dd>${esc(new Date(consent.signed_at).toLocaleDateString())}</dd></div><div><dt>Preferred email/phone for follow-up</dt><dd>${esc(consent.contact || '—')}</dd></div></dl>`;
}
