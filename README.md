# Philippine Fiestas Map

An interactive map of Philippine festivals and fiestas. Drill down from country → region → province → municipality → barangay, click festivals in the sidebar to fly to their location, and browse ~1,000 named festivals plus ~42,000 barangay patron fiestas.

**Stack:** Vite · React · MapLibre GL · PSGC-aligned GeoJSON boundaries

## Features

- **Five-level drill-down** on an admin-boundary map (region, province, municipality, barangay where data exists)
- **Festival sidebar** filtered by the current selection; breadcrumb and chip pickers for navigation
- **Click-to-explore** map interactions with sea-click to clear selection
- **HUC city patches** (Cebu City, Mandaue, Lapu-Lapu, etc.) merged from geoBoundaries where missing from source maps
- **Data pipeline** that joins festival records to PSGC codes for geospatial filtering

## Quick start

```powershell
# 1. Install dependencies
npm install

# 2. Clone raw boundary + PSGC sources (~large download)
.\scripts\clone-sources.ps1

# 3. Build processed datasets
npm run data:all

# 4. Run the map app (auto-syncs GeoJSON to public/)
npm run dev
```

Open http://localhost:5173

**Already have processed data in git?** You can skip steps 2–3 and run `npm run dev` directly if `data/raw/philippines-json-maps` exists (needed for `map:sync`).

### Linux / macOS

```bash
./scripts/clone-sources.sh
npm run data:all
npm run dev
```

## npm scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Development server (runs `map:sync` first) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm run map:sync` | Copy lowres GeoJSON + processed JSON into `public/` |
| `npm run data:all` | Full data pipeline (boundaries → PSGC → festivals → build) |
| `npm run data:fetch-boundaries` | Build boundary manifest + indexes; patch HUC cities |
| `npm run data:fetch-psgc` | Fetch PSA admin index from psgc2 |
| `npm run data:fetch-festivals` | Fetch TPB calendar + seed festival data |
| `npm run data:fetch-wikipedia-festivals` | Scrape Wikipedia festival list |
| `npm run data:fetch-barangay-fiestas` | Extract barangay patron fiestas from PSGC |
| `npm run data:fetch-lgu-barangay-schedules` | Scrape/cache LGU barangay fiesta schedules |
| `npm run data:backfill-barangay-dates` | Apply LGU, Wikipedia, and patron-saint dates |
| `npm run data:enrich-dates` | Online date enrichment for named festivals |
| `npm run data:enrich-barangay-dates` | Wikipedia batch lookup for barangay feast dates |
| `npm run data:build-barangay` | Build `barangay-fiestas.json` index |
| `npm run data:build` | Build final `festivals.json` with PSGC joins |
| `npm run data:analyze-missing-barangays` | Report municipalities missing barangay GeoJSON |
| `npm run check:go-live` | Pre-deploy sanity checks |
| `npm run check:e2e` | Map interaction smoke test (Playwright) |

See [docs/data-pipeline.md](docs/data-pipeline.md) for full pipeline details.

## Documentation

| Doc | Contents |
|-----|----------|
| [docs/data-sources.md](docs/data-sources.md) | **Data provenance** — sources, licenses, how each dataset was obtained |
| [docs/data-pipeline.md](docs/data-pipeline.md) | Scripts, data files, PSGC codes, known gaps |
| [docs/architecture.md](docs/architecture.md) | App structure, map layers, selection state, module reference |
| [docs/map-interaction.md](docs/map-interaction.md) | Click rules, navigation, festival filtering |

## Project structure

```
philippine-fiestas-map/
├── data/
│   ├── processed/          # Built datasets (tracked in git)
│   │   ├── boundaries/     # manifest, indexes, HUC city + barangay patches
│   │   └── festivals/      # festivals.json, barangay-fiestas.json
│   ├── raw/                # Cloned source repos (gitignored)
│   └── schema/             # JSON schemas
├── docs/                   # Architecture and pipeline documentation
├── public/
│   ├── geojson/            # Synced boundary polygons (gitignored, from map:sync)
│   └── data/processed/     # Synced JSON for the app
├── scripts/                # Data pipeline and boundary sync
└── src/
    ├── App.jsx             # Selection state, data loading
    ├── components/         # FiestaMap, Sidebar, ErrorBoundary
    └── lib/                # Data loaders, map utils, festival index
```

## Data sources

| Data | Source | License |
|------|--------|---------|
| Admin boundaries | [faeldon/philippines-json-maps](https://github.com/faeldon/philippines-json-maps) (PSGC Dec 2023) | MIT |
| HUC city polygons | [geoBoundaries](https://www.geoboundaries.org/) PHL ADM3 | CC-BY 4.0 |
| HUC barangay patches | [altcoder/philippines-psgc-shapefiles](https://github.com/altcoder/philippines-psgc-shapefiles) ADM4 | See upstream |
| Admin names / PSGC | [xemasiv/psgc2](https://github.com/xemasiv/psgc2) | CC-BY 4.0 |
| Named festivals | TPB calendar, Wikipedia, curated seeds | varies |
| Barangay fiestas | PSGC hierarchy + date backfill (LGU schedules, patron-saint calendar) | CC-BY 4.0 |

See **[docs/data-sources.md](docs/data-sources.md)** for full provenance: how each dataset was cloned, scraped, or inferred, plus coverage limits and attribution requirements.

## Administrative drill-down

```
Country → Region (17) → Province (~88) → Municipality/City (~1,600) → Barangay (~42,000)
```

Polygons use philippines-json-maps PSGC property names (`adm1_psgc` … `adm4_psgc`). Festival records are joined to municipality PSGC codes; barangay fiestas use PSA codes converted via `psaToAdm()`.

**Coverage notes:** Barangay polygons exist for ~1,640 municipalities plus 33 HUC cities (altcoder patches). A few HUC barangays and Manila still have gaps. See [docs/data-pipeline.md#known-gaps](docs/data-pipeline.md#known-gaps).

## Roadmap

- [x] Data pipeline with PSGC joins
- [x] MapLibre map with region → province → municipality drill-down
- [x] Barangay boundary drill-down (where GeoJSON exists)
- [x] HUC municipality boundary patches
- [x] Barangay patron fiesta stubs from PSGC (~42k)
- [ ] Calendar view (date filter on same dataset)
- [ ] Barangay feast dates and patron saint names (crowdsource / parish records)
- [x] Barangay polygons for HUC cities (altcoder ADM4 patches; ~95% coverage)
- [ ] Manila municipality polygon + remaining unmatched HUC barangays

## License

MIT. See individual data sources for boundary and PSGC licensing.
