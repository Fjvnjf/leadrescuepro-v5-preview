/* V5 owner booking journey. No customer values are sent to analytics. */
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
const SOCIAL_KEYS = ['social_platform', 'social_profile_type', 'social_post_id', 'social_post_url'];
const REQUIRED_FIELDS = ['name', 'business_name', 'phone', 'city_state', 'missed_calls', 'best_time'];
const FORM_NAME = 'free_missed_call_audit';
const INTAKE_URL = '/api/marketing/leads/intake';
const THANK_YOU_PATH = '/free-missed-call-audit/thank-you/';
const RECEIPT_KEY = 'lrp_v5_audit_receipt';
const trim = value => String(value ?? '').trim();

export function normalizeWebsite(value) {
  const input = trim(value);
  if (!input) return '';
  try {
    const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !url.hostname.includes('.') || /\s/.test(input)) return null;
    // A colon may only belong to an explicit http(s) scheme or a valid port.
    if (/^[a-z][a-z\d+.-]*:/i.test(input) && !/^https?:\/\//i.test(input)) return null;
    return url.href;
  } catch { return null; }
}

export function validateAuditPayload(payload) {
  const errors = {};
  REQUIRED_FIELDS.forEach(name => { if (!trim(payload[name])) errors[name] = 'Please complete this field.'; });
  const phone = trim(payload.phone);
  const digits = phone.replace(/\D/g, '');
  if (phone && (!/^\+?[\d\s().-]+$/.test(phone) || !(digits.length === 10 || (digits.length === 11 && digits.startsWith('1'))))) {
    errors.phone = 'Enter a 10-digit U.S. number, with an optional +1.';
  }
  const city = trim(payload.city_state);
  if (city && !/^.+?,\s*[A-Za-z][A-Za-z\s]{1,15}$/.test(city) && !/^.+\s+[A-Za-z]{2}$/.test(city)) {
    errors.city_state = 'Include your city and state, for example Austin, TX.';
  }
  if (trim(payload.website_or_gbp) && normalizeWebsite(payload.website_or_gbp) === null) {
    errors.website_or_gbp = 'Enter a valid website or Google Business Profile link.';
  }
  const email = trim(payload.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.';
  if (String(payload.contact_consent || '').toLowerCase() !== 'yes') errors.contact_consent = 'Please agree to receive calls and texts about your request.';
  return errors;
}

export function confirmedSubmission(response, data) {
  return Boolean(response.ok && data?.ok === true && !data.spamFiltered && typeof data.leadId === 'string' && data.leadId.trim());
}

export function submissionError(status, data = {}) {
  if (status === 409) return 'We already have a request for this phone number. Please call LeadRescuePro if you need to update it.';
  if (status === 429) return 'Too many attempts. Please wait before trying again, or call LeadRescuePro.';
  if (status === 400 || status === 422) return 'Please check the highlighted details and try again.';
  if (status >= 500) return 'Our request service is temporarily unavailable. Your details are still here. Please try again or call LeadRescuePro.';
  if (data.spamFiltered) return 'We could not confirm your request. Please reload the page and try again, or call LeadRescuePro.';
  return 'We could not confirm your request. Your details are still here. Please try again or call LeadRescuePro.';
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') initializeFunnel();

function initializeFunnel() {
  const memory = new Map();
  const storage = {
    get(kind, key) {
      try { return window[kind].getItem(key) ?? memory.get(key) ?? null; }
      catch { return memory.get(key) ?? null; }
    },
    set(kind, key, value) {
      memory.set(key, value);
      try { window[kind].setItem(key, value); } catch { /* Form remains usable without storage. */ }
    }
  };
  function readObject(key) {
    try {
      const value = JSON.parse(storage.get('localStorage', key) || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch { return {}; }
  }
  const query = new URLSearchParams(location.search);
  function attribution(keys, key) {
    const existing = readObject(key);
    const fresh = keys.some(name => trim(query.get(name)));
    const result = Object.fromEntries(keys.map(name => [name, trim(fresh ? query.get(name) : existing[name]).slice(0, name.endsWith('_url') ? 500 : 200)]));
    storage.set('localStorage', key, JSON.stringify(result));
    return result;
  }
  const utm = attribution(UTM_KEYS, 'lrp_marketing_utm');
  const social = attribution(SOCIAL_KEYS, 'lrp_marketing_social');
  let sessionId = storage.get('localStorage', 'lrp_marketing_session_id');
  if (!sessionId) {
    sessionId = window.crypto?.randomUUID?.() || `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    storage.set('localStorage', 'lrp_marketing_session_id', sessionId);
  }
  const source = document.body.dataset.pageSource || 'homepage_cinematic_v5';
  const safeReferrer = (() => { try { const url = new URL(document.referrer); return url.origin + url.pathname; } catch { return ''; } })();
  let preview = location.hostname.endsWith('.github.io');
  if (preview) displayPreview();
  const context = () => ({ session_id: sessionId, page_path: location.pathname, referrer: safeReferrer, source, ...utm, ...social });
  const allowedEvents = new Set(['page_view', 'cta_click', 'phone_click', 'audit_form_start', 'form_validation_error', 'form_submit_success', 'form_submit_failed', 'audit_thank_you_view']);
  function track(name, details = {}) {
    if (!allowedEvents.has(name)) return;
    const detail = { ...context(), event_name: name, event_category: details.event_category || 'website', source: details.source || source, metadata_json: JSON.stringify({ preview, ...(details.metadata || {}) }) };
    window.dispatchEvent(new CustomEvent('lrp:track', { detail }));
    const body = JSON.stringify(detail);
    try {
      if (navigator.sendBeacon?.('/api/marketing/analytics/event', new Blob([body], { type: 'application/json' }))) return;
      fetch('/api/marketing/analytics/event', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'same-origin', body, keepalive: true }).catch(() => {});
    } catch { /* Analytics must never block the request. */ }
  }
  window.LRPAnalytics = { track, context };

  function displayPreview() {
    document.querySelectorAll('[data-preview-note]').forEach(element => {
      element.hidden = false;
      element.textContent = 'Private design preview. Forms are simulated; no real request is sent.';
    });
    if (location.pathname === THANK_YOU_PATH) setReceiptView();
  }
  const previewController = new AbortController();
  const previewTimeout = window.setTimeout(() => previewController.abort(), 2000);
  const previewReady = fetch('/__preview', { credentials: 'same-origin', cache: 'no-store', signal: previewController.signal })
    .then(async response => {
      if (!response.ok || response.headers.get('X-LRP-Preview') !== '1') return;
      const data = await response.json();
      if (data.preview === true) { preview = true; displayPreview(); }
    }).catch(() => {}).finally(() => window.clearTimeout(previewTimeout));

  function setReceiptView() {
    let receipt = null;
    try { receipt = JSON.parse(storage.get('sessionStorage', RECEIPT_KEY) || 'null'); } catch { /* Direct visit. */ }
    const recent = receipt && receipt.path === THANK_YOU_PATH && Date.now() - receipt.at < 30 * 60 * 1000;
    const heading = document.querySelector('[data-thank-you-title]') || document.querySelector('h1');
    const message = document.querySelector('[data-thank-you-message]');
    if (preview || (recent && receipt.preview)) {
      if (heading) heading.textContent = recent ? 'Preview complete. No request was sent.' : 'This is the preview confirmation page.';
      if (message) message.textContent = 'This private preview uses a simulated form. No real audit request was sent, and nobody will call from this test.';
    } else if (recent) {
      if (heading) heading.textContent = 'Your audit request is in.';
      if (message) message.textContent = 'Our AI scheduling assistant will call shortly to confirm fit and help you choose a time with your LeadRescuePro closer.';
    } else {
      if (heading) heading.textContent = 'Book a free audit.';
      if (message) message.textContent = 'Submit the form to request a short review with a LeadRescuePro human closer.';
    }
  }
  if (location.pathname === THANK_YOU_PATH) {
    setReceiptView();
    previewReady.then(() => track('audit_thank_you_view', { event_category: 'lead' }));
  }
  previewReady.then(() => track('page_view'));

  document.addEventListener('click', event => {
    const element = event.target instanceof Element ? event.target.closest('a, [data-track-event]') : null;
    if (!element) return;
    const href = element.getAttribute('href') || '';
    const name = href.startsWith('tel:') ? 'phone_click' : element.dataset.trackEvent || (href.includes('/free-missed-call-audit') ? 'cta_click' : '');
    if (name) track(name, { event_category: 'cta', source: element.dataset.trackSource || source, metadata: { placement: element.dataset.trackSource || element.dataset.track || element.id || '', destination: href.startsWith('tel:') ? 'business_phone' : href.split('?')[0].slice(0, 200) } });
  });

  function trackingFields(form) {
    const fields = { form_name: FORM_NAME, source: form.dataset.source || source, source_page: location.pathname + (UTM_KEYS.some(key => query.has(key)) ? `?${new URLSearchParams(Object.entries(utm).filter(([, value]) => value))}` : ''), referrer: safeReferrer, ...utm, ...social };
    for (const [name, value] of Object.entries(fields)) {
      let field = form.elements.namedItem(name);
      if (!field) { field = document.createElement('input'); field.type = 'hidden'; field.name = name; form.append(field); }
      field.value = value;
    }
  }
  function status(form, text, error = false) {
    const element = document.getElementById(form.dataset.statusId) || form.querySelector('[role="status"], .form-status');
    if (!element) return;
    element.textContent = text;
    element.classList.toggle('is-error', error);
    element.dataset.state = error ? 'error' : 'status';
  }
  function showErrors(form, errors) {
    [...REQUIRED_FIELDS, 'website_or_gbp', 'email', 'contact_consent'].forEach(name => {
      const field = form.elements.namedItem(name);
      if (!field) return;
      field.setAttribute('aria-invalid', errors[name] ? 'true' : 'false');
      const element = document.getElementById(`${field.id || name}-error`);
      if (element) { element.textContent = errors[name] || ''; if (errors[name]) field.setAttribute('aria-describedby', element.id); }
    });
    const firstName = Object.keys(errors)[0];
    if (firstName) form.elements.namedItem(firstName)?.focus();
  }
  function serverErrors(data) {
    const result = {};
    if (!Array.isArray(data.fields)) return result;
    const mappings = { full_name: 'name', company_name: 'business_name', phone: 'phone', city: 'city_state', state: 'city_state', missed_calls: 'missed_calls', best_time: 'best_time', email: 'email', contact_consent: 'contact_consent' };
    data.fields.forEach(message => {
      const key = Object.keys(mappings).find(field => String(message).startsWith(field));
      if (key) result[mappings[key]] = key === 'phone' ? 'Enter a valid U.S. phone number.' : 'Please check this field.';
    });
    return result;
  }

  document.querySelectorAll('form[data-lead-form]').forEach(form => {
    let pending = false;
    let started = false;
    const start = () => { if (!started) { started = true; track('audit_form_start', { event_category: 'lead', source: form.dataset.source, metadata: { form_name: FORM_NAME } }); } };
    form.addEventListener('focusin', start);
    form.addEventListener('input', start);
    trackingFields(form);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (pending) return;
      pending = true; // Set synchronously, before preview detection or any request.
      start();
      const button = form.querySelector('[type="submit"]');
      const originalContents = button ? [...button.childNodes].map(child => child.cloneNode(true)) : [];
      let navigating = false;
      try {
        const initial = Object.fromEntries(new FormData(form));
        if (trim(initial._gotcha)) {
          status(form, 'We could not confirm your request. Please reload and try again.', true);
          return;
        }
        const errors = validateAuditPayload(initial);
        showErrors(form, errors);
        if (Object.keys(errors).length) {
          status(form, 'Please check the highlighted fields.', true);
          track('form_validation_error', { event_category: 'lead', source: form.dataset.source, metadata: { fields: Object.keys(errors), form_name: FORM_NAME } });
          return;
        }
        if (button) { button.disabled = true; button.textContent = 'Sending your request…'; }
        form.setAttribute('aria-busy', 'true');
        status(form, 'Checking your request…');
        await previewReady;
        trackingFields(form);
        const data = new FormData(form);
        [...REQUIRED_FIELDS, 'website_or_gbp', 'email', 'contact_consent'].forEach(name => data.set(name, trim(data.get(name))));
        data.set('website_or_gbp', normalizeWebsite(data.get('website_or_gbp')) || '');
        if (button && preview) button.textContent = 'Testing your request…';
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 18000);
        let response;
        try {
          if (preview) {
            response = new Response(JSON.stringify({ ok: true, preview: true, leadId: `preview-${Date.now()}` }), { status: 200, headers: { 'content-type': 'application/json', 'X-LRP-Preview': '1' } });
          } else {
            response = await fetch(INTAKE_URL, { method: 'POST', body: data, credentials: 'same-origin', signal: controller.signal });
          }
        } finally { window.clearTimeout(timeout); }
        const rawResult = await response.json().catch(() => ({}));
        const result = rawResult && typeof rawResult === 'object' && !Array.isArray(rawResult) ? rawResult : {};
        if (!confirmedSubmission(response, result)) {
          showErrors(form, serverErrors(result));
          status(form, submissionError(response.status, result), true);
          track('form_submit_failed', { event_category: 'lead', source: form.dataset.source, metadata: { status: response.status, reason: result.spamFiltered ? 'unconfirmed' : 'service', form_name: FORM_NAME } });
          return;
        }
        const isPreview = result.preview === true || response.headers.get('X-LRP-Preview') === '1';
        // A short-lived receipt prevents a direct URL visit from claiming a submission.
        storage.set('sessionStorage', RECEIPT_KEY, JSON.stringify({ preview: isPreview, at: Date.now(), path: THANK_YOU_PATH }));
        status(form, isPreview ? 'Preview complete. No request was sent.' : 'Request received. Opening your confirmation…');
        track('form_submit_success', { event_category: 'lead', source: form.dataset.source, metadata: { form_name: FORM_NAME, preview: isPreview } });
        navigating = true;
        window.location.assign(THANK_YOU_PATH);
      } catch (error) {
        status(form, error?.name === 'AbortError' ? 'The request timed out. Your details are still here. Please try again or call LeadRescuePro.' : 'We could not reach the request service. Your details are still here. Check your connection and try again.', true);
        track('form_submit_failed', { event_category: 'lead', source: form.dataset.source, metadata: { reason: error?.name === 'AbortError' ? 'timeout' : 'network', form_name: FORM_NAME } });
      } finally {
        if (!navigating) {
          pending = false;
          form.removeAttribute('aria-busy');
          if (button) { button.disabled = false; button.replaceChildren(...originalContents); }
        }
      }
    });
  });
}
