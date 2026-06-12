# Architecture

This document describes how the Philippine Fiestas Map web app is structured: React components, MapLibre layers, selection state, and the supporting libraries.

## High-level overview

```
┌─────────────────────────────────────────────────────────────┐
│  App.jsx                                                    │
│  - Loads manifest, festivals, indexes on mount              │
│  - Owns `selection` state and `applyMapSelection()`         │
│  - Passes selection + handlers to children                  │
└───────────────┬─────────────────────────┬───────────────────┘
                │                         │
        ┌───────▼────────┐        ┌───────▼────────┐
        │  Sidebar.jsx   │        │  FiestaMap.jsx │
        │  Breadcrumb    │        │  MapLibre GL   │
        │  Area pickers  │        │  Layer sync    │
        │  Festival list │        │  Click/hover   │
        └───────┬────────┘        └───────┬────────┘
                │                         │
                └──────────┬──────────────┘
                           │
              ┌────────────▼────────────┐
              │  src/lib/               │
              │  data.js      loaders   │
              │  festivalIndex.js       │
              │  mapInteraction.js      │
              │  mapUtils.js            │
              │  mapStyle.js            │
              │  psgc.js                │
              └─────────────────────────┘
```

The app is a single-page React application with no backend. All boundary GeoJSON and festival JSON are served statically from `public/` after `npm run map:sync`. Upstream datasets, licenses, and acquisition methods are documented in [data-sources.md](data-sources.md).

## Selection model

A **selection** is a plain object describing the currently focused administrative area:

```js
{
  level: "region" | "province" | "municipality" | "barangay",
  regionPsgc: number,
  regionName: string,
  provincePsgc?: number,
  provinceName?: string,
  municipalityPsgc?: number,
  municipalityName?: string,
  barangayPsgc?: number,
  barangayName?: string,
  flyBounds?: [[lng, lat], [lng, lat]],  // optional precomputed bounds
  mapFocus?: { center: [lng, lat], zoom: number },  // fallback for cities without polygons
  festivalId?: string,  // set when navigating via festival click
}
```

`null` selection means country view (no area selected).

### `applyMapSelection(sel, { festivalId })`

Central handler in `App.jsx` for all navigation:

1. Increments a sequence counter to guard against async race conditions
2. Optionally resolves `flyBounds` via `resolveSelectionFlyBounds()` when not already provided
3. Updates React `selection` state and bumps `mapFlyTrigger` to force map camera sync

All paths converge here: map clicks, sidebar chips, breadcrumb, and festival card clicks.

## Map component (`FiestaMap.jsx`)

### Data sources (MapLibre)

| Source ID | Content | When loaded |
|-----------|---------|-------------|
| `provinces` | All province polygons (merged from 17 region files) | On map init |
| `municipalities` | Municipality/city polygons for current region or province | On region/province/municipality/barangay selection |
| `barangays` | Barangay polygons for current municipality | When municipality has barangay GeoJSON |

### Layer stack (bottom → top)

| Layer ID | Type | Purpose |
|----------|------|---------|
| `background` | background | Dark base color |
| `provinces-fill` / `provinces-line` | fill + line | Province boundaries (always visible) |
| `muni-fill` / `muni-line` | fill + line | Municipality boundaries (loaded on drill-down) |
| `bgy-fill` / `bgy-line` | fill + line | Barangay boundaries (loaded per municipality) |
| `highlight-fill` / `highlight-line` | fill + line | Province-level selection highlight |
| `muni-highlight-fill` / `muni-highlight-line` | fill + line | Municipality selection highlight |
| `bgy-highlight-fill` / `bgy-highlight-line` | fill + line | Barangay selection highlight |

Highlight layers sit on top so the selected area is always visible.

### `syncSelectionToMap(map)`

Runs whenever `selection` or `flyTrigger` changes:

1. Uses a generation counter (`syncGenRef`) so stale async work is discarded
2. **Country / null:** hides muni and barangay layers, clears highlights, flies to Philippines overview
3. **Region+:** loads municipality GeoJSON for the region (all provinces merged)
4. **Province+:** loads municipality GeoJSON for that province (includes HUC patches)
5. **Municipality/barangay:** loads barangay GeoJSON if `barangays-index.json` has `featureCount > 0`
6. Applies highlight paint properties and flies the camera

### Click and hover

