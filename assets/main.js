(() => {
  'use strict';
  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
  const menu = document.querySelector('.menu-toggle');
  const mobileMenu = document.querySelector('#mobile-menu');
  function closeMenu() { if (!menu) return; menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', 'Open menu'); mobileMenu.hidden = true; }
  menu?.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', String(open)); menu.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); mobileMenu.hidden = !open; });
  mobileMenu?.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && menu && !mobileMenu.hidden) { closeMenu(); menu.focus(); } });
  const scenarios = {
    direct: { kicker: 'DIRECT TO YOUR AI NUMBER', title: 'Give your next campaign\na number that answers.', description: 'Use the dedicated AI number on a campaign or share it directly. Calls to that number reach your AI receptionist for plumbing-specific intake.', note: 'No forwarding needed for calls made directly to the AI number.', sourceLabel: 'DIRECT CALL', source: 'Homeowner dials the AI number', path: 'Reaches your dedicated number' },
    overflow: { kicker: 'SELECTED OVERFLOW CALLS', title: 'Keep a busy line\nfrom becoming a dead end.', description: 'Configure your existing phone service to forward selected unanswered or busy calls to the dedicated AI number. Your receptionist gathers the details for your team.', note: 'Forwarding is optional and depends on your phone service and setup.', sourceLabel: 'YOUR EXISTING BUSINESS LINE', source: 'A selected busy or unanswered call', path: 'Your configured forwarding rules' },
    afterhours: { kicker: 'AFTER-HOURS COVERAGE', title: 'Close the office.\nKeep an answer available.', description: 'Route selected after-hours calls to your dedicated AI number. The receptionist collects the issue, urgency, and caller details using the rules you configure.', note: 'After-hours routing is configured with you; it is not switched on automatically.', sourceLabel: 'YOUR AFTER-HOURS CALL FLOW', source: 'A call arrives outside staffed hours', path: 'Your configured after-hours routing' }
  };
  const tabs = [...document.querySelectorAll('[data-scenario]')];
  function selectScenario(tab) {
    tabs.forEach(t => { const active = t === tab; t.setAttribute('aria-selected', String(active)); t.tabIndex = active ? 0 : -1; });
    const data = scenarios[tab.dataset.scenario];
    for (const [id, value] of Object.entries({ 'scenario-kicker': data.kicker, 'scenario-title': data.title, 'scenario-description': data.description, 'scenario-note': data.note, 'routing-source-label': data.sourceLabel, 'routing-source': data.source, 'routing-path': data.path })) document.getElementById(id).textContent = value;
    document.getElementById('scenario-panel').setAttribute('aria-labelledby', tab.id);
  }
  tabs.forEach((tab, index) => { tab.addEventListener('click', () => selectScenario(tab)); tab.addEventListener('keydown', event => { let next; if (event.key === 'ArrowRight') next = (index + 1) % tabs.length; if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length; if (event.key === 'Home') next = 0; if (event.key === 'End') next = tabs.length - 1; if (next !== undefined) { event.preventDefault(); selectScenario(tabs[next]); tabs[next].focus(); } }); });
  const host = document.querySelector('#scene-host');
  if (!host) return;
  const poster = document.querySelector('#scene-poster');
  function posterLoaded() { if (poster.naturalWidth) host.classList.add('has-poster'); }
  poster.addEventListener('load', posterLoaded); poster.addEventListener('error', () => { poster.hidden = true; host.classList.remove('has-poster'); }); posterLoaded();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 700px)');
  const explore = document.querySelector('#explore-3d');
  const motion = document.querySelector('#motion-toggle');
  const status = document.querySelector('#scene-status');
  const stageLabel = document.querySelector('#scene-stage-label');
  const stageButtons = [...document.querySelectorAll('[data-stage]')];
  const stages = ['CALLER', 'DEDICATED AI NUMBER', 'PLUMBING INTAKE', 'CALLBACK-READY LEAD'];
  let scene = null; let loading = false; let failed = false; let paused = false; let stage = 0; let scrollFrame = 0;
  function updateStage(next) {
    stage = next;
    stageButtons.forEach((button, i) => { button.classList.toggle('is-active', i === stage); button.setAttribute('aria-pressed', String(i === stage)); });
    stageLabel.textContent = `0${stage + 1} / ${stages[stage]}`;
    scene?.setStage(stage);
  }
  function showFallback(message) {
    scene?.dispose(); scene = null; window.__LRPV4Scene = null;
    host.classList.remove('scene-ready'); motion.hidden = true; status.textContent = message || '';
  }
  async function loadScene() {
    if (loading || scene || failed || reduced.matches) return;
    loading = true; explore.disabled = true; status.textContent = 'Loading 3D…';
    try {
      const module = await import('./scene.bundle.js');
      if (reduced.matches) { status.textContent = ''; return; }
      scene = await module.mountScene(host, { onError: () => { failed = true; showFallback('Static illustration'); } });
      if (!scene || failed) throw new Error('3D unavailable');
      window.__LRPV4Scene = scene;
      host.classList.add('scene-ready'); status.textContent = ''; explore.hidden = true; motion.hidden = false;
      paused = false; motion.setAttribute('aria-pressed', 'false'); motion.textContent = 'Pause motion Ⅱ'; scene.setStage(stage);
    } catch { failed = true; showFallback('Static illustration'); explore.hidden = true; }
    finally { loading = false; explore.disabled = false; }
  }
  explore.addEventListener('click', loadScene);
  motion.addEventListener('click', () => { paused = !paused; motion.setAttribute('aria-pressed', String(paused)); motion.textContent = paused ? 'Play motion ▷' : 'Pause motion Ⅱ'; if (paused) scene?.pause(); else scene?.resume(); });
  stageButtons.forEach(button => button.addEventListener('click', () => updateStage(Number(button.dataset.stage))));
  function applyPreference() {
    if (reduced.matches) { showFallback(); explore.hidden = true; }
    else if (!scene && !failed) { explore.hidden = false; if (!mobile.matches) { if ('requestIdleCallback' in window) requestIdleCallback(loadScene, { timeout: 1800 }); else setTimeout(loadScene, 300); } }
  }
  reduced.addEventListener('change', applyPreference);
  mobile.addEventListener('change', applyPreference);
  window.addEventListener('scroll', () => {
    if (scrollFrame || paused || reduced.matches) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      const hero = document.querySelector('.hero');
      const progress = Math.min(Math.max(scrollY / (hero.offsetHeight * .62), 0), .999);
      const next = Math.floor(progress * 4);
      if (next !== stage && scrollY < hero.offsetHeight) updateStage(next);
    });
  }, { passive: true });
  applyPreference();
})();
