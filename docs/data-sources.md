# Data sources and provenance

This document describes **what data** the Philippine Fiestas Map uses, **where it comes from**, **how it was obtained**, and **what limitations** apply. For build scripts and file paths, see [data-pipeline.md](data-pipeline.md).

## Summary

| Layer | Records | Primary source | How obtained |
|-------|---------|----------------|--------------|
| Map boundaries (region → barangay) | ~42k barangays in ~1,640 municipalities | [philippines-json-maps](https://github.com/faeldon/philippines-json-maps) | `git clone` → indexed by `fetch-boundaries.js` |
| HUC city polygons | 32 highly urbanized cities | [geoBoundaries](https://www.geoboundaries.org/) PHL ADM3 | HTTP download on first pipeline run |
| HUC barangay polygons | All 33 highly urbanized cities (~4,400 barangays) | [altcoder/philippines-psgc-shapefiles](https://github.com/altcoder/philippines-psgc-shapefiles) ADM4 | `build-huc-barangay-boundaries.js` — shapefile + PSGC remapping |
| Admin names & PSGC codes | Full PH hierarchy | [xemasiv/psgc2](https://github.com/xemasiv/psgc2) | `git clone` → `fetch-psgc.js` |
| Named festivals | ~1,000+ | TPB, Wikipedia, curated seeds | Web scrape + manual curation |
| Barangay patron fiestas | ~42,044 | PSGC barangay list (psgc2) | Generated from `raw.json` hierarchy |
| Barangay fiesta dates | ~11% with dates | LGU schedules, patron-saint calendar, optional Wikipedia | Inference + curated imports (see below) |

The app code is MIT-licensed. **Each upstream dataset has its own license** — see [Attribution and licenses](#attribution-and-licenses).

---

## 1. Administrative boundary polygons

### 1.1 philippines-json-maps (primary)

| Item | Detail |
|------|--------|
| **Repository** | [faeldon/philippines-json-maps](https://github.com/faeldon/philippines-json-maps) |
| **License** | MIT |
| **PSGC vintage** | December 2023 |
| **What we use** | Low-resolution GeoJSON for country, regions, provinces, municipalities, and barangays |
| **Property names** | `adm1_psgc` (region) through `adm4_psgc` (barangay) |

**How it was obtained**

1. Clone into `data/raw/philippines-json-maps` via `scripts/clone-sources.ps1` (or `.sh`).
2. `scripts/fetch-boundaries.js` scans `2023/geojson/` and builds indexes (`manifest.json`, `municipalities-index.json`, `barangays-index.json`).
3. `scripts/sync-map-boundaries.js` copies polygons to `public/geojson/` for the web app.

**Upstream lineage**

The shapefiles behind philippines-json-maps come from [altcoder/philippines-psgc-shapefiles](https://github.com/altcoder/philippines-psgc-shapefiles), which cleaned and matched [OCHA / PSA–NAMRIA COD](https://data.humdata.org/dataset/cod-ab-phl) administrative boundaries to PSGC. Polygons were simplified with [mapshaper](https://mapshaper.org/) to low / medium / high resolution GeoJSON.

**What the map shows**

- **Country view:** all provinces colored by region.
- **Region view:** provinces in that region.
- **Province view:** municipalities/cities in that province.
- **Municipality view:** barangay grid **only where** a `bgysubmuns-municity-*.json` file exists in the source (~1,640 municipalities).

### 1.2 geoBoundaries (HUC city patches)

| Item | Detail |
|------|--------|
| **Project** | [geoBoundaries](https://www.geoboundaries.org/) — William & Mary geoLab |
| **Dataset** | PHL ADM3 (municipality/city level), simplified GeoJSON |
| **License** | CC-BY 4.0 |
| **Cached at** | `data/raw/geoboundaries/PHL-ADM3_simplified.geojson` |

**Why it is needed**

Highly Urbanized Cities (HUCs) such as Cebu City, Mandaue, and Lapu-Lapu are often **omitted** from province-level municipality files in philippines-json-maps because they are administratively independent of their host province’s regular municipality list.

**How it was obtained**

`scripts/build-huc-boundaries.js`:

1. Lists HUCs from `psgc2/raw.json` where `cityClass === "HUC"`.
2. Downloads geoBoundaries ADM3 simplified GeoJSON (once).
3. Matches city names to polygons and writes `huc-cities.json` and `huc-by-province.json`.
4. Patches `municipalities-index.json` so HUCs appear under their host province.

At runtime, `loadMunicipalities()` in `src/lib/data.js` merges HUC features into the province municipality layer.

### 1.3 altcoder shapefiles (HUC barangay patches)

| Item | Detail |
|------|--------|
| **Repository** | [altcoder/philippines-psgc-shapefiles](https://github.com/altcoder/philippines-psgc-shapefiles) |
| **Dataset** | `PH_Adm4_BgySubMuns` (barangay level) |
| **License** | Follow upstream PSA/OCHA terms; shapefile distributed via GitHub |

**Why it is needed**

HUC cities generally have **no barangay GeoJSON** in philippines-json-maps. Without a patch, drill-down stops at the city outline.

**How it was obtained**

`scripts/build-huc-barangay-boundaries.js` (runs in `npm run data:fetch-boundaries`):

1. Detects all **33 HUC cities** missing from `barangays-index.json`.
2. Downloads `PH_Adm4_BgySubMuns.shp.zip` (~380 MB, cached under `data/raw/altcoder/`).
3. Maps each city to its altcoder ADM3 code via `PH_Adm3_MuniCities.csv` (Manila uses ADM2 district grouping).
4. Matches barangay polygons to PSGC names, remaps `adm4_psgc` to philippines-json-maps conventions.
5. Reprojects from UTM Zone 51 to WGS84, simplifies, and writes to `data/processed/boundaries/huc-barangays/`.

Re-run `npm run data:fetch-boundaries && npm run map:sync` after PSGC updates. A few barangays may remain unmatched where altcoder names diverge from PSGC (e.g. some Makati, Iligan, Angeles barangays).

---

## 2. Philippine Standard Geographic Code (PSGC)

### 2.1 psgc2

| Item | Detail |
|------|--------|
| **Repository** | [xemasiv/psgc2](https://github.com/xemasiv/psgc2) |
| **License** | CC-BY 4.0 |
| **Authority** | Derived from [Philippine Statistics Authority](https://psa.gov.ph/classification/psgc) PSGC publications |
| **What we use** | Region / province / municipality / barangay names, codes, populations, city class (HUC, CC, etc.) |

**How it was obtained**

1. Clone into `data/raw/psgc2` via `scripts/clone-sources.ps1`.
2. `scripts/fetch-psgc.js` builds `data/processed/psgc/admin-index.json` for pipeline use.
3. `scripts/fetch-barangay-fiestas.js` walks `raw.json` in hierarchy order to emit one patron fiesta stub per barangay.

**PSGC code formats in this project**

| Format | Example | Used in |
|--------|---------|---------|
| **PSA** (9-digit, leading `0`) | `072230000` | psgc2, barangay fiesta records |
| **ADM** (philippines-json-maps) | `702230000` | GeoJSON properties, map selection (most areas) |
| **NCR map ADM** (10-digit) | `1380300000` | Metro Manila GeoJSON; aliases to `317602000` fiesta index keys |

Conversion is implemented in `src/lib/psgc.js` (`psaToAdm`, `normalizePsgc`, `FIESTA_MUNICIPALITY_ALIASES`, `barangayPsgcMatches`).

---

## 3. Named festivals (~1,000+)

These are **distinct festival events** (Sinulog, Kadayawan, etc.), not the automatic per-barangay patron fiesta stubs.

### 3.1 Curated seed list

| Item | Detail |
|------|--------|
| **Location** | `SEED_FESTIVALS` in `scripts/fetch-festivals.js` |
| **How obtained** | Manual research and curation |
| **Contents** | Major national and regional festivals with structured location hints, months, and short descriptions |
| **Examples** | Sinulog, Ati-Atihan, Dinagyang, Black Nazarene, Pahiyas, MassKara |

### 3.2 Tourism Promotions Board (DOT/TPB) calendar

| Item | Detail |
|------|--------|
| **URL** | [tpb.gov.ph — Calendar of Philippine Festivals](https://tpb.gov.ph/tpb-calendar-of-promotions-and-marketing-activities/calendar-of-philippine-festivals-and-monthly-observances-theme/) |
| **How obtained** | HTML scrape with Cheerio in `scripts/fetch-festivals.js` |
| **Fields extracted** | Festival name, month/observance text, location text where present |
| **Caveats** | Page structure may change; re-run `npm run data:fetch-festivals` after DOT site updates |

### 3.3 Wikipedia — List of festivals in the Philippines

| Item | Detail |
|------|--------|
| **Page** | [List of festivals in the Philippines](https://en.wikipedia.org/wiki/List_of_festivals_in_the_Philippines) |
| **License** | CC-BY-SA 4.0 (Wikipedia content) |
| **How obtained** | MediaWiki API parse + table scrape in `scripts/fetch-wikipedia-festivals.js` |
| **Output** | Merged into `raw-festivals.json` during `fetch-festivals.js` |

### 3.4 Date and description enrichment

| Step | Script | Source | Method |
|------|--------|--------|--------|
| Local parse | `seed-enrichment-cache.js` | `dateVenueRaw` text, known festival lookup table | Regex + curated dates |
| Online dates | `enrich-festival-dates-online.js` | Wikipedia search API | Rate-limited fetch; cached in `date-enrichment-cache.json` |
| Online descriptions | `enrich-festival-descriptions-online.js` | Wikipedia extracts | Rate-limited fetch; cached in `description-enrichment-cache.json` |

Run full offline + online enrichment:

```powershell
npm run data:enrich
```

### 3.5 Geocoding festivals to the map

`scripts/build-dataset.js` joins each festival to PSGC municipality codes using:

1. **`scripts/lib/location-parser.js`** — parses `locationText`, province, municipality fields.
2. **`scripts/lib/location-overrides.js`** — manual aliases (HUC city names, spelling variants, province-wide events).
3. **`data/processed/boundaries/municipalities-index.json`** — authoritative municipality list per province.

Output: `data/processed/festivals/festivals.json` with `location.psgc`, `location.provincePsgc`, `location.regionPsgc`, and `location.confidence` (`high` / `medium` / `low`).

---

## 4. Barangay patron fiestas (~42,044)

Every barangay in the PSGC hierarchy gets **one patronal fiesta record** — the traditional barangay-level religious feast. This is separate from the named festival list above.

### 4.1 Generation

| Item | Detail |
|------|--------|
| **Script** | `scripts/fetch-barangay-fiestas.js` |
| **Input** | `data/raw/psgc2/raw.json` |
| **Output** | `barangay-fiestas-raw.json` → `build-barangay-fiestas.js` → `barangay-fiestas.json` |
| **Per record** | Barangay name, PSGC, municipality/province/region text, type `patron-saint` |

PSGC provides **names and codes**, not feast dates or patron saint names for most barangays.

### 4.2 Fiesta date backfill

`scripts/backfill-barangay-fiesta-dates.js` applies dates in priority order:

| Priority | Method | Source | `dateSource` field |
|----------|--------|--------|-------------------|
| 1 | Curated overrides + LGU schedules | `barangay-fiesta-date-overrides.js` (sparse), `lgu-fiesta-schedules/` | `lgu-magallanes-sorsogon`, `lgu-siargao-islands`, etc. |
| 2 | Wikipedia search cache | `scripts/enrich-barangay-fiesta-dates-online.js` | `wikipedia-search` |
| 3 | Patron-saint inference | `scripts/lib/patron-saint-calendar.js` | `patron-saint-calendar` |

**LGU schedule sources currently imported**

| Region / area | Source | URL |
|---------------|--------|-----|
| Siargao Islands, Surigao del Norte | Fiesta directory | [siargaoislands.net/p/fiesta.html](https://www.siargaoislands.net/p/fiesta.html) |
| Biliran Province | Island + travel calendars | [biliranisland.com/festivals](https://www.biliranisland.com/festivals/), [latagaw.com May guide](https://latagaw.com/complete-guide-month-of-may-fiesta-schedules-biliran-province/) |
| Dagupan City, Pangasinan | Official city calendar | [dagupan.gov.ph](https://www.dagupan.gov.ph/the-city/calendar-of-activities/) |
| Siquijor Province | Province-wide guide | [siquijor-secrets.com/siquijor-fiestas](https://siquijor-secrets.com/siquijor-fiestas/) |
| Magallanes, Sorsogon | LGU feast-day table (HTML parser) | [magallanessorsogon.gov.ph](https://magallanessorsogon.gov.ph) → `data/raw/lgu-schedules/magallanes-fiestas.html` |
| General Mariano Alvarez, Cavite | Official city page | [genmarianoalvarez.gov.ph/barangay-feast](https://genmarianoalvarez.gov.ph/barangay-feast/) |
| Santa Maria, Bulacan | CLUP fiesta celebrations table | [scribd.com/document/744110354/Comprehensive-Land-Use-Plan-of-Santa-Maria-2006-2015-1](https://www.scribd.com/document/744110354/Comprehensive-Land-Use-Plan-of-Santa-Maria-2006-2015-1) |
| Lagonoy, Camarines Sur | Barangay festivities list | [dahomlagonoy.weebly.com/dl-blogs/barangay-fiesta](https://dahomlagonoy.weebly.com/dl-blogs/barangay-fiesta) |
| San Pascual, Batangas | Municipal Tourism, Culture & The Arts Section schedule (public mirror) | [scribd.com/document/887672179/Barangay-Fiesta-2](https://www.scribd.com/document/887672179/Barangay-Fiesta-2) |
| San Vicente, Palawan | Municipal tourism / CLUP barangay fiesta table | [scribd.com/document/510524031/LA-SERENE](https://www.scribd.com/document/510524031/LA-SERENE) |
| Ubay, Bohol | Wikipedia barangay table with `Date of Fiesta` column | [en.wikipedia.org/wiki/Ubay,_Bohol#Barangays](https://en.wikipedia.org/wiki/Ubay,_Bohol#Barangays) |
| Masantol, Pampanga | Municipal Planning & Development Coordinator schedule (public mirror) | [scribd.com/document/995540556/Brgy-Fiesta](https://www.scribd.com/document/995540556/Brgy-Fiesta) |
| City of Malolos, Bulacan | 2023 Ecological Profile Table EcS-37 (Fiestas) | [scribd.com/document/846730135/Ecological-Profile-2023](https://www.scribd.com/document/846730135/Ecological-Profile-2023) |
| City of Malolos, Bulacan | 2023 Ecological Profile, Table EcS-37: Fiestas | [scribd.com/document/846730135/Ecological-Profile-2023](https://www.scribd.com/document/846730135/Ecological-Profile-2023) |
| Magsaysay, Balingoan, Balingasag, City of Gingoog, Kinoguitan, Sugbongcogon, Salay, Lagonglong, Talisayan, and Medina, Misamis Oriental | 1st District barangay feast-date tables (public mirror) | [scribd.com/doc/270868638/Municipalities-Feast-Date-1st-District](https://www.scribd.com/doc/270868638/Municipalities-Feast-Date-1st-District) |
| Binuangan, Misamis Oriental | Our Lady of Lourdes Parish chapel feast-day pages | [binuanganparish.wordpress.com](https://binuanganparish.wordpress.com/) |
| Jasaan, Villanueva, Tagoloan, Opol, Lugait, and City of El Salvador, Misamis Oriental | 2nd District barangay feast-date tables (public mirror) | [scribd.com/doc/270867869/Municipalities-Feast-Date-2nd-District](https://www.scribd.com/doc/270867869/Municipalities-Feast-Date-2nd-District) |

**Patron-saint calendar**

For barangays named after saints (e.g. San Roque, Santa Cruz), feast days are inferred from the Roman Catholic liturgical calendar in `patron-saint-calendar.js`. This is an **approximation** — actual barangay fiestas often fall on the nearest weekend, not always the canonical feast day.

**Coverage (approximate)**

- ~42,044 barangay fiesta records total
- ~11% have month/day after backfill
- Remaining records show name and location only until more LGU/parish data is added

Optional Wikipedia batch enrichment:

```powershell
LIMIT=200 npm run data:enrich-barangay-dates
npm run data:backfill-barangay-dates
```

---

## 5. What the map does *not* use

| Item | Notes |
|------|-------|
| **External map tiles** | The base map is a dark background + GeoJSON only; no Mapbox/Google/OSM tile API keys required |
| **Live APIs at runtime** | All festival and boundary data is static JSON served from `public/` |
| **Official PSA API** | PSGC is consumed from the psgc2 git snapshot, not a live PSA endpoint |
| **Parish registry** | No diocesan or CBCP patron-saint database (yet) |

---

## 6. Data quality and known gaps

| Gap | Impact |
|-----|--------|
| **HUC barangay name mismatches** | Makati, Iligan, Angeles, Olongapo have a few barangays unmatched in altcoder (~95% coverage overall) |
| **Manila** | Municipality polygon empty or missing in source; camera uses `CITY_MAP_FOCUS` fallback |
| **Barangay feast dates** | ~90% still undated; inference is approximate |
| **Festival geocoding** | Some Wikipedia/TPB entries lack precise municipality; `confidence` may be `low` |
| **Duplicate festival names** | Deduplication in `build-dataset.js` / `dedupe-festivals.js` may merge or drop near-duplicates |
| **Stale sources** | PSGC Dec 2023; boundary merges after 2023 may not be reflected until sources are refreshed |

Each festival record in `festivals.json` includes a `source` field (`seed`, `tpb`, `wikipedia`, etc.) and `location.confidence` where geocoded.

Barangay fiesta records include `dateSource` when a date is present, indicating how that date was derived.

---

## 7. Attribution and licenses

When publishing or redistributing this project or its data derivatives, credit the upstream sources:

| Data | Attribution |
|------|----------------|
| **philippines-json-maps** | [faeldon/philippines-json-maps](https://github.com/faeldon/philippines-json-maps) (MIT) |
| **PSGC / psgc2** | [xemasiv/psgc2](https://github.com/xemasiv/psgc2) (CC-BY 4.0); Philippine Statistics Authority |
| **geoBoundaries** | [geoBoundaries](https://www.geoboundaries.org/) (CC-BY 4.0) |
| **altcoder shapefiles** | [altcoder/philippines-psgc-shapefiles](https://github.com/altcoder/philippines-psgc-shapefiles); OCHA/PSA–NAMRIA COD |
| **Wikipedia content** | [Wikipedia](https://en.wikipedia.org/) contributors (CC-BY-SA 4.0) |
| **TPB / DOT calendar** | [Tourism Promotions Board](https://tpb.gov.ph/) — verify terms for commercial reuse |
| **LGU schedules** | Respective local government units and publishers cited in `scripts/lib/lgu-fiesta-schedules/` |

The web app sidebar footer shows an unofficial-use tagline, inline **Map** and **Fiestas** source links, expandable **Data sources & references** (full provenance list), and **Terms & disclaimers** (legal text derived from the same source list). Configure sources in `src/lib/attribution.js`, legal sections in `src/lib/disclaimers.js`, and layout in `src/components/DataAttribution.jsx`.

**App license:** MIT (see [LICENSE](../LICENSE)).

---

## 8. Refreshing upstream data

```powershell
# Update cloned sources
cd data/raw/philippines-json-maps && git pull
cd ../psgc2 && git pull
cd ../../..

# Rebuild processed data and sync for the app
npm run data:all
npm run map:sync
```

To add a new LGU fiesta schedule, extend `scripts/lib/lgu-fiesta-schedules/` or `barangay-fiesta-date-overrides.js`, then run `npm run data:backfill-barangay-dates`.

To add a named festival manually, add an entry to `SEED_FESTIVALS` in `scripts/fetch-festivals.js` (or edit `raw-festivals.json`) and run `npm run data:build`.

---

## Related documentation

| Document | Contents |
|----------|----------|
| [data-pipeline.md](data-pipeline.md) | Script reference, file paths, PSGC formats |
| [architecture.md](architecture.md) | How the app loads and displays this data |
| [map-interaction.md](map-interaction.md) | Drill-down rules and festival filtering |
| [README.md](../README.md) | Quick start and npm scripts |
