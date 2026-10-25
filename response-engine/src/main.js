import './styles.css';
import './console.css';
import './command.css';
import './workspace.css';
import './motion.css';
import './landing-depth.css';
import './dashboard-materials.css';
import './experience.css';
import './cinematic.css';
import './storyboard.css';
import './singularity.css';
import './singularity-reveal.css';
import './singularity-loader.css';
import './storyboard-editorial.css';
import { mountMotion, animateViewChange, motionAllowed } from './motion.js';
import { workspaceIncidents, workspaceFiltered, workspaceIncidentTable, workspaceAnalysis, workspaceNetwork, workspaceResponse, workspaceDemo, workspaceReports, workspaceSettings, generatedIncidentsHTML } from './workspace.js';
import { parseTrafficFile } from './traffic.js';
import { commandOverview } from './command.js';
import { landing } from './storyboard.js';
import { icon, hydrate, escape, severityPill, toast, modal, download } from './ui.js';
import { overview, incidentTable } from './components.js';
import { NAV, shell, dashboardEnvironment, overviewPage, incidentsPage, filterIncidents, analysisPage, networkPage, responsePage, demoPage, resultHTML, reportsPage, settingsPage, detailPage } from './pages.js';
import { SCENARIOS, STAGES, loadState, saveState, initialState, createEvents, evaluateEvents, time, date, reportHTML } from './simulation.js';

import './github-pages-assets.css';

