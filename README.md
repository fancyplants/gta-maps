# GTA Maps

Directions with a second ETA: how long the drive would take if you drove like you were in Grand Theft Auto. Run the reds, weave through traffic, and compare against the law-abiding time.

**Live site:** https://fancyplants.github.io/gta-maps/

## Features

- Search for places or click the map to set a start and a destination
- Law-abiding vs GTA drive time over the same route
- Wanted level (1 to 5 stars) that scales how recklessly you drive
- Fun stats: red lights run, cars weaved past, expected crashes, police roadblocks
- "Start mission" replay that races the GTA car against a law-abiding ghost, ending in a Mission Passed screen
- Shareable links (start, destination and wanted level live in the URL)

## How the times are worked out

Both drives follow the same OSRM route. The model lives in [`src/lib/gtaModel.ts`](src/lib/gtaModel.ts).

**Law-abiding** = OSRM's free-flow driving time, plus on city streets (normal speed under 70 km/h):
- about 4 s per junction passed (signals, stop signs, yielding)
- 15 s per turn across oncoming traffic, 6 s per turn on your own side

**GTA** = for each road segment, the normal speed times a wanted-level multiplier (1.3× to 2.3×), capped at a top speed (140 to 260 km/h), plus:
- no waiting at junctions, ever
- braking into and launching out of every turn, using a corner speed per turn type and simple acceleration and braking physics
- expected crashes per km (8 s each), rising with the wanted level
- from three stars, expected police roadblocks per km (12 s each)

It's for fun. Please don't drive like this.

## Data sources

- Map tiles: © OpenStreetMap contributors, © CARTO
- Routing: [OSRM](https://project-osrm.org) public demo server
- Search: [Photon](https://photon.komoot.io) by komoot

These are free public services with fair-use limits, which is fine for a hobby site.

## Development

```sh
npm install
npm run dev     # local dev server
npm test        # model tests
npm run build   # production build in dist/
```

Pushing to `main` builds and deploys to GitHub Pages via `.github/workflows/deploy.yml`.
