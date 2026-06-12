# Data pipeline

How raw sources become the JSON and GeoJSON files the map app consumes.

For **where data comes from, licenses, and how it was obtained**, see [data-sources.md](data-sources.md).

## Overview

```
data/raw/                          scripts/                         data/processed/
─────────────                      ────────                         ────────────────
philippines-json-maps/    ──►  fetch-boundaries.js              ──►  boundaries/manifest.json
  geojson/...                       build-huc-boundaries.js           municipalities-index.json
                                    build-huc-barangay-boundaries.js  barangays-index.json
                                                                      huc-cities.json
                                                                      huc-by-province.json
                                                                      huc-barangays/*.json

psgc2/                    ──►  fetch-psgc.js                    ──►  psgc/admin-index.json
                              fetch-barangay-fiestas.js        ──►  festivals/barangay-fiestas-raw.json
                              fetch-lgu-barangay-schedules-online
                              backfill-barangay-fiesta-dates.js

TPB + Wikipedia + seeds   ──►  fetch-festivals.js               ──►  festivals/raw-festivals.json
                              enrich-festival-dates-online           date-enrichment-cache.json

barangay raw              ──►  build-barangay-fiestas.js        ──►  festivals/barangay-fiestas.json

raw festivals + indexes   ──►  build-dataset.js           ──►  festivals/festivals.json

processed + raw geojson   ──►  sync-map-boundaries.js     ──►  public/geojson/
                                                                    public/data/processed/
```

Run the full pipeline:

```powershell
npm run data:all
```

