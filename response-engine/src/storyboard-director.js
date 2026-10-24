import {gsap} from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import {makeJourney} from './journey-data.js';
import {createLandingLoader} from './singularity-loader.js';
import {modal,escape} from './ui.js';
gsap.registerPlugin(ScrollTrigger);
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const mix=(a,b,t)=>a+(b-a)*t;
const phase=(p,a,b)=>{const t=clamp((p-a)/(b-a));return t*t*(3-2*t);};
const names=['The awakening','Enter the intelligence','See the invisible','Understand the risk','From intelligence to action'];

export function mountStoryboard(root,{onOpenCase}={}){
  const experience=root.querySelector('.sb-experience');if(!experience)return()=>{};
  const abort=new AbortController(),{signal}=abort,media=matchMedia('(prefers-reduced-motion: reduce)'),stage=experience.querySelector('.sb-stage'),track=experience.querySelector('.sb-track'),host=experience.querySelector('.sb-world');
  const scenes=[...experience.querySelectorAll('[data-story-scene]')],chapters=[...experience.querySelectorAll('[data-story-chapter]')],hero=experience.querySelector('.sb-hero-word'),score=experience.querySelector('[data-story-score]'),input=experience.querySelector('#sb-failures'),iframe=experience.querySelector('.sb-console-live');
  const heroTitle=experience.querySelector('.sb-hero-type'),scoreReadout=experience.querySelector('.sb-risk-readout');
  const headlineLines=scenes.map(scene=>{const heading=scene.querySelector('h2');if(!heading)return[];heading.innerHTML=heading.innerHTML.split(/<br\s*\/?\s*>/i).map(line=>`<span class="sb-line"><span>${line}</span></span>`).join('');return [...heading.querySelectorAll('.sb-line>span')];});
  const nodeButtons=[...experience.querySelectorAll('[data-story-node]')],loader=createLandingLoader(),tourControls=experience.querySelector('.sb-tour-controls');
  const orbit={x:0,y:0};let orbitTween=null,tourActive=false,tourPaused=false;
  experience.dataset.signal='source';
  const previewScreen=experience.querySelector('.sb-console-screen'),previewCorners=[...experience.querySelectorAll('[data-preview-corner]')];
  const previewQuad=[{x:.3,y:.24},{x:.9,y:.24},{x:.3,y:.75},{x:.9,y:.75}];let previewWidth=1280,previewHeight=800;
  let disposed=false,world=null,lenis=null,scrollTrigger=null,frame=0,lastNow=0,elapsed=0,width=innerWidth,height=innerHeight,step=innerHeight*1.15,origin=0,target=0,p=0,act=-1,velocity=0,lastY=scrollY,resizeTimer=0;
  let pointer={x:0,y:0},pointerTarget={x:0,y:0},cursor={x:-50,y:-50},cursorTarget={x:-50,y:-50},drag={active:false,x:0,y:0,lastX:0,lastY:0},inspection=null,pinned=false,currentStep=2,panels=[],glyph=[],riskPoints=[],riskBounds=null,playback=null,handoff={},riskTween=null,hasEvidence=false,factorSelection=-1;
  const numbers={score:84,f0:36,f1:30,f2:9,f3:9};
  const time=Date.now();let journey=makeJourney(40,1,time);
  const responseName=action=>({'Simulated host isolation':'Host isolation','Simulated IP block':'IP block','Security alert':'Security alert','Log only':'Record only'}[action]||'Keep observing');
  const motion=()=>!media.matches&&!document.documentElement.classList.contains('motion-paused');
  const set=(name,value)=>experience.style.setProperty('--sb-'+name,String(value));
  const mood={dark:0,geometry:0,network:0,risk:0,restore:0};
  const master=gsap.timeline({paused:true}).to(mood,{dark:1,duration:.65,ease:'power2.inOut'},.2).to(mood,{geometry:1,duration:.8,ease:'power3.inOut'},.25).to(mood,{network:1,duration:.8,ease:'power2.inOut'},1.2).to(mood,{risk:1,duration:.8,ease:'power3.inOut'},2.2).to(mood,{restore:1,duration:.75,ease:'power2.inOut'},3.25);

  function renderNumbers(){
    const incident=journey.incident;score.textContent=incident?Math.round(numbers.score):'—';
    experience.querySelectorAll('[data-factor-value]').forEach((el,i)=>el.textContent=Math.round(numbers['f'+i]));
  }
  function updateEvidence({animate=false}={}){
    riskTween?.kill();const incident=journey.incident,first=journey.events[0],count=journey.events.length;
    experience.querySelectorAll('[data-story-count]').forEach(el=>el.textContent=count);
    const duration=((Date.parse(journey.events.at(-1).timestamp)-Date.parse(first.timestamp))/1000).toFixed(1);
    experience.querySelector('[data-story-duration]').textContent=duration;experience.querySelector('[data-story-rule-state]').textContent=incident?'Threshold crossed':'Still observing';experience.querySelectorAll('[data-evidence-tick]').forEach(tick=>{const index=Number(tick.dataset.evidenceTick);tick.dataset.observed=String(index<count);tick.dataset.alert=String(index>=19&&index<count);});
    input.style.setProperty('--range-fill',((count-10)/70*100)+'%');
    experience.querySelector('[data-story-case-kind]').textContent=incident?'SSH BRUTE FORCE':'SSH / OBSERVING';
    experience.querySelector('[data-story-node=rule] strong').textContent=incident?'A threshold crossed.':'A threshold ahead.';experience.querySelector('[data-story-node=rule]').setAttribute('aria-label','Inspect the detection threshold');
    experience.querySelector('[data-story-source]').textContent=first.source;experience.querySelector('[data-story-destination]').textContent=first.destination;
    experience.querySelector('[data-story-node-detail=source]').textContent=count+' failed SSH logins from '+first.source;experience.querySelector('[data-story-node-detail=rule]').textContent=incident?'20 in 60 seconds: detection threshold matched.':'Below the 20 in 60 seconds threshold.';experience.querySelector('[data-story-node-detail=host]').textContent=first.destination+' / SSH port 22';
    score.setAttribute('aria-label',incident?`Illustrative risk ${incident.risk} of 100. ${incident.severity}.`:'Below the detection threshold. No incident.');
    experience.querySelector('[data-story-severity]').textContent=incident?.severity.toUpperCase()||'BELOW THRESHOLD';experience.querySelector('[data-story-risk-label]').textContent=incident?incident.severity:'Observing';experience.querySelector('[data-story-risk-response]').textContent=responseName(incident?.action);experience.querySelector('[data-story-cap]').textContent=!incident?'Rule threshold: 20 failures / 60s.':incident.breakdown[1].value===30?'Frequency capped at 30.':'Frequency contributes '+incident.breakdown[1].value+' of 30.';experience.querySelector('#sb-frequency').textContent=count;
    input.setAttribute('aria-valuetext',`${count} failed logins. ${incident?`Risk ${incident.risk} of 100, ${incident.severity}. ${incident.action}.`:'Below detection threshold.'}`);
    const factors=incident?.breakdown||[{label:'Attack type',value:0,max:40},{label:'Event frequency',value:0,max:30},{label:'Host impact',value:0,max:20},{label:'Time window',value:0,max:10}];
    const factorNames=['Attack signature','Repetition','Host impact','Time window'];
    experience.querySelector('[data-story-factors]').innerHTML=factors.map((f,i)=>`<div><button class="sb-factor" data-story-factor="${i}" aria-pressed="${factorSelection===i}" title="Explain ${escape(f.label)}" style="--factor-level:${f.value/f.max}"><span class="sb-factor-index">${String(i+1).padStart(2,'0')}</span><span>${factorNames[i]}</span><output aria-live="off" aria-label="${escape(f.label)}: ${f.value} of ${f.max}"><b data-factor-value="${i}">${Math.round(numbers['f'+i])}</b><small>/ ${f.max}</small></output></button></div>`).join('');
    const targetNumbers={score:incident?.risk||0};factors.forEach((f,i)=>targetNumbers['f'+i]=f.value);
    if(animate&&hasEvidence&&motion())riskTween=gsap.to(numbers,{...targetNumbers,duration:.42,ease:'power2.out',onUpdate:()=>{renderNumbers();requestFrame();},onComplete:sampleTargets});
    else{Object.assign(numbers,targetNumbers);renderNumbers();}hasEvidence=true;
    const values=Array.from({length:15},(_,i)=>{const n=10+i*5;return [((n-10)/70*280+10),90-(makeJourney(n,1,time).incident?.risk||0)*.8];});
    const line='M'+values.map(v=>v.join(' ')).join('L');experience.querySelector('[data-story-chart-line]').setAttribute('d',line);experience.querySelector('[data-story-chart-fill]').setAttribute('d',line+'L290 100H10Z');
    const marker=experience.querySelector('[data-story-chart-point]'),attributes={cx:(count-10)/70*280+10,cy:90-(incident?.risk||0)*.8};gsap.killTweensOf(marker);
    if(animate&&motion())gsap.to(marker,{attr:attributes,duration:.42,ease:'power2.out'});else for(const[k,v]of Object.entries(attributes))marker.setAttribute(k,String(v));
    const open=experience.querySelector('[data-story-open]');open.disabled=!incident;experience.querySelector('[data-story-open-label]').textContent=incident?'Open this case':'Keep observing';
    updateStep(currentStep);if(factorSelection>=0)explainFactor();if(inspection)showInspector(inspection,pinned);sampleTargets();sendEvidence();requestFrame();
  }
  function updateStep(index){
    currentStep=index;experience.dataset.note='stage';experience.querySelectorAll('[data-story-step]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.storyStep)===index)));
    const incident=journey.incident,count=journey.events.length,duration=((count-1)*.085).toFixed(1),first=journey.events[0];
    const entries=[
      ['01 / DETECTION',incident?'Repeated failures.':'Still observing.',`${count} failed logins in ${duration} seconds.`],
      ['02 / CONTEXT','A single destination.',`${first.destination} / SSH port 22.`],
      ['03 / ASSESSMENT',incident?`${incident.breakdown.map(f=>f.value).join(' + ')} = ${incident.risk}.`:'Below threshold.','Inspect a factor above.'],
      ['04 / POLICY PREVIEW',responseName(incident?.action)+'.','A simulated response. No live actions.']
    ];
    const entry=entries[index];experience.querySelector('.sb-response-preview .sb-eyebrow').textContent=entry[0];experience.querySelector('[data-story-action]').textContent=entry[1];experience.querySelector('[data-story-note-caption]').textContent=entry[2];requestFrame();
  }
  function sampleTargets(){
    const sample=document.createElement('canvas'),c=sample.getContext('2d',{willReadFrequently:true});if(!c)return;
    const saved=scenes.map(s=>s.style.transform),savedHero=hero.style.transform,savedTitle=heroTitle.style.transform,savedDock=scoreReadout.style.getPropertyValue('--sb-score-dock');scoreReadout.style.setProperty('--sb-score-dock','0');scenes.forEach(s=>s.style.transform='none');hero.style.transform='none';heroTitle.style.transform='none';
    sample.width=800;sample.height=Math.round(800*height/width);const scale=800/width;
    for(const letter of hero.querySelectorAll('[data-story-letter]')){const b=letter.getBoundingClientRect(),font=parseFloat(getComputedStyle(letter).fontSize);c.font=`${font*scale}px "Cormorant Garamond"`;c.textBaseline='alphabetic';c.fillStyle='#fff';const metrics=c.measureText(letter.textContent),ascent=metrics.fontBoundingBoxAscent??font*scale*.8,descent=metrics.fontBoundingBoxDescent??font*scale*.2;c.fillText(letter.textContent,b.left*scale,b.top*scale+(b.height*scale-ascent-descent)/2+ascent);}
    let pixels=c.getImageData(0,0,sample.width,sample.height).data,points=[];for(let y=0;y<sample.height;y+=3)for(let x=0;x<800;x+=3)if(pixels[(y*800+x)*4+3]>100)points.push([x/800,y/sample.height]);glyph=points;
    sample.width=360;sample.height=280;const scoreFace=getComputedStyle(score);c.font=`${scoreFace.fontWeight} 250px ${scoreFace.fontFamily}`;c.textBaseline='top';c.fillStyle='#fff';c.fillText(String(journey.incident?.risk??'—'),0,0);pixels=c.getImageData(0,0,360,280).data;points=[];
    for(let y=0;y<270;y+=5)for(let x=0;x<360;x+=5)if(pixels[(y*360+x)*4+3]>100)points.push([x,y]);
    if(points.length){const xs=points.map(q=>q[0]),ys=points.map(q=>q[1]),l=Math.min(...xs),r=Math.max(...xs),t=Math.min(...ys),b=Math.max(...ys);riskPoints=points.map(q=>[(q[0]-l)/(r-l),(q[1]-t)/(b-t)]);}
    const scoreBox=score.getBoundingClientRect(),scoreStyle=getComputedStyle(score),scoreFont=parseFloat(scoreStyle.fontSize);c.font=`${scoreStyle.fontWeight} ${scoreFont}px ${scoreStyle.fontFamily}`;if('letterSpacing' in c)c.letterSpacing=scoreStyle.letterSpacing;
    const ink=c.measureText(String(journey.incident?.risk??'—')),fontAscent=ink.fontBoundingBoxAscent??scoreFont*.8,fontDescent=ink.fontBoundingBoxDescent??scoreFont*.2,baseline=scoreBox.top+(scoreBox.height-fontAscent-fontDescent)/2+fontAscent;
    riskBounds={left:scoreBox.left-ink.actualBoundingBoxLeft,top:baseline-ink.actualBoundingBoxAscent,width:ink.actualBoundingBoxLeft+ink.actualBoundingBoxRight,height:ink.actualBoundingBoxAscent+ink.actualBoundingBoxDescent};
    scenes.forEach((s,i)=>s.style.transform=saved[i]);hero.style.transform=savedHero;heroTitle.style.transform=savedTitle;
    if(savedDock)scoreReadout.style.setProperty('--sb-score-dock',savedDock);else scoreReadout.style.removeProperty('--sb-score-dock');
    world?.setTargets({glyph,risk:riskPoints,riskBounds,panels,handoff,quad:previewQuad});
  }
  function measure(){
    const oldStep=step,preservedProgress=target;width=stage.clientWidth;height=stage.clientHeight;step=height*(width<=760?1.06:1.15);set('step',step+'px');origin=track.getBoundingClientRect().top+scrollY;
    previewWidth=Math.max(1280,width);const scale=previewScreen.clientWidth/previewWidth;previewHeight=Math.round(previewScreen.clientHeight/Math.max(.01,scale));iframe.style.width=previewWidth+'px';iframe.style.height=previewHeight+'px';set('preview-scale',scale);readPreviewQuad();world?.resize();
    if(act>=0&&Math.abs(oldStep-step)>30){lenis?.resize();if(lenis)lenis.scrollTo(origin+preservedProgress*step,{immediate:true,force:true});else window.scrollTo({top:origin+preservedProgress*step,behavior:'instant'});}
    sampleTargets();if(iframe.hasAttribute('src'))requestAnimationFrame(()=>{if(!disposed)prepareConsole();});scrollTrigger?.refresh();sync();
  }
  function sync(){const y=scrollY;velocity=clamp((y-lastY)/80,-1,1);lastY=y;target=clamp((y-origin)/step,0,4);requestFrame();}
  function scrollToAnchor(anchor,{instant=false}={}){stopPlayback();const index=Number(anchor.dataset.actAnchor);if(!Number.isFinite(index)){anchor.scrollIntoView();return;}const y=origin+index*step;if(lenis)lenis.scrollTo(y,{immediate:instant,duration:1.05,force:true});else window.scrollTo({top:y,behavior:motion()&&!instant?'smooth':'instant'});if(!motion()||instant){target=index;p=index;compose(p);}}
  root.experienceScrollTo=scrollToAnchor;
  function configureScroll(){
    lenis?.destroy();lenis=null;if(motion()){
      lenis=new Lenis({duration:1.05,smoothWheel:true,syncTouch:false,wheelMultiplier:.9,touchMultiplier:1.2});lenis.on('scroll',()=>{ScrollTrigger.update();sync();});
    }requestFrame();
  }
  function showInspector(id,pin=false){
    inspection=id;pinned=pin;experience.querySelector('.sb-inspector').hidden=true;
    nodeButtons.forEach(button=>button.setAttribute('aria-expanded',String(button.dataset.storyNode===id)));requestFrame();
  }
  function readPreviewQuad(){
    const stageBox=stage.getBoundingClientRect();previewCorners.forEach((corner,i)=>{const box=corner.getBoundingClientRect();previewQuad[i].x=(box.left-stageBox.left)/width;previewQuad[i].y=(box.top-stageBox.top)/height;});world?.setPreviewQuad(previewQuad);
  }
  function previewPoint(x,y){
    const [tl,tr,bl,br]=previewQuad;return{x:mix(mix(tl.x,tr.x,x),mix(bl.x,br.x,x),y),y:mix(mix(tl.y,tr.y,x),mix(bl.y,br.y,x),y)};
  }
  function sendEvidence(){if(iframe.hasAttribute('src'))iframe.contentWindow?.postMessage({type:'iairs:preview-evidence',events:journey.events},location.origin);}
  function loadConsole(){if(iframe.hasAttribute('src'))return;iframe.src=new URL('#console/overview?story-preview=1',location.href).href;}
  function prepareConsole(){
    if(disposed)return;try{
      const doc=iframe.contentDocument;if(!doc?.querySelector('.command-layout'))return;
      doc.querySelector('[data-storyboard-preview-style]')?.remove();
      const parts=[...doc.querySelectorAll('.app-topbar,.app-sidebar,.command-hero,.metric-card,.command-activity,.command-recents,.distribution-panel,.command-timeline,.command-risk,.active-incident-card,.command-actions,.command-host')];
      panels=parts.map(el=>{const r=el.getBoundingClientRect();return{x:r.left/previewWidth,y:r.top/previewHeight,w:r.width/previewWidth,h:r.height/previewHeight};});
      const box=selector=>{const el=doc.querySelector(selector);if(!el)return null;const r=el.getBoundingClientRect();return{x:r.left/previewWidth,y:r.top/previewHeight,w:r.width/previewWidth,h:r.height/previewHeight};};
      handoff={score:box('.command-risk .risk-dial strong'),riskDial:box('.command-risk .risk-dial'),source:box('.active-incident-data .mono'),case:box('.active-incident-card')};
      const style=doc.createElement('style');style.dataset.storyboardPreviewStyle='';style.textContent=`body{overflow:hidden!important}[data-storyboard-part]{--a:clamp(0,calc((var(--storyboard-assembly,0) - var(--storyboard-delay,0))*2.25),1);transform:translate3d(calc((1 - var(--a))*var(--storyboard-from-x,0px)),calc((1 - var(--a))*var(--storyboard-from-y,0px)),0);opacity:var(--a);clip-path:inset(0 calc((1 - var(--a))*100%) 0 0)}@media(max-width:760px){.app-sidebar[data-storyboard-part]{transform:translateX(-110%)!important;opacity:0!important}}`;
      doc.head.append(style);parts.forEach((el,i)=>{const r=panels[i];el.dataset.storyboardPart='';el.style.setProperty('--storyboard-delay',String((i%6)*.035));el.style.setProperty('--storyboard-from-x',(previewWidth*.52-(r.x+r.w/2)*previewWidth)*.5+'px');el.style.setProperty('--storyboard-from-y',(previewHeight*.53-(r.y+r.h/2)*previewHeight)*.5+'px');});
      experience.dataset.consoleReady='true';readPreviewQuad();sampleTargets();requestFrame();
    }catch{/* The normal console remains reachable from every chapter. */}
  }
  iframe.addEventListener('load',()=>{if(!iframe.hasAttribute('src'))return;prepareConsole();sendEvidence();const doc=iframe.contentDocument;if(doc)Promise.allSettled([doc.fonts.ready,...[...doc.images].map(image=>image.decode())]).then(()=>{if(!disposed){prepareConsole();loader.complete('workspace');}});},{signal});
  window.addEventListener('message',event=>{if(event.source===iframe.contentWindow&&event.origin===location.origin&&event.data?.type==='iairs:preview-rendered')prepareConsole();},{signal});
  function updateTour(){
    tourControls.hidden=!tourActive;tourControls.dataset.paused=String(tourPaused);
    experience.querySelector('[data-tour-state]').textContent=tourPaused?'VIEW PAUSED':'GUIDED VIEW';
    experience.querySelector('[data-tour-index]').textContent=String(Math.max(0,act)+1).padStart(2,'0')+' / 05';
    const toggle=experience.querySelector('[data-tour-toggle]');toggle.textContent=tourPaused?'Resume':'Pause';toggle.setAttribute('aria-label',tourPaused?'Resume guided tour':'Pause guided tour');
    experience.querySelector('[data-story-play]').setAttribute('aria-pressed',String(tourActive&&!tourPaused));experience.querySelector('[data-story-play]>span').textContent=tourActive?(tourPaused?'Resume sequence':'Pause sequence'):'Play the sequence';
  }
  function stopPlayback(){playback?.kill();playback=null;tourActive=false;tourPaused=false;updateTour();}
  function pausePlayback(){if(!tourActive)return;playback?.kill();playback=null;tourPaused=true;updateTour();requestFrame();}
  function startPlayback(){
    if(!motion()){scrollToAnchor(experience.querySelector('[data-act-anchor="1"]'));return;}
    if(target>3.96)scrollToAnchor(experience.querySelector('[data-act-anchor="0"]'),{instant:true});
    playback?.kill();tourActive=true;tourPaused=false;const state={y:scrollY};
    playback=gsap.to(state,{y:origin+step*4,duration:Math.max(2,34*(1-target/4)),ease:'none',onUpdate:()=>{if(lenis)lenis.scrollTo(state.y,{immediate:true});else window.scrollTo(0,state.y);},onComplete:stopPlayback});updateTour();requestFrame();
  }
  experience.querySelector('[data-story-play]').addEventListener('click',()=>tourActive&&!tourPaused?pausePlayback():startPlayback(),{signal});
  experience.querySelector('[data-tour-toggle]').addEventListener('click',()=>tourPaused?startPlayback():pausePlayback(),{signal});
  experience.querySelector('[data-tour-exit]').addEventListener('click',()=>{stopPlayback();chapters[act]?.focus({preventScroll:true});},{signal});
  function compose(progress){
    master.time(progress);const active=progress<.64?0:progress<1.57?1:progress<2.57?2:progress<3.43?3:4;
    if(act!==active){act=active;experience.dataset.act=String(active);experience.querySelector('[data-tour-index]').textContent=String(active+1).padStart(2,'0')+' / 05';chapters.forEach((a,i)=>{if(i===active)a.setAttribute('aria-current','step');else a.removeAttribute('aria-current');});experience.querySelector('[data-story-status]').textContent=`Chapter ${active+1}. ${names[active]}. Educational simulation.`;if(active!==2)showInspector(null);}
    const night=mood.dark*(1-phase(progress,3.25,3.82)*.97),consoleExpand=0,consoleAssembly=phase(progress,3.22,3.90),chrome=1;
    set('night',night);set('paper',`color-mix(in srgb,#0b0d0e ${night*100}%,#181715)`);set('ink','#f1efe9');set('muted','#aaa8a2');set('chrome',chrome);set('progress',progress/4);set('console-expand',consoleExpand);set('console-assembly',consoleAssembly);set('score-solid',motion()?phase(progress,2.86,3.0):1);set('score-dock',phase(progress,3.15,3.85));
    set('idle-phase',elapsed*Math.PI/5);set('idle',motion()?1-phase(progress,.04,.6):0);set('light-x',(72+Math.sin(elapsed*.25)*7)+'%');set('type-x',(pointer.x*4)+'px');set('type-fracture',(motion()?Math.sin(clamp(progress)*Math.PI)*30+velocity*5:0)+'px');set('type-turn',(motion()?Math.sin(clamp(progress)*Math.PI)*-5:0)+'deg');
    const windows=[[0,0,.32,.69],[.52,.91,1.48,1.70],[1.48,1.92,2.48,2.72],[2.48,2.96,3.35,3.65],[3.34,3.82,4.5,5]];
    scenes.forEach((scene,i)=>{
      const[a,b,c,d]=windows[i],enter=i===0?1:phase(progress,a,b),leave=phase(progress,c,d),alpha=enter*(1-leave),visible=motion()?alpha>.001:i===active;
      scene.style.visibility=visible?'visible':'hidden';scene.style.opacity=motion()?String(alpha):visible?'1':'0';scene.inert=i!==active;scene.dataset.active=String(i===active);scene.setAttribute('aria-hidden',String(i!==active));
      scene.style.clipPath='none';scene.style.transform=motion()?`translate3d(0,${(1-enter)*22-leave*35}px,0)`:'none';
      headlineLines[i].forEach((line,j)=>{const reveal=i===0?1:phase(progress,a+j*.045,b+j*.045);line.style.transform=motion()?`translate3d(0,${(1-reveal)*108-leave*112}%,0) rotateX(${(1-reveal)*24}deg)`:'none';});
    });
    const riskInk=motion()?phase(progress,2.64,2.96)*(1-phase(progress,3.28,3.58)):(active===3?1:0),revealInk=motion()?phase(progress,3.67,3.96):(active===4?1:0);
    set('risk-ink',riskInk);set('reveal-ink',revealInk);
    experience.querySelectorAll('.sb-risk-panels,.sb-response-preview,.sb-decision-steps').forEach(el=>el.inert=active!==3||riskInk<.5);
    experience.querySelectorAll('.sb-reveal-label,.sb-action-copy,.sb-reveal-actions,.sb-action .sb-replay').forEach(el=>{el.style.visibility=revealInk>.001?'visible':'hidden';el.inert=active!==4||revealInk<.6;});
    if(progress>3.1){readPreviewQuad();if(handoff.score){const r=handoff.score,point=previewPoint(r.x+r.w*.5,r.y+r.h*.5),frameHeight=Math.hypot((previewQuad[2].x-previewQuad[0].x)*width,(previewQuad[2].y-previewQuad[0].y)*height);set('score-target-x',point.x*width+'px');set('score-target-y',point.y*height+'px');set('score-target-scale',clamp(r.h*frameHeight/Math.max(1,riskBounds?.height||150),.04,1));}}
    const pull=phase(progress,.07,.73),titleAlpha=1-phase(progress,.18,.59);
    heroTitle.style.opacity=String(titleAlpha);heroTitle.style.visibility=titleAlpha>.001?'visible':'hidden';heroTitle.style.transform=motion()?`translate3d(${pull*width*.13+pointer.x*5}px,${-pull*height*.10}px,0) scale(${1+pull*.14})`:'none';hero.style.transform='none';hero.style.opacity='1';
    if(progress>2.35)loadConsole();if(experience.dataset.consoleReady==='true')iframe.contentDocument?.documentElement.style.setProperty('--storyboard-assembly',String(consoleAssembly));
    experience.querySelector('.sb-header').inert=document.documentElement.classList.contains('sb-loading')||chrome<.02;experience.querySelector('.sb-chapters').inert=chrome<.02;experience.querySelector('.sb-skip').inert=chrome<.02;
    const entry=document.querySelector('#sb-boot'),covered=entry&&!entry.hidden&&!entry.dataset.state;
    const result=covered?null:world?.draw({progress,time:elapsed,motion:motion(),pointerX:pointer.x,pointerY:pointer.y,velocity,risk:numbers.score,factors:[numbers.f0,numbers.f1,numbers.f2,numbers.f3],factorSelection,inspection,dragX:drag.x,dragY:drag.y,orbitX:orbit.x,orbitY:orbit.y});
    if(result?.signal){const initial={x:width*.12,y:height*.54},t=phase(progress,.12,1);set('signal-x',mix(initial.x,result.signal.x,t)+'px');set('signal-y',mix(initial.y,result.signal.y,t)+'px');set('signal-alpha',(1-phase(progress,3.5,4))*.8);}
    if(progress>1.45&&progress<2.6){
      const fallback=width<=760?{source:{x:width*.33,y:height*.50},rule:{x:width*.67,y:height*.52},host:{x:width*.52,y:height*.64}}:{source:{x:width*.55,y:height*.33},rule:{x:width*.78,y:height*.42},host:{x:width*.67,y:height*.66}};
      const positions=result?.nodes||(host.dataset.fallback?fallback:null);
      if(positions)for(const button of nodeButtons){const node=positions[button.dataset.storyNode];if(!node)continue;const cardWidth=Math.min(260,width*.72),cardLeft=clamp(node.x+cardWidth+24>width*.94?node.x-cardWidth-20:node.x+20,width*.06,width*.94-cardWidth),cardTop=clamp(node.y-22,height*.27,height*.75-140);button.style.left=(node.x-22)+'px';button.style.top=(node.y-22)+'px';button.style.setProperty('--card-x',(cardLeft-node.x+22)+'px');button.style.setProperty('--card-y',(cardTop-node.y+22)+'px');button.style.setProperty('--card-width',cardWidth+'px');}
    }
  }

  function tick(now){
    frame=0;if(disposed||document.hidden)return;const elapsedFrame=lastNow?(now-lastNow)/1000:1/60,dt=Math.min(elapsedFrame,.08);lastNow=now;lenis?.raf(now);const allow=motion(),blend=1-Math.exp(-dt*12);
    if(allow)elapsed+=Math.min(elapsedFrame,.25);pointer.x=mix(pointer.x,allow?pointerTarget.x:0,blend);pointer.y=mix(pointer.y,allow?pointerTarget.y:0,blend);cursor.x=mix(cursor.x,cursorTarget.x,.26);cursor.y=mix(cursor.y,cursorTarget.y,.26);velocity*=Math.exp(-dt*7);if(!drag.active){drag.x*=Math.exp(-dt*.9);drag.y*=Math.exp(-dt*.9);}p=target;
    set('cursor-x',cursor.x+'px');set('cursor-y',cursor.y+'px');compose(p);root.dataset.motion=allow?'on':'off';stage.dataset.progress=p.toFixed(4);stage.dataset.ready='true';
    if(allow||playback)requestFrame();
  }
  function requestFrame(){if(!disposed&&!frame&&!document.hidden)frame=requestAnimationFrame(tick);}
  stage.addEventListener('pointermove',event=>{
    if(event.pointerType==='touch'&&!drag.active)return;pointerTarget={x:event.clientX/width-.5,y:event.clientY/height-.5};cursorTarget={x:event.clientX,y:event.clientY};experience.dataset.pointer='true';
    const hot=event.target.closest('button,a,input'),isNode=event.target.closest('[data-story-node]');experience.dataset.cursor=drag.active?'drag':isNode?'inspect':hot?'hover':act===2?'drag':'default';set('cursor-scale',hot?1.4:1);set('inspect-x',pointerTarget.x*4+'px');set('inspect-y',pointerTarget.y*3+'px');experience.querySelector('.sb-cursor>span').textContent=isNode?'INSPECT':drag.active?'DRAG':'';
    if(drag.active){drag.x+=(event.clientX-drag.lastX)/width*3;drag.y+=(event.clientY-drag.lastY)/height;drag.lastX=event.clientX;drag.lastY=event.clientY;}
  },{passive:true,signal});
  stage.addEventListener('pointerdown',event=>{if(event.pointerType==='touch'&&act===2&&!event.target.closest('[data-story-node]'))showInspector(null);if(event.pointerType==='mouse'){experience.dataset.cursor='click';set('cursor-scale',.85);}if(event.pointerType==='mouse'&&event.button===0&&act===2&&!event.target.closest('a,button,input')){pausePlayback();orbitTween?.kill();drag.active=true;drag.lastX=event.clientX;drag.lastY=event.clientY;stage.setPointerCapture(event.pointerId);experience.dataset.cursor='drag';}},{signal});
  stage.addEventListener('pointerup',()=>{drag.active=false;set('cursor-scale',1);experience.dataset.cursor='default';},{signal});stage.addEventListener('pointercancel',()=>{drag.active=false;},{signal});stage.addEventListener('pointerleave',()=>{pointerTarget={x:0,y:0};experience.dataset.pointer='false';if(!pinned)showInspector(null);},{signal});
  function focusSignal(id){
    experience.dataset.signal=id;orbitTween?.kill();if(motion()){const view={source:[.11,-.025],rule:[-.09,.04],host:[.18,.015]}[id];orbitTween=gsap.to(orbit,{x:view[0],y:view[1],duration:1.1,ease:'power2.inOut',onUpdate:requestFrame});}
  }
  nodeButtons.forEach(button=>{
    const id=button.dataset.storyNode;
    button.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')showInspector(id);},{signal});
    button.addEventListener('pointerleave',event=>{if(event.pointerType==='mouse'&&inspection===id)showInspector(null);},{signal});
    button.addEventListener('focus',()=>{if(button.matches(':focus-visible'))showInspector(id);},{signal});
    button.addEventListener('blur',()=>{if(inspection===id&&!button.matches(':hover'))showInspector(null);},{signal});
    button.addEventListener('click',event=>{pausePlayback();if(event.pointerType==='touch'||matchMedia('(hover: none)').matches){const opening=inspection!==id;focusSignal(id);showInspector(opening?id:null,opening);}else if(button.matches(':hover,:focus-visible'))showInspector(id);},{signal});
  });
  experience.querySelector('[data-story-inspect-close]').addEventListener('click',()=>showInspector(null),{signal});
  experience.querySelectorAll('[data-story-step]').forEach(button=>button.addEventListener('click',()=>{pausePlayback();factorSelection=-1;experience.querySelectorAll('[data-story-factor]').forEach(b=>b.setAttribute('aria-pressed','false'));updateStep(Number(button.dataset.storyStep));},{signal}));
  function explainFactor(){
    const incident=journey.incident,count=journey.events.length,value=index=>incident?.breakdown[index].value||0;
    const notes=[
      ['01 / ATTACK SIGNATURE',incident?'The SSH rule contributes 36 of 40.':'The rule has not matched.','20 failures within 60 seconds trigger detection.'],
      ['02 / REPETITION',`${count} attempts contribute ${value(1)} of 30.`,value(1)===30?'30 is the limit for this contribution.':'Each repeated failure adds to the evidence.'],
      ['03 / HOST IMPACT',`One host contributes ${value(2)} of 20.`,'The example targets a single SSH service.'],
      ['04 / TIME WINDOW',`${((count-1)*.085).toFixed(1)} seconds contribute ${value(3)} of 10.`,'Scored once the detection rule matches.']
    ];
    const note=notes[factorSelection];experience.dataset.note='factor';experience.querySelector('.sb-response-preview .sb-eyebrow').textContent=note[0];experience.querySelector('[data-story-action]').textContent=note[1];experience.querySelector('[data-story-note-caption]').textContent=note[2];requestFrame();
  }
  experience.querySelector('[data-story-factors]').addEventListener('click',event=>{
    const button=event.target.closest('[data-story-factor]');if(!button)return;pausePlayback();const selected=Number(button.dataset.storyFactor);factorSelection=factorSelection===selected?-1:selected;
    experience.querySelectorAll('[data-story-factor]').forEach(el=>el.setAttribute('aria-pressed',String(Number(el.dataset.storyFactor)===factorSelection)));
    if(factorSelection<0)updateStep(currentStep);else explainFactor();
  },{signal});
  input.addEventListener('input',()=>{pausePlayback();journey=makeJourney(Number(input.value),1,time);updateEvidence({animate:true});},{signal});
  experience.querySelector('[data-story-about]').addEventListener('click',()=>modal('One incident. Every decision.',`<p class="eyebrow">IAIRS / AN INTERACTIVE STUDY</p><p>Follow a simulated SSH attack from repeated login failures to a response.</p><p>The globe connects the source, the detection rule, and the target. Its positions are schematic. Change the event count to see how the score and policy respond; select a contribution to inspect its weight.</p><p>Open this case saves the example in this browser. Enter the console opens your workspace. All responses in this study are simulated.</p><button class="button button-primary" data-action="close-modal">Return to the sequence</button>`),{signal});
  experience.querySelector('[data-story-open]').addEventListener('click',event=>{if(!journey.incident||event.currentTarget.disabled)return;event.currentTarget.disabled=true;onOpenCase?.(journey.events);},{signal});
  experience.querySelectorAll('.sb-button,.sb-access,.sb-launch').forEach(button=>{button.addEventListener('pointermove',event=>{if(!motion()||event.pointerType!=='mouse')return;const r=button.getBoundingClientRect();button.style.translate=`${(event.clientX-r.left-r.width/2)*.05}px ${(event.clientY-r.top-r.height/2)*.1}px`;},{passive:true,signal});button.addEventListener('pointerleave',()=>button.style.removeProperty('translate'),{signal});});
  for(const type of ['wheel','touchstart'])window.addEventListener(type,pausePlayback,{passive:true,signal});
  experience.addEventListener('keydown',event=>{if(event.key==='Escape'){stopPlayback();showInspector(null);drag.active=false;}if(['PageDown','PageUp','Home','End','ArrowDown','ArrowUp'].includes(event.key))pausePlayback();},{signal});
  window.addEventListener('scroll',sync,{passive:true,signal});window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(measure,130);},{passive:true,signal});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){pausePlayback();cancelAnimationFrame(frame);frame=0;lastNow=0;lenis?.stop();}else{lenis?.start();requestFrame();}},{signal});
  host.addEventListener('storyboard:invalidate',requestFrame,{signal});
  const preference=()=>{stopPlayback();updateEvidence();configureScroll();requestFrame();};media.addEventListener('change',preference);
  let lastPaused=document.documentElement.classList.contains('motion-paused');
  const observer=new MutationObserver(()=>{const paused=document.documentElement.classList.contains('motion-paused');if(paused!==lastPaused){lastPaused=paused;preference();}});observer.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  updateEvidence();measure();configureScroll();scrollTrigger=ScrollTrigger.create({trigger:track,start:'top top',end:()=>'+='+step*4,invalidateOnRefresh:true,onUpdate:sync,onRefresh:sync});
  const initial=experience.querySelector(`#${CSS.escape(location.hash.slice(1)||'home')}`);if(initial?.hasAttribute('data-act-anchor'))scrollToAnchor(initial,{instant:true});
  Promise.allSettled([document.fonts.load('400 32px "Cormorant Garamond"'),document.fonts.load('italic 400 32px "Cormorant Garamond"'),document.fonts.load('400 16px "Space Grotesk"'),document.fonts.load('400 12px "IBM Plex Mono"'),document.fonts.load('400 16px "Inter"')]).then(()=>{if(!disposed){loader.complete('fonts');measure();requestFrame();}});
  import('./singularity-world.js').then(({createStoryboardWorld})=>{if(disposed)return;loader.complete('engine');world=createStoryboardWorld(host,{onAsset:id=>loader.complete(id)});measure();world.ready?.then(()=>{if(!disposed)requestFrame();});requestFrame();}).catch(()=>{host.dataset.fallback='true';['engine','earth','environment','shaders'].forEach(id=>loader.complete(id));requestFrame();});
  loadConsole();requestFrame();
  return()=>{disposed=true;stopPlayback();loader.dispose();orbitTween?.kill();abort.abort();media.removeEventListener('change',preference);observer.disconnect();scrollTrigger?.kill();master.kill();riskTween?.kill();gsap.killTweensOf(experience.querySelector('[data-story-chart-point]'));lenis?.destroy();world?.dispose();cancelAnimationFrame(frame);clearTimeout(resizeTimer);delete root.experienceScrollTo;delete root.dataset.motion;};
}
