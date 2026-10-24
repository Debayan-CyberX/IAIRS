# Asset preservation and motion audit

The current site is the visual source of truth. Motion enhancements must not replace, edit, recolor, remove, or rename these assets. The baseline hashes and original dimensions are recorded in `.openai/asset-inventory.json`.

| Existing asset | Existing uses | Treatment |
| --- | --- | --- |
| `public/assets/response-core.webp` | Original hero reference; WebGL fallback; overview sidebar emblem | Preserve raster unchanged; use a separately generated clean canyon behind the live engine |
| `public/assets/story-panels.webp` | Five story chapters; engine showcase; closing console scene; target-host cube; traffic-flow insets | Preserve raster; subtle scroll depth and hover emphasis |
| `public/assets/command-environment.webp` | Overview globe environment; console backgrounds; Demo Lab scene; response-engine backdrop | Preserve raster; ambient layers, mapped callout highlights, and synthetic-result feedback |
| `public/assets/network-activity.webp` | Incident preview rail, investigation background, overview activity and incident art | Preserve raster; selection transition and evidence focus |
| `public/assets/network-topology.webp` | Network page spatial topology; overview and globe surroundings; landing console atmosphere | Preserve raster; animate the existing SVG connections and data-mapped node overlays; use a dark treatment behind the overview panels |
| `public/favicon.svg` | Browser icon | Preserve unchanged |
| `public/assets/*woff2` and `fonts.css` | Existing Space Grotesk, Inter, IBM Plex Mono typography | Preserve unchanged |

No original 3D model or scene is available. The current user-authorized reconstruction creates actual orb geometry in `src/world.js`: rounded metal bands, fasteners, reflective glass, ribs, and inner machinery. It approximates the reference rather than recovering its hidden geometry. The original image remains unchanged and supplies the non-WebGL fallback. A new sibling asset, hero-canyon-clean.png, removes the painted orb and supplies a natural canyon behind the rendered geometry. The same canyon and studio light strips supply material reflections. A background shader introduces procedural fog without a circular mask. The exact built-in imagegen prompt is recorded in HERO_ART_DIRECTION.md. Existing investigation globes and the overview's optional 3D view remain procedural Three.js scenes in `src/visuals.js`. Every original asset file remains intact.

The shared motion layer reuses the same background URLs on removable child planes. Their slow transform loops leave captions and controls stable. Original image files are never edited. The globe's original artwork gains illustrative trails; its explicit 3D mode retains and improves the existing procedural globe, lighting, surface points, and animated nodes. No motion layer claims that decorative geography or image nodes are real observed hosts. Lower landing sections gain code-rendered atmosphere, flow paths, grids, and moving light rays.

## Current compositions

- Landing: the approved six-act Follow one signal redesign replaces the former card sections. See LIVING_EXPERIENCE.md for its shared 3D scene, scoring, console handoff, asset treatment, motion preferences and fallback.
- Console environment: the user explicitly requested the obsidian and flowing-light landscape from the concept board and its titanium, smoked-glass, obsidian, holographic glow, particle and volumetric-light material palette. A new high-resolution reference reconstruction (`dashboard-environment-v2.png`) is used across console routes; the original 11 assets remain byte-for-byte unchanged. Provenance and the built-in imagegen prompt are recorded in `DASHBOARD_ENVIRONMENT.md`. The SVG light traces and restrained CSS atmosphere respect motion preferences.
- Overview: restore the full original globe-and-canyon scene inside the top panel, as requested in the latest reference. Keep the new obsidian landscape behind the dashboard, along with metrics, activity panels, and the investigation rail.
- Incidents: current table and filters, selected-incident rail, five-stage lifecycle ribbon.
- Analysis: traffic upload, parsed event evidence, detection chart, sources, protocol distribution; rule/risk/context tabs.
- Network: current topology artwork, existing host and source overlays, connection rail, flow inset.
- Response: existing event/risk/decision sequence, four severity branches, response preview and details.
- Demo Lab: current scenario/control panels, simulation scene, generated incidents and output, live pipeline.
- Reports, settings, investigation: retain existing card/panel compositions and material system.

## Motion implementation checklist

- Existing console motion uses native CSS, SVG, Web Animations and Three.js. The approved landing experience additionally uses GSAP, Lenis and postprocessing.
- The approved landing redesign uses one persistent scene and GSAP/Lenis choreography; original files stay intact.
- Drive effects and counters from current incidents and real local simulation results.
- Use passive listeners, capped particles, intersection/visibility pausing, adaptive resolution, and complete cleanup on route changes.
- Honor OS reduced motion and the existing Ambient Motion preference.
- Compare media hashes after implementation; verify routes, rules, persistence, reports, and mobile layouts.
- Existing ingestion supports CSV/JSON structured events. PCAP parsing and a live backend are not implemented; motion must not imply otherwise.
