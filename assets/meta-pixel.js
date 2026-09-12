/* Meta Pixel bridge. It remains a no-op until a real numeric ID is placed in the page meta tag. */
(function () {
  'use strict';
  var tag = document.querySelector('meta[name="meta-pixel-id"]');
  var pixelId = tag ? String(tag.content || '').trim() : '';
  if (!/^\d+$/.test(pixelId)) return;

  var initialized = false;
  var pageViewSent = false;
  window.fbq = window.fbq || function () {
    window.fbq.callMethod ? window.fbq.callMethod.apply(window.fbq, arguments) : window.fbq.queue.push(arguments);
  };
  window.fbq.push = window.fbq;
  window.fbq.loaded = true;
  window.fbq.version = '2.0';
  window.fbq.queue = window.fbq.queue || [];

  function init() {
    if (initialized) return;
    initialized = true;
    window.fbq('init', pixelId);
    window.fbq('track', 'PageView');
    pageViewSent = true;
    if (!document.getElementById('meta-pixel-sdk')) {
      var script = document.createElement('script');
      script.id = 'meta-pixel-sdk';
      script.async = true;
      script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      document.head.appendChild(script);
    }
  }

  window.addEventListener('lrp:track', function (event) {
    var detail = event && event.detail ? event.detail : {};
    var eventName = String(detail.event_name || '');
    init();
    if (eventName === 'page_view' && !pageViewSent) {
      window.fbq('track', 'PageView');
      pageViewSent = true;
    }
    if (eventName === 'form_submit_success') {
      window.fbq('track', 'Lead', { content_name: 'free_missed_call_audit' });
    }
    if (eventName === 'cta_click') {
      window.fbq('trackCustom', 'LeadRescueProCTA');
    }
  });

  init();
})();
