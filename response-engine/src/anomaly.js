const acts = [['home','Control'],['system','Fracture'],['detection','Detection'],['workflow','Verdict'],['containment','Response'],['console-preview','Restoration']];
const arrow = '<span aria-hidden="true">↗</span>';

function matter(text, extra = '') {
  return `<span class="an-matter ${extra}" aria-hidden="true">${[0,1,2].map(i=>`<span class="an-slice an-slice-${i}">${[...text].map((letter,j)=>`<span class="an-letter" style="--letter:${j}">${letter===' '?'&nbsp;':letter}</span>`).join('')}</span>`).join('')}</span>`;
}

export function landing() {
  return `<div class="anomaly-experience" data-act="0">
    <svg width="0" height="0" class="an-filter-defs" aria-hidden="true"><defs><filter id="an-type-liquid" x="-20%" y="-35%" width="140%" height="170%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".008 .025" numOctaves="2" seed="19" result="flow"/><feDisplacementMap in="SourceGraphic" in2="flow" scale="0" xChannelSelector="R" yChannelSelector="G" data-an-displacement/></filter></defs></svg>
    <header class="an-header">
      <a href="#home" class="an-wordmark" aria-label="IAIRS home">IAIRS<span class="an-brand-mark" aria-hidden="true">▧</span></a>
      <span class="an-brand-caption">INTELLIGENT AUTOMATED<br>INCIDENT RESPONSE SYSTEM</span>
      <nav aria-label="Main navigation"><button data-an-about>About</button><a href="#detection">System</a><a class="an-enter" href="#console/overview" data-an-enter>Enter console ${arrow}</a></nav>
    </header>
    <main id="main-content" class="an-track">
      ${acts.map(([id],i)=>`<div id="${id}" class="an-anchor" data-act-anchor="${i}" style="--act-index:${i}"></div>`).join('')}
      <div class="an-stage">
        <div class="an-paper" aria-hidden="true"><div class="an-world" data-world="procedural"><svg class="an-liquid-fallback" viewBox="0 0 800 800"><defs><linearGradient id="an-liquid-ink" x1="0" x2="1"><stop stop-color="#77736f"/><stop offset=".3" stop-color="#eae7df"/><stop offset=".5" stop-color="#b87655"/><stop offset=".7" stop-color="#d8bfa3"/><stop offset="1" stop-color="#77736f"/></linearGradient></defs><path d="M40 180C230 180 260 80 420 190S650 300 780 200M150 360C340 280 450 490 760 370M40 570C250 500 500 700 780 550" fill="none" stroke="url(#an-liquid-ink)" stroke-width="28"/></svg></div></div>
        <div class="an-dark" aria-hidden="true"></div>
        <div class="an-grid" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
        <canvas class="an-field" aria-hidden="true"></canvas>
        <div class="an-grain" aria-hidden="true"></div>
        <div class="an-halftone" aria-hidden="true"></div>
        <div class="an-signal" aria-hidden="true"><i></i></div>
        <div class="an-cut" aria-hidden="true"></div>

        <section class="an-scene an-control" data-scene="0" aria-labelledby="an-control-title">
          <div class="an-scene-top"><span>00 / THE AWAKENING</span><span class="an-state"><i></i>SYSTEM STATE / STABLE</span></div>
          <h1 id="an-control-title"><span class="sr-only">Everything is under control.</span>${matter('EVERYTHING')}${matter('IS UNDER','an-line-middle')}${matter('CONTROL.','an-line-last')}</h1>
          <div class="an-control-aside"><span class="an-cross" aria-hidden="true">+</span><p>Until it isn’t.</p><span class="an-micro">ONE SIGNAL CHANGES EVERYTHING.</span></div>
          <div class="an-hero-bottom"><a href="#system" class="an-scroll"><span class="an-down" aria-hidden="true">↓</span><span>SCROLL TO DISRUPT<br><small>A STORY IN SIX ACTS</small></span></a><p>The website is the incident.<br>The scroll is the timeline.</p><span class="an-edition">IAIRS — THE ANOMALY<br>INTERACTIVE EDITION / 001</span></div>
        </section>

        <section class="an-scene an-fracture" data-scene="1" aria-labelledby="an-fracture-title" inert>
          <div class="an-scene-top"><span>01 / THE FRACTURE</span><span class="an-state"><i></i>PATTERN / INTERRUPTED</span></div>
          <h2 id="an-fracture-title"><span class="sr-only">Something breaks the pattern.</span>${matter('SOMETHING')}${matter('BREAKS','an-red-word')}${matter('THE PATTERN.')}</h2>
          <div class="an-fracture-note"><span class="an-micro">ANOMALY / 001</span><p>A single source.<br>Repeated failed access.<br>A system out of alignment.</p><span class="an-micro">ILLUSTRATIVE SSH INCIDENT</span></div>
          <div class="an-bottom-note"><span>DISRUPTION ORIGIN / THE RED SIGNAL</span><span>SCROLL BACK TO REASSEMBLE ↑</span></div>
        </section>

        <section class="an-scene an-detection" data-scene="2" aria-labelledby="an-detection-title" inert>
          <div class="an-scene-top"><span>02 / THE SYSTEM SEES</span><span class="an-state"><i></i>DETECTION / RULE MATCHED</span></div>
          <h2 id="an-detection-title">THE SYSTEM<br>SEES THE<br><span>PATTERN.</span></h2>
          <p class="an-detection-intro">The invisible becomes evidence.<br>One signal. A connected story.</p>
          <button class="an-node-inspect" aria-expanded="false" aria-controls="an-node-details"><span aria-hidden="true">+</span> INSPECT THE SIGNAL</button>
          <div class="an-node-details" id="an-node-details" hidden><span class="an-micro">ILLUSTRATIVE EVENT / SSH AUTHENTICATION</span><dl><div><dt>Source</dt><dd data-an-source></dd></div><div><dt>Destination</dt><dd data-an-target></dd></div><div><dt>Pattern</dt><dd>Repeated failed SSH logins</dd></div><div><dt>Rule</dt><dd>≥ 20 failures within 60 seconds</dd></div></dl></div>
          <div class="an-detection-evidence"><span class="an-micro">EVIDENCE / NOT LIVE TRAFFIC</span><strong><span data-an-count>40</span> <small>FAILED LOGINS</small></strong><p data-an-reason></p><div class="an-event-marks" aria-hidden="true">${Array.from({length:40},(_,i)=>`<i style="--i:${i}"></i>`).join('')}</div><span class="an-micro">SSH :22 <span>→</span> BRUTE-FORCE PATTERN</span></div>
        </section>

        <section class="an-scene an-verdict" data-scene="3" aria-labelledby="an-verdict-title" inert>
          <div class="an-scene-top"><span>03 / THE VERDICT</span><span class="an-state"><i></i>SEVERITY / <span data-an-severity>CRITICAL</span></span></div>
          <h2 id="an-verdict-title">RISK IS<br>CALCULATED.<br><span>NOT GUESSED.</span></h2>
          <div class="an-score-composition"><div class="an-score-fragments" aria-hidden="true"></div><div class="an-score"><output data-an-score aria-label="Illustrative incident risk score">84</output><span>/100</span></div><span class="an-score-caption">ONE INCIDENT. EVERY FACTOR ACCOUNTED FOR.</span></div>
          <div class="an-risk-evidence"><span class="an-micro">THE EVIDENCE BEHIND THE NUMBER</span><div data-an-factors></div><div class="an-risk-total"><span>CALCULATED RISK</span><strong data-an-equation></strong></div><label class="an-risk-slider" for="an-failures"><span>EXPLORE THE EVIDENCE <output id="an-frequency">40 FAILURES</output></span><input id="an-failures" type="range" min="10" max="80" value="40" aria-describedby="an-risk-help"><small id="an-risk-help">Change the failures. The actual IAIRS rule engine recalculates.</small></label></div>
        </section>

        <section class="an-scene an-response" data-scene="4" aria-labelledby="an-response-title" inert>
          <div class="an-scene-top"><span>04 / THE RESPONSE</span><span class="an-state"><i></i>SIMULATED RESPONSE</span></div>
          <h2 id="an-response-title">DETECTION<br>WAS ONLY<br><span>THE BEGINNING.</span></h2>
          <div class="an-response-map"><svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><g class="an-branch-base"><path d="M20 250H160L290 55H720"/><path d="M20 250H200L330 185H720"/><path d="M20 250H240L370 315H720"/><path d="M20 250H280L410 445H720"/></g><path class="an-active-branch" pathLength="1" d="M20 250H280L410 445H720"/><circle class="an-response-origin" cx="20" cy="250" r="5"/><g class="an-branch-ends"><circle cx="720" cy="55" r="4"/><circle cx="720" cy="185" r="4"/><circle cx="720" cy="315" r="4"/><circle cx="720" cy="445" r="4"/></g></svg><div class="an-branch-labels">${[['Low','00–25','Log only'],['Medium','26–50','Security alert'],['High','51–75','Simulated IP block'],['Critical','76–100','Isolation + admin notification']].map(([severity,range,action])=>`<div data-an-branch="${severity}"><button class="an-policy-choose" data-an-policy="${severity}" aria-pressed="false" aria-label="Explore ${severity} simulated response"><span>${range} / ${severity.toUpperCase()}</span><strong>${action}</strong></button></div>`).join('')}</div></div>
          <div class="an-response-result"><span class="an-micro" data-an-result>CONTAINMENT SIMULATED</span><p data-an-action>Simulated host isolation</p><small>Visual policy simulation. No host is isolated or administrator contacted.</small></div>
        </section>

        <section class="an-scene an-restoration" data-scene="5" aria-labelledby="an-restoration-title" inert>
          <div class="an-scene-top"><span>05 / CONTROL, RESTORED</span><span class="an-state"><i></i>FROM SIGNAL TO RESPONSE</span></div>
          <div class="an-restoration-copy"><h2 id="an-restoration-title">FROM SIGNAL<br>TO RESPONSE.</h2><p>What began as a disruption<br>becomes a system of understanding.</p><a class="an-primary-cta" href="#console/overview" data-an-enter>ENTER THE CONSOLE ${arrow}</a><a class="an-replay" href="#home">REPLAY THE EXPERIENCE <span aria-hidden="true">↶</span></a></div>
          <div class="an-console-reveal"><div class="an-console-bar"><span>IAIRS / THE OPERATIONAL CONSOLE</span><span>YOUR LOCAL SIMULATION <i></i></span></div><div class="an-console-window"><iframe class="an-console-live" title="The actual IAIRS operational console, with your local simulation dataset" tabindex="-1" aria-hidden="true" inert></iframe><div class="an-console-construction" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div></div><div class="an-console-caption"><span>THE ACTUAL IAIRS WORKSPACE</span><a href="#console/overview" data-an-enter>OPEN WORKSPACE ${arrow}</a></div></div>
          <div class="an-restoration-bottom"><span>THE ANOMALY IS CONTAINED. THE STORY CONTINUES.</span><span>IAIRS / EDUCATIONAL SIMULATION</span></div>
        </section>
        <nav class="an-rail" aria-label="Narrative acts">${acts.map(([id,name],i)=>`<a href="#${id}" data-an-chapter="${i}" aria-label="Act ${i}: ${name}" ${i===0?'aria-current="step"':''}><span>${String(i).padStart(2,'0')}</span><i></i><small>${name}</small></a>`).join('')}</nav>
        <div class="an-stage-footer"><span><i></i> <span data-an-phase>ALL SYSTEMS IN ORDER</span></span><a href="#console/overview">SKIP EXPERIENCE ↗</a><span class="an-footer-index"><span data-an-index>00</span> — 05</span></div>
        <div class="an-progress" aria-hidden="true"><i></i></div>
      </div>
    </main>
    <div class="sr-only" aria-live="polite" data-an-status></div>
  </div>`;
}
