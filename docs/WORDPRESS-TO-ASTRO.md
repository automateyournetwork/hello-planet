# From a WordPress export to a site you own

John's rebuild is the origin of this globe. The website source records a standalone Astro migration, preserved WordPress routes and discussion, public content recovery, search, books, topic pages, a timeline, and later the visitor globe. Production serves static output on Apache/cPanel with a separate PHP/SQLite collector. Node is used for development/builds, not as a requirement for serving the static site.

This is a playbook based on that evidence, not a universal one-click converter. The full website importer and private migration archives are not included here. Your export, plugins, URL structure, theme, and hosting will require their own decisions.

## 1. Preserve what exists

Export WordPress content as WXR/XML. Separately back up uploads, the database, configuration, and the old site for rollback. WXR is not a complete media or plugin backup. Keep these inputs in an ignored private directory, outside public assets. Preserve source dates and original URLs.

Create a manifest of published posts/pages, attachments, categories, tags, feeds, numeric query URLs, and important inbound links. Separate public comments from commenter email addresses, unpublished records, and moderation metadata. Record counts before transformation so omissions become visible.

## 2. Decide what the new site should do

John wanted an owned destination for writing, books, code, videos, events, and network automation education. The requirements were bigger than “make it modern.” A free book reader, archive routes, discovery, and usable mobile navigation mattered.

Write your own acceptance criteria: old URLs resolve or redirect; dates survive; images load; comments retain approved public text only; keyboard navigation works; search finds representative articles; the new host can serve the result. Make a separate list of optional experiments such as the globe.

## 3. Build a content pipeline before polishing

Parse the export into structured records with stable IDs and paths. Sanitize imported HTML, rewrite known media references, and preserve code formatting. Recover public media from an allowlist rather than copying an entire hosting backup into `public/`.

John's site combines recovered public records with new Markdown articles. A typical article has title, date, path, description, topics, draft flag, and body. Build output regenerates pages and indexes. Choose an equivalent workflow that your future self can maintain.

## 4. Rebuild the information architecture

Design a homepage around what readers want to do. Keep original articles reachable while adding topic collections, a search index, an RSS feed, sitemap, metadata, and related reading. Use a route manifest instead of relying on memory. Redirect old aliases and numeric WordPress URLs deliberately; test actual host behavior.

Astro supplies the HTML shell and build pipeline. Three.js handles selected interactive scenes. Most content does not need a canvas or client-side application. This division allowed John's archive and books to remain ordinary readable pages while experiments grew around them.

## 5. Separate analytics history from new measurements

John recovered a Jetpack baseline of 78,373 views through September 24, 2026. It was inserted once; new production visits were added afterward. A partly overlapping Google Analytics snapshot was kept separate. Country totals were not invented into city-level visitor records.

Recover only what you can substantiate. Do not add overlapping reports. Do not treat a rounded monthly label as an exact number or a blank month as zero. Start your new counter at zero if you cannot establish a defensible baseline.

## 6. Use a harness and bounded loops

Give the coding agent the requirements, allowlisted source inventory, architecture, and exact check commands. Let it inspect the repository and a local browser. Work in small loops: implement, verify, visually inspect, repair, record. Durable notes matter when a session ends or context fills.

John's saved loop notes show concrete corrections: live versus preview labels, retry deduplication, stale-page presence, mobile overflow, and a PHP adapter for the actual hosting environment. These were discovered and verified through iteration. The method is not a claim that one prompt produces a reliable migration.

## 7. Rehearse the cutover

Build to a staging origin with noindex. Test representative old and new URLs, redirects, feeds, search, book/media delivery, mobile layouts, and privacy boundaries. Compare expected content totals and identify known missing legacy assets explicitly. Scan deployable output for private inputs.

For production, rebuild with the correct canonical origin and indexing settings. Deploy only reviewed static output plus the deliberately configured API. Preserve certificate-renewal directories and analytics storage. Keep the old site/database recoverable and record rollback steps. Verify public responses after cutover without flooding the host.

## 8. Keep creating

John's site continued into NetClaw, visualizations, VibeOps, educational games, and spec-driven development articles. The globe itself became an atlas. Your new site is a place to iterate, not the end of the migration.

Related public work: [NetClaw](https://github.com/automateyournetwork/netclaw), [Merlin](https://github.com/automateyournetwork/merlin), [Networking Video Game Starter Kit](https://github.com/automateyournetwork/NetworkingVideoGameStarterKit), [builder-skills](https://github.com/automateyournetwork/builder-skills), and [the site's visualizations](https://automateyournetwork.com/visualizations/).