let state=loadState();saveState(state);
let cleanups=[],layout='',renderId=0,activeSection='overview',scenario='port',running=false,runToken=0,lastResult=null,selectedStage=0,detailTab='Overview',detailId=null;
let commandView='live',activityTab='all',storyboardPreview=null;
const workspace={analysisTab:'traffic',networkTab:'topology',networkView:'3d',responseTab:'engine',responseLevel:'High',incidentId:null,networkHost:null,imported:null};
let replayController=null;
let filters={search:'',severity:'all',type:'all',period:'all'},prefs={dim:false,motion:true};
try{prefs={...prefs,...JSON.parse(localStorage.getItem('iairs-preferences')||'{}')};}catch{}
const app=document.querySelector('#app');
const route=()=>{const[path,query='']=location.hash.slice(1).split('?');return{path,params:new URLSearchParams(query)};};
function applyPreferences(){document.documentElement.classList.toggle('low-light',prefs.dim);document.documentElement.classList.toggle('motion-paused',!prefs.motion);}
applyPreferences();
function commitJourney(events){
  state=loadState();
  const result=evaluateEvents(events,state.runs.length+1);
  if(result.incident){result.incident.origin='landing';state.incidents.unshift(result.incident);}
  state.runs.unshift({kind:'brute',timestamp:events[0].timestamp,count:events.length,incidentId:result.incident?.id||null,origin:'landing'});
  state.eventsProcessed+=events.length;saveState(state);
  return result.incident?'incident/'+result.incident.id:'console/overview';
}
async function startVisuals(id){
  if(layout==='landing'){
    const {mountStoryboard}=await import('./storyboard-director.js');if(id!==renderId)return;
    cleanups.push(mountStoryboard(app,{onOpenCase:events=>{const destination=commitJourney(events);location.hash=destination.startsWith('incident/')?'console/overview?incident='+encodeURIComponent(destination.slice(9)):destination;}}));return;
  }
  if(route().params.has('story-preview')&&window.parent!==window)return;
  const{mountNetwork}=await import('./visuals.js');if(id!==renderId)return;
  document.querySelectorAll('[data-network]').forEach(el=>cleanups.push(mountNetwork(el,{compact:layout==='landing'})));
  if(motionAllowed())document.querySelectorAll('.command-hero.view-live,.lab-live-panel .demo-visual').forEach(scene=>{
    const layer=document.createElement('div');layer.className=scene.matches('.command-hero')?'command-globe-live':'lab-globe-live';layer.setAttribute('aria-hidden','true');scene.append(layer);
    const stop=mountNetwork(layer,{overlay:true,neutral:scene.matches('.demo-visual'),pointerTarget:scene});cleanups.push(()=>{stop();layer.remove();});
  });
}
function render(keepScroll=false){
  replayController?.abort();replayController=null;
  const{path,params}=route(),consoleView=path==='console'||path.startsWith('console/')||path.startsWith('incident/');
  const previewMode=consoleView&&params.has('story-preview')&&window.parent!==window;
  document.documentElement.toggleAttribute('data-storyboard-preview',previewMode);
  const preview=previewMode?storyboardPreview:null;
  const viewState=preview?{...state,incidents:preview.incident?[preview.incident,...state.incidents]:state.incidents,runs:[{kind:'brute',timestamp:preview.events[0].timestamp,count:preview.events.length},...state.runs],eventsProcessed:state.eventsProcessed+preview.events.length}:state;
  const focused=preview?preview.incident:state.incidents.find(i=>i.id===params.get('incident'));
  const fromAnomaly=consoleView&&layout==='landing'&&app.querySelector('.sb-experience')?.dataset.act==='4';
  if(consoleView&&layout==='landing'&&app.querySelector('.sb-experience')){state=loadState();try{prefs={...prefs,...JSON.parse(localStorage.getItem('iairs-preferences')||'{}')};}catch{}applyPreferences();}
  if(!consoleView&&layout==='landing'&&!keepScroll){const target=document.getElementById(path||'home');if(target){if(app.experienceScrollTo)app.experienceScrollTo(target);else target.scrollIntoView({behavior:prefs.motion?'smooth':'instant'});}return;}
  if(running){runToken++;running=false;}
  cleanups.forEach(fn=>fn());cleanups=[];renderId++;const scroll=window.scrollY;layout=consoleView?'console':'landing';document.body.classList.toggle('console-mode',consoleView);document.body.classList.toggle('experience-mode',!consoleView);
  if(consoleView){
    document.querySelector('#sb-boot').hidden=true;document.documentElement.classList.remove('sb-loading');
    activeSection=path.startsWith('incident/')?'incidents':path.split('/')[1]||'overview';
    document.body.classList.toggle('command-mode',activeSection==='overview');
    document.body.classList.toggle('collage-mode',activeSection!=='overview');
    if(!keepScroll&&activeSection==='incidents'&&!path.startsWith('incident/'))filters={search:params.get('host')||params.get('source')||'',severity:params.get('severity')||'all',type:params.get('type')||'all',period:'all',status:'all'};
    if(!keepScroll&&activeSection==='response'&&['Low','Medium','High','Critical'].includes(params.get('level'))){workspace.responseLevel=params.get('level');workspace.responseTab='engine';}
    if(!keepScroll&&activeSection==='demo'&&params.get('scenario')&&SCENARIOS.some(s=>s.id===params.get('scenario')))scenario=params.get('scenario');
    let content;
    if(path.startsWith('incident/')){const id=decodeURIComponent(path.slice(9));if(id!==detailId){detailId=id;detailTab='Overview';}content=detailPage(state,id,detailTab);}
    else content={overview:()=>commandOverview(viewState,commandView,activityTab,focused),incidents:()=>workspaceIncidents(state,filters,workspace),analysis:()=>workspaceAnalysis(state,workspace),network:()=>workspaceNetwork(state,workspace),response:()=>workspaceResponse(state,selectedStage,workspace),demo:()=>workspaceDemo(state,scenario,lastResult),reports:()=>workspaceReports(state),settings:()=>workspaceSettings(prefs)}[activeSection]?.()||overviewPage(state);
    app.innerHTML=dashboardEnvironment()+shell(activeSection,content,state,prefs);document.title=`${path.startsWith('incident/')?'Incident investigation':NAV.find(i=>i[2]===activeSection)?.[1]||'Settings'} — IAIRS`;
    if(activeSection==='overview')document.querySelector('.topbar-tools').insertAdjacentHTML('beforebegin',`<div class="command-live-status"><span>Live</span> • Simulation Mode <svg viewBox="0 0 70 16" aria-hidden="true"><path d="M0 8H7L9 5L11 10L13 6L15 9H23L25 4L27 13L30 3L32 10L35 7H40L42 5L44 10L47 8H52L55 2L57 14L60 5L62 10H70" fill="none" stroke="#b7cbd0" stroke-width=".8"/></svg></div>`);
    else document.querySelector('.topbar-tools').insertAdjacentHTML('beforebegin',`<div class="workspace-live"><span class="status-dot"></span> Live <span>• Simulation Mode</span></div>`);
    if(activeSection==='reports')installReportControls();
    if(activeSection==='response'&&workspace.responseTab==='engine')document.querySelector('.page-actions').insertAdjacentHTML('afterbegin',`<button class="button button-outline button-small replay-button" data-action="replay-response" ${state.incidents.some(i=>i.severity===workspace.responseLevel)?'':'disabled title="No recorded incident matches this policy"'}>${icon('play')} Replay recorded event</button>`);
    if(activeSection==='demo'&&lastResult)installDemoReplay();
  }else{document.body.classList.remove('command-mode','collage-mode');app.innerHTML=landing(icon);document.title='IAIRS — Intelligence beyond threats';}
  if(fromAnomaly)app.querySelector('.app-layout').style.viewTransitionName='iairs-console';
  if(previewMode){const status=app.querySelector('.command-live-status');if(status)status.textContent=preview?.incident?'Simulation preview ? illustrative case':'Simulation preview';}
  hydrate();if(consoleView&&!previewMode)cleanups.push(mountMotion(app,{enter:!keepScroll,page:activeSection}));startVisuals(renderId);
  if(keepScroll)window.scrollTo(0,scroll);else{window.scrollTo(0,0);if(!consoleView&&path&&path!=='home')requestAnimationFrame(()=>document.getElementById(path)?.scrollIntoView());}
}
function updateResults(){const el=document.querySelector('#incident-results');if(!el)return;const rows=workspaceFiltered(state,filters);el.innerHTML=workspaceIncidentTable(rows,workspace.incidentId||rows[0]?.id);document.querySelector('#filtered-count').textContent=rows.length;hydrate();}
function savePreferences(){try{localStorage.setItem('iairs-preferences',JSON.stringify(prefs));}catch{}applyPreferences();}
async function analyzeFile(file){
  if(!file)return;
  if(file.size>10*1024*1024){toast('Choose a traffic file smaller than 10 MB.');return;}
  const uploadStatus=document.querySelector('#analysis-upload-status');if(uploadStatus)uploadStatus.textContent='Reading and evaluating local events…';document.querySelector('#traffic-drop')?.setAttribute('aria-busy','true');
  try{workspace.imported=parseTrafficFile(await file.text(),file.name);render(true);toast(`${workspace.imported.events.length} events analyzed locally; ${workspace.imported.incidents.length} detection groups found.`);}
  catch(error){const status=document.querySelector('#analysis-upload-status');if(status)status.textContent=error.message;toast(`Could not analyze this file: ${error.message}`);}
  finally{document.querySelector('#traffic-drop')?.removeAttribute('aria-busy');}
}
function installReportControls(){
  const grid=document.querySelector('.report-grid');if(!grid)return;
  grid.insertAdjacentHTML('beforebegin',`<div class="report-tools"><label>${icon('search')}<input id="report-search" type="search" placeholder="Search reports, incidents, or IP addresses…" aria-label="Search reports" value="${escape(workspace.reportSearch||'')}"></label><label class="sr-only" for="report-severity">Report severity</label><select id="report-severity"><option value="all">All severities</option>${['Critical','High','Medium','Low'].map(s=>`<option ${workspace.reportSeverity===s?'selected':''}>${s}</option>`).join('')}</select><span class="report-result-count" role="status" id="report-result-count">${state.incidents.length} reports</span></div>`);
  grid.querySelectorAll('.report-card').forEach((card,index)=>{const i=state.incidents[index];card.dataset.reportId=i.id;card.querySelector('.report-card-bottom .icon-button').insertAdjacentHTML('beforebegin',`<button class="report-preview-button" data-action="preview-report" data-id="${i.id}">Preview ${icon('file-text')}</button>`);});
  updateReportResults(false);
}
function updateReportResults(animate=true){
  const query=(workspace.reportSearch||'').toLowerCase(),severity=workspace.reportSeverity||'all';let count=0;
  document.querySelector('.report-no-results')?.remove();
  document.querySelectorAll('.report-card[data-report-id]').forEach(card=>{const i=state.incidents.find(i=>i.id===card.dataset.reportId),visible=`${i.id} ${i.type} ${i.source} ${i.destination}`.toLowerCase().includes(query)&&(severity==='all'||i.severity===severity),wasHidden=card.hidden;card.hidden=!visible;if(visible){count++;if(animate&&wasHidden&&motionAllowed())card.animate([{opacity:.6,translate:'0 5px'},{opacity:1,translate:'0 0'}],{duration:250,easing:'ease-out'});}});
  const label=document.querySelector('#report-result-count');if(label)label.textContent=`${count} reports`;
  if(!count)document.querySelector('.report-grid')?.insertAdjacentHTML('beforeend','<div class="report-no-results">No matching reports. Try another search or severity.</div>');
}
function installDemoReplay(){const result=document.querySelector('#demo-results .simulation-result');if(result&&!result.querySelector('[data-action="replay-demo"]'))result.insertAdjacentHTML('beforeend',`<button class="button button-outline button-small replay-button" data-action="replay-demo">${icon('play')} Replay timeline</button>`);}
const replayDelay=(milliseconds,signal)=>new Promise((resolve,reject)=>{const onAbort=()=>{clearTimeout(timer);reject(new DOMException('Replay canceled','AbortError'));};const timer=setTimeout(()=>{signal.removeEventListener('abort',onAbort);resolve();},milliseconds);signal.addEventListener('abort',onAbort,{once:true});});
async function replayRecorded(kind,button){
  if(running||replayController)return;
  const incident=kind==='demo'?lastResult?.incident:state.incidents.find(i=>i.severity===workspace.responseLevel);
  if(kind!=='demo'&&!incident){toast('No recorded incident is available to replay.');return;}
  const controller=new AbortController();replayController=controller;const {signal}=controller,diagram=document.querySelector('.response-branch-diagram'),feed=kind==='demo'?document.querySelector('#event-feed'):null,lab=document.querySelector('.lab-live-panel'),runButton=document.querySelector('[data-action="run-simulation"]');
  button.disabled=true;const oldButton=button.innerHTML;button.innerHTML=`${icon('play')} Replaying…`;if(runButton)runButton.disabled=true;
  const label=document.createElement('div');label.className='replay-status';label.setAttribute('role','status');(kind==='demo'?document.querySelector('#demo-results'):document.querySelector('.response-diagram-panel')).append(label);
  diagram?.classList.add('replay-active');if(feed)feed.innerHTML='';
  const messages=incident?[`${incident.eventCount} recorded synthetic events.`,`${incident.protocol} event fields normalized.`,incident.reason,`Recorded risk: ${incident.risk}/100 (${incident.severity}).`,`${incident.severity} → ${incident.action}.`,'Recorded simulated response. No new containment action.',`Audit trail: ${incident.id}.`,'Replay complete. No new incident created.']:['Recorded normal synthetic traffic.','Event fields normalized.','No detection threshold crossed.','No incident risk was assigned.','Policy: no response required.','No containment action.','Original run remains recorded.','Replay complete. No new incident created.'];
  try{
    for(let step=0;step<STAGES.length;step++){
      if(signal.aborted)return;label.textContent=`REPLAY / ${STAGES[step]} — ${messages[step]}`;
      if(diagram)diagram.dataset.replayStage=String(step);
      document.querySelectorAll('[data-run-stage]').forEach((el,index)=>{el.classList.toggle('running',index===step);el.classList.toggle('complete',index<step);const status=el.querySelector('strong');if(status)status.textContent=index<step?'Replayed':index===step?'Replay':'Ready';});
      if(lab){lab.classList.add('lab-running');lab.dataset.detection=step>=2&&incident?'detected':'none';}
      if(feed){const line=document.createElement('div');line.className='event-feed-line';line.innerHTML=`<time>${incident?time(incident.timeline[Math.min(step,5)].timestamp):'REPLAY'}</time>${escape(messages[step])}`;feed.append(line);feed.scrollTop=feed.scrollHeight;}
      await replayDelay(360,signal);
    }
    label.textContent='REPLAY COMPLETE / Original data and incident count unchanged.';toast('Recorded timeline replayed. No new incident created.');
  }catch(error){if(error.name!=='AbortError')toast(`Replay could not finish: ${error.message}`);}
  finally{
    if(!signal.aborted){button.disabled=false;button.innerHTML=oldButton;if(runButton)runButton.disabled=false;diagram?.classList.remove('replay-active');if(diagram)delete diagram.dataset.replayStage;lab?.classList.remove('lab-running');document.querySelectorAll('[data-run-stage]').forEach(el=>{el.classList.remove('running');el.classList.add('complete');const status=el.querySelector('strong');if(status)status.textContent='Replayed';});hydrate();}
    if(replayController===controller)replayController=null;
  }
}
function showDocs(){modal('The Response Engine',`<p class="eyebrow">INTELLIGENT AUTOMATED INCIDENT RESPONSE SYSTEM</p><p>IAIRS demonstrates the complete incident response lifecycle in a controlled educational environment. This implementation uses synthetic traffic, explicit detection rules, weighted risk scoring, and local browser storage.</p><div class="docs-stages">${STAGES.map((s,i)=>`<a href="#console/response" data-action="close-modal"><span class="mono">0${i+1}</span>${s}${icon('arrow-up-right')}</a>`).join('')}</div><p><strong>Try it:</strong> Open Demo Lab, choose a scenario, and run a simulation. Investigate the resulting incident to trace its evidence, risk score, and simulated response. Download a report to document the lifecycle.</p><p class="docs-note">No real packets are sent. No firewall rules or hosts are modified. Network graphics are illustrative. Sample incidents are labeled. This build does not process PCAP uploads or connect to a live monitoring backend.</p><a class="button button-primary" href="#console/demo" data-action="close-modal">Open Demo Lab ${icon('arrow-up-right')}</a>`,true);}
function showMethodology(){modal('A score you can trace.',`<p>Risk = attack type + event frequency + host impact + time window.</p><div class="methodology-table"><div><strong>Attack type / 40</strong><span>SYN flood: 40 · Brute force: 36 · Port scan: 26 · DNS anomaly: 12</span></div><div><strong>Frequency / 30</strong><span>Scaled from actual SYN counts, failed logins, unique ports, or DNS queries.</span></div><div><strong>Host impact / 20</strong><span>9 points per affected host, capped at 20.</span></div><div><strong>Time window / 10</strong><span>9 points for a burst within 30 seconds; 5 for a slower burst.</span></div></div><p>Low 0–25 → Log only<br>Medium 26–50 → Alert<br>High 51–75 → Simulated IP block<br>Critical 76–100 → Simulated host isolation</p><p class="docs-note">Rules run on synthetic events. These are educational thresholds, not production detection recommendations.</p>`,true);}
function exportCSV(){const rows=activeSection==='incidents'?workspaceFiltered(state,filters):state.incidents,columns=['id','timestamp','type','source','destination','protocol','severity','risk','action','status','eventCount'];const cell=v=>`"${String(v).replaceAll('"','""')}"`;download('IAIRS-incident-register.csv',[columns.join(','),...rows.map(i=>columns.map(c=>cell(i[c])).join(','))].join('\r\n'),'text/csv;charset=utf-8');toast(`${rows.length} incidents exported.`);}
async function runSimulation(){
  if(running)return;
  const target=document.querySelector('#demo-target')?.value.trim()||'10.0.0.9',windowSeconds=Number(document.querySelector('#demo-window')?.value||10);
  if(!/^\d{1,3}(\.\d{1,3}){3}$/.test(target)||target.split('.').some(n=>Number(n)>255)||!Number.isFinite(windowSeconds)||windowSeconds<1||windowSeconds>60){toast('Use a valid target IPv4 address and a 1–60 second observation window.');return;}
  running=true;const token=++runToken,speed=Number(document.querySelector('#demo-speed')?.value||450),sequence=state.runs.length+1,definition=SCENARIOS.find(s=>s.id===scenario),events=createEvents(scenario,sequence);
  events.forEach((event,n)=>{event.destination=target;event.timestamp=new Date(Date.now()-windowSeconds*1000+n*windowSeconds*1000/Math.max(events.length-1,1)).toISOString();});
  const result=evaluateEvents(events,sequence);const lab=document.querySelector('.lab-live-panel');lab?.classList.add('lab-running');if(lab)lab.dataset.detection='none';
  const button=document.querySelector('[data-action="run-simulation"]');button.disabled=true;button.innerHTML=`${icon('loader-circle','spin')} Running Simulation`;document.querySelectorAll('[data-scenario],#demo-speed,#demo-target,#demo-window').forEach(el=>el.disabled=true);
  const feed=document.querySelector('#event-feed');feed.innerHTML='';document.querySelector('#demo-results').innerHTML='';
  const messages=[`${events.length} synthetic ${definition.protocol} events collected.`,`Normalized ${events.length} events across a 60-second window.`,result.incident?`Rule matched: ${result.incident.type}.`:'No detection threshold crossed.',result.incident?`Risk score: ${result.incident.risk}/100 — ${result.incident.severity}.`:'Risk assessment: no incident.',result.incident?`Policy selected: ${result.incident.action}.`:'Policy selected: no action required.',result.incident?'Response simulated. Real network unchanged.':'Routine traffic accepted.',result.incident?'Incident and audit trail saved locally.':'Run recorded. No incident created.','Report data prepared. Simulation complete.'];
  for(let step=0;step<STAGES.length;step++){
    if(token!==runToken)return;document.querySelector('#run-status').innerHTML=`<span class="status-dot"></span> ${STAGES[step]}…`;
    document.querySelectorAll('[data-run-stage]').forEach((el,index)=>{el.classList.toggle('complete',index<step);el.classList.toggle('running',index===step);const status=el.querySelector('strong');if(status)status.textContent=index<step?'Complete':index===step?'Processing':'Ready';});
    const count=document.querySelector('#lab-counter-events');if(count)count.textContent=Math.round(events.length*(step+1)/STAGES.length);
    const detections=document.querySelector('#lab-counter-detections');if(detections)detections.textContent=step>=2&&result.incident?'1':'0';
    if(lab)lab.dataset.detection=step>=2&&result.incident?'detected':'none';
    const line=document.createElement('div');line.className=`event-feed-line ${step===2&&result.incident?'feed-detection':''}`;line.innerHTML=`<time>${time(Date.now())}</time> ${escape(messages[step])}`;feed.append(line);feed.scrollTop=feed.scrollHeight;document.querySelector('#demo-event-count').textContent=`${Math.round(events.length*(step+1)/STAGES.length)} events processed`;hydrate();await new Promise(resolve=>setTimeout(resolve,speed));
  }
  if(token!==runToken)return;if(result.incident)state.incidents.unshift(result.incident);state.eventsProcessed+=events.length;state.runs.unshift({kind:scenario,timestamp:events[0].timestamp,count:events.length,incidentId:result.incident?.id||null});saveState(state);lastResult=result;
  document.querySelectorAll('[data-run-stage]').forEach(el=>{el.classList.remove('running');el.classList.add('complete');const label=el.querySelector('strong');if(label)label.textContent='Complete';});document.querySelector('#run-status').innerHTML=`${icon('check')} Complete`;document.querySelector('#demo-results').innerHTML=resultHTML(result);document.querySelectorAll('[data-scenario],#demo-speed,#demo-target,#demo-window').forEach(el=>el.disabled=false);button.disabled=false;button.innerHTML=`${icon('play')} Run Again`;running=false;const count=document.querySelector('.sidebar-count');if(count)count.textContent=state.incidents.length;
  document.querySelector('.lab-live-panel')?.classList.remove('lab-running');const generated=document.querySelector('#generated-incidents');if(generated)generated.innerHTML=generatedIncidentsHTML(state);const incidentCounter=document.querySelector('#lab-counter-incidents');if(incidentCounter)incidentCounter.textContent=result.incident?'1':'0';
  installDemoReplay();hydrate();toast(result.incident?'Simulation complete. Incident recorded.':'Simulation complete. Normal traffic; no incident created.');
}

