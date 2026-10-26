import { renderChrome, pageHero, $ } from '../app/lib/core.js';
import { CONFIG } from '../app/config.js';

// DRAFT wording written from what the app actually does. Must be approved by Kye and Sonia
// (a legal review is advisable) before launch.
await renderChrome();
const email = CONFIG.contactEmail;
$('#main').innerHTML = pageHero({ eyebrow: 'Privacy', title: 'Privacy <span>Policy.</span>', lead: 'How The Fibroid Fixer Program collects, uses and protects your information.', narrow: true })
  + `<div class="wrap-narrow page-body prose">
  <p><span class="draft-badge">Draft — awaiting approval</span></p>
  <h2>What we collect</h2>
  <ul>
    <li><strong>Account details:</strong> your name, email address and, if you choose to give it, your phone number.</li>
    <li><strong>Registration and payment records:</strong> which classes you registered for, the amount you paid, and links to your receipt and invoice. Card details are entered on Stripe’s secure page and are never seen or stored by us.</li>
    <li><strong>Intake information:</strong> your consent choices and your answers to the Pre-Class Survey, which include health information about fibroids, your menstrual cycle, symptoms and medical care. Every question is optional.</li>
    <li><strong>Class attendance details:</strong> your personal Zoom link and whether it has been sent.</li>
  </ul>
  <h2>How we use it</h2>
  <ul>
    <li>To register you for classes, take payment and send receipts.</li>
    <li>To send emails about your class: sign-in links, confirmation, intake reminders, your Zoom link and class reminders.</li>
    <li>To prepare Brother Long to teach your class, using your intake answers.</li>
    <li>Optional uses of de-identified information (such as case studies) happen only if you choose YES on the consent form, and you can change your mind by writing to us.</li>
  </ul>
  <h2>Who can see it</h2>
  <ul>
    <li><strong>You</strong> can see your own registrations, payments and intake answers in your account at any time.</li>
    <li><strong>Brother Long</strong> (the program owner) can see registrations, payments and intake answers.</li>
    <li><strong>Assistants</strong> who help run classes can see names, contact details and whether intake is complete. They cannot see payment amounts or intake answers unless Brother Long gives them that access.</li>
  </ul>
  <h2>Services we use</h2>
  <ul>
    <li><strong>Supabase</strong> stores account, registration and intake information in a protected database.</li>
    <li><strong>Stripe</strong> processes payments and receipts.</li>
    <li><strong>Zoom</strong> receives your name and email to create your personal class link.</li>
    <li><strong>Google (Gmail)</strong> is used to send the program’s emails, and to sign you in if you choose “Continue with Google.”</li>
  </ul>
  <p>Your intake answers are never included in emails and are never shared with Stripe or Zoom.</p>
  <h2>What we don’t do</h2>
  <ul><li>We don’t sell your information.</li><li>We don’t use advertising or tracking tools on this site.</li></ul>
  <h2>Your choices</h2>
  <p>You can update your name and phone number in your account. To ask for a copy of your information, a correction, or for your account to be deleted, email <a class="inline-link" href="mailto:${email}">${email}</a>. Some payment records may need to be kept for tax and accounting purposes.</p>
  <h2>Newsletter</h2>
  <p>If you sign up for updates on the home page, your email address is kept in a separate mailing list used only for program news. You can ask to be removed at any time.</p>
  <h2>Contact</h2>
  <p>Questions about privacy: <a class="inline-link" href="mailto:${email}">${email}</a>.</p>
</div>`;
