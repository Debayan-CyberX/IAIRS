export const SCENARIOS = [
  { id: 'normal', name: 'Normal Traffic', icon: 'activity', description: 'Routine HTTPS connections. No detection threshold is crossed.', protocol: 'HTTPS' },
  { id: 'port', name: 'Port Scan', icon: 'scan-line', description: 'A single source probes 30 destination ports in a short time window.', protocol: 'TCP' },
  { id: 'brute', name: 'Brute Force', icon: 'fingerprint', description: 'Repeated failed SSH authentication attempts from one source.', protocol: 'SSH' },
  { id: 'syn', name: 'SYN Flood', icon: 'waves', description: 'A synthetic burst of SYN requests exceeds the volume threshold.', protocol: 'TCP' },
  { id: 'dns', name: 'Suspicious DNS', icon: 'network', description: 'An elevated query frequency triggers a DNS anomaly rule.', protocol: 'DNS' },
];
export const STAGES = ['Network Traffic', 'Preprocessing', 'Threat Detection', 'Risk Assessment', 'Decision Engine', 'Simulated Response', 'Incident Logging', 'Reporting'];
export const ACTIONS = { Low: 'Log only', Medium: 'Security alert', High: 'Simulated IP block', Critical: 'Simulated host isolation' };
const STORAGE_KEY = 'iairs-simulation-v1';
export const time = value => new Date(value).toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });
export const date = value => new Date(value).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });

export function createEvents(scenario, runNumber = 1, timestamp = Date.now()) {
  const count = { normal: 20, port: 60, brute: 40, syn: 240, dns: 85 }[scenario] ?? 20;
  return Array.from({ length: count }, (_, i) => ({
    timestamp: new Date(timestamp + i * 85).toISOString(),
    source: scenario === 'normal' ? `10.0.0.${20 + i % 3}` : `203.0.113.${(runNumber * 17) % 240 + 1}`,
    destination: `10.0.0.${5 + runNumber % 6}`,
    port: scenario === 'port' ? 20 + i % 30 : scenario === 'brute' ? 22 : scenario === 'dns' ? 53 : 443,
    protocol: scenario === 'dns' ? 'DNS' : scenario === 'brute' ? 'SSH' : scenario === 'normal' ? 'HTTPS' : 'TCP',
    flag: scenario === 'syn' ? 'SYN' : 'ACK',
    auth: scenario === 'brute' ? 'failed' : 'success',
    query: scenario === 'dns' ? `q${i}.example.test` : null,
  }));
}

export function evaluateEvents(rawEvents, sequence) {
  const events = rawEvents.map(event => ({ ...event, port: Number(event.port), timestamp: new Date(event.timestamp).toISOString() }));
  const ports = new Set(events.map(event => event.port)).size;
  const failures = events.filter(event => event.auth === 'failed').length;
  const syns = events.filter(event => event.flag === 'SYN').length;
  const queries = events.filter(event => event.protocol === 'DNS').length;
  const hosts = new Set(events.map(event => event.destination)).size;
  const duration = (Date.parse(events.at(-1).timestamp) - Date.parse(events[0].timestamp)) / 1000;
  const rules = [
    { match: syns >= 100 && duration <= 60, type: 'SYN Flood', kind: 'syn', base: 40, frequency: Math.min(30, Math.ceil(syns / 6)), reason: `${syns} SYN requests within ${duration.toFixed(1)} seconds; threshold: 100 in 60 seconds.` },
    { match: failures >= 20 && duration <= 60, type: 'Brute Force', kind: 'brute', base: 36, frequency: Math.min(30, Math.ceil(failures * .8)), reason: `${failures} failed SSH logins within ${duration.toFixed(1)} seconds; threshold: 20 in 60 seconds.` },
    { match: ports >= 12 && duration <= 60, type: 'Port Scan', kind: 'port', base: 26, frequency: Math.min(30, Math.ceil(ports * .8)), reason: `${ports} unique destination ports within ${duration.toFixed(1)} seconds; threshold: 12 in 60 seconds.` },
    { match: queries >= 60 && duration <= 60, type: 'Suspicious DNS', kind: 'dns', base: 12, frequency: Math.min(25, Math.ceil(queries / 5)), reason: `${queries} DNS queries within ${duration.toFixed(1)} seconds; threshold: 60 in 60 seconds.` },
  ];
  const rule = rules.find(item => item.match);
  if (!rule) return { incident: null, eventCount: events.length, message: 'Normal traffic. No detection threshold crossed.' };
  const breakdown = [
    { label: 'Attack type', value: rule.base, max: 40 },
    { label: 'Event frequency', value: rule.frequency, max: 30 },
    { label: 'Host impact', value: Math.min(20, hosts * 9), max: 20 },
    { label: 'Time window', value: duration <= 30 ? 9 : 5, max: 10 },
  ];
  const risk = Math.min(100, breakdown.reduce((sum, item) => sum + item.value, 0));
  const severity = risk >= 76 ? 'Critical' : risk >= 51 ? 'High' : risk >= 26 ? 'Medium' : 'Low';
  const timestamp = events[0].timestamp;
  const day = new Date(timestamp).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).replaceAll('-', '');
  return {
    eventCount: events.length,
    incident: { id: `IA-${day}-${String(sequence).padStart(3, '0')}`, kind: rule.kind, type: rule.type, source: events[0].source, destination: events[0].destination, protocol: events[0].protocol, timestamp, severity, risk, breakdown, reason: rule.reason, action: ACTIONS[severity], status: severity === 'Medium' ? 'Alert generated' : 'Simulated containment', eventCount: events.length, duration, evidence: events.slice(0, 8), fixture: false,
      timeline: ['Suspicious activity detected', 'Detection threshold crossed', 'Risk score calculated', 'Decision engine triggered', 'Response simulated', 'Incident logged and reported'].map((label, i) => ({ label, timestamp: new Date(Date.parse(timestamp) + i * 420).toISOString() })),
    },
  };
}

