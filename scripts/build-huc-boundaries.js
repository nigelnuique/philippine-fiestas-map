/**
 * Extracts highly urbanized city (HUC) polygons missing from philippines-json-maps
 * provdist files, using geoBoundaries ADM3 simplified GeoJSON.
 *
 * Outputs:
 * - data/processed/boundaries/huc-cities.json
 * - data/processed/boundaries/huc-by-province.json
 * Patches municipalities-index.json to include HUC cities in their host province.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const PSGC_RAW = path.join(ROOT, "data", "raw", "psgc2", "raw.json");
const PSGC_CITIES = path.join(ROOT, "data", "raw", "psgc2", "cities.json");
const MUNI_INDEX = path.join(ROOT, "data", "processed", "boundaries", "municipalities-index.json");
const MANIFEST = path.join(ROOT, "data", "processed", "boundaries", "manifest.json");
const GEO_CACHE = path.join(ROOT, "data", "raw", "geoboundaries", "PHL-ADM3_simplified.geojson");
const OUT_CITIES = path.join(ROOT, "data", "processed", "boundaries", "huc-cities.json");
const OUT_BY_PROV = path.join(ROOT, "data", "processed", "boundaries", "huc-by-province.json");

const GEO_URL =
  "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/PHL/ADM3/geoBoundaries-PHL-ADM3_simplified.geojson";

function normalizeName(name) {
  return String(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^city of\s+/i, "")
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s+city$/i, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** PSGC 9-digit (072219000) → philippines-json-maps adm codes (702219000). */
function psgcToAdmCodes(code) {
  const s = String(code).padStart(9, "0");
  return {
    adm1: Number(`${s[1]}${s[0]}0000000`),
    adm2: Number(`${s[1]}${s[0]}${s.slice(2, 4)}00000`),
    adm3: Number(`${s[1]}${s[0]}${s.slice(2)}`),
  };
}

async function loadGeoBoundaries() {
  if (!fs.existsSync(GEO_CACHE)) {
    console.log("  Downloading geoBoundaries PHL ADM3 (simplified)…");
    const res = await fetch(GEO_URL);
    if (!res.ok) throw new Error(`geoBoundaries download failed: ${res.status}`);
    const text = await res.text();
    fs.mkdirSync(path.dirname(GEO_CACHE), { recursive: true });
    fs.writeFileSync(GEO_CACHE, text);
  }
  return JSON.parse(fs.readFileSync(GEO_CACHE, "utf8"));
}

function buildProvinceNameMap(manifest) {
  const map = new Map();
  for (const region of manifest.regions) {
    for (const prov of region.provinceLayer?.provinces ?? []) {
      map.set(normalizeName(prov.name), prov.psgc);
    }
  }
  return map;
}

function findShapeFeature(shapeFeatures, cityName) {
  const target = normalizeName(cityName);
  const candidates = shapeFeatures.filter((f) => {
    const sn = normalizeName(f.properties.shapeName);
    return (
      sn === target ||
      sn === `${target} city` ||
      `${sn} city` === target ||
      sn.replace(/-/g, " ") === target.replace(/-/g, " ")
    );
  });
  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    return candidates.find((f) => /city/i.test(f.properties.shapeName)) ?? candidates[0];
  }
  for (const f of shapeFeatures) {
    const sn = normalizeName(f.properties.shapeName);
    if (sn.includes(target) || target.includes(sn)) return f;
  }
  return null;
}

async function main() {
  for (const f of [PSGC_RAW, PSGC_CITIES, MUNI_INDEX, MANIFEST]) {
    if (!fs.existsSync(f)) {
      console.error(`Missing ${f}. Run: npm run data:fetch-boundaries`);
      process.exit(1);
    }
  }

  const geo = await loadGeoBoundaries();
  const psgcRaw = JSON.parse(fs.readFileSync(PSGC_RAW, "utf8"));
  const psgcCities = JSON.parse(fs.readFileSync(PSGC_CITIES, "utf8"));
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  const muniIndex = JSON.parse(fs.readFileSync(MUNI_INDEX, "utf8"));

  const provinceByName = buildProvinceNameMap(manifest);
  const hucs = psgcRaw.filter((r) => r.interLevel === "City" && r.cityClass === "HUC");

  const psgcCityByNorm = new Map();
  for (const c of psgcCities) {
    psgcCityByNorm.set(normalizeName(c.name), c);
  }

  const features = [];
  const byProvince = {};
  const missing = [];

  for (const huc of hucs) {
    const { adm1: regionPsgc, adm2: provincePsgc, adm3: adm3Psgc } = psgcToAdmCodes(huc.code);

    const psgcCity = psgcCityByNorm.get(normalizeName(huc.name));
    const provinceName = psgcCity?.province ?? null;
    const hostProvincePsgc = provinceName
      ? provinceByName.get(normalizeName(provinceName)) ?? provincePsgc
      : provincePsgc;

    const shape = findShapeFeature(geo.features, huc.name);
    if (!shape) {
      missing.push(huc.name);
      continue;
    }

    const displayName = shape.properties.shapeName.replace(/\s+City$/i, " City");
    const feature = {
      type: "Feature",
      id: adm3Psgc,
      geometry: shape.geometry,
      properties: {
        adm1_psgc: regionPsgc,
        adm2_psgc: hostProvincePsgc,
        adm3_psgc: adm3Psgc,
        adm3_en: displayName,
        geo_level: "City",
        huc: true,
      },
    };

    features.push(feature);

    const provKey = String(hostProvincePsgc);
    if (!byProvince[provKey]) byProvince[provKey] = [];
    byProvince[provKey].push(adm3Psgc);

    const entry = muniIndex[provKey];
    if (entry) {
      const exists = entry.municipalities.some((m) => m.psgc === adm3Psgc);
      if (!exists) {
        entry.municipalities.push({
          psgc: adm3Psgc,
          name: displayName,
          adm1Psgc: regionPsgc,
          adm2Psgc: hostProvincePsgc,
          huc: true,
        });
        entry.municipalities.sort((a, b) => a.name.localeCompare(b.name));
        entry.featureCount = entry.municipalities.length;
      }
    }
  }

  fs.mkdirSync(path.dirname(OUT_CITIES), { recursive: true });
  fs.writeFileSync(
    OUT_CITIES,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: "geoBoundaries PHL ADM3 + PSGC HUC list",
        count: features.length,
        type: "FeatureCollection",
        features,
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    OUT_BY_PROV,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        byProvincePsgc: byProvince,
      },
      null,
      2
    )
  );
  fs.writeFileSync(MUNI_INDEX, JSON.stringify(muniIndex, null, 2));

  console.log(`HUC boundaries written to ${path.relative(ROOT, OUT_CITIES)}`);
  console.log(`  HUC cities: ${features.length}`);
  console.log(`  Provinces patched: ${Object.keys(byProvince).length}`);
  if (missing.length) {
    console.log(`  Missing shapes: ${missing.join(", ")}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