- **Interactive layers:** `bgy-fill`, `muni-fill`, `provinces-fill` (only layers that are currently loaded/visible)
- **Deepest feature wins:** `pickDeepestFeature()` selects the most specific admin polygon under the cursor
- **Drill-down rules:** see [map-interaction.md](map-interaction.md)
- **Sea click:** clicking empty map clears selection (8px drag threshold distinguishes pan from click)
- **Hover:** feature-state `hover` toggles fill opacity on the active layer

## Sidebar (`Sidebar.jsx`)

- **Breadcrumb:** navigates up the hierarchy; Philippines crumb resets to country
- **Region picker:** shown at country level (17 regions)
- **Province chips:** shown at region and province levels
- **Municipality chips:** shown at province, municipality, and barangay levels
- **Barangay chips:** shown when barangay index has entries for the municipality
- **Festival list:** filtered via `festivalsForSelection()` — empty at country level; scoped to selection otherwise

## Library modules

### `data.js`

Client-side data loaders. Fetches from `/data/processed/` and `/geojson/`:

- `loadManifest()`, `loadFestivals()`, `loadMunicipalitiesIndex()`, `loadBarangaysIndex()`
- `loadAllProvinces(manifest)` — merges all province layer GeoJSON into one FeatureCollection
- `loadMunicipalities(provincePsgc)` — province muni file + HUC feature merge
- `loadMunicipalitiesForRegion(manifest, regionPsgc)` — all municipalities in a region
- `loadBarangays(municipalityPsgc)` — per-municipality barangay GeoJSON
- `resolveSelectionFlyBounds(selection)` — async bounds lookup for sidebar navigation

### `festivalIndex.js`

- `buildFestivalIndex(festivalData, manifest)` — indexes festivals by PSGC, province, and region
- `festivalsForSelection(index, selection, barangayFestivals)` — returns festivals for the current area
- `formatFestivalDate(f)` — human-readable date string

### `mapInteraction.js`

- `pickDeepestFeature(features)` — admin depth comparison (`adm4` > `adm3` > `adm2` > `adm1`)
- `selectionFromFeature(feature, manifest)` — build selection from a GeoJSON feature
- `selectionFromMapClick(feature, manifest, currentSelection)` — apply drill-down click rules
- `hasBarangayMap(barangaysIndex, municipalityPsgc)` — whether barangay GeoJSON exists

### `mapUtils.js`

- `boundsFromFeature()`, `mergeBounds()`, `boundsForSelection()` — camera fitting
- `selectionToFilter(selection)` — MapLibre filter expressions for highlight layers
- `selectionFromFestival()` — resolve a festival record to a map selection (including barangay level when boundaries exist)
- `findMunicipalityByName()`, `findMunicipalityByPsgc()` — name/PSGC lookup helpers

### `psgc.js`

Converts PSA 9-digit PSGC codes (used in barangay fiesta data) to philippines-json-maps admin codes:

```
PSA:  012802001  →  ADM: 102802001
      ^region digit swap in first two positions
```

### `mapStyle.js`

Shared MapLibre paint definitions for base fills, lines, and highlight overlays.

## Async safety

Two generation counters prevent stale updates during fast navigation:

| Counter | Location | Purpose |
|---------|----------|---------|
| `selectionSeqRef` | `App.jsx` | Ignore late `resolveSelectionFlyBounds` results |
| `syncGenRef` | `FiestaMap.jsx` | Cancel in-flight layer loads and camera moves |

## Build and deploy

```
npm run build
  → prebuild: map:sync (copy GeoJSON + JSON to public/)
  → vite build → dist/
```

The production bundle is static HTML/JS/CSS. Host `dist/` on any static file server. GeoJSON files in `public/geojson/` are large (~1,600+ municipality files); ensure your host serves them with gzip/brotli.

## Adding features

| Task | Where to start |
|------|----------------|
| New festival source | `scripts/fetch-festivals.js`, then `npm run data:build` |
| New map layer | `FiestaMap.jsx` layer stack + `syncSelectionToMap` |
| Change click behavior | `mapInteraction.js` → `selectionFromMapClick` |
| Change festival filtering | `festivalIndex.js` → `festivalsForSelection` |
| City without polygon | `constants.js` → `CITY_MAP_FOCUS` or HUC patch in `build-huc-boundaries.js` |
