import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { makeJourney } from './journey-data.js';
import { escape } from './ui.js';

gsap.registerPlugin(ScrollTrigger);
let rememberedFrequency=40;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

function createSound(button,status) {
  let context=null,master=null,voices=[],enabled=false,closed=false;
  const text=button.querySelector('span');
  const display=()=>{button.setAttribute('aria-pressed',String(enabled));button.setAttribute('aria-label',enabled?'Disable ambient sound':'Enable ambient sound');text.textContent=enabled?'Sound on':'Sound off';};
  const suspend=()=>{if(context&&context.state==='running')context.suspend().catch(()=>{});};
  return {
    async toggle() {
      if(closed)return;
      try{
        if(!context){
          const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('Audio is unavailable');
          context=new Audio();master=context.createGain();master.gain.value=0;master.connect(context.destination);
          [48,72,96].forEach((frequency,index)=>{const voice=context.createOscillator(),gain=context.createGain();voice.type='sine';voice.frequency.value=frequency;gain.gain.value=[.45,.16,.07][index];voice.connect(gain);gain.connect(master);voice.start();voices.push({voice,gain});});
        }
        if(closed)return;
        enabled=!enabled;
        if(enabled){await context.resume();master.gain.setTargetAtTime(.035,context.currentTime,.5);}
        else {master.gain.setValueAtTime(0,context.currentTime);await context.suspend();}
        display();
      }catch{enabled=false;display();status.textContent='Ambient sound is unavailable in this browser.';}
    },
    cue(kind) {
      if(!enabled||!context||closed||context.state!=='running')return;
      const oscillator=context.createOscillator(),gain=context.createGain(),now=context.currentTime;
      oscillator.type='sine';oscillator.frequency.setValueAtTime(kind===2?210:330,now);oscillator.frequency.exponentialRampToValueAtTime(kind===2?125:220,now+.5);
      gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.012,now+.035);gain.gain.exponentialRampToValueAtTime(.0001,now+.65);oscillator.connect(gain);gain.connect(master);oscillator.start(now);oscillator.stop(now+.7);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
    },
    visibility(){if(document.hidden)suspend();else if(enabled&&context)context.resume().catch(()=>{});},
    dispose(){closed=true;enabled=false;voices.forEach(({voice,gain})=>{voice.stop();voice.disconnect();gain.disconnect();});voices=[];if(context)context.close().catch(()=>{});}
  };
}

