# 001 — PC Globe mode

## Idea

John loved PC Globe at age nine in 1987. Add an atlas to his 2026 visitor globe so curiosity about places is useful even when no visitors are mapped.

## Behavior

- Fourth mode, “PC Globe mode,” alongside Right now, Today, and History.
- Uses the bundled Natural Earth city/capital landmarks.
- Searches city, country name/code, or region through accessible HTML controls.
- Selecting a place focuses the globe and describes its reference coordinates and kind.
- “Take me somewhere” selects from current search results.
- A normal link opens a Wikipedia search for that city/country; no request until clicked.
- Atlas points are never labeled or stored as visitors; visitor panels/arcs are hidden.
- Mode changes never write events or alter counters. Page tracking is independent.
- Text controls work without WebGL. Reduced motion is respected.

## Acceptance

1. Search Japan; select Tokyo; verify name/country, selected globe label, and link.
2. Search an impossible term; show no results and disable random selection.
3. Clear search; random selection produces a bundled landmark and learning link.
4. Return to Right now; traffic controls and source labels return.
5. Verify 390px and desktop layout without overflow.
6. No collector writes from atlas interactions in an automated browser.
7. Block WebGL and verify search, details, and links.

## Boundaries

Original atlas view inspired by PC Globe, not an emulator or a reproduction of its database. Natural Earth coordinates are reference data, not live geographic authority. Country/territory source codes do not imply a political country count.

## Loop

Read marker selection → make landmark selection work outside WebGL → add atlas controls/source labels → test actual interactions → repair failures → record screenshots and results.
