# Philippine Fiestas Map

An exhaustive, zoomable map of Philippine fiestas and festivals. Click any administrative area to highlight it and see festivals in that region, province, or municipality.

**Status:** Data pipeline (v0.1) — map UI coming next.

## Quick start

```powershell
# 1. Install dependencies
npm install

# 2. Clone raw boundary + PSGC sources (~large download)
.\scripts\clone-sources.ps1

# 3. Build processed datasets
npm run data:all
```

## Data pipeline

| Script | Output |
|--------|--------|
| `npm run data:fetch-boundaries` | `data/processed/boundaries/manifest.json` — layer index for regions → provinces → municipalities |
| `npm run data:fetch-psgc` | `data/processed/psgc/admin-index.json` — LGU names and hierarchy |
| `npm run data:fetch-festivals` | `data/processed/festivals/raw-festivals.json` — TPB scrape + curated seeds |
| `npm run data:build` | `data/processed/festivals/festivals.json` — festivals joined to PSGC codes |

### Sources

- **Boundaries:** [faeldon/philippines-json-maps](https://github.com/faeldon/philippines-json-maps) (PSGC Dec 2023, GeoJSON)
- **Admin names:** [xemasiv/psgc2](https://github.com/xemasiv/psgc2) (PSA PSGC)
- **Festivals:** [Tourism Promotions Board calendar](https://tpb.gov.ph/tpb-calendar-of-promotions-and-marketing-activities/calendar-of-philippine-festivals-and-monthly-observances-theme/) + curated major festivals

### Map drill-down model

```
Country → Region (17) → Province (~81) → Municipality/City (~1,600)
```

Each polygon is identified by PSGC codes (`adm1_psgc`, `adm2_psgc`, `adm3_psgc`) from the boundary GeoJSON. Festival records are joined to these codes for click-to-filter.

## Project structure

```
data/
  processed/          # Built datasets (tracked in git)
  raw/                # Cloned source repos (gitignored, large)
  schema/             # JSON schemas
scripts/              # Data pipeline
```

## Roadmap

- [x] Repo + data pipeline
- [ ] MapLibre map UI with click-to-highlight
- [ ] Calendar view (same dataset, date filter)
- [ ] Municipal patron-saint fiesta coverage (crowdsource)
- [ ] Barangay-level depth

## License

MIT. Boundary data: see [philippines-json-maps](https://github.com/faeldon/philippines-json-maps) (MIT). PSGC data: CC-BY-4.0.