export function initialState() {
  const incidents = [];
  const runs = [];
  let eventsProcessed = 0;
  const kinds = ['port', 'brute', 'dns', 'port', 'syn', 'dns', 'brute', 'port', 'dns', 'syn', 'port', 'brute', 'dns', 'port', 'syn', 'brute'];
  kinds.forEach((kind, index) => {
    const events = createEvents(kind, index + 1, Date.now() - (kinds.length - index) * 120000);
    const result = evaluateEvents(events, index + 1);
    result.incident.fixture = true;
    incidents.unshift(result.incident);
    runs.unshift({ kind, timestamp: events[0].timestamp, count: events.length, incidentId: result.incident.id });
    eventsProcessed += events.length;
  });
  return { version: 1, incidents, runs, eventsProcessed };
}
export function loadState() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (data?.version === 1 && Array.isArray(data.incidents) && Array.isArray(data.runs) && Number.isFinite(data.eventsProcessed) && data.incidents.every(i => i.id && i.evidence && i.timeline && i.breakdown)) return data;
  } catch { /* A fresh demo also works when browser storage is unavailable. */ }
  return initialState();
}
export function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* Current session remains available. */ }
}
export function getStats(state) {
  return {
    total: state.incidents.length,
    critical: state.incidents.filter(i => i.severity === 'Critical').length,
    blocked: state.incidents.filter(i => i.severity === 'High' || i.severity === 'Critical').length,
    hosts: new Set(state.incidents.map(i => i.destination)).size,
    events: state.eventsProcessed,
  };
}
export function reportHTML(incident) {
  const safe = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>${safe(incident.id)} — IAIRS Incident Report</title><style>body{font:15px/1.7 system-ui;max-width:850px;margin:60px auto;padding:24px;color:#1d2427}h1{font-size:40px;letter-spacing:-2px}small{letter-spacing:2px}table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:12px;border-bottom:1px solid #ddd}th{width:35%}footer{margin-top:40px;color:#666}@media print{body{margin:0}}</style><small>IAIRS / THE RESPONSE ENGINE</small><h1>Incident report</h1><p>${safe(incident.id)} · ${safe(date(incident.timestamp))} · ${safe(time(incident.timestamp))} IST</p><p><strong>Simulation only.</strong> ${incident.fixture ? 'Illustrative sample dataset.' : incident.origin === 'landing' ? 'Generated by the local landing-page simulation.' : 'Generated by the local Demo Lab.'} No real network actions were taken.</p><table>${[['Attack type',incident.type],['Source IP',incident.source],['Destination',incident.destination],['Protocol',incident.protocol],['Severity',incident.severity],['Risk score',`${incident.risk}/100`],['Response',incident.action],['Status',incident.status],['Events analyzed',incident.eventCount],['Detection reason',incident.reason]].map(([k,v])=>`<tr><th>${safe(k)}</th><td>${safe(v)}</td></tr>`).join('')}</table><h2>Risk assessment</h2>${incident.breakdown.map(item=>`<p>${safe(item.label)}: ${item.value}/${item.max}</p>`).join('')}<h2>Audit trail</h2>${incident.timeline.map(item=>`<p>${safe(time(item.timestamp))} IST — ${safe(item.label)}</p>`).join('')}<footer>Intelligent Automated Incident Response System · Educational simulation<br>Use your browser's Print command to save this report as PDF.</footer></html>`;
}
