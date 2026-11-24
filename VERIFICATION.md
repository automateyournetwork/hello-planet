# Hello, Planet verification — November 24, 2026

This records the standalone release, including the finished PC GLOBE visitor atlas. The original source handoff's historical manifest is retained in `provenance/`; the current release includes the adaptations described there.

## Verified locally

- Clean dependency installation with the committed lockfile.
- `npm run check`: 25 files; zero errors, warnings, or hints.
- `npm test`: **15 passing** collector, geolocation, and connection tests. The standalone baseline starts at zero and persists without duplication.
- `npm run build`: static demo, display-only embed, and supporting routes build successfully. Three.js produces a chunk-size advisory; it is dynamically imported.
- `npm run test:browser` against the built output: **13 passing** scenarios covering WebGL rendering; labeled example/history data; atlas search; no collector writes from atlas/embed interactions; no-WebGL and API-failure behavior; live/today snapshots; stale-data removal; country/palette/overlay/zoom/expansion controls; privacy preferences; audio generation/stop/delayed-fetch cancellation; automated accessibility; and narrow layouts.
- A final narrow-screen review found clipped six-digit retro totals. Responsive type sizing was corrected, and the focused 320px readout-fit/accessibility test passes.
- Desktop and mobile screenshots are saved in `docs/images/`. Screenshots show explicitly labeled examples or John's sample historical aggregates, not fabricated live visitors.
- Markdown local links checked. Allowlisted-source review and secret-pattern scanning found no private keys, recognizable tokens, credential-bearing URLs, or private machine paths in publishable files. Runtime databases, GeoIP MMDBs, private exports, original DOS software, and repository history from the personal website are excluded.
- All 298 public PC GLOBE assets from the verified website release are included with their source/license notices. Only the standalone source configuration and sample-history labels are adapted.

The first Linux PHP run caught one inherited test expectation still adding John’s historical baseline to 20 concurrent writes. The standalone counter correctly returned 20; the fixture now expects the new zero-baseline behavior.

A browser-test update was needed because the finished retro interface puts the city gazetteer inside a collapsible panel. The test now opens that panel before interacting. No product behavior was weakened to make the test pass.

## CI and practical limits

GitHub Actions runs type checks, Node tests, static build, Chromium browser tests, and PHP integration tests on Linux. Consult the workflow result for the exact commit. PHP is not installed in the local authoring shell, so no local PHP execution is claimed.

Live GeoIP resolution, production deployment on a new host, physical-device audio quality, and spoken-screen-reader use are not qualified by these standalone checks. Automated audio verification confirms nonzero, quantized 16-bit sample buffers at 22,050 Hz; it does not substitute for listening. Node dev/preview servers are local-only. A production collector and private persistent storage must be configured separately.
