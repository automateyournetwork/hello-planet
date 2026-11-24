# 002 — The memory becomes a visitor atlas

This extends [001](001-pc-globe-mode.md), the initial searchable-landmark idea, with the completed PC GLOBE experience released on John's site on November 24, 2026.

## Intent

Recreate the invitation to explore that John remembers from PC Globe in 1987. Make it a working view of his visitor globe that can also travel to other websites.

## Experience

- Fourth PC GLOBE tab with a DOS/early Windows visual style.
- SVG world map, country selection, 250 profiles/flags, three palettes, pan/zoom, and expansion.
- Shared visitor snapshot; History, recovered history, Right now, and Today retain distinct meanings.
- Geographic country information and 503-place gazetteer remain separate from traffic.
- Optional anthem openings and two original themes, with explicit play/mute/stop and cancellation on exit.
- Country selection and text remain available when WebGL or map geometry is unavailable.
- Country, font, map, flag, and music sources retain their licenses. No DOS software is distributed.

## Acceptance

Run `tests/browser/pc-globe.spec.ts` plus `globe.spec.ts`. Verify country counts and labels, shared snapshots, stale data removal, privacy, map fallback, pointer/keyboard controls, gazetteer search, no fabricated visits, audio start/stop and delayed-request cancellation, mobile fit, and automated accessibility. Capture the final desktop and mobile interface.

## Standalone adaptation

Start the collector at zero. Label John's history as sample content in both interfaces. Configure home coordinates/country/name through globe.config.json. Ship all referenced public assets and credits. Verify a clean install, type checks, collector tests, a static build, and the built site's browser behavior before publishing the repo.