document.addEventListener('click',async event=>{
  const el=event.target.closest('[data-action],[data-stage],[data-scenario],[data-detail-tab],[data-copy],[data-incident],[data-command-view],[data-activity-tab],[data-workspace-tab],[data-incident-status],[data-inspect-id],[data-network-host],[data-network-view],[data-response-level],[data-analysis-point]');if(!el)return;
  if(el.hasAttribute('data-analysis-point')){
    const rows=workspace.imported?.incidents||state.incidents,stamps=rows.map(i=>Date.parse(i.timestamp)),start=Math.min(...stamps),span=Math.max(Math.max(...stamps)-start,1),matches=rows.filter(i=>i.severity===el.dataset.severity&&Math.min(31,Math.floor((Date.parse(i.timestamp)-start)/span*31))===Number(el.dataset.analysisPoint)),i=matches[0];
    if(i)modal('Detection evidence',`<p class="eyebrow">${workspace.imported?'LOCAL FILE ANALYSIS':'SIMULATION DATASET'} / ${matches.length} MATCHED GROUP${matches.length===1?'':'S'}</p><div class="evidence-focus-heading"><h3>${escape(i.type)}</h3>${severityPill(i.severity)}<span class="mono">Risk ${i.risk}/100</span></div><p>${escape(i.reason)}</p><div class="table-scroll"><table class="incident-table"><thead><tr><th>Time (IST)</th><th>Source IP</th><th>Destination</th><th>Port</th><th>Protocol</th></tr></thead><tbody>${i.evidence.slice(0,5).map(e=>`<tr><td>${time(e.timestamp)}</td><td>${escape(e.source)}</td><td>${escape(e.destination)}</td><td>${e.port}</td><td>${escape(e.protocol)}</td></tr>`).join('')}</tbody></table></div>${workspace.imported?'<p class="docs-note">This local analysis has not been added to the incident register.</p>':`<a class="button button-primary" href="#incident/${i.id}" data-action="close-modal">Open investigation ${icon('arrow-up-right')}</a>`}`,true);
    return;
  }
  if(el.dataset.workspaceTab){workspace[`${el.dataset.group}Tab`]=el.dataset.workspaceTab;if(el.dataset.group==='network'){if(el.dataset.workspaceTab==='geographic')workspace.networkView='map';else if(el.dataset.workspaceTab!=='connections')workspace.networkView='3d';}render(true);return;}
  if(el.dataset.incidentStatus){filters.status=el.dataset.incidentStatus;render(true);return;}
  if(el.dataset.inspectId&&!event.target.closest('a')){workspace.incidentId=el.dataset.inspectId;render(true);return;}
  if(el.dataset.networkHost){workspace.networkHost=el.dataset.networkHost;render(true);return;}
  if(el.dataset.networkView){workspace.networkView=el.dataset.networkView;if(el.dataset.networkView!=='list')workspace.networkTab=el.dataset.networkView==='map'?'geographic':'topology';render(true);return;}
  if(el.dataset.responseLevel){workspace.responseLevel=el.dataset.responseLevel;selectedStage=5;if(el.hasAttribute('data-open-engine'))workspace.responseTab='engine';render(true);return;}
  if(el.dataset.commandView){commandView=el.dataset.commandView;render(true);return;}
  if(el.dataset.activityTab){activityTab=el.dataset.activityTab;render(true);return;}
  if(el.dataset.incident&&!event.target.closest('a,button')){location.hash=`incident/${el.dataset.incident}`;return;}
  if(el.hasAttribute('data-stage')){selectedStage=Number(el.dataset.stage);render(true);return;}
  if(el.dataset.scenario){if(running)return;scenario=el.dataset.scenario;lastResult=null;render(true);return;}
  if(el.dataset.detailTab){detailTab=el.dataset.detailTab;render(true);return;}
  if(el.dataset.copy){try{await navigator.clipboard.writeText(el.dataset.copy);toast('IP address copied.');}catch{toast(`IP address: ${el.dataset.copy}`);}return;}
  const action=el.dataset.action;
  if(action==='docs')showDocs();if(action==='methodology')showMethodology();if(action==='close-modal')document.querySelector('#modal').close();if(action==='menu'){const header=document.querySelector('.site-header');header?.classList.toggle('menu-open');el.setAttribute('aria-expanded',String(header?.classList.contains('menu-open')));}if(action==='sidebar')document.querySelector('.app-sidebar')?.classList.toggle('sidebar-open');
  if(action==='theme'){prefs.dim=!prefs.dim;savePreferences();render(true);toast(prefs.dim?'Low light mode enabled.':'Standard lighting enabled.');}
  if(action==='motion'){prefs.motion=!prefs.motion;savePreferences();render(true);toast(prefs.motion?'Ambient motion resumed.':'Ambient motion paused.');}
  if(action==='profile')modal('Analyst workspace',`<p>This is your local simulation workspace. Sample incidents and your Demo Lab results are stored in this browser.</p><div class="profile-stats"><div><strong>${state.incidents.length}</strong><span>Recorded incidents</span></div><div><strong>${state.runs.length}</strong><span>Simulation runs</span></div></div><a class="button button-outline" href="#console/settings" data-action="close-modal">Workspace settings ${icon('settings')}</a>`);
  if(action==='notifications'){const critical=state.incidents.filter(i=>i.severity==='Critical');modal('Critical incidents',`<p>${critical.length} critical incidents in your simulation dataset. Host isolation was simulated for each.</p><div class="notification-list">${critical.slice(0,6).map(i=>`<a href="#incident/${i.id}" data-action="close-modal">${icon('shield-alert')}<div><strong>${i.type}</strong><span class="mono">${i.id} · ${time(i.timestamp)} IST</span></div>${icon('arrow-up-right')}</a>`).join('')||'<p>No critical incidents recorded.</p>'}</div>`);}
  if(action==='export-csv')exportCSV();if(action==='export-json'){download('IAIRS-workspace.json',JSON.stringify({...state,simulationOnly:true,exportedAt:new Date().toISOString()},null,2),'application/json');toast('Workspace exported as JSON.');}
  if(action==='incident-json'){const i=state.incidents.find(i=>i.id===el.dataset.id);if(i){download(`${i.id}.json`,JSON.stringify({...i,simulationOnly:true},null,2),'application/json');toast('Incident JSON downloaded.');}}
  if(action==='report'){const i=state.incidents.find(i=>i.id===el.dataset.id);if(i){download(`${i.id}-report.html`,reportHTML(i),'text/html');toast('Report downloaded. Open it to review or print as PDF.');}}
  if(action==='clear-filters'){filters={search:'',severity:'all',type:'all',period:'all'};render(true);}
  if(action==='search-host')location.hash=`console/incidents?host=${el.dataset.host}`;
  if(action==='run-simulation')runSimulation();
  if(action==='replay-response'||action==='replay-demo')replayRecorded(action==='replay-demo'?'demo':'response',el);
  if(action==='preview-report'){const i=state.incidents.find(i=>i.id===el.dataset.id);if(i)modal('Incident report preview',`<p class="eyebrow">${i.id} / SIMULATION ONLY</p><iframe class="report-preview-frame" title="Report ${i.id}" sandbox srcdoc="${escape(reportHTML(i))}"></iframe><div class="report-preview-actions"><button class="button button-primary" data-action="report" data-id="${i.id}">${icon('download')} Download report</button><button class="button button-outline" data-action="incident-json" data-id="${i.id}">Download JSON ${icon('file-text')}</button></div>`,true);}
  if(action==='sample-traffic'){download('IAIRS-sample-traffic.json',JSON.stringify(createEvents('port'),null,2),'application/json');toast('Sample traffic file downloaded.');}
  if(action==='traffic-schema')modal('Traffic event schema',`<p>Upload CSV with a header row, or a JSON array of events (an object with an events array also works).</p><pre class="traffic-schema">${escape(JSON.stringify(createEvents('brute')[0],null,2))}</pre><p>Required: source, destination, port, timestamp. Optional: protocol, flag, auth, query. Event timestamps must be valid ISO dates. The file stays in your browser; analysis results do not change the incident register.</p><button class="button button-primary" data-action="sample-traffic">Download sample JSON ${icon('download')}</button>`,true);
  if(action==='reset-data')modal('Restore the sample dataset?',`<p>This removes your Demo Lab runs from this browser and restores the 16 illustrative incidents.</p><div class="dialog-actions"><button class="button button-outline" data-action="close-modal">Keep my data</button><button class="button button-primary" data-action="confirm-reset">${icon('refresh-cw')} Restore sample data</button></div>`);
  if(action==='confirm-reset'){state=initialState();lastResult=null;saveState(state);document.querySelector('#modal').close();render(true);toast('Sample dataset restored.');}
});
document.addEventListener('input',event=>{
  if(event.target.id==='report-search'){workspace.reportSearch=event.target.value;updateReportResults();}
  if(event.target.id==='incident-search'){filters.search=event.target.value;updateResults();}
  if(event.target.id==='global-search'){const query=event.target.value.trim().toLowerCase(),results=document.querySelector('#global-results');if(!query){results.hidden=true;return;}const matches=state.incidents.filter(i=>`${i.id} ${i.type} ${i.source} ${i.destination}`.toLowerCase().includes(query)).slice(0,6);results.innerHTML=`<span class="search-results-label">INCIDENTS / ${matches.length} RESULTS</span>${matches.length?matches.map(i=>`<a href="#incident/${i.id}">${icon('shield-alert')}<span><strong>${i.type}</strong><small class="mono">${i.source} → ${i.destination}</small></span>${severityPill(i.severity)}</a>`).join(''):'<p>No matching incidents.</p>'}`;results.hidden=false;hydrate();}
});
document.addEventListener('change',event=>{const key={'severity-filter':'severity','type-filter':'type','period-filter':'period'}[event.target.id];if(key){filters[key]=event.target.value;updateResults();}if(event.target.id==='report-severity'){workspace.reportSeverity=event.target.value;updateReportResults();}if(event.target.id==='analysis-file')analyzeFile(event.target.files[0]);if(event.target.id==='case-status'){const i=state.incidents.find(i=>i.id===event.target.dataset.id);if(i&&['Open','Investigating','Contained','Resolved'].includes(event.target.value)){i.workflowStatus=event.target.value;saveState(state);render(true);toast('Case status updated locally.');}}});
document.addEventListener('dragover',event=>{if(event.target.closest('#traffic-drop')){event.preventDefault();event.target.closest('#traffic-drop').classList.add('drag-over');}});
document.addEventListener('dragleave',event=>event.target.closest('#traffic-drop')?.classList.remove('drag-over'));
document.addEventListener('drop',event=>{if(event.target.closest('#traffic-drop')){event.preventDefault();analyzeFile(event.dataTransfer.files[0]);}});
document.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.hasAttribute?.('data-analysis-point')){event.preventDefault();event.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));return;}const editing=/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);if((event.key==='/'&&!editing)||((event.metaKey||event.ctrlKey)&&event.key==='k')){event.preventDefault();document.querySelector('#global-search')?.focus();}if(event.key==='Escape'){const results=document.querySelector('#global-results');if(results)results.hidden=true;}if(event.key==='Enter'&&event.target.id==='global-search'){const first=document.querySelector('#global-results a');if(first)location.href=first.href;}});
document.addEventListener('click',event=>{if(!event.target.closest('.global-search-wrap')){const results=document.querySelector('#global-results');if(results)results.hidden=true;}});
document.querySelector('#modal').addEventListener('click',event=>{if(event.target===event.currentTarget){const r=event.currentTarget.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.currentTarget.close();}});
window.addEventListener('message',event=>{
  if(window.parent===window||event.source!==window.parent||event.origin!==location.origin||!route().params.has('story-preview')||event.data?.type!=='iairs:preview-evidence')return;
  const events=event.data.events;
  if(!Array.isArray(events)||events.length<10||events.length>80||!events.every(e=>e.auth==='failed'&&e.protocol==='SSH'&&Number.isFinite(Date.parse(e.timestamp))))return;
  storyboardPreview={events,...evaluateEvents(events,state.runs.length+1)};
  render(true);window.parent.postMessage({type:'iairs:preview-rendered'},location.origin);
});
window.addEventListener('hashchange',()=>{const {path}=route();if(layout==='landing'&&path!=='console'&&!path.startsWith('console/')&&!path.startsWith('incident/'))render();else animateViewChange(()=>render());});
setInterval(()=>document.querySelectorAll('[data-clock]').forEach(el=>el.innerHTML=`${date(Date.now())} <span>${time(Date.now())}</span> IST`),1000);
setInterval(()=>document.querySelectorAll('[data-command-clock]').forEach(el=>el.textContent=time(Date.now())),1000);
render();
