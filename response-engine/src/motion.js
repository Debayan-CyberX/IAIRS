const rememberedValues=new Map();
let navigationTransition=null;
export const motionAllowed=()=>!matchMedia('(prefers-reduced-motion: reduce)').matches&&!document.documentElement.classList.contains('motion-paused');

export function animateViewChange(callback){
  if(!motionAllowed()||!document.startViewTransition){callback();return;}
  try{navigationTransition?.skipTransition();const transition=document.startViewTransition(callback);navigationTransition=transition;transition.ready.catch(()=>{});transition.updateCallbackDone.catch(()=>{});transition.finished.catch(()=>{}).finally(()=>{if(navigationTransition===transition)navigationTransition=null;});}catch{callback();}
}

export function mountMotion(root,{enter=true,page='home'}={}){
  const controller=new AbortController(),{signal}=controller,animations=new Set(),created=[],observers=[];
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  let enabled=motionAllowed(),pointerFrame=0,scrollFrame=0,particleFrame=0,lastDraw=0,disposed=false,activeSurface=null,pointerEvent=null;
  root.dataset.motion=enabled?'on':'off';
  const coarse=matchMedia('(pointer: coarse)').matches||innerWidth<760;
  const landingScenes=new IntersectionObserver(entries=>entries.forEach(entry=>{entry.target.dataset.inView=String(entry.isIntersecting);}),{rootMargin:'80px'});observers.push(landingScenes);
  root.querySelectorAll('.story-section,.console-section,.workflow-section,.closing-section').forEach((section,index)=>{
    const scene=document.createElement('div');scene.className=`landing-scene landing-scene-${index}`;scene.setAttribute('aria-hidden','true');
    scene.innerHTML=`<div class="landing-light-rays"></div><div class="landing-floor-grid"></div><div class="landing-mineral-plane plane-one"></div><div class="landing-mineral-plane plane-two"></div><svg class="landing-flow-lines" viewBox="0 0 1400 700" preserveAspectRatio="none"><g fill="none" stroke="#9daeb3" stroke-width=".7" opacity=".35">${Array.from({length:8},(_,n)=>`<path d="M-100 ${420+n*13} C310 ${650-n*25} 620 ${30+n*24} 1500 ${200+n*19}"/>`).join('')}</g><g class="landing-flow-pulses" fill="none" stroke="#d3c19e" stroke-width="1.4" stroke-dasharray="3 330" opacity=".7">${Array.from({length:3},(_,n)=>`<path d="M-100 ${430+n*28} C310 ${650-n*50} 620 ${50+n*45} 1500 ${230+n*35}" style="animation-delay:${-n*4}s"/>`).join('')}</g></svg>`;
    section.prepend(scene);landingScenes.observe(scene);created.push(()=>scene.remove());
  });
  const play=(element,keyframes,options)=>{
    if(!enabled||disposed||!element)return null;
    const animation=element.animate(keyframes,{duration:420,easing:'cubic-bezier(.2,.7,.2,1)',...options});animations.add(animation);
    animation.finished.catch(()=>{}).finally(()=>animations.delete(animation));return animation;
  };
  const ambient=[];
  const livingArt=[];
  const artObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
    const layer=livingArt.find(layer=>layer.element===entry.target);if(!layer)return;layer.visible=entry.isIntersecting;
    if(layer.visible&&enabled&&!document.hidden)layer.animation.play();else layer.animation.pause();
  }),{rootMargin:'60px'});observers.push(artObserver);
  if(enabled)root.querySelectorAll('.command-world,.story-art,.rail-incident-art,.incident-art,.activity-art,.host-cube-art,.topology-art,.flow-stream-art,.lab-simulation-art,.detail-network,.engine-machines,.console-scene-backdrop,.engine-showcase-art,.closing-art').forEach((element,index)=>{
    const computed=getComputedStyle(element);if(!computed.backgroundImage.includes('url('))return;
    const original={backgroundImage:element.style.backgroundImage,position:element.style.position,isolation:element.style.isolation};
    const plane=document.createElement('div');plane.className='motion-image-plane';plane.setAttribute('aria-hidden','true');
    for(const property of ['backgroundImage','backgroundPosition','backgroundSize','backgroundRepeat','backgroundOrigin','backgroundClip'])plane.style[property]=computed[property];
    if(computed.position==='static')element.style.position='relative';element.style.isolation='isolate';element.style.backgroundImage='none';element.prepend(plane);element.classList.add('motion-artwork');
    const amplitude=coarse?2:element.matches('.command-world,.topology-art,.lab-simulation-art')?7:4;
    const animation=play(plane,[{transform:`scale(1.045) translate(${-amplitude}px,${amplitude*.6}px)`},{transform:`scale(1.065) translate(${amplitude}px,${-amplitude}px)`},{transform:`scale(1.045) translate(${-amplitude}px,${amplitude*.6}px)`}],{duration:16000+index%5*2300,iterations:Infinity,easing:'ease-in-out',delay:-index*1150});
    if(animation){animation.pause();livingArt.push({element,plane,animation,visible:false});artObserver.observe(element);}
    created.push(()=>{plane.remove();element.classList.remove('motion-artwork');Object.assign(element.style,original);});
  });
  const scenes=root.querySelectorAll('.command-hero,.spatial-topology,.demo-visual');
  if(!coarse)scenes.forEach(scene=>{
    scene.addEventListener('pointermove',event=>{
      if(!enabled)return;const rect=scene.getBoundingClientRect();
      scene.style.setProperty('--scene-x',`${((event.clientX-rect.left)/rect.width-.5)*14}px`);scene.style.setProperty('--scene-y',`${((event.clientY-rect.top)/rect.height-.5)*10}px`);
    },{passive:true,signal});
    scene.addEventListener('pointerleave',()=>{scene.style.setProperty('--scene-x','0px');scene.style.setProperty('--scene-y','0px');},{passive:true,signal});
  });
  const resetSurface=element=>{if(!element)return;element.classList.remove('motion-hover');element.style.removeProperty('--surface-x');element.style.removeProperty('--surface-y');element.style.removeProperty('--tilt-x');element.style.removeProperty('--tilt-y');};
  const pointerUpdate=()=>{
    pointerFrame=0;if(!enabled||!activeSurface||!pointerEvent)return;
    const rect=activeSurface.getBoundingClientRect(),x=(pointerEvent.clientX-rect.left)/rect.width,y=(pointerEvent.clientY-rect.top)/rect.height;
    activeSurface.style.setProperty('--surface-x',`${x*100}%`);activeSurface.style.setProperty('--surface-y',`${y*100}%`);
    if(activeSurface.dataset.motionTilt==='true'){activeSurface.style.setProperty('--tilt-x',`${(.5-y)*1.4}deg`);activeSurface.style.setProperty('--tilt-y',`${(x-.5)*1.4}deg`);}
  };
  const addSurfaces=()=>{
    root.querySelectorAll('.glass-panel,.metric-card,.report-card,.host-card,.rule-card,.capability-card').forEach(element=>{
      element.dataset.motionSurface='true';
      if(element.matches('.report-card,.story-card,.rule-card,.host-card,.capability-card'))element.dataset.motionTilt='true';
    });
  };
  addSurfaces();
  if(!coarse){
    root.addEventListener('pointermove',event=>{
      if(!enabled)return;pointerEvent=event;
      const element=event.target.closest('[data-motion-surface]');
      if(element!==activeSurface){resetSurface(activeSurface);activeSurface=element;activeSurface?.classList.add('motion-hover');}
      if(!pointerFrame)pointerFrame=requestAnimationFrame(pointerUpdate);
    },{passive:true,signal});
    root.addEventListener('pointerleave',()=>{resetSurface(activeSurface);activeSurface=null;},{passive:true,signal});
  }
  const reveal=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(!entry.isIntersecting)return;reveal.unobserve(entry.target);
    const delay=Number(entry.target.dataset.motionDelay||0);
    play(entry.target,[{opacity:.68,translate:'0 9px'},{opacity:1,translate:'0 0'}],{duration:520,delay});
    if(entry.target.matches('.glass-panel,.metric-grid'))animateCounters(entry.target);
  }),{threshold:.06,rootMargin:'0px 0px -15px 0px'});observers.push(reveal);

  function animateCounters(scope){
    scope.querySelectorAll('.metric-copy>strong,.donut strong,.risk-dial strong,.event-ring>strong').forEach(element=>{
      if(element.dataset.counterDone)return;element.dataset.counterDone='true';
      const finalText=element.textContent.trim(),match=finalText.match(/^(\d[\d,]*(?:\.\d+)?)(K)?$/i);if(!match)return;
      const end=Number(match[1].replaceAll(',','')),suffix=match[2]||'',decimals=match[1].includes('.')?1:0;
      const key=element.closest('.metric-card')?.querySelector('.metric-copy>p')?.textContent||`${page}:${element.closest('.glass-panel')?.querySelector('h2')?.textContent}:${finalText}`;
      const start=rememberedValues.get(key)??end*.84;rememberedValues.set(key,end);
      if(!enabled||end===start||end===0)return;
      element.setAttribute('aria-label',finalText);
      const started=performance.now();let frame=0;
      const step=now=>{if(disposed||!enabled){element.textContent=finalText;return;}const p=Math.min(1,(now-started)/480),value=start+(end-start)*(1-Math.pow(1-p,3));element.textContent=(decimals?value.toFixed(decimals):Math.round(value).toLocaleString('en-US'))+suffix;if(p<1)frame=requestAnimationFrame(step);else element.textContent=finalText;};
      frame=requestAnimationFrame(step);created.push(()=>{cancelAnimationFrame(frame);element.textContent=finalText;});
    });
  }
  const initializeReveals=()=>{
    if(enter){
      root.querySelectorAll('.section-heading,.story-card,.pipeline-step,.app-page-heading,.workspace-tabs,.glass-panel,.metric-grid,.report-card,.engine-showcase,.capability-card').forEach((element,index)=>{element.dataset.motionDelay=String(Math.min(index%5*32,128));reveal.observe(element);});
      const title=root.querySelector('.hero h1');play(title,[{opacity:.65,translate:'0 8px'},{opacity:1,translate:'0 0'}],{duration:850,delay:70});
    }else{
      root.querySelectorAll('.incident-side,.connection-details,.stage-details,.simulation-result,.response-branch.selected').forEach(element=>play(element,[{opacity:.72},{opacity:1}],{duration:230}));
      animateCounters(root);
    }
  };
  initializeReveals();

  root.querySelectorAll('.insight-line-chart path[stroke]:not([opacity]),.source-bars>a>i,.risk-mini-bar').forEach((element,index)=>{
    if(element.tagName.toLowerCase()==='path'&&enabled&&enter){
      try{const length=element.getTotalLength();if(length>6000)return;play(element,[{strokeDasharray:`${length}`,strokeDashoffset:length},{strokeDasharray:`${length}`,strokeDashoffset:0}],{duration:850,delay:index*25});}catch{}
    }else if(enter)play(element,[{scale:'.82 1',opacity:.6},{scale:'1 1',opacity:1}],{duration:600,delay:index*25});
  });
  root.querySelectorAll('.topology-connections,.response-branch-diagram>svg,.lifecycle-waves').forEach(svg=>{
    if(!enabled)return;
    [...svg.querySelectorAll(':scope>path,:scope>g>path')].filter(path=>!path.hasAttribute('filter')).slice(0,12).forEach((path,index)=>{
      const stroke=path.getAttribute('stroke');if(!stroke||stroke==='none')return;
      const trace=path.cloneNode(false);trace.removeAttribute('filter');trace.classList.add('motion-connection-trace');trace.setAttribute('pathLength','100');trace.setAttribute('stroke-dasharray','1 18');trace.setAttribute('stroke-width','1.7');trace.setAttribute('opacity','.6');trace.style.setProperty('--trace-duration',`${6+index%4*2}s`);trace.style.setProperty('--trace-delay',`${-index*1.3}s`);svg.append(trace);created.push(()=>trace.remove());
    });
  });

  const sceneObserver=new IntersectionObserver(entries=>{entries.forEach(entry=>{const scene=ambient.find(scene=>scene.canvas===entry.target);if(scene)scene.visible=entry.isIntersecting;});startParticles();},{rootMargin:'60px'});observers.push(sceneObserver);
  root.querySelectorAll('.hero,.command-hero,.spatial-topology,.lab-live-panel .demo-visual').forEach((element,index)=>{
    if(!enabled)return;
    const canvas=document.createElement('canvas');canvas.className='motion-atmosphere';canvas.setAttribute('aria-hidden','true');element.append(canvas);
    const ctx=canvas.getContext('2d');if(!ctx){canvas.remove();return;}
    const scene={canvas,ctx,visible:false,width:0,height:0,particles:Array.from({length:coarse?8:24},(_,n)=>({x:(Math.sin(n*97.31+index)*.5+.5),y:(Math.cos(n*41.75+index)*.5+.5),radius:.35+(n%4)*.2,speed:.003+(n%5)*.0008,alpha:.06+(n%5)*.025}))};ambient.push(scene);
    const resize=()=>{const rect=element.getBoundingClientRect(),ratio=Math.min(devicePixelRatio,coarse?1:1.4);scene.width=rect.width;scene.height=rect.height;canvas.width=Math.round(rect.width*ratio);canvas.height=Math.round(rect.height*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);};
    const observer=new ResizeObserver(resize);observer.observe(element);observers.push(observer);resize();sceneObserver.observe(canvas);
    const light=document.createElement('div');light.className='motion-ambient-light';light.setAttribute('aria-hidden','true');element.append(light);
    created.push(()=>{canvas.remove();light.remove();});
  });
  function particleTick(now){
    particleFrame=0;if(disposed||!enabled||document.hidden)return;
    if(now-lastDraw>=40){lastDraw=now;ambient.filter(scene=>scene.visible).forEach(scene=>{const {ctx,width,height}=scene;ctx.clearRect(0,0,width,height);scene.particles.forEach(p=>{const x=(p.x+Math.sin(now*.000025+p.y*8)*.008)*width,y=(p.y-now*.000001*p.speed*100+1e3)%1*height;ctx.beginPath();ctx.fillStyle=`rgba(219,225,222,${p.alpha})`;ctx.arc(x,y,p.radius,0,Math.PI*2);ctx.fill();});});}
    if(ambient.some(scene=>scene.visible))particleFrame=requestAnimationFrame(particleTick);
  }
  function startParticles(){if(!particleFrame&&enabled&&!document.hidden&&ambient.some(scene=>scene.visible))particleFrame=requestAnimationFrame(particleTick);}
  document.addEventListener('visibilitychange',()=>{livingArt.forEach(layer=>{if(document.hidden||!enabled||!layer.visible)layer.animation.pause();else layer.animation.play();});if(document.hidden){cancelAnimationFrame(particleFrame);particleFrame=0;}else startParticles();},{signal});
  const scrollUpdate=()=>{
    scrollFrame=0;if(!enabled)return;
    root.querySelectorAll('.story-card').forEach(element=>{const rect=element.getBoundingClientRect();if(rect.bottom<0||rect.top>innerHeight)return;element.style.setProperty('--story-depth',`${Math.max(-16,Math.min(16,(innerHeight*.5-rect.top-rect.height*.5)*.055))}px`);});
    root.querySelectorAll('.section-heading,.closing-section').forEach(element=>{const rect=element.getBoundingClientRect();if(rect.bottom<0||rect.top>innerHeight)return;element.style.setProperty('--scroll-rise',`${Math.max(0,Math.min(18,(rect.top-innerHeight*.45)*.07))}px`);});
  };
  if(root.querySelector('.story-grid')){window.addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(scrollUpdate);},{passive:true,signal});scrollUpdate();}
  root.addEventListener('pointerover',event=>{
    if(!enabled)return;const link=event.target.closest('a[href^="#incident/"]');if(!link||link.contains(event.relatedTarget))return;
    root.querySelectorAll(`a[href="${CSS.escape(link.getAttribute('href'))}"]`).forEach(element=>element.classList.add('motion-related'));
  },{passive:true,signal});
  root.addEventListener('pointerout',event=>{const link=event.target.closest('a[href^="#incident/"]');if(!link||link.contains(event.relatedTarget))return;root.querySelectorAll('.motion-related').forEach(element=>element.classList.remove('motion-related'));},{passive:true,signal});
  const changes=new MutationObserver(records=>{
    if(!enabled)return;
    const targets=new Set();for(const record of records){const parent=record.target.nodeType===Node.TEXT_NODE?record.target.parentElement:record.target;const element=parent?.closest?.('.lab-event-counters strong,.demo-event-count,.simulation-result,#analysis-upload-status');if(element)targets.add(element);}
    targets.forEach(element=>play(element,[{opacity:.65,translate:'0 2px'},{opacity:1,translate:'0 0'}],{duration:210}));
  });changes.observe(root,{subtree:true,childList:true,characterData:true});observers.push(changes);
  const onPreference=()=>{enabled=motionAllowed();root.dataset.motion=enabled?'on':'off';if(!enabled){animations.forEach(animation=>animation.pause());cancelAnimationFrame(particleFrame);particleFrame=0;resetSurface(activeSurface);ambient.forEach(scene=>scene.ctx.clearRect(0,0,scene.width,scene.height));}else{livingArt.filter(layer=>layer.visible).forEach(layer=>layer.animation.play());startParticles();}};
  media.addEventListener('change',onPreference,{signal});
  return()=>{disposed=true;controller.abort();cancelAnimationFrame(pointerFrame);cancelAnimationFrame(scrollFrame);cancelAnimationFrame(particleFrame);observers.forEach(observer=>observer.disconnect());animations.forEach(animation=>animation.cancel());created.forEach(cleanup=>cleanup());resetSurface(activeSurface);root.querySelectorAll('[data-motion-surface]').forEach(element=>{delete element.dataset.motionSurface;delete element.dataset.motionTilt;});delete root.dataset.motion;};
}
