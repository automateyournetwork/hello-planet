# Source and geographic attribution

The original code and documentation in this standalone extraction are released by John Capobianco under the MIT license in LICENSE. The private website repository is not part of this release. Third-party data, software, and fonts retain their own terms.

- Globe: Three.js, installed from npm under its own license.
- World outlines: world-atlas 2.0.2 / Natural Earth 110m countries, transformed using topojson-client. Included software license notices: `licenses/world-atlas-LICENSE.txt` and `licenses/topojson-client-LICENSE.txt`. [Natural Earth data terms](https://www.naturalearthdata.com/about/terms-of-use/) identify the underlying map data as public domain.
- US state interiors: US Atlas 3.0.1, from US Census Bureau 2017 cartographic boundaries; source URL and attribution remain in `public/data/us-state-borders.json`. [US Atlas repository](https://github.com/topojson/us-atlas).
- Canada boundaries, regional reference points and 503 city landmarks: [Natural Earth](https://github.com/nvkelso/natural-earth-vector), public-domain geographic data. None of these points is a visitor record.
- Canada/Québec flag graphic: original website SVG for its public municipality marker.
- Historical country and total counts: only the original site's publicly displayed aggregate fields required by the globe/counter. Unrelated report sections and source screenshots are omitted.
- Optional location lookup: [DB-IP](https://db-ip.com/). No MMDB is bundled. Obtain and maintain a database under its applicable terms and retain the displayed attribution when using it.
- Self-hosted fonts: Inter Variable, Space Grotesk Variable and IBM Plex Mono, installed using their Fontsource npm packages with their own license notices.

`prepare-us-borders.mjs` is an optional regeneration script; it needs `topojson-client` installed and downloads public map data. `prepare-globe-geography.py` expects cached public Natural Earth source GeoJSON at the paths described in its code. These source caches are omitted. Neither generator is required for normal installation, build or demo use because the resulting map data is included.

## PC GLOBE visitor edition

The original atlas component and synthesizer code are included under this repository’s MIT license. Its third-party assets retain the licenses below; the code license does not relicense the data. The complete public credits page is `public/pc-globe/credits.html`; the source manifest is `public/pc-globe/manifest.json`.

- Country/territory profiles: [mledoze/countries](https://github.com/mledoze/countries), ODbL 1.0. The derived subset remains under ODbL; database copy and license are included.
- Flags: [lipis/flag-icons](https://github.com/lipis/flag-icons), MIT; notice included.
- Retro map: world-atlas 2.0.2 / Natural Earth, ISC software notice and public-domain source geography.
- WebPlus IBM VGA 8x16 font: [Oldschool PC Font Pack 2.2](https://int10h.org/oldschool-pc-fonts/), CC BY-SA 4.0; license included.
- Anthem note data: [anthem-scores 0.1.1](https://github.com/MarianBecher/anthem-scores), unmodified per-score data, with public-domain, CC0, or CC BY-SA source terms retained in every JSON and `public/pc-globe/anthems/CREDITS.md`. Preserve attribution and applicable share-alike terms. Some countries share a score; 43 entries use 36 melodies.
- Two synth themes are original compositions in `src/lib/pc-globe-audio.ts`. No original PC Globe executable, proprietary map/database, sound driver, or recording is distributed.

Screenshots in `docs/images/` depict this project. Their maps, flags, font, and any displayed third-party content retain the attributions above. The old counter graphics used in the separate website article are not bundled here.