Or step by step — see [npm scripts in README](../README.md#npm-scripts).

## Prerequisites

Clone raw sources (one-time, large download):

```powershell
.\scripts\clone-sources.ps1
```

This clones into `data/raw/`:

| Repo | Purpose |
|------|---------|
| `philippines-json-maps` | Admin boundary GeoJSON (PSGC Dec 2023) |
| `psgc2` | PSA PSGC codes, city classes, barangay patron fields |

HUC boundary shapes are downloaded automatically by `build-huc-boundaries.js` from geoBoundaries on first run.

HUC **barangay** shapes (where missing from philippines-json-maps) are built by `build-huc-barangay-boundaries.js` from altcoder ADM4 shapefiles — see [data-sources.md §1.3](data-sources.md#13-altcoder-shapefiles-huc-barangay-patches).

## Script reference

### `fetch-boundaries.js`

Scans `data/raw/philippines-json-maps/2023/geojson/` and writes:

| Output | Description |
|--------|-------------|
| `manifest.json` | Region list, province layer file paths, metadata |
| `municipalities-index.json` | Per-province municipality lists with PSGC codes |
| `barangays-index.json` | Per-municipality barangay lists (only where GeoJSON has geometry) |

The manifest stores **relative paths** into the raw repo; `sync-map-boundaries.js` copies the actual GeoJSON to `public/geojson/` preserving the same path structure.

### `build-huc-boundaries.js`

Highly Urbanized Cities (HUCs) like Cebu City, Mandaue, and Lapu-Lapu are missing from philippines-json-maps province municipality files. This script:

1. Reads HUC list from `psgc2/raw.json` (`cityClass === "HUC"`)
2. Matches shapes from geoBoundaries PHL ADM3 simplified GeoJSON
3. Writes `huc-cities.json` (FeatureCollection) and `huc-by-province.json` (lookup by host province)
4. Patches `municipalities-index.json` to include HUC entries

At runtime, `loadMunicipalities()` in `data.js` merges HUC features into the province municipality layer.

### `fetch-psgc.js`

Builds `data/processed/psgc/admin-index.json` — normalized admin hierarchy from psgc2 for pipeline scripts.

### `fetch-festivals.js`

Aggregates named festival records from:

- Curated seed list
- Tourism Promotions Board (TPB) calendar
- Optional Wikipedia scrape (`data:fetch-wikipedia-festivals`)

Output: `data/processed/festivals/raw-festivals.json`

### `seed-enrichment-cache.js`

Seeds `date-enrichment-cache.json` from well-known festival dates and local `dateVenueRaw` parsing — no network required. Run before online enrichment:

```powershell
npm run data:seed-enrichment
```

### `enrich-festival-dates-online.js`

Queries Wikipedia for festival dates not parsed from raw text. Results cached in `date-enrichment-cache.json` and applied during `data:build`. Rate-limited; use `DATE_ENRICH_LIMIT=50` for partial runs.

### `enrich-festival-descriptions-online.js`

Backfills missing festival descriptions from Wikipedia extracts. Cached in `description-enrichment-cache.json`. Use `DESC_ENRICH_LIMIT=50` for partial runs.

### `scripts/lib/location-overrides.js`

Manual city aliases, festival name → location hints, and region mappings used by `location-parser.js` to backfill geocoding gaps (HUC cities, spelling variants, province-wide events).

Full offline + online enrichment:

```powershell
npm run data:enrich
```

### `fetch-barangay-fiestas.js` + `build-barangay-fiestas.js`

Extracts one patron fiesta per barangay from the PSGC hierarchy (not feast dates). Output:

| File | Description |
|------|-------------|
| `barangay-fiestas.json` | Index keyed by municipality PSGC → array of barangay fiesta records |
| `barangay-fiestas-raw.json` | Intermediate raw extraction |

Barangay fiestas use **PSA PSGC codes** (9-digit). The app converts these to admin codes via `psaToAdm()` in `src/lib/psgc.js`.

### `backfill-barangay-fiesta-dates.js`

Adds month/day where possible (see [data-sources.md §4.2](data-sources.md#42-fiesta-date-backfill)):

1. Curated LGU overrides (`scripts/lib/barangay-fiesta-date-overrides.js`)
2. Imported LGU schedules (`scripts/lib/lgu-fiesta-schedules/` — Siargao, Biliran, etc.)
3. Patron-saint name inference (`scripts/lib/patron-saint-calendar.js`)
4. Optional Wikipedia cache (`data:enrich-barangay-dates` → `barangay-date-enrichment-cache.json`)

Runs automatically in `npm run data:all` after `fetch-barangay-fiestas`.

### `build-dataset.js`

Joins raw festivals to municipality PSGC codes using `scripts/lib/location-parser.js`:

1. Merges and deduplicates seed + TPB records
2. Resolves location strings to municipality/province/region PSGC
3. Parses and enriches dates
4. Writes `festivals.json` with `location.psgc`, `location.provincePsgc`, `location.regionPsgc`, and `confidence` fields

Festival schema: `data/schema/festival.schema.json`

### `sync-map-boundaries.js`

Copies files needed at runtime into `public/`:

| Source | Destination | Count |
|--------|-------------|-------|
| `raw/.../regions/lowres/*.json` | `public/geojson/regions/lowres/` | 17 |
| `raw/.../provdists/lowres/*.json` | `public/geojson/provdists/lowres/` | 88 |
| `raw/.../municities/lowres/bgysubmuns-*.json` | `public/geojson/municities/lowres/` | ~1,642 |
| `processed/boundaries/huc-barangays/*.json` | `public/geojson/municities/lowres/` (overrides) | 33 HUC cities |
| `data/processed/` | `public/data/processed/` | all JSON |

Runs automatically before `dev` and `build` via npm `predev` / `prebuild` hooks.

## Processed data files

### Boundaries (`data/processed/boundaries/`)

| File | Used by | Contents |
|------|---------|----------|
| `manifest.json` | App init | Region/province layer index |
| `municipalities-index.json` | Sidebar chips, festival geocoding | Municipality names + PSGC per province |
| `barangays-index.json` | Sidebar chips, barangay layer decision | Barangay names + PSGC per municipality |
| `huc-cities.json` | `loadMunicipalities()` | HUC polygon features |
| `huc-by-province.json` | `loadMunicipalities()` | Which HUC PSGCs belong to each province |
| `huc-barangays/*.json` | `loadBarangays()`, `barangays-index.json` | Barangay polygons for HUC cities |

### Festivals (`data/processed/festivals/`)

| File | Used by | Contents |
|------|---------|----------|
| `festivals.json` | Sidebar, festival index | ~1,000+ named festivals with PSGC joins |
| `barangay-fiestas.json` | Municipality/barangay festival lists | ~42,000 barangay patron fiestas |

## PSGC code formats

The codebase uses two related formats:

| Format | Example | Where used |
|--------|---------|------------|
| **ADM** (philippines-json-maps) | `702217000` | GeoJSON `adm*_psgc` properties, map selection |
| **PSA** (psgc2) | `072217000` | Barangay fiesta records, some raw festival data |

Conversion (`src/lib/psgc.js`):

```js
// PSA 072217000 → ADM 702217000
// Swap first two digits: [0][7]... → [7][0]...
psaToAdm("072217000") // → 702217000
```

Region codes use 9 trailing zeros (`700000000` = Region VII). Province codes use 5 trailing zeros. Municipality codes use 3 trailing zeros.

## Known gaps

| Gap | Impact | Workaround |
|-----|--------|------------|
| **HUC barangay name mismatches** | A few barangays missing in Makati, Iligan, Angeles, Olongapo (~95% HUC coverage) | Run `npm run data:analyze-missing-barangays`; add altcoder/name overrides |
| **Manila** empty geometry in source | No municipality polygon | `CITY_MAP_FOCUS` in `constants.js` for camera fallback |
| **Barangay feast dates** mostly missing | ~10% have dates after backfill; rest are name/location only | Add LGU schedules to `lgu-fiesta-schedules/` |
| **Festival location confidence** varies | Some festivals unmatched or low-confidence | `location.confidence` field in `festivals.json` |

To analyze barangay boundary gaps:

```powershell
npm run data:analyze-missing-barangays
```

## Refreshing data

```powershell
# Re-clone / pull latest sources
cd data/raw/philippines-json-maps && git pull
cd ../psgc2 && git pull

# Rebuild everything
cd ../../..
npm run data:all
npm run map:sync
```

To add a new named festival manually, edit the seed list in `scripts/fetch-festivals.js` (or the raw JSON) and run `npm run data:build`.

## Git tracking

| Tracked | Ignored |
|---------|---------|
| `data/processed/` | `data/raw/` |
| `data/schema/` | `public/geojson/` (generated) |
| Source code | `public/data/processed/` (generated copy) |

Processed JSON is committed so the app can run without cloning raw sources, but `map:sync` still requires `data/raw/philippines-json-maps` for GeoJSON polygons.
