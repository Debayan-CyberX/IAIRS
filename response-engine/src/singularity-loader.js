import {createLoadingForm} from './singularity-loading-form.js';

const phase=(value,start,end)=>{const t=Math.max(0,Math.min(1,(value-start)/(end-start)));return t*t*(3-2*t);};

export function createLandingLoader(){
  const overlay=document.querySelector('#sb-boot');
  if(!overlay||overlay.hidden)return {complete(){},finish(){},dispose(){}};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),form=createLoadingForm(overlay.querySelector('canvas'));
  const staticMotion=()=>reduced.matches||document.documentElement.classList.contains('motion-paused');
  const tasks=new Map([['engine',12],['fonts',14],['earth',16],['environment',22],['workspace',12],['shaders',24]]),done=new Set();
  const labels={engine:'Connecting the experience',fonts:'Setting the letterforms',earth:'Mapping the evidence',environment:'Shaping the light',workspace:'Preparing your workspace',shaders:'Resolving the final image'};
  const output=overlay.querySelector('[data-load-number]'),bar=overlay.querySelector('[role=progressbar]'),status=overlay.querySelector('[data-load-status]'),digits=[...overlay.querySelectorAll('[data-load-digit]')],phaseLabel=overlay.querySelector('[data-load-phase]');
  const abort=new AbortController(),{signal}=abort,stage=document.querySelector('.sb-track'),header=document.querySelector('.sb-header');
  let frame=0,timer=0,exitTimer=0,disposed=false,finished=false,exiting=false,exitAt=0,exitDuration=1180,last=0,lastPaint=0,time=0,value=0,target=0,lastNumber='',lastPhase=-1;
  const pointer={x:0,y:0},destination={x:0,y:0};
  stage.inert=true;header.inert=true;document.documentElement.classList.add('sb-loading');
  overlay.dataset.form=overlay.querySelector('canvas').dataset.renderer;
  function resize(){form.resize(innerWidth,innerHeight);request();}
  function renderProgress(){
    const number=String(Math.min(100,Math.floor(value+.01))).padStart(3,'0');
    if(number!==lastNumber){output.textContent=number;digits.forEach((digit,i)=>digit.style.setProperty('--digit',number[i]));lastNumber=number;}
    bar.setAttribute('aria-valuenow',String(target));overlay.style.setProperty('--load-progress',String(value/100));
  }
  function draw(now){
    frame=0;if(disposed||finished||document.hidden)return;
    if(now-lastPaint<1000/45&&!staticMotion()){request();return;}lastPaint=now;
    const dt=last?Math.min((now-last)/1000,.10):.016;last=now;time+=dt;
    value=staticMotion()?target:value+(target-value)*(1-Math.exp(-dt*8));renderProgress();
    const amount=staticMotion()?1:phase(time,.32,1.90),exit=exiting?(now-exitAt)/exitDuration:0;
    pointer.x+=(destination.x-pointer.x)*(1-Math.exp(-dt*5));pointer.y+=(destination.y-pointer.y)*(1-Math.exp(-dt*5));
    form.draw({time:staticMotion()?0:time,morph:amount,exit:Math.min(1,exit),x:staticMotion()?0:pointer.x,y:staticMotion()?0:pointer.y});
    const index=amount<.12?0:amount<.90?1:2;
    if(index!==lastPhase){phaseLabel.textContent=['01 / THE LETTERFORM','02 / SIGNALS IN FORMATION','03 / ORDER EMERGES'][index];overlay.dataset.sequence=String(index);lastPhase=index;}
    overlay.style.setProperty('--load-morph',String(amount));
    if(!exiting&&target===100&&value>99.7&&(staticMotion()||time>2.05)){value=100;renderProgress();finish();return;}
    if(!staticMotion()||value<target-.05||exiting)request();
  }
  function request(){if(!frame&&!disposed&&!finished&&!document.hidden)frame=requestAnimationFrame(draw);}
  function complete(id){
    if(done.has(id)||!tasks.has(id)||disposed)return;done.add(id);target=[...done].reduce((sum,key)=>sum+tasks.get(key),0);
    status.textContent=target===100?'Signal acquired. Experience ready.':labels[id];
    overlay.querySelector(`[data-load-stage="${id}"]`)?.setAttribute('data-complete','true');
    if(id==='fonts')form.refresh();request();
  }
  function release(){
    if(disposed||finished)return;finished=true;cancelAnimationFrame(frame);form.dispose();
    const focused=overlay.contains(document.activeElement);overlay.hidden=true;overlay.dataset.state='complete';document.documentElement.classList.remove('sb-loading');stage.inert=false;header.inert=false;
    document.querySelector('.sb-experience')?.setAttribute('data-entry-ready','true');if(focused)document.querySelector('.sb-button')?.focus({preventScroll:true});
  }
  function finish({fast=false}={}){
    if(exiting||finished||disposed)return;exiting=true;clearTimeout(timer);exitAt=performance.now();exitDuration=staticMotion()||fast?130:1180;
    overlay.dataset.state=exitDuration===130?'quiet-opening':'opening';overlay.querySelector('[data-load-enter]').disabled=true;
    document.querySelector('.sb-world')?.dispatchEvent(new Event('storyboard:invalidate'));
    exitTimer=setTimeout(release,exitDuration);request();
  }
  overlay.querySelector('[data-load-enter]').addEventListener('click',()=>finish(),{signal});
  overlay.addEventListener('pointermove',event=>{if(event.pointerType==='touch')return;destination.x=(event.clientX/innerWidth-.5)*2;destination.y=(event.clientY/innerHeight-.5)*2;},{passive:true,signal});
  overlay.addEventListener('pointerleave',()=>{destination.x=destination.y=0;},{signal});
  window.addEventListener('resize',resize,{passive:true,signal});window.addEventListener('keydown',event=>{if(event.key==='Escape')finish({fast:true});},{signal});
  overlay.querySelector('canvas').addEventListener('webglcontextlost',()=>{if(!finished&&!disposed)overlay.dataset.form='kinetic-type';},{signal});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;last=0;}else request();},{signal});
  reduced.addEventListener('change',request,{signal});
  timer=setTimeout(()=>{if(!exiting&&!finished&&target<100)status.textContent='You can enter while the remaining assets load';},12000);
  resize();request();
  return {complete,finish,dispose(){disposed=true;abort.abort();cancelAnimationFrame(frame);clearTimeout(timer);clearTimeout(exitTimer);form.dispose();overlay.hidden=true;document.documentElement.classList.remove('sb-loading');stage.inert=false;header.inert=false;}};
}
