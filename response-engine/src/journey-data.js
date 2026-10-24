import { createEvents, evaluateEvents } from './simulation.js';

export function makeJourney(count=40, sequence=1, timestamp=Date.now()) {
  const total=Math.max(10,Math.min(80,Math.round(Number(count)||40)));
  const seed=createEvents('brute',sequence,timestamp);
  const events=Array.from({length:total},(_,index)=>({...seed[index%seed.length],timestamp:new Date(timestamp+index*85).toISOString()}));
  return {events,...evaluateEvents(events,sequence)};
}

