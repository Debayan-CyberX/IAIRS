import { evaluateEvents } from './simulation.js';

function csvRows(text) {
  const rows=[];let row=[],cell='',quoted=false;
  for(let index=0;index<text.length;index++){
    const c=text[index];
    if(c==='"') { if(quoted&&text[index+1]==='"'){cell+='"';index++;}else quoted=!quoted; }
    else if(c===','&&!quoted){row.push(cell);cell='';}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[index+1]==='\n')index++;row.push(cell);if(row.some(s=>s.trim()))rows.push(row);row=[];cell='';}
    else cell+=c;
  }
  if(quoted)throw new Error('The CSV has an unclosed quoted field.');
  row.push(cell);if(row.some(s=>s.trim()))rows.push(row);
  if(rows.length<2)throw new Error('The CSV needs a header and at least one event.');
  const columns=rows.shift().map(s=>s.trim().replace(/^\uFEFF/,''));
  return rows.map(row=>Object.fromEntries(columns.map((column,index)=>[column,row[index]??''])));
}
const validIP=value=>typeof value==='string'&&/^\d{1,3}(\.\d{1,3}){3}$/.test(value)&&value.split('.').every(part=>Number(part)<=255);
export function parseTrafficFile(text,filename){
  let records;
  if(filename.toLowerCase().endsWith('.csv'))records=csvRows(text);
  else if(filename.toLowerCase().endsWith('.json')){const value=JSON.parse(text);records=Array.isArray(value)?value:value.events;}
  else throw new Error('Choose a CSV or JSON event file.');
  if(!Array.isArray(records)||!records.length)throw new Error('No events found. Use an array or an object with an events array.');
  if(records.length>25000)throw new Error('Use up to 25,000 events per file.');
  const events=records.map((record,index)=>{
    if(!record||typeof record!=='object')throw new Error(`Event ${index+1} is not an event object.`);
    const source=record.source??record.source_ip,destination=record.destination??record.destination_ip,port=Number(record.port??record.destination_port);
    const timestamp=new Date(record.timestamp).toISOString();
    if(!validIP(source)||!validIP(destination)||!Number.isInteger(port)||port<0||port>65535)throw new Error(`Event ${index+1} needs valid source, destination, and port fields.`);
    const protocol=String(record.protocol||'TCP').trim().toUpperCase();
    if(!['TCP','UDP','SSH','HTTPS','HTTP','DNS','ICMP'].includes(protocol))throw new Error(`Event ${index+1} has an unsupported protocol.`);
    return{source,destination,port,timestamp,protocol,flag:String(record.flag||'ACK').toUpperCase(),auth:String(record.auth||'success').toLowerCase(),query:record.query?String(record.query).slice(0,253):null};
  }).sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp));
  const groups=new Map();
  for(const event of events){const key=`${event.source}|${Math.floor(Date.parse(event.timestamp)/60000)}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(event);}
  const incidents=[...groups.values()].map((group,index)=>evaluateEvents(group,index+1).incident).filter(Boolean);
  return{events,incidents,name:filename};
}
