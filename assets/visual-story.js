/* Fixed, fictional examples only. No audio, network, AI or call integrations. */
(() => {
  const panel = document.querySelector('#story-panel');
  if (!panel) return;
  const $ = id => document.getElementById(id);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const tabs = [...document.querySelectorAll('[data-story-scenario]')];
  const phases = [...document.querySelectorAll('[data-story-phase]')];
  const details = [...document.querySelectorAll('[data-story-detail]')];
  const milestones = [0, 3000, 6000, 9000, 12000, 15000, 18000, 20000];
  const scenarios = {
    direct: {source:'Homeowner', forwarding:false, caption:'A call to your dedicated AI number.', route:'Direct call → dedicated AI number.', callback:'After 3 PM'},
    overflow: {source:'Busy business line', forwarding:true, caption:'Selected overflow calls are forwarded.', route:'Busy line → configured forwarding → AI number.', callback:'After 3 PM'},
    afterhours: {source:'Business line · after hours', forwarding:true, caption:'After-hours forwarding is configured.', route:'After hours → configured forwarding → AI number.', callback:'Tomorrow morning'}
  };
  let scenario='direct',elapsed=0,playing=false,timer=null,last=0,beat=-1;
  panel.classList.add('v5-enhanced');
  const announce = text => { $('story-status').textContent=text; };
  function pause(message) {
    playing=false;clearInterval(timer);timer=null;panel.dataset.playing='false';
    $('story-pause').disabled=true;$('story-play').disabled=reduced.matches || elapsed>=20000;
    if(message) announce(message);
  }
  function render() {
    const nextBeat=Math.min(6,milestones.findLastIndex(t=>elapsed>=t));
    const seconds=Math.floor(elapsed/1000);
    $('story-time').textContent=`00:${String(seconds).padStart(2,'0')} / 00:20`;
    const progress=panel.querySelector('[role=progressbar]');
    progress.setAttribute('aria-valuenow',String(seconds));progress.firstElementChild.style.width=`${elapsed/200}%`;
    $('story-next').disabled=elapsed>=20000;
    if(beat===nextBeat)return;beat=nextBeat;panel.dataset.storyBeat=String(beat);
    const lines=[['Let’s follow the call.','Press Play to begin.'],['“How can we help?”','The dedicated AI number answers.'],['“No hot water.”','Issue captured.'],['“What’s your ZIP?”','Austin · 78704'],['“How soon do you need help?”','Same-day requested.'],['“When can we call you?”',scenarios[scenario].callback],['Ready for your team.','Your team decides the next step.']];
    $('story-dialogue').textContent=lines[beat][0];$('story-dialogue-caption').textContent=reduced.matches&&beat===0?'Use Next Step to explore.':lines[beat][1];
    details.forEach((el,i)=>el.classList.toggle('is-pending',beat<i+2));
    const phase=beat===0?0:beat===1?1:beat<6?2:3;
    phases.forEach((el,i)=>{if(i===phase)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current')});
    $('story-stamp').textContent=beat===6?'✓ Example lead · Your team calls back':'Collecting the callback details';
    if(beat===0)$('story-stamp').textContent='Awaiting call details';
    if(beat>0)announce(lines[beat].join(' '));
  }
  function play() {
    if(reduced.matches){announce('Reduced motion: use Next Step to explore.');return;}
    if(playing||elapsed>=20000)return;
    playing=true;panel.dataset.playing='true';last=performance.now();$('story-play').disabled=true;$('story-pause').disabled=false;
    announce('Playing the silent, fictional call example.');
    timer=setInterval(()=>{const now=performance.now();elapsed=Math.min(20000,elapsed+now-last);last=now;render();if(elapsed>=20000)pause('Example complete. Your team handles the callback, dispatch and service.');},100);
  }
  function reset() {pause();elapsed=0;beat=-1;render();$('story-play').disabled=reduced.matches;}
  function select(key) {
    scenario=key;reset();const data=scenarios[key];
    tabs.forEach(tab=>{const chosen=tab.dataset.storyScenario===key;tab.setAttribute('aria-selected',String(chosen));tab.tabIndex=chosen?0:-1});
    panel.setAttribute('aria-labelledby',`story-${key}`);$('story-route-source').textContent=data.source;
    $('story-forwarding').hidden=!data.forwarding;$('story-caller-caption').textContent=data.caption;$('story-callback-time').textContent=data.callback;
    announce(data.route+(reduced.matches?' Use Next Step.':' Press Play.'));
  }
  tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>select(tab.dataset.storyScenario));tab.addEventListener('keydown',event=>{let index;if(event.key==='ArrowRight')index=(i+1)%tabs.length;else if(event.key==='ArrowLeft')index=(i+tabs.length-1)%tabs.length;else if(event.key==='Home')index=0;else if(event.key==='End')index=tabs.length-1;else return;event.preventDefault();tabs[index].focus();select(tabs[index].dataset.storyScenario);});});
  $('story-play').addEventListener('click',play);
  $('story-pause').addEventListener('click',()=>pause('Paused. Play to continue, or choose Next Step.'));
  $('story-replay').addEventListener('click',()=>{reset();if(reduced.matches)announce('Example reset. Use Next Step.');else play();});
  $('story-next').addEventListener('click',()=>{pause();elapsed=milestones.find(t=>t>elapsed)??20000;render();$('story-play').disabled=reduced.matches||elapsed>=20000;});
  reduced.addEventListener('change',()=>{pause();beat=-1;render();announce(reduced.matches?'Reduced motion: use Next Step to explore.':'Press Play to continue the example.');});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing)pause('Paused while the page is hidden.');});
  new IntersectionObserver(entries=>{if(!entries[0].isIntersecting&&playing)pause('Paused offscreen. Play to continue.');},{threshold:0}).observe(panel);
  select('direct');
})();
