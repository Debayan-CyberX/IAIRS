# IAIRS — The Response Engine

A working IAIRS simulation with The Anomaly, a six-act editorial landing experience. One red signal moves through fractured typography, a procedural data field, verified risk assessment, simulated response, and restoration into the existing Global Threat Command Center. See [ANOMALY.md](./ANOMALY.md) for the current landing architecture and verification.

Hosted site: https://iairs-response-engine.palefly10.chatgpt.site

## Run locally

```powershell
npm install
npm run dev
```

Open the URL Vite prints. The console is at `/#console/overview`, and the interactive laboratory is at `/#console/demo`.

```powershell
npm run check
npm run build
npm run preview
```

## What works

- Five traffic scenarios: normal traffic, port scanning, brute force, SYN flood, and suspicious DNS.
- Detection thresholds evaluate generated event fields. Risk scores combine attack type, observed frequency, affected hosts, and time window.
- Severity selects log, alert, simulated IP block, or simulated host isolation.
- Incidents, evidence, audit trails, and preferences persist in localStorage.
- Search by incident ID, attack type, source IP, or destination. Filter by severity, threat type, time range, or case status; select a case in the investigation rail.
- Analyze local CSV/JSON event files, inspect chart evidence, and explore detection rules, sources, protocols, and risk components without changing the incident register.
- Investigation views show evidence, timeline, score components, response, and reports.
- Search and filter reports, preview them in a sandboxed document, and download individual HTML/JSON, the incident register as CSV, or the full workspace as JSON.
- Live artwork, interactive WebGL globe, illustrative geographic map, and dataset topology views.
- Responsive layouts, keyboard navigation, reduced motion, low light mode, and a non-WebGL fallback.
- Custom animated 3D response engine with rounded chrome bands, machined details, refractive glass, a warm core, independent rotation, pointer depth, and drag/keyboard controls. Existing artwork layers, section rays, network traces, and globe trails remain animated.
- Replay existing response records and completed Lab runs without generating additional incidents or detections.

The initial 16 incidents are labeled sample data. New incidents are labeled Demo Lab generated. All metrics are derived from this dataset. This frontend implementation runs entirely in the browser; it does not capture live traffic, process PCAP uploads, call AI, contact external hosts, or modify real infrastructure. The supplied report describes a proposed Python/SQLite backend; no existing backend was present in the workspace.

## Verification

With the dev server running, execute `npm test`, `npm run test:experience`, `npm run test:enhancements`, and `npm run test:motion`. The Playwright checks cover scenarios, severity, persistence, investigation tabs, report contents, search, host filtering, imports, exports, preferences, dataset restoration, replay, dashboard modes, visible rotation, pointer/scroll responses, offscreen pausing, mobile overflow, reduced motion, and runtime errors. Screenshots and downloaded verification files go to ignored `test-results/`. `npm run check` also verifies all 11 original public assets against their recorded SHA-256 hashes.

## Implementation

- Vite, plain JavaScript modules, Three.js, Lucide icons.
- Locally served Space Grotesk, Inter, and IBM Plex Mono fonts.
- The landing page is a code-generated six-act incident narrative: monumental editorial type, live signed-distance liquid, stable glyph-to-network particles, verified risk, measured response paths, and panel-by-panel reconstruction into the actual running console and a full-viewport handoff. It uses GSAP ScrollTrigger and one persistent WebGL stage, without background videos or painted scene textures. See ANOMALY.md for architecture and validation.
- Every console page uses a high-resolution reconstruction of the user's concept-board environment: obsidian rock, reflective mineral ground, silver light ribbons and fine particles. It was created with the built-in imagegen tool from the small supplied environment panel, with the prompt recorded in `DASHBOARD_ENVIRONMENT.md`. The original 11 assets remain unchanged. Smoked-glass panels, titanium edges, restrained holographic reflections and volumetric light follow the reference's material row. The Overview top panel retains the full original globe-and-canyon scene; the new obsidian landscape stays behind the rest of the dashboard. Its default `Live` globe remains the original artwork with moving illustrative connection trails; the explicit `3D` view and investigation globes extend the existing rendered globe. These are simulation visuals, not a live geographic traffic feed.
- Visual tokens and base styling: `src/styles.css`; current landing: `src/anomaly.js`, `src/anomaly-director.js`, `src/signal-stage.js`, `src/signal-field.js`, `src/signal-particles.js`, `src/signal-distance.js`, `src/signal-ribbons.js`, `src/signal-ribbon-shape.js`, `src/anomaly.css`, and `src/anomaly-editorial.css`; shared console materials: `src/dashboard-materials.css`.
- Shared console components: `src/components.js` and `src/console.css`.
- Command center reproduction: `src/command.js` and `src/command.css`.
- Collage console pages: `src/workspace.js` and `src/workspace.css`; structured event analysis: `src/traffic.js`.
- Console motion: `src/motion.js` and `src/motion.css`; procedural console globes: `src/visuals.js`. The current landing uses `src/anomaly-director.js` with Canvas 2D, capped resolution and mobile contour density, hidden-tab pausing, a Canvas-unavailable fallback, reduced-motion support, and route cleanup. Earlier `src/world.js` and `src/experience.js` remain as historical landing source.
- Rules and sample data: `src/simulation.js`.
- Asset provenance and generation prompts: `ASSETS.md`.
- Asset inventory, preservation rules, and integrity check: `.openai/asset-inventory.json`, `ASSET_PRESERVATION.md`, and `asset-integrity.mjs`.

The site is deployed privately through Sites. Its identity is recorded in `.openai/hosting.json`.
