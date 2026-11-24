# PC GLOBE — a visitor atlas with a personal history

John Capobianco remembers being nine in 1987 and obsessed with PC Globe. He connects that experience with his love of travel, culture, and humanism. Seeing visitors arrive from around the world brought that curiosity back. The new mode makes the connection tangible: the same website counter can become a retro atlas.

## Try it

Select **PC GLOBE**. The default DATA view is explicitly labeled John's sample Jetpack history. Select Right now or Today for your installation's snapshots. Pick a country on the map or through the selector; flags, capital, region, languages, currency, and area come from the bundled reference dataset. The overview map omits some small islands; the menu includes all 250 profiles.

Toggle visitor pins, flags, grid, and home/viewer overlays. Choose EGA colour, CGA cyan/magenta, or amber. Zoom and pan with the map controls, pointer, or keyboard. Open **City gazetteer · 503 places** for search, random selection, and a learning link. The expand button gives the atlas more room; Escape restores it and stops sound.

Audio is opt-in. Select an FM brass, FM bell, or PC speaker voice. Play an available anthem opening or one of the two original themes. Sound stops on Stop, mute, hiding/leaving the mode, or page exit. A delayed music request cannot start playback after you leave. Unsupported anthem selections explicitly say no score is included.

## How it fits together

`Network.astro` mounts both interfaces. `globe.ts` switches visibility and sends the same collector snapshot to `pc-globe.ts`. No second tracker or separate visitor database is created. The modern view uses Three.js/WebGL; the retro map uses SVG, so its country selector, map, and text can work without WebGL.

`pc-globe.ts` loads local profiles, map geometry, flags, and the anthem index. It projects longitude/latitude into a flat world map and unwraps polygons around the date line. Country details are reference information. Country aggregates are diamonds; approximate live locations are circles. Missing locations are not manufactured. Historical reports overlap and are not added together.

`pc-globe-audio.ts` synthesizes notes using Web Audio and quantizes buffers to 16-bit samples at 22,050 Hz. The build notes describe targeted analysis of PC Globe 5.04 informing the PC-speaker behavior. This is not full Sound Blaster/OPL hardware emulation. Original DOS binaries and proprietary assets are not included. Licensed note data and original themes supply the music.

## Data and attribution

The shipped snapshot includes 250 country/territory profiles and flags, 177 map geometries, 503 city landmarks, and 43 anthem entries sharing 36 melodies. These are dataset coverage counts, not assertions about political recognition or universal geographic coverage.

Country data is ODbL; the font and some note data are CC BY-SA; other assets have their own notices. See [ATTRIBUTION.md](../ATTRIBUTION.md) and the [bundled credits page](../public/pc-globe/credits.html). Keep the data, source links, and applicable license files together when embedding or adapting the feature. Source dates and terms travel with the assets.

## What the loop proved

The acceptance suite exercises country selection, historic totals, live/today snapshots, stale-data removal, map failure, privacy preferences, palette/overlay/zoom controls, gazetteer, expansion, audio buffers, delayed playback cancellation, mobile fit, and automated accessibility. See [VERIFICATION.md](../VERIFICATION.md) for results from this standalone release. Automated playback checks are not a claim of human listening or physical-device verification.
