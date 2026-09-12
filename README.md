# LeadRescuePro V5 — Keep the banner. Show the story.

An isolated, unpublished three-page experiment. V4, production files and backups are preserved.

## Preview

From the repository root:

```sh
node experiments/frontend/homepage-visual-v5/scripts/preview-server.mjs
```

Open **http://127.0.0.1:8770/**. The audit and confirmation routes are `/free-missed-call-audit/` and `/free-missed-call-audit/thank-you/` on the same server.

Use this server rather than a generic static server. Its intake and analytics fixtures discard data, never contact production, and clearly label simulated confirmations. No database, notifications, live calls or AI requests are involved. All pages are noindex. Do not deploy this adapter.

## What changed

- The header and entire hero retain V4 markup, CSS, JavaScript, Three.js bundle, sculpture source and poster. Desktop/mobile frozen comparisons verify identical pixels.
- Below the banner, one 26-second narrated video tells a single fictional plumbing-call story: caller → dedicated AI number → “No hot water” → details captured → callback preference → example lead for the team. The voiceover is generated with Fish Audio and starts only after the visitor presses Play. Direct Calls, Overflow and After Hours show their actual routing distinction. The latter two explicitly show configured forwarding.
- Play starts only on a click; Pause retains progress, Replay restarts, and Next Step reveals each stage. Playback pauses offscreen and when the tab is hidden. Reduced motion uses manual step-through without loading the video.
- A fictional homeowner’s “No hot water” call becomes a clearly labeled example lead. It does not become a booking. Your team remains responsible for callbacks, dispatch and service.
- The outdated 42-second YouTube introduction is removed from V5 so visitors only see the current dedicated-number offer.
- Both prices stay visible. Inclusions use labeled SVG illustrations; supporting explanations and FAQs use native disclosures.
- Audit and thank-you explanations use three illustrated steps. Form controls, consent, validation, attribution, error handling, preview receipts and confirmed-success routing retain V4 behavior.

Only the homepage’s attribution source changes to `homepage_visual_v5`. The audit form identity remains `free_missed_call_audit`; audit page submission source remains `free_missed_call_audit_page`. Client code never emits the server-owned `audit_form_submit` conversion. `assets/funnel.js` is unchanged from V4.

## Files

`assets/call-flow-player.css` and `assets/call-flow-player.js` contain the player and accessible controls. The rendered desktop and mobile assets are `call-flow-explainer.mp4` and `call-flow-explainer-mobile.mp4`, with matching posters and the shared `call-flow-explainer.vtt` captions track. `video/hyperframes-call-story/` contains the HyperFrames desktop source; `video/remotion-call-story/` contains the Remotion mobile source. Their selectors are scoped below the banner. The existing Three.js sculpture remains unchanged.

No new build is needed. Three.js, Manrope and their existing licenses are included. The preview uses the production external-script CSP pattern, with no inline script exception.

## Verify

```sh
node --test experiments/frontend/homepage-visual-v5/tests/funnel-contract.test.mjs tests/marketing-helpers.test.mjs
node experiments/frontend/homepage-visual-v5/tests/browser-check.cjs
node experiments/frontend/homepage-visual-v5/tests/story-check.cjs
```

Browser tests require Playwright; set `LRP_PLAYWRIGHT_MODULE` to its installed module path. Set `LRP_AXE_MODULE` for accessibility scans. The preview origin can be overridden with `LRP_PREVIEW_ORIGIN`.

See `review/VERIFICATION.md`, JSON reports, screenshots and `review/visual-tour.webm` for evidence. All form tests use synthetic entries on the isolated local adapter.

## Promotion and rollback — future work

1. Choose the experiment first. Take a fresh snapshot of the actual deployed release, local production files, and routing; they may differ.
2. Stage only the three HTML pages and required assets. Namespace V5 production asset paths and update all three pages and module imports together; do not overwrite global CSS used elsewhere.
3. Keep the existing same-origin intake/analytics endpoints. Never publish the preview server, fixtures, tests or review material. Verify deployed audit support against an isolated staging database with notifications stubbed.
4. Replace any existing audit-to-checkout redirects, including hosting rules, only as part of that approved release. Retain unrelated pages and pending changes.
5. Add production canonical/social metadata, remove noindex from the chosen homepage/audit page, keep confirmation noindex, and disable preview detection in production configuration.
6. Verify persistence, deduplication, attribution and the server conversion event in staging, then review the release before deploying.
7. Roll back only the released pages/assets/routing to the fresh snapshot. Do not restore an entire stale public directory over newer work.

No deployment, API, database, checkout or telephony changes were made for V5.
