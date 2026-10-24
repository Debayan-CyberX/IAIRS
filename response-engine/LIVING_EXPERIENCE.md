# Follow one signal

The landing page is a six-act interactive incident-response environment. It replaces the former chapter cards, dashboard thumbnail, feature cards and pipeline cards. Dashboard artwork and its newly requested background remain unchanged.

1. Arrival: a machined titanium/obsidian engine in the preserved canyon; console and signal actions fit the first screen.
2. Signal: the desktop camera approaches the aperture and follows a synthetic failed-login burst into moving traffic.
3. Detection: the existing SSH threshold is explicit, with a replayable visual response.
4. Decision: a keyboard-accessible input changes 10–80 failed logins. The existing rule engine calculates the score and policy. Four glass surfaces and the contributions follow those values.
5. Response: the engine aligns around the selected signal while ordinary traffic continues. Below-threshold input leaves traffic open.
6. Evidence: a three-tab preview carries the same source, target, events, score and response into the actual investigation.

Previewing does not write records. The final action records one run in browser storage and, only when detection exists, creates the incident and opens its investigation. Its exported report identifies the landing-page simulation.

## Implementation and assets

- src/journey.js: semantic sections, actions, chapter navigation, risk control and evidence handoff.
- src/experience.js: chapter progression, desktop Lenis synchronization, GSAP coordination, input evaluation, opt-in Web Audio and cleanup.
- src/world.js: one persistent Three.js scene, rounded metal bands, fasteners, machinery, iris, glass, shared lighting, depth, particles, risk surfaces and containment geometry.
- src/journey-data.js: synthetic bursts evaluated by the existing evaluateEvents function.
- src/experience.css: editorial layout, phone composition and reduced-motion treatment.

The engine, glass, machinery and traffic are rendered geometry. The canyon uses a new clean backplate made from the original artwork, with the painted orb removed so the real engine has a natural environment behind it. The dashboard mineral landscape remains unchanged. Procedural haze and light animate the raster surroundings. This is a hybrid scene, not recovered original geometry. No original public image, font or SVG was edited, renamed or removed. All 12 prior assets retain their hashes; the clean canyon is separately inventoried. See HERO_ART_DIRECTION.md for the asset and generation prompt.

Physically based materials, a reflection environment using the same canyon with studio light strips, shared lights, bloom and tone mapping unify the image. The engine has no opaque hemisphere or primitive foreground rocks. Its overall pose drifts within a bounded angle while individual bands and internal rings rotate continuously, preserving the composed view over long sessions. Drag and keyboard controls still let visitors turn it. The desktop hero is 38% larger in model scale and moves closer to the camera; its text column is compact to keep the first-screen actions visible. Desktop rendering starts at 2x CSS resolution, with Ultra SMAA edge smoothing and no noisy roughness texture. Sustained slow rendering can reduce pixel density to a floor of 1.5x; mobile uses 1.5x with lower geometry complexity. Rendering sleeps in hidden tabs, stops for reduced motion or Ambient Motion off, and disposes on navigation. Still scenes retain keyboard rotation and control feedback. WebGL failure retains photographic artwork and functional scoring/navigation.

Sound starts only through its explicit button, suspends in hidden tabs, and closes on navigation. No external audio requests are required.

## Verification

- npm run check: JavaScript syntax and public asset integrity.
- npm run test:experience / npm run test:landing: rule thresholds; risk control; preview isolation; exact incident handoff, persistence and report provenance; below-threshold runs; six hero viewports; mobile navigation and overflow.
- npm run test:motion: canvas changes, rotation, drag, camera movement, single canvas, optional sound, both motion preferences, keyboard control, disposal, dashboard modes and no-WebGL fallback.
- npm test: console modes, filtering, five scenarios, persistence, investigation, reports, search, settings, responsive layouts and runtime errors.

## Libraries and research

The scene and interaction code are authored for IAIRS. The existing Vite/Three.js application now uses GSAP 3.15.0, Lenis 1.3.27 and postprocessing 6.39.5. No portfolio assets or third-party scene were copied.

- [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/)
- [Lenis](https://github.com/darkroomengineering/lenis)
- [Three.js](https://github.com/mrdoob/three.js)
- [Postprocessing](https://github.com/pmndrs/postprocessing)
- Creative research: [Lusion's Synthetic Human](https://lusion.co/projects/synthetic_human/) and [Bruno Simon's world](https://bruno-simon.com/).

