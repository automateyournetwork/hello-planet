# Integration and hosting

## Choose a route

| Your site | Practical starting point |
| --- | --- |
| Astro | Copy components, supporting libraries/data, styles, config, and public assets. |
| WordPress / another CMS | Self-host the built embed; add the tracker once to the parent layout. |
| React / another framework | Embed first, or port the markup and call `mountGlobe(element)` after mounting. |
| Static-only hosting | Atlas/history display works; add a backend for live counting. |
| Apache/PHP | Use the supplied PHP collector and private SQLite storage. |

The default assumes assets at `/data/` and `/images/`, a collector at `/api/traffic`, and one globe per document. Subdirectory hosting requires adjusting those paths, the Astro base, and navigation. The component's `data-*` selectors are an interface with `globe.ts`; preserve them when porting. The original lifecycle assumes document navigation, so a React SPA needs explicit unmount cleanup and route-event semantics before treating it as a native React component.

## Native integration checklist

Copy `src/components/{Network,HitCounter,PCGlobe}.astro`, `src/lib/{globe,connections,hit-counter,visitor,pc-globe,pc-globe-audio}.ts`, `src/data/`, `src/styles/{globe,demo,atlas,pc-globe}.css`, `public/data/`, the complete `public/pc-globe/` directory including licenses, `public/images/home-flags.svg`, and `globe.config.json`. The demo stylesheet supplies theme variables; integrate them into your design system. Include the fonts from the demo page or choose replacements. Install the dependencies listed in `package.json`.

Set your document body's `data-visitor-endpoint` to `/api/traffic/` (the trailing slash is required by Astro dev routing). Mount the component once and call `startVisitorCounter()` once. A globe is a reader; the tracker is a writer. Keeping these separate lets you count all pages while displaying the globe only on selected pages.

## Embed without double counting

`/embed/` includes the globe but deliberately omits `startVisitorCounter()`. Its polling endpoint is `/api/traffic` on the embed's own origin. Parent pages must post to the same dataset through an API on their own origin. For different origins, use a server-side reverse proxy to the collector with an explicit trusted deployment design; the bundled collector does not enable permissive cross-origin writes. Putting both pages and embed on one origin is simpler. Do not add a second tracker inside the iframe.

## Configuration

`globe.config.json` configures Node and frontend baseline, timezone, and the public home marker in both views. Set `home.country` to its two-letter country code as well as the coordinates. Use a nonnegative integer baseline from verified historical statistics or zero. Node validates this at startup. Use a valid IANA timezone. Changing the baseline after database creation does not change the stored value: plan a backed-up migration if necessary. Do not erase a real database merely to change the label.

PHP reads `HELLO_PLANET_BASELINE` and `HELLO_PLANET_TIMEZONE`; set those consistently with the frontend configuration. It does not read the build's JSON at runtime. `AYN_ANALYTICS_DIR` selects its private storage directory; the original environment-variable name is retained for compatibility.

The History tab retains three sample aggregate JSON files and date-specific copy in `Network.astro`, `globe.ts`, and `pc-globe.ts`. Replace them and their labels together, or remove both the modern History control and the retro DATA history options. The example 78,373 historical views never seed your new counter. Replace `/stats/`, `/about/`, their redirects in `astro.config.mjs`, and the flag graphic for your site. `globe.config.json` customizes the home popup link; other educational/source links remain independently editable.

## PHP production collector

1. Build with `npm ci && npm run check && npm test && npm run build`.
2. Use PHP 8.1+ with PDO SQLite. Copy `server/php/traffic.php` to your public `api/traffic.php`.
3. Configure a private writable analytics directory **outside** the document root. Keep it out of static release archives.
4. Configure the baseline/timezone, then rewrite `/api/traffic` to `/api/traffic.php` (or use the PHP URL in the body attribute).
5. Install the reader and MMDB only if you need location estimates; see `server/php/SETUP.md`.
6. Deploy static `dist/` contents while preserving the API and private database. Test a separate staging collector before activation.

For Apache, an example rule in the origin-root `.htaccess` is:

```apache
RewriteEngine On
RewriteRule ^api/traffic/?$ api/traffic.php [L]
```

Adapt this to existing routing rules. No deployment automation is included. A plain `dist/` upload does not install the API or its dependencies. Serve over HTTPS. The supplied Node dev/preview servers bind loopback and report `local-preview`; they are not a hardened production server.

## Retro atlas assets

Copy the complete `public/pc-globe/` directory; this contains the SVG geometry data, profiles, flags, font, anthem note data, and all license/credit files. It uses root-relative paths just like the modern map. `PCGlobe.astro` imports its stylesheet; the component mounts through `globe.ts` and shares that snapshot instead of starting another collector. The country selector remains usable when map geometry fails. The city gazetteer is a collapsible panel. See [PC-GLOBE.md](PC-GLOBE.md).

## Geography

Counting does not require a location database. Obtain a DB-IP City MMDB separately under its terms. Node reads `AYN_GEOIP_DATABASE` or `private/geoip/dbip-city-lite-2026-09.mmdb` (see `server/geolocation.mjs`). PHP expects `visitors.mmdb` and its Composer reader beneath the private analytics directory. Retain attribution and maintain the database. Neither private/loopback IPs nor missing lookups should invent a location.

Node can fall back to a region point; PHP currently returns a rounded city or no location. Both use the direct peer address. Behind a CDN/reverse proxy, explicitly establish which peers may supply a client address. Do not trust arbitrary forwarded headers.

## Understand the data

POST sends a random per-tab session ID, document/event ID, event type, and pathname. Views are deduplicated by event ID; visible pages heartbeat about every 25 seconds. Presence expires at 90 seconds. GET returns `source`, baseline/lifetime/new view counts, active/today counters, location aggregates, and optional viewer location. See `HOW-IT-WAS-BUILT.md` for the contract.

Application storage omits raw IPs, raw referrers, query strings, user agents, and GPS. IP is used transiently for local lookup. Host access logs have their own behavior. Session counts are not verified humans. Per-session throttling and input checks are not a comprehensive abuse defense. View-event retention is currently indefinite; operators should define retention, archival totals, and backups before adopting at scale. Do not prune events without preserving aggregate totals and deduplication semantics.
