import { makeJourney } from './journey-data.js';
import { escape, modal } from './ui.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { drawSignalField } from './signal-field.js';
gsap.registerPlugin(ScrollTrigger);

// One continuous coordinate, 0–5, directs every scene. No wheel/touch interception.
const clamp = (v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const mix = (a,b,t)=>a+(b-a)*t;
const ease = t=>{t=clamp(t);return t*t*(3-2*t);};
const range = (p,a,b)=>ease((p-a)/(b-a));
const chapters = ['ALL SYSTEMS IN ORDER','ANOMALY ACQUIRED','PATTERN DETECTED','RISK CALCULATED','RESPONSE SIMULATED','CONTROL RESTORED'];
const branchPaths = ['M20 250H160L290 55H720','M20 250H200L330 185H720','M20 250H240L370 315H720','M20 250H280L410 445H720'];

export function mountAnomaly(root) {
  const experience=root.querySelector('.anomaly-experience');
  if(!experience)return ()=>{};
  const abort=new AbortController(),{signal}=abort,media=matchMedia('(prefers-reduced-motion: reduce)');
  const stage=experience.querySelector('.an-stage'),track=experience.querySelector('.an-track'),canvas=experience.querySelector('.an-field');
  let ctx=null;try{ctx=canvas.getContext('2d',{alpha:true});}catch{/* Typography and navigation remain usable. */}
  const scenes=[...experience.querySelectorAll('[data-scene]')],nav=[...experience.querySelectorAll('[data-an-chapter]')];
  const letters=[...experience.querySelectorAll('.an-control .an-letter')];
  const score=experience.querySelector('[data-an-score]'),input=experience.querySelector('#an-failures');
  const fragments=experience.querySelector('.an-score-fragments');
  let width=innerWidth,height=innerHeight,step=innerHeight*1.12,origin=0,dpr=1,phone=false,disposed=false;
  let target=0,progress=0,frame=0,lastTime=0,lastDraw=0,lastY=scrollY,velocity=0,currentAct=-1;
  let pointer={x:0,y:0},pointerTarget={x:0,y:0},handoffTimer=0,resizeTimer=0,scoreBounds=null;
  const timestamp=Date.now();let journey=makeJourney(40,1,timestamp),policyOverride=null,evidencePinned=false,evidenceFocus=0,policyReveal=1;
  const selectedSeverity=()=>policyOverride||journey.incident?.severity;
  const policyActions={Low:'Log only',Medium:'Security alert',High:'Simulated IP block',Critical:'Simulated host isolation + administrator notification'};
  const fragmentNodes=Array.from({length:58},(_,i)=>{
    const span=document.createElement('span');span.textContent=['AUTH_FAILED','SSH:22','203.0.113.18','→','RULE MATCH','EVENT_0'+i,'3.3s','10.0.0.6'][i%8];
    span.style.left=(4+(i*37)%91)+'%';span.style.top=(5+(i*29)%85)+'%';fragments.append(span);return span;
  });
  let particleTargets=[],letterBounds=[],titleParticles=[],fractureParticles=[],responsePaths=[],signalStage=null,scrollDirector=null,consolePanels=[],headlineMask=null,maskKey='';
  const consoleFrame=experience.querySelector('.an-console-live');
  const displacement=experience.querySelector('[data-an-displacement]');
  const sampleCount=matchMedia('(max-width:760px)').matches?1024:4096;
  // Stable identities are reused from the glyph cloud all the way to the console grid.
  const columns=sampleCount>1500?64:32;
  const identities=Array.from({length:sampleCount},(_,i)=>({u:(i%columns)/(columns-1),v:Math.floor(i/columns)/(sampleCount/columns-1),group:i%40}));
  const motionState={particles:0,wire:0,blueprint:0,halftone:0,verdict:0,reveal:0};
  const master=gsap.timeline({paused:true})
    .to(motionState,{halftone:.075,duration:.65,ease:'sine.inOut'},.35)
    .to(motionState,{halftone:0,duration:.7,ease:'sine.inOut'},1.05)
    .to(motionState,{particles:1,duration:.75,ease:'power2.inOut'},1.2)
    .to(motionState,{wire:1,duration:.6,ease:'power2.inOut'},1.85)
    .to(motionState,{particles:0,duration:.7,ease:'power2.inOut'},2.35)
    .to(motionState,{blueprint:1,verdict:1,duration:.65,ease:'power2.inOut'},2.35)
    .to(motionState,{wire:0,duration:.5,ease:'sine.inOut'},2.85)
    .to(motionState,{blueprint:.2,duration:.4,ease:'sine.inOut'},4.15)
    .to(motionState,{reveal:1,duration:.65,ease:'power2.inOut'},4.35)
    .to({}, {duration:0},5);
  const motion=()=>!media.matches&&!document.documentElement.classList.contains('motion-paused');
  const set=(key,value)=>experience.style.setProperty('--an-'+key,String(value));

  function applyEvidence(){
    const incident=journey.incident,first=journey.events[0],count=journey.events.length;
    experience.dataset.severity=incident?.severity||'none';
    experience.querySelector('[data-an-source]').textContent=first.source;
    experience.querySelector('[data-an-target]').textContent=first.destination;
    experience.querySelector('[data-an-count]').textContent=count;
    experience.querySelector('[data-an-reason]').textContent=incident?.reason||`${count} failed logins. Below the threshold of 20 within 60 seconds.`;
    experience.querySelector('[data-an-severity]').textContent=incident?.severity.toUpperCase()||'BELOW THRESHOLD';
    score.textContent=incident?.risk??'—';
    score.setAttribute('aria-label',incident?`Risk ${incident.risk} out of 100, ${incident.severity}`:'Below detection threshold; no incident');
    experience.querySelector('#an-frequency').textContent=count+' FAILURES';
    input.setAttribute('aria-valuetext',`${count} failures. ${incident?`Risk ${incident.risk} of 100. ${incident.action}.`:'Below threshold. Continue observing.'}`);
    const factors=incident?.breakdown||[{label:'Attack type',value:0,max:40},{label:'Event frequency',value:0,max:30},{label:'Host impact',value:0,max:20},{label:'Time window',value:0,max:10}];
    experience.querySelector('[data-an-factors]').innerHTML=factors.map(f=>`<div class="an-factor"><span>${escape(f.label)}</span><output>${f.value}</output><small>/ ${f.max}</small><div class="an-factor-meter"><i style="--factor-fill:${f.value/f.max*100}%"></i></div></div>`).join('');
    experience.querySelector('[data-an-equation]').textContent=incident?factors.map(f=>f.value).join(' + ')+' = '+incident.risk:'NO RULE MATCHED';
    applyPolicy();
    experience.querySelectorAll('.an-event-marks i').forEach((el,i)=>{el.style.opacity=i<count?'1':'.15';});
    if(currentAct>=0)experience.querySelector('[data-an-phase]').textContent=phase(currentAct);
    sampleScore();updateTargets();requestFrame();
  }

  function applyPolicy(){
    const severity=selectedSeverity(),index=['Low','Medium','High','Critical'].indexOf(severity);
    experience.dataset.policy=severity||'none';
    experience.querySelector('[data-an-result]').textContent=severity?(policyOverride?'EXPLORE THE POLICY / SIMULATION ONLY':'ILLUSTRATIVE RESPONSE / SIMULATION ONLY'):'CONTINUE OBSERVING';
    experience.querySelector('[data-an-action]').textContent=policyActions[severity]||'No response selected';
    experience.querySelectorAll('[data-an-branch]').forEach(el=>el.classList.toggle('is-selected',el.dataset.anBranch===severity));
    experience.querySelectorAll('[data-an-policy]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.anPolicy===severity)));
    experience.querySelector('.an-active-branch').setAttribute('d',branchPaths[Math.max(index,0)]);
    experience.querySelector('.an-active-branch').style.opacity=severity?'1':'0';
    if(currentAct===4)experience.querySelector('[data-an-phase]').textContent=severity?'RESPONSE POLICY / '+severity.toUpperCase():'CONTINUE OBSERVING';
    requestFrame();
  }

  function phase(act){
    if(!journey.incident&&act===2)return 'BELOW DETECTION THRESHOLD';
    if(!journey.incident&&act===3)return 'NO RULE MATCHED';
    if(!journey.incident&&!policyOverride&&act===4)return 'CONTINUE OBSERVING';
    return chapters[act];
  }

  function sampleScore(){
    const transforms=scenes.map(s=>s.style.transform);scenes.forEach(s=>s.style.transform='none');
    // Sample the actual displayed type, so evidence converges into that same number.
    scoreBounds=score.getBoundingClientRect();
    const sample=document.createElement('canvas'),sc=sample.getContext('2d',{willReadFrequently:true});
    if(!sc){scenes.forEach((s,i)=>s.style.transform=transforms[i]);return;}
    sample.width=300;sample.height=270;
    sc.font='500 250px "Space Grotesk"';sc.textBaseline='top';sc.fillText(String(journey.incident?.risk??'—'),0,0);
    const data=sc.getImageData(0,0,300,270).data,points=[];
    for(let y=20;y<250;y+=7)for(let x=0;x<300;x+=6)if(data[(y*300+x)*4+3]>150)points.push([x/300,y/270]);
    if(points.length){const xs=points.map(q=>q[0]),ys=points.map(q=>q[1]),minX=Math.min(...xs),minY=Math.min(...ys),maxX=Math.max(...xs),maxY=Math.max(...ys);particleTargets=points.map(q=>[(q[0]-minX)/(maxX-minX),(q[1]-minY)/(maxY-minY)]);}
    const titlePoints=[],fracturePoints=[];
    const nextMaskKey=width+'x'+height+'/'+document.fonts.status;
    const maskCanvas=document.createElement('canvas');maskCanvas.width=phone?480:1024;maskCanvas.height=Math.round(maskCanvas.width*height/width);
    const maskContext=nextMaskKey!==maskKey?maskCanvas.getContext('2d',{willReadFrequently:true}):null;
    experience.querySelectorAll('.an-control .an-slice-0,.an-fracture .an-slice-0').forEach(line=>{
      const box=line.getBoundingClientRect();sc.font='120px "Cormorant Garamond"';
      const metrics=sc.measureText(line.textContent),w=Math.ceil(metrics.width)+4,h=130;
      sample.width=w;sample.height=h;sc.font='120px "Cormorant Garamond"';sc.textBaseline='top';sc.fillText(line.textContent,0,0);
      const pixels=sc.getImageData(0,0,w,h).data;
      const target=line.closest('.an-fracture')?fracturePoints:titlePoints;
      const fontSize=parseFloat(getComputedStyle(line).fontSize),glyphTop=box.top+(box.height-fontSize)/2,glyphHeight=h/120*fontSize;
      if(maskContext&&line.closest('.an-fracture'))maskContext.drawImage(sample,0,0,w,h,box.left/width*maskCanvas.width,glyphTop/height*maskCanvas.height,box.width/width*maskCanvas.width,glyphHeight/height*maskCanvas.height);
      for(let y=0;y<h;y+=4)for(let x=0;x<w;x+=4)if(pixels[(y*w+x)*4+3]>100)target.push([(box.left+x/w*box.width)/width,(glyphTop+y/h*glyphHeight)/height]);
    });
    titleParticles=titlePoints;
    fractureParticles=fracturePoints;
    if(maskContext){headlineMask=maskContext.getImageData(0,0,maskCanvas.width,maskCanvas.height);maskKey=nextMaskKey;}
    scenes.forEach((s,i)=>s.style.transform=transforms[i]);
  }

  function measure(){
    const oldStep=step;
    width=stage.clientWidth;height=stage.clientHeight;phone=width<=760;
    consoleFrame.style.width=width+'px';consoleFrame.style.height=height+'px';
    step=height*(phone?1.04:1.12);experience.style.setProperty('--an-step',step+'px');
    origin=track.getBoundingClientRect().top+scrollY;
    // Resizing preserves the narrative coordinate instead of unexpectedly changing acts.
    if(oldStep&&currentAct>=0&&Math.abs(oldStep-step)>30)window.scrollTo({top:origin+target*step,behavior:'instant'});
    dpr=Math.min(devicePixelRatio||1,phone?1.3:1.65);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    ctx?.setTransform(dpr,0,0,dpr,0,0);
    sampleScore();letterBounds=letters.map(letter=>letter.getBoundingClientRect());signalStage?.resize();scrollDirector?.refresh();sync();
    const responseScene=experience.querySelector('.an-response'),responseTransform=responseScene.style.transform;responseScene.style.transform='none';
    responsePaths=[...experience.querySelectorAll('.an-branch-base path')].map(path=>{
      const matrix=path.getScreenCTM(),length=path.getTotalLength();
      return Array.from({length:65},(_,i)=>{const q=path.getPointAtLength(length*i/64);return matrix?[matrix.a*q.x+matrix.c*q.y+matrix.e,matrix.b*q.x+matrix.d*q.y+matrix.f]:[0,0];});
    });
    responseScene.style.transform=responseTransform;
    updateTargets();
  }

  function updateTargets(){
    if(!scoreBounds)return;
    signalStage?.update({identities,title:titleParticles,fracture:fractureParticles,mask:headlineMask,score:particleTargets,scoreBounds,width,height,responsePaths,panels:consolePanels});
  }

  function loadConsole(){
    if(consoleFrame.hasAttribute('src'))return;
    consoleFrame.src=new URL('#console/overview',location.href).href;
  }
  consoleFrame.addEventListener('load',()=>{
    if(disposed)return;
    try{
      const doc=consoleFrame.contentDocument;
      const main=doc?.querySelector('.command-layout');if(!main)return;
      experience.dataset.consoleReady='true';
      // These are boundaries measured from the real application, not a fictional UI.
      const parts=[...doc.querySelectorAll('.app-sidebar,.app-topbar,.command-hero,.metric-card,.command-activity,.command-recents,.distribution-panel,.command-timeline,.command-risk,.active-incident-card,.command-actions,.command-host')];
      consolePanels=parts.map(el=>{
        const r=el.getBoundingClientRect();return {x:r.left/consoleFrame.clientWidth,y:r.top/consoleFrame.clientHeight,w:r.width/consoleFrame.clientWidth,h:r.height/consoleFrame.clientHeight};
      }).filter(r=>r.w>0&&r.h>0);
      const style=doc.createElement('style');
      style.textContent=`body{overflow:hidden!important}[data-an-console-part]{--part:clamp(0,calc((var(--an-live-assembly,0) - var(--an-part-delay,0))*2.2),1);transform:translate3d(calc((1 - var(--part))*var(--an-from-x,0px)),calc((1 - var(--part))*var(--an-from-y,0px)),0) scale(calc(.86 + var(--part)*.14));clip-path:inset(0 calc((1 - var(--part))*100%) 0 0);opacity:var(--part);will-change:transform,clip-path;transform-origin:center}@media(max-width:760px){.app-sidebar[data-an-console-part]{transform:translateX(-110%)!important;opacity:0!important}}`;
      doc.head.append(style);
      parts.forEach((el,i)=>{const r=el.getBoundingClientRect();el.dataset.anConsolePart='';el.style.setProperty('--an-part-delay',String((i%7)*.035));el.style.setProperty('--an-from-x',(consoleFrame.clientWidth*.12-r.left-r.width/2)*.65+'px');el.style.setProperty('--an-from-y',(consoleFrame.clientHeight*.54-r.top-r.height/2)*.65+'px');});
      updateTargets();requestFrame();
    }catch{/* The native console link is always available. */}
  },{signal});

  function sync(){
    if(disposed)return;
    const y=scrollY;
    velocity=clamp((y-lastY)/65,-1,1);lastY=y;
    target=clamp((y-origin)/step,0,5);
    if(!motion())progress=target;
    requestFrame();
  }

  function updateScenes(p){
    const active=clamp(Math.round(p),0,5);
    if(active!==currentAct){
      currentAct=active;experience.dataset.act=String(active);
      nav.forEach((link,i)=>{if(i===active)link.setAttribute('aria-current','step');else link.removeAttribute('aria-current');});
      experience.querySelector('[data-an-index]').textContent=String(active).padStart(2,'0');
      experience.querySelector('[data-an-phase]').textContent=phase(active);
      experience.querySelector('[data-an-status]').textContent=`Act ${active}: ${nav[active].getAttribute('aria-label').split(': ')[1]}. ${phase(active).toLowerCase()}.`;
    }
    scenes.forEach((scene,i)=>{
      const distance=p-i;
      // Headline masks move through the cut; large headlines never cross-fade over
      // one another. The persistent geometry carries the handoff between them.
      let alpha=Math.abs(distance)<.53?1:0;
      if(!motion())alpha=i===active?1:0;
      const visible=alpha>.005;
      scene.style.opacity=alpha.toFixed(3);scene.style.visibility=visible?'visible':'hidden';
      scene.inert=i!==active;scene.dataset.visible=String(i===active);scene.setAttribute('aria-hidden',String(i!==active));
      scene.style.transform=motion()?`translate3d(0,${-distance*24}px,0)`:'none';
      scene.style.clipPath=motion()?`inset(${(1-range(p,i-.52,i-.24))*100}% 0 ${range(p,i+.24,i+.52)*100}% 0)`:'none';
      if(motion()){
        const exit=range(distance,.22,.54),entry=1-range(distance,-.54,-.25);
        const heading=scene.querySelector('h1,h2');
        if(heading){heading.style.opacity=String((1-Math.max(exit,entry))*(i===5?1-range(p,4.56,4.9):i===1?1-range(p,.95,1.1):1));heading.style.clipPath=`inset(${entry*100}% 0 ${exit*100}% 0)`;}
      }else{scene.querySelector('h1,h2')?.style.removeProperty('opacity');scene.querySelector('h1,h2')?.style.removeProperty('clip-path');}
    });
  }

  function drawComposition(p,time){
    master.time(p);
    stage.dataset.progress=p.toFixed(4);stage.dataset.renderTime=motion()?time.toFixed(3):'0.000';
    const idlePhase=time*Math.PI/5,allow=motion(),ambient=allow?Math.sin(idlePhase):0;
    const idle=allow?1-range(p,.04,.55):0;
    set('idle-phase',idlePhase);set('idle-strength',idle);
    set('light-x',(50+Math.sin(idlePhase)*45)+'%');
    if(p>3.3)loadConsole();
    set('halftone',allow?motionState.halftone:0);set('verdict',allow?motionState.verdict:1);set('reveal',allow?motionState.reveal:1);set('blueprint',allow?motionState.blueprint:1);
    const night=range(p,.85,1.85);
    set('night',night);set('atmosphere',`color-mix(in srgb, #171717 ${night*100}%, #eae7df)`);
    set('liquid-alpha',range(p,.25,.85)*(1-range(p,1.45,2)));
    let sx=.72,sy=.63;
    if(p<1){sx=mix(phone?.56:.57,.70,range(p,.05,.9));sy=mix(phone?.43:.65,.49,range(p,.05,.9));}
    else if(p<2){sx=mix(.70,phone?.69:.65,range(p,1,2));sy=mix(.49,phone?.54:.47,range(p,1,2));}
    else if(p<3){sx=mix(phone?.69:.65,.31,range(p,2.1,3));sy=mix(phone?.54:.47,.62,range(p,2.1,3));}
    else if(p<4){const node=responsePaths[Math.max(0,['Low','Medium','High','Critical'].indexOf(selectedSeverity()))]?.[0]||[width*.18,height*.53];sx=mix(.31,node[0]/width,range(p,3.1,4));sy=mix(.62,node[1]/height,range(p,3.1,4));}
    else {const node=responsePaths[Math.max(0,['Low','Medium','High','Critical'].indexOf(selectedSeverity()))]?.[0]||[width*.18,height*.53];sx=mix(node[0]/width,phone?.77:.85,range(p,4,5));sy=mix(node[1]/height,phone?.61:.30,range(p,4,5));}
    const proximity=Math.max(0,1-Math.hypot(pointer.x+.5-sx,pointer.y+.5-sy)/.22);
    sx+=idle*(Math.sin(idlePhase)*.012+pointer.x*.012*proximity);sy+=idle*(Math.cos(idlePhase)*.009+pointer.y*.012*proximity);
    set('signal-x',sx*width+(allow?ambient*1.6:0)+'px');set('signal-y',sy*height+(allow?Math.cos(idlePhase)*1.6:0)+'px');
    set('sx',sx*100+'%');set('sy',sy*100+'%');
    signalStage?.draw({progress:p,time:allow?time:0,pointerX:pointer.x,pointerY:pointer.y,signalX:sx,signalY:sy,motion:allow,velocity,inspection:evidenceFocus,selectedBranch:['Low','Medium','High','Critical'].indexOf(selectedSeverity())});
    const iris=range(p,1.25,1.95)*(1-range(p,4.25,4.95));
    set('iris',iris*Math.hypot(width,height)*1.1+'px');
    const isDark=p>=1.16;
    set('color',isDark?'#eae7df':'#101010');
    set('rail-bg',isDark?'#171717':'#eae7df');
    set('field-alpha',range(p,.15,.75)*(1-range(p,3.7,4.45)));
    set('grid-alpha',mix(.065,.035,range(p,1.2,2))+.05*range(p,4.1,5));
    set('grid-x',(allow?pointer.x*3*(1-range(p,1.5,2)):0)+'px');
    const fracture=allow?Math.sin(clamp(p,0,1)*Math.PI)*36+Math.sin(clamp(p-1,0,1)*Math.PI)*64:0;
    set('fracture',fracture+(allow?velocity*7:0)+'px');set('skew',allow?velocity*1.1+'deg':'0deg');
    set('stretch',1+(allow?Math.sin(clamp(p,0,2)*Math.PI)*.025:0));
    set('letter-y',(allow?Math.sin(clamp(p,0,2)*Math.PI)*11:0)+'px');
    set('letter-turn',(allow?Math.sin(clamp(p,0,2)*Math.PI)*12:0)+'deg');
    set('tracking',(allow?Math.sin(clamp(p,0,2)*Math.PI)*.008:0)+'em');
    displacement?.setAttribute('scale',String(allow?Math.sin(clamp(p/1.8)*Math.PI)*24+idle*(2.2+Math.sin(idlePhase)*1.3):0));
    set('type-filter',allow&&p<1.8?'url(#an-type-liquid)':'none');
    set('type-x',(allow?pointer.x*2.5:0)+'px');set('type-y',(allow?ambient*.6:0)+'px');
    set('cut-scale',Math.sin(clamp((p-.15)/1.6)*Math.PI));set('cut-y',sy*100+'%');
    set('signal-scale',mix(1,.55,range(p,2.5,3.1)));set('ring-alpha',range(p,1.2,1.9)*(1-range(p,2.3,3)));
    set('ring-scale',allow?1+Math.sin(time*1.4)*.12:1);set('core',range(p,4.5,5));
    set('marks',range(p,1.5,2));set('path-offset',1-range(p,3.6,4.15)*policyReveal);
    set('console-rotate',mix(-16,0,range(p,4.35,5))+'deg');set('console-y',mix(80,0,range(p,4.35,5))+'px');
    set('progress',p/5);
    set('risk-solid',allow?range(p,3.02,3.22):1);
    set('score-leave',allow?range(p,3.1,3.48):0);
    set('network-dolly',range(p,1.5,2.4));
    set('console-expand',range(p,4.58,5));
    set('console-assemble',range(p,4.3,4.85));
    if(experience.dataset.consoleReady==='true')consoleFrame.contentDocument?.documentElement.style.setProperty('--an-live-assembly',String(range(p,4.25,4.9)));
    set('console-copy',1-range(p,4.56,4.9));
    set('chrome',1-range(p,4.78,5));
    const hiddenChrome=p>4.97;
    experience.querySelector('.an-header').inert=hiddenChrome;
    experience.querySelector('.an-rail').inert=hiddenChrome;
    experience.querySelector('.an-stage-footer').inert=hiddenChrome;
    fragmentNodes.forEach((node,i)=>{
      const spread=1-range(p,2.45,3.12),a=(i*2.39996),distance=(phone?100:230)*spread;
      node.style.transform=`translate3d(${Math.cos(a)*distance}px,${Math.sin(a)*distance}px,0)`;
      node.style.opacity=String(allow?(1-range(p,2.55,2.85))*range(p,2.3,2.55)*.8:0);
    });
    if(!allow)letters.forEach(letter=>letter.style.removeProperty('translate'));
    if(ctx)drawSignalField(ctx,{p,time:allow?time:0,width,height,phone,pointer,identities,title:titleParticles,fracture:fractureParticles,score:particleTargets,scoreBounds,signalX:sx*width,signalY:sy*height,motion:allow,responsePaths,gpu:experience.querySelector('.an-world').dataset.gpu==='ready',selectedBranch:['Low','Medium','High','Critical'].indexOf(selectedSeverity())});
  }

  function tick(now){
    frame=0;if(disposed||document.hidden)return;
    const dt=lastTime?Math.min((now-lastTime)/1000,.1):1/60;lastTime=now;
    const allow=motion(),blend=1-Math.exp(-dt*15);root.dataset.motion=allow?'on':'off';
    evidenceFocus=mix(evidenceFocus,currentAct===2&&!experience.querySelector('.an-node-details').hidden?1:0,allow?blend:1);
    policyReveal=allow?mix(policyReveal,1,1-Math.exp(-dt*5)):1;
    if(!allow){pointer={x:0,y:0};pointerTarget={x:0,y:0};velocity=0;}
    progress=allow?mix(progress,target,blend):target;
    if(Math.abs(target-progress)<.0001)progress=target;
    pointer.x=mix(pointer.x,pointerTarget.x,blend);pointer.y=mix(pointer.y,pointerTarget.y,blend);velocity*=Math.exp(-dt*9);
    const fps=phone?30:60;
    if(!allow||now-lastDraw>1000/fps-1){updateScenes(progress);drawComposition(progress,now/1000);lastDraw=now;}
    if(allow||Math.abs(progress-target)>.0001)requestFrame();
  }
  function requestFrame(){if(!disposed&&!frame&&!document.hidden)frame=requestAnimationFrame(tick);}
  function scrollToAct(el){
    if(resizeTimer){clearTimeout(resizeTimer);resizeTimer=0;measure();}
    const index=Number(el.dataset.actAnchor);
    if(!Number.isFinite(index))return;
    window.scrollTo({top:origin+index*step,behavior:motion()?'smooth':'instant'});
    // Direct keyboard navigation exposes the destination's interactive controls.
    if(!motion()){target=index;progress=index;updateScenes(index);drawComposition(index,0);}
  }
  root.experienceScrollTo=scrollToAct;

  window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{resizeTimer=0;measure();},120);},{passive:true,signal});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;lastTime=0;}else{sync();}},{signal});
  stage.addEventListener('pointermove',event=>{
    if(!motion()||event.pointerType==='touch')return;
    pointerTarget={x:event.clientX/width-.5,y:event.clientY/height-.5};
    if(currentAct===0&&progress<.25){
      letters.forEach((letter,index)=>{
        if(index%3!==0)return;
        const box=letterBounds[index];if(!box)return;
        const distance=Math.hypot(event.clientX-(box.left+box.width/2),event.clientY-(box.top+box.height/2));
        letter.style.translate=distance<140?`${(event.clientX-box.left-box.width/2)*.025}px ${(event.clientY-box.top-box.height/2)*.025}px`:'0px 0px';
      });
    }
  },{passive:true,signal});
  stage.addEventListener('pointerleave',()=>{pointerTarget={x:0,y:0};letters.forEach(l=>l.style.removeProperty('translate'));},{signal});
  experience.querySelectorAll('.an-primary-cta,.an-enter').forEach(button=>{
    button.addEventListener('pointermove',event=>{
      if(!motion()||event.pointerType!=='mouse')return;
      const b=button.getBoundingClientRect();button.style.translate=`${(event.clientX-b.left-b.width/2)*.06}px ${(event.clientY-b.top-b.height/2)*.1}px`;
    },{passive:true,signal});
    button.addEventListener('pointerleave',()=>{button.style.removeProperty('translate');},{signal});
  });
  input.addEventListener('input',()=>{policyOverride=null;journey=makeJourney(Number(input.value),1,timestamp);applyEvidence();},{signal});
  const inspect=experience.querySelector('.an-node-inspect'),details=experience.querySelector('.an-node-details');
  const showEvidence=visible=>{details.hidden=!visible;experience.dataset.inspecting=String(visible);inspect.setAttribute('aria-expanded',String(visible));requestFrame();};
  inspect.addEventListener('click',()=>{evidencePinned=!evidencePinned;showEvidence(evidencePinned);},{signal});
  inspect.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')showEvidence(true);},{signal});
  stage.addEventListener('pointermove',event=>{if(!evidencePinned&&!details.hidden&&!event.target.closest('.an-node-inspect,.an-node-details'))showEvidence(false);},{passive:true,signal});
  stage.addEventListener('pointerleave',()=>{if(!evidencePinned)showEvidence(false);},{signal});
  experience.addEventListener('keydown',event=>{if(event.key==='Escape'&&!details.hidden){evidencePinned=false;showEvidence(false);inspect.focus();}},{signal});
  experience.querySelectorAll('[data-an-policy]').forEach(button=>button.addEventListener('click',()=>{policyOverride=button.dataset.anPolicy;policyReveal=motion()?0:1;applyPolicy();},{signal}));
  experience.querySelector('[data-an-about]').addEventListener('click',()=>{
    modal('The website is the incident.',`<p class="eyebrow">IAIRS / THE ANOMALY</p><p>Intelligent Automated Incident Response System is an educational cybersecurity simulation. Follow one illustrative SSH incident through disruption, detection, risk assessment, and simulated response.</p><p>The displayed score uses the existing IAIRS rule engine. The landing-page example stays in memory and does not add incidents to your workspace. The console contains sample data and your own local Demo Lab runs.</p><p>No live traffic is captured. Containment actions are simulated.</p><button class="button button-primary" data-action="close-modal">Return to the experience ↗</button>`);
  },{signal});
  experience.querySelectorAll('[data-an-enter]').forEach(link=>link.addEventListener('click',event=>{
    if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||!motion())return;
    event.preventDefault();
    if(handoffTimer)return;
    experience.classList.add('an-handoff');
    // This is a real application route; native href remains the no-script fallback.
    handoffTimer=setTimeout(()=>{location.hash='console/overview';},currentAct===5?420:100);
  },{signal}));
  const preferenceChanged=()=>{root.dataset.motion=motion()?'on':'off';lastTime=0;sync();};
  media.addEventListener('change',preferenceChanged);
  const observer=new MutationObserver(preferenceChanged);observer.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  root.dataset.motion=motion()?'on':'off';stage.dataset.ready=String(!!ctx);stage.dataset.fallback=String(!ctx);
  applyEvidence();measure();
  scrollDirector=ScrollTrigger.create({trigger:track,start:'top top',end:()=>'+='+step*5,invalidateOnRefresh:true,onUpdate:self=>{velocity=clamp(self.getVelocity()/1600,-1,1);lastY=scrollY;target=self.progress*5;if(!motion())progress=target;requestFrame();},onRefresh:sync});
  document.fonts.ready.then(()=>{if(!disposed){measure();requestFrame();}});
  import('./signal-stage.js').then(async({createSignalStage})=>{
    if(disposed)return;const stage=await createSignalStage(experience.querySelector('.an-world'));
    if(disposed){stage.dispose();return;}signalStage=stage;measure();drawComposition(progress,motion()?performance.now()/1000:0);requestFrame();
  }).catch(()=>{if(!disposed)experience.querySelector('.an-world').dataset.gpu='fallback';});
  requestFrame();
  return ()=>{disposed=true;abort.abort();scrollDirector?.kill();master.kill();signalStage?.dispose();media.removeEventListener('change',preferenceChanged);observer.disconnect();cancelAnimationFrame(frame);clearTimeout(handoffTimer);clearTimeout(resizeTimer);delete root.experienceScrollTo;delete root.dataset.motion;canvas.width=canvas.height=0;};
}