export function mountExperience(root,{nextSequence,onCommit}) {
  gsap.ticker.lagSmoothing(0);
  const controller=new AbortController(),{signal}=controller,media=matchMedia('(prefers-reduced-motion: reduce)');
  const chapters=[...root.querySelectorAll('[data-chapter]')],stage=root.querySelector('.world-stage'),hero=root.querySelector('.hero');
  const liveStatus=root.querySelector('.experience-live-status'),frequency=root.querySelector('#signal-frequency'),handoff=root.querySelector('.handoff-panel');
  const sound=createSound(root.querySelector('[data-sound-toggle]'),liveStatus);
  let disposed=false,world=null,lenis=null,tickerAdded=false,elapsed=0,lastRender=0,target=0,smooth=0,currentChapter=-1,pulse=0,pointerX=0,pointerY=0,dragX=0,dragY=0,dragging=false,lastPointerX=0,lastPointerY=0;
  let inspection=false;
  let activeTab='evidence',offsets=[],resizeTimer=0,committing=false,revealContext=null;
  const timestamp=Date.now(),sequence=nextSequence(),isPhone=()=>innerWidth<761;
  let journey=makeJourney(rememberedFrequency,sequence,timestamp);
  const allowed=()=>!media.matches&&!document.documentElement.classList.contains('motion-paused');
  root.dataset.motion=allowed()?'on':'off';
  frequency.value=String(rememberedFrequency);

  function renderHandoff() {
    const {incident,events}=journey,first=events[0],duration=((Date.parse(events.at(-1).timestamp)-Date.parse(first.timestamp))/1000).toFixed(1);
    handoff.setAttribute('aria-labelledby','handoff-'+activeTab+'-tab');
    if(activeTab==='evidence'){
      handoff.innerHTML='<dl>'+[['Source',first.source],['Target',first.destination],['Protocol / port','SSH / 22'],['Failed logins',String(events.length)],['Observation window',duration+' seconds']].map(([label,value])=>'<div><dt>'+label+'</dt><dd>'+escape(value)+'</dd></div>').join('')+'</dl>';
    }else if(activeTab==='decision'){
      const sum=incident?.breakdown.map(factor=>factor.value).join(' + ')||'No rule matched';
      handoff.innerHTML='<p class="handoff-formula">'+escape(sum)+(incident?' = '+incident.risk:'')+'</p><p>'+escape(incident?.reason||journey.message)+'</p><p>Policy: '+escape(incident?.action||'Continue observing')+'.</p>';
    }else{
      const labels=incident?['Failed login events collected','Detection rule matched','Risk '+incident.risk+'/100 · '+incident.severity,incident.action,'Evidence prepared for the console']:['Failed login events collected','Detection threshold not crossed','No incident generated','Run ready to record locally'];
      handoff.innerHTML='<ol>'+labels.map((label,index)=>'<li><span>0'+(index+1)+'</span>'+escape(label)+'</li>').join('')+'</ol><p>Recorded locally when you open the console.</p>';
    }
  }

  function applyJourney() {
    const {incident,events}=journey,first=events[0],detected=!!incident;
    root.dataset.risk=incident?.severity||'none';
    root.dataset.detected=String(detected);inspection=false;root.querySelector('[data-hold-inspect]').setAttribute('aria-pressed','false');root.querySelector('[data-replay-signal]').setAttribute('aria-expanded','false');root.querySelector('[data-replay-signal]').innerHTML='Inspect the detection <span aria-hidden="true">&#8599;</span>';
    root.querySelectorAll('[data-signal-source]').forEach(el=>el.textContent=first.source);
    root.querySelectorAll('[data-signal-target]').forEach(el=>el.textContent=first.destination);
    root.querySelectorAll('[data-signal-count]').forEach(el=>el.textContent=events.length);
    root.querySelector('[data-signal-duration]').textContent=((events.length-1)*.085).toFixed(1)+'s';
    root.querySelector('#frequency-value').textContent=String(events.length);
    root.querySelector('[data-journey-score]').textContent=detected?incident.risk:'—';
    root.querySelectorAll('[data-journey-severity]').forEach(el=>el.textContent=incident?.severity||'Below threshold');
    root.querySelectorAll('[data-journey-action]').forEach(el=>el.textContent=incident?.action||'Continue observing');
    root.querySelectorAll('[data-factor-score]').forEach((el,index)=>el.textContent=detected?incident.breakdown[index].value:'0');
    root.querySelectorAll('[data-factor-bar]').forEach((el,index)=>el.style.width=detected?incident.breakdown[index].value/incident.breakdown[index].max*100+'%':'0%');
    root.querySelector('.score-orbit-fill').setAttribute('stroke-dasharray',(incident?.risk||0)+' 100');
    frequency.style.setProperty('--range-fill',(events.length-10)/70*100+'%');
    frequency.setAttribute('aria-valuetext',events.length+' failed logins. '+(incident?'Risk '+incident.risk+' of 100. '+incident.action:'Below detection threshold. No incident.'));
    root.querySelector('[data-detection-title]').innerHTML=detected?'A pattern,<br><em>revealed.</em>':'No pattern.<br><em>Keep watching.</em>';
    root.querySelector('[data-detection-copy]').textContent='IAIRS checks for repeated SSH failures: at least 20 within 60 seconds. '+(detected?'This source crosses that threshold.':'This source stays below that threshold.');
    root.querySelector('[data-risk-lead]').textContent=detected?'THE RISK IS':'NO RULE MATCHED';
    root.querySelector('[data-detection-state]').textContent=detected?'THRESHOLD CROSSED':'BELOW THRESHOLD';
    root.querySelector('[data-detection-reason]').textContent=incident?.reason||events.length+' failed logins. Detection starts at 20 within 60 seconds.';
    root.querySelector('[data-anomaly-tag]').textContent=detected?'ANOMALY / 001':'OBSERVING / 001';
    root.querySelector('[data-response-title]').innerHTML=detected?'Access,<br><em>contained.</em>':'Keep<br><em>observing.</em>';
    root.querySelector('.failure-strip').innerHTML=events.map((_,index)=>'<i'+(index===19?' class="threshold-mark"':'')+'></i>').join('');
    root.querySelector('[data-containment-label]').textContent=detected?'RESPONSE SIMULATED':'TRAFFIC REMAINS OPEN';
    root.querySelector('[data-response-copy]').textContent=detected?'At this score, the policy selects '+incident.action.toLowerCase()+'. The same source and target are attached to the response record.':'The signal stays below the detection threshold. No containment is selected.';
    root.querySelector('[data-handoff-title]').textContent=detected?'Brute Force':'Observed traffic';
    root.querySelector('[data-open-journey]').innerHTML=(detected?'Open this incident':'Record run & open console')+' <span aria-hidden="true">↗</span>';
    root.querySelector('[data-handoff-note]').textContent=detected?'Recorded locally when you open it.':'The run is recorded; no incident is created.';
    renderHandoff();
    updateChapter(Math.round(target));
    if(world&&!allowed())renderStill();
  }

  function updateChapter(index) {
    index=clamp(index,0,5);
    const changed=index!==currentChapter;currentChapter=index;root.dataset.chapter=String(index);
    root.querySelectorAll('[data-chapter-link]').forEach((link,n)=>{if(n===index)link.setAttribute('aria-current','step');else link.removeAttribute('aria-current');});
    const states=['SYSTEM LISTENING','SIGNAL ACQUIRED',journey.incident?'PATTERN DETECTED':'BELOW THRESHOLD','EVALUATING RISK',journey.incident?'RESPONSE SIMULATED':'CONTINUING OBSERVATION','EVIDENCE READY'];
    root.querySelector('[data-tracker-phase]').textContent=states[index];
    if(changed&&(index===2||index===4)){sound.cue(index);pulse=1;}
  }

  function measure() {
    offsets=chapters.map(el=>el.getBoundingClientRect().top+scrollY);
    lenis?.resize();world?.resize();syncScroll();
  }
  function syncScroll() {
    if(disposed||!offsets.length)return;
    const y=scrollY;let i=0;
    while(i<offsets.length-2&&y>=offsets[i+1])i++;
    target=clamp(i+(y-offsets[i])/Math.max(offsets[i+1]-offsets[i],1),0,5);
    root.style.setProperty('--journey-progress',String(clamp(y/Math.max(document.documentElement.scrollHeight-innerHeight,1),0,1)));
    updateChapter(Math.round(target));
    if(!allowed()){smooth=Math.round(target);renderStill();}
    else if(!tickerAdded&&!document.hidden)startTick();
  }
  function sceneInput(progress=smooth) {
    return {progress,elapsed,eventCount:journey.events.length,inspection,risk:journey.incident?.risk||0,factors:journey.incident?.breakdown.map(factor=>factor.value)||[0,0,0,0],detected:!!journey.incident,pulse,pointerX,pointerY,dragX,dragY,motion:allowed()};
  }
  function syncCaptions(progress) {
    const footer=root.querySelector('.experience-footer'),endFade=clamp((footer.getBoundingClientRect().top-80)/180,0,1);
    const window=(center,width)=>clamp((width-Math.abs(progress-center))/.25,0,1);
    root.style.setProperty('--paper',String(Math.max(window(3,.53),clamp((progress-4.5)/.35,0,1))));
    chapters.slice(1).forEach((chapter,i)=>{
      const distance=progress-(i+1),alpha=clamp((.46-Math.abs(distance))/.20,0,1)*endFade;
      chapter.inert=alpha<.1;
      chapter.querySelectorAll('.story-caption,.story-evidence,.inspect-surface').forEach(panel=>{panel.style.opacity=String(alpha);panel.style.visibility=alpha>.01?'visible':'hidden';panel.style.transform='translate3d(0,'+(distance*-25)+'px,0)';});
    });
  }
  function renderStill() {if(!disposed){syncCaptions(Math.round(target));if(world)world.draw(sceneInput(Math.round(target)),0);}}

  function tick(time,deltaMs) {
    if(disposed||document.hidden)return;
    lenis?.raf(time*1000);
    if(time-lastRender<1/65)return;
    const delta=lastRender?Math.min(time-lastRender,.15):1/60;lastRender=time;
    const slowdown=currentChapter===2?.4:1;elapsed+=delta*slowdown;
    smooth+=(target-smooth)*Math.min(1,delta*6);
    pulse=Math.max(0,pulse-delta*.6);
    syncCaptions(smooth);world?.draw(sceneInput(),delta);
  }
  function startTick() {if(tickerAdded||!allowed()||document.hidden)return;lastRender=0;gsap.ticker.add(tick);tickerAdded=true;}
  function stopTick() {gsap.ticker.remove(tick);tickerAdded=false;lastRender=0;}
  function preferences() {
    root.dataset.motion=allowed()?'on':'off';
    if(allowed()){
      if(!isPhone()&&!lenis)lenis=new Lenis({autoRaf:false,duration:1.05,smoothWheel:true,syncTouch:false});
      startTick();
    }else{lenis?.destroy();lenis=null;stopTick();revealContext?.revert();revealContext=null;smooth=Math.round(target);renderStill();}
  }

  root.experienceScrollTo=element=>{
    if(lenis&&allowed())lenis.scrollTo(element,{duration:1.05,offset:0});
    else element.scrollIntoView({behavior:allowed()&&!isPhone()?'smooth':'instant',block:'start'});
    root.querySelector('.site-header')?.classList.remove('menu-open');
    root.querySelector('[data-action="menu"]')?.setAttribute('aria-expanded','false');
  };
  root.addEventListener('click',event=>{
    const link=event.target.closest('a[href^="#"]');
    if(!link||event.defaultPrevented||event.button||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const hash=link.getAttribute('href'),target=chapters.find(chapter=>'#'+chapter.id===hash);
    if(!target)return;
    event.preventDefault();if(location.hash!==hash)history.pushState(null,'',hash);
    root.experienceScrollTo(target);
  },{signal});
  frequency.addEventListener('input',()=>{
    rememberedFrequency=Number(frequency.value);journey=makeJourney(rememberedFrequency,sequence,timestamp);applyJourney();
  },{signal});
  frequency.addEventListener('change',()=>{liveStatus.textContent=frequency.getAttribute('aria-valuetext');sound.cue(2);},{signal});
  root.querySelector('[data-sound-toggle]').addEventListener('click',()=>sound.toggle(),{signal});
  function setInspection(next){
    inspection=next;pulse=1;sound.cue(2);root.querySelector('[data-hold-inspect]').setAttribute('aria-pressed',String(inspection));
    const button=root.querySelector('[data-replay-signal]');button.setAttribute('aria-expanded',String(inspection));button.innerHTML=(inspection?'Close inspection':'Inspect the detection')+' <span aria-hidden="true">&#8599;</span>';
    const evidence=root.querySelector('[data-detection-reason]');
    if(inspection){const indices=[0,Math.min(19,journey.events.length-1),journey.events.length-1].filter((value,index,array)=>array.indexOf(value)===index);evidence.innerHTML=indices.map(index=>'<span class="inspection-event"><b>'+escape(journey.events[index].timestamp.slice(11,23))+'</b><span>Failure '+(index+1)+(index===19?' / threshold':'')+'</span></span>').join('');}
    else evidence.textContent=journey.incident?.reason||journey.events.length+' failed logins. Detection starts at 20 within 60 seconds.';
    liveStatus.textContent=inspection?'Event inspection opened. '+(journey.incident?.reason||journey.message):'Event inspection closed.';
    if(!allowed())renderStill();
  }
  root.querySelector('[data-replay-signal]').addEventListener('click',()=>setInspection(!inspection),{signal});
  const hold=root.querySelector('[data-hold-inspect]');let holdPointer='mouse',holding=false;
  hold.addEventListener('pointerdown',event=>{holdPointer=event.pointerType;if(event.pointerType!=='mouse'||event.button)return;event.preventDefault();holding=true;hold.setPointerCapture(event.pointerId);setInspection(true);},{signal});
  const releaseInspection=()=>{if(holding){holding=false;setInspection(false);}};
  hold.addEventListener('pointerup',releaseInspection,{signal});hold.addEventListener('pointercancel',releaseInspection,{signal});hold.addEventListener('lostpointercapture',releaseInspection,{signal});window.addEventListener('blur',releaseInspection,{signal});
  hold.addEventListener('click',event=>{if(event.detail===0||holdPointer!=='mouse')setInspection(!inspection);},{signal});
  const activateTab=tab=>{
    activeTab=tab.dataset.handoffTab;
    root.querySelectorAll('[data-handoff-tab]').forEach(el=>{const selected=el===tab;el.setAttribute('aria-selected',String(selected));el.tabIndex=selected?0:-1;});
    renderHandoff();
  };
  root.querySelectorAll('[data-handoff-tab]').forEach(tab=>{
    tab.addEventListener('click',()=>activateTab(tab),{signal});
    tab.addEventListener('keydown',event=>{
      const tabs=[...root.querySelectorAll('[data-handoff-tab]')],index=tabs.indexOf(tab);
      const next=event.key==='ArrowRight'?(index+1)%3:event.key==='ArrowLeft'?(index+2)%3:event.key==='Home'?0:event.key==='End'?2:null;
      if(next===null)return;event.preventDefault();activateTab(tabs[next]);tabs[next].focus();
    },{signal});
  });
  root.querySelector('[data-open-journey]').addEventListener('click',event=>{
    if(committing)return;committing=true;event.currentTarget.disabled=true;
    try{const destination=onCommit(journey.events);location.hash=destination;}
    catch{committing=false;event.currentTarget.disabled=false;liveStatus.textContent='The run could not be opened. Please try again.';}
  },{signal});

  hero.addEventListener('pointermove',event=>{
    if(!allowed())return;
    const rect=hero.getBoundingClientRect();pointerX=(event.clientX-rect.left)/rect.width-.5;pointerY=(event.clientY-rect.top)/rect.height-.5;
    if(dragging){dragX=clamp(dragX+(event.clientX-lastPointerX)*.005,-1.5,1.5);dragY=clamp(dragY+(event.clientY-lastPointerY)*.004,-.6,.6);lastPointerX=event.clientX;lastPointerY=event.clientY;}
  },{passive:true,signal});
  hero.addEventListener('pointerdown',event=>{
    if(event.pointerType!=='mouse'||event.button||event.target.closest('a,button,input,.hero-content'))return;
    event.preventDefault();
    dragging=true;lastPointerX=event.clientX;lastPointerY=event.clientY;hero.setPointerCapture(event.pointerId);
  },{signal});
  const release=()=>{dragging=false;};hero.addEventListener('pointerup',release,{signal});hero.addEventListener('pointercancel',release,{signal});hero.addEventListener('lostpointercapture',release,{signal});window.addEventListener('blur',release,{signal});
  hero.addEventListener('pointerleave',()=>{if(!dragging)pointerX=pointerY=0;},{signal});
  stage.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key))return;
    event.preventDefault();if(event.key==='Home')dragX=dragY=0;
    else {dragX+=event.key==='ArrowLeft'?-.15:event.key==='ArrowRight'?.15:0;dragY+=event.key==='ArrowUp'?-.1:event.key==='ArrowDown'?.1:0;}
    dragX=clamp(dragX,-1.5,1.5);dragY=clamp(dragY,-.6,.6);if(!allowed())renderStill();
  },{signal});
  window.addEventListener('scroll',syncScroll,{passive:true,signal});
  window.addEventListener('resize',()=>{
    clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(disposed)return;if(isPhone()&&lenis){lenis.destroy();lenis=null;}preferences();measure();ScrollTrigger.refresh();},150);
  },{passive:true,signal});
  document.addEventListener('visibilitychange',()=>{sound.visibility();if(document.hidden)stopTick();else preferences();},{signal});
  media.addEventListener('change',preferences,{signal});
  const preferenceObserver=new MutationObserver(preferences);preferenceObserver.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  const trigger=ScrollTrigger.create({trigger:root.querySelector('.world-story'),start:'top top',end:'bottom bottom',onUpdate:syncScroll,onRefresh:measure});
  applyJourney();measure();preferences();
  const initialChapter=chapters.find(chapter=>'#'+chapter.id===location.hash);
  if(initialChapter&&initialChapter!==hero){requestAnimationFrame(()=>{if(disposed)return;const top=initialChapter.getBoundingClientRect().top+scrollY;if(lenis)lenis.scrollTo(top,{immediate:true});else window.scrollTo({top,behavior:'instant'});syncScroll();});}
  document.fonts.ready.then(()=>{if(!disposed){measure();ScrollTrigger.refresh();}});
  import('./world.js').then(({createWorld})=>{
    if(disposed)return;world=createWorld(stage);measure();
    world.draw(sceneInput(allowed()?smooth:Math.round(target)),0);
    if(allowed())startTick();
  }).catch(()=>{if(!disposed){stage.dataset.fallback='true';stage.setAttribute('aria-label','Titanium response engine environment. The interactive signal and scoring controls remain available.');}});
  return()=>{
    disposed=true;controller.abort();clearTimeout(resizeTimer);stopTick();lenis?.destroy();trigger.kill();revealContext?.revert();preferenceObserver.disconnect();world?.dispose();sound.dispose();gsap.ticker.lagSmoothing(500,33);
    delete root.experienceScrollTo;delete root.dataset.motion;delete root.dataset.chapter;delete root.dataset.risk;delete root.dataset.detected;root.style.removeProperty('--journey-progress');
  };
}

