/**
 * Backfills barangay GeoJSON for HUC cities missing from philippines-json-maps.
 * Source: altcoder PH_Adm4_BgySubMuns shapefile with PSGC code remapping.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import AdmZip from "adm-zip";
import { open as openShapefile } from "shapefile";
import simplify from "@turf/simplify";
import proj4 from "proj4";
import {
  adm3ToPsgc9,
  normalizeBarangayName,
  psgc9ToAdm4,
  psgcToAdmCodes,
} from "./lib/psgc-adm.js";
import {
  BARANGAY_SHAPE_ALIASES_BY_ADM3,
  listAllHucBarangayConfigs,
  listHucBarangayBackfillTargets,
} from "./lib/huc-barangay-sources.js";

const UTM51 = "EPSG:32651";
const WGS84 = "EPSG:4326";
proj4.defs(UTM51, "+proj=utm +zone=51 +datum=WGS84 +units=m +no_defs");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const PSGC_RAW = path.join(ROOT, "data", "raw", "psgc2", "raw.json");
const RAW_MAPS = path.join(
  ROOT,
  "data",
  "raw",
  "philippines-json-maps",
  "2023",
  "geojson",
  "municities",
  "lowres"
);
const PROCESSED_OUT = path.join(ROOT, "data", "processed", "boundaries", "huc-barangays");
const REBUILD_ALL = process.env.REBUILD_ALL === "1";

const SHAPE_ZIP_URL =
  "https://media.githubusercontent.com/media/altcoder/philippines-psgc-shapefiles/main/dist/PH_Adm4_BgySubMuns.shp.zip";
const SHAPE_CACHE = path.join(ROOT, "data", "raw", "altcoder", "PH_Adm4_BgySubMuns.shp.zip");
const SHAPE_EXTRACT = path.join(ROOT, "data", "raw", "altcoder", "PH_Adm4_BgySubMuns");
const CSV_URL =
  "https://raw.githubusercontent.com/altcoder/philippines-psgc-shapefiles/main/dist/PH_Adm4_BgySubMuns.csv";
const CSV_CACHE = path.join(ROOT, "data", "raw", "altcoder", "PH_Adm4_BgySubMuns.csv");

async function downloadFile(url, dest) {
  if (fs.existsSync(dest)) return;
  console.log(`  Downloading ${path.basename(dest)}…`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${url}: ${res.status}`);
  await pipeline(res.body, createWriteStream(dest));
}

async function loadCsvMeta() {
  await downloadFile(CSV_URL, CSV_CACHE);
  const text = fs.readFileSync(CSV_CACHE, "utf8");
  const byAdm4 = new Map();
  for (const line of text.split("\n").slice(1)) {
    if (!line.trim()) continue;
    const [adm1, adm2, adm3, adm4, adm4En, geoLevel, lenCrs, areaCrs, lenKm, areaKm2] =
      line.split(",");
    byAdm4.set(Number(adm4), {
      adm4_en: adm4En,
      geo_level: geoLevel,
      len_crs: Number(lenCrs),
      area_crs: Number(areaCrs),
      len_km: Number(lenKm),
      area_km2: Number(areaKm2),
      adm1_psgc: Number(adm1),
      adm2_psgc: Number(adm2),
      adm3_psgc: Number(adm3),
    });
  }
  return byAdm4;
}

function findShapefilePath() {
  if (!fs.existsSync(SHAPE_EXTRACT)) return null;
  for (const name of fs.readdirSync(SHAPE_EXTRACT)) {
    if (/^PH_Adm4_BgySubMuns.*\.shp$/i.test(name)) {
      return path.join(SHAPE_EXTRACT, name);
    }
  }
  return null;
}

function extractShapefile() {
  const existing = findShapefilePath();
  if (existing) return existing;
  console.log("  Extracting shapefile (this may take a minute)…");
  fs.mkdirSync(SHAPE_EXTRACT, { recursive: true });
  const zip = new AdmZip(SHAPE_CACHE);
  zip.extractAllTo(SHAPE_EXTRACT, true);
  const shpPath = findShapefilePath();
  if (!shpPath) throw new Error("PH_Adm4_BgySubMuns shapefile not found after extract");
  return shpPath;
}

function loadPsgcBarangays(cityCode9) {
  const raw = JSON.parse(fs.readFileSync(PSGC_RAW, "utf8"));
  let inCity = false;
  const barangays = [];
  for (const row of raw) {
    if (row.interLevel === "City" && row.code === cityCode9) {
      inCity = true;
      continue;
    }
    if (inCity && (row.interLevel === "City" || row.interLevel === "Mun")) break;
    if (inCity && row.interLevel === "Bgy") {
      barangays.push({
        code9: row.code,
        name: row.name,
        adm4: psgc9ToAdm4(row.code),
      });
    }
  }
  return barangays;
}

function reprojectCoord([x, y]) {
  const [lon, lat] = proj4(UTM51, WGS84, [x, y]);
  return [lon, lat];
}

function reprojectGeometry(geometry) {
  if (!geometry) return geometry;
  if (geometry.type === "Polygon") {
    return {
      type: "Polygon",
      coordinates: geometry.coordinates.map((ring) =>
        ring.map((c) => reprojectCoord(c))
      ),
    };
  }
  if (geometry.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: geometry.coordinates.map((poly) =>
        poly.map((ring) => ring.map((c) => reprojectCoord(c)))
      ),
    };
  }
  return geometry;
}

function simplifyFeature(feature, tolerance = 0.0005) {
  try {
    return simplify(feature, { tolerance, highQuality: false });
  } catch {
    return feature;
  }
}

function featureLooksProjected(feature) {
  const sample = feature?.geometry?.coordinates?.[0]?.[0];
  return Array.isArray(sample) && (Math.abs(sample[0]) > 180 || Math.abs(sample[1]) > 90);
}

function existingFileValid(outPath) {
  if (!fs.existsSync(outPath)) return false;
  const existing = JSON.parse(fs.readFileSync(outPath, "utf8"));
  if (!existing.features?.length) return false;
  return !featureLooksProjected(existing.features[0]);
}

async function indexShapefileFeatures() {
  const shpPath = extractShapefile();
  const source = await openShapefile(shpPath);
  const byAdm3 = new Map();
  const byAdm2 = new Map();
  let total = 0;

  let result = await source.read();
  while (!result.done) {
    const f = result.value;
    if (f.geometry) {
      const adm2 = Number(f.properties?.adm2_psgc ?? f.properties?.ADM2_PSGC);
      const adm3 = Number(f.properties?.adm3_psgc ?? f.properties?.ADM3_PSGC);
      if (adm3) {
        if (!byAdm3.has(adm3)) byAdm3.set(adm3, []);
        byAdm3.get(adm3).push(f);
      }
      if (adm2) {
        if (!byAdm2.has(adm2)) byAdm2.set(adm2, []);
        byAdm2.get(adm2).push(f);
      }
      total++;
    }
    result = await source.read();
  }

  console.log(`  Indexed ${total} barangay polygons from shapefile`);
  return { byAdm3, byAdm2 };
}

function shapeLookupKey(psgcNorm, targetAdm3) {
  const aliases = BARANGAY_SHAPE_ALIASES_BY_ADM3[targetAdm3] ?? {};
  return aliases[psgcNorm] ?? psgcNorm;
}

function matchByName(sourceFeatures, psgcBarangays, targetAdm3) {
  const byNorm = new Map();
  for (const f of sourceFeatures) {
    const name = f.properties?.adm4_en ?? f.properties?.ADM4_EN;
    if (name) byNorm.set(normalizeBarangayName(name), f);
  }

  const matched = [];
  const missing = [];
  const usedShapes = new Set();

  for (const bgy of psgcBarangays) {
    const psgcNorm = normalizeBarangayName(bgy.name);
    const lookup = shapeLookupKey(psgcNorm, targetAdm3);
    const shape = byNorm.get(lookup);
    if (shape && !usedShapes.has(shape)) {
      usedShapes.add(shape);
      matched.push({ bgy, shape });
    } else {
      missing.push(bgy.name);
    }
  }
  return { matched, missing };
}

function buildMunicipalityFile(config, sourceFeatures, csvMeta) {
  const rawCode = adm3ToPsgc9(config.targetAdm3);
  const barangays = loadPsgcBarangays(rawCode);
  if (!barangays.length) {
    throw new Error(`No PSGC barangays for ${config.cityName} (${rawCode})`);
  }

  const { matched, missing } = matchByName(
    sourceFeatures,
    barangays,
    config.targetAdm3
  );
  if (missing.length) {
    console.warn(
      `  ${config.cityName}: ${missing.length} unmatched (${missing.slice(0, 5).join(", ")}${missing.length > 5 ? "…" : ""})`
    );
  }

  const { adm1, adm2, adm3 } = psgcToAdmCodes(rawCode);
  const features = matched.map(({ bgy, shape }) => {
    const sourceAdm4 = Number(shape.properties?.adm4_psgc ?? shape.properties?.ADM4_PSGC);
    const meta = csvMeta.get(sourceAdm4) ?? {};
    const feature = {
      type: "Feature",
      id: bgy.adm4,
      geometry: reprojectGeometry(shape.geometry),
      properties: {
        adm1_psgc: adm1,
        adm2_psgc: adm2,
        adm3_psgc: adm3,
        adm4_psgc: bgy.adm4,
        adm4_en: bgy.name,
        geo_level: "Bgy",
        len_crs: meta.len_crs ?? 0,
        area_crs: meta.area_crs ?? 0,
        len_km: meta.len_km ?? 0,
        area_km2: meta.area_km2 ?? 0,
      },
    };
    return simplifyFeature(feature);
  });

  features.sort((a, b) => a.properties.adm4_psgc - b.properties.adm4_psgc);

  const fileName = `bgysubmuns-municity-${config.targetAdm3}.0.001.json`;
  const payload = JSON.stringify({ type: "FeatureCollection", features });
  const processedFile = path.join(PROCESSED_OUT, fileName);
  const rawMapsFile = path.join(RAW_MAPS, fileName);
  fs.mkdirSync(PROCESSED_OUT, { recursive: true });
  fs.mkdirSync(RAW_MAPS, { recursive: true });
  fs.writeFileSync(processedFile, payload);
  fs.writeFileSync(rawMapsFile, payload);

  console.log(
    `  ${config.cityName}: ${features.length}/${barangays.length} barangays → ${path.relative(ROOT, processedFile)}`
  );
  return features.length;
}

async function main() {
  if (!fs.existsSync(PSGC_RAW)) {
    console.error("Missing PSGC data. Run: npm run data:fetch-psgc");
    process.exit(1);
  }

  const allHucs = listAllHucBarangayConfigs();
  const targets = REBUILD_ALL ? allHucs : listHucBarangayBackfillTargets();

  if (!targets.length) {
    console.log(
      `All ${allHucs.length} HUC cities have complete barangay GeoJSON. Use REBUILD_ALL=1 to force rebuild.`
    );
    return;
  }

  console.log(
    `HUC barangay boundary backfill (${targets.length}/${allHucs.length} cities${REBUILD_ALL ? ", full rebuild" : ""})`
  );
  await downloadFile(SHAPE_ZIP_URL, SHAPE_CACHE);
  const csvMeta = await loadCsvMeta();
  const { byAdm3, byAdm2 } = await indexShapefileFeatures();

  let total = 0;
  let built = 0;
  let skipped = 0;

  for (const config of targets) {
    const outPath = path.join(
      PROCESSED_OUT,
      `bgysubmuns-municity-${config.targetAdm3}.0.001.json`
    );
    if (!REBUILD_ALL && existingFileValid(outPath) && !config.needsBuild) {
      skipped++;
      continue;
    }

    const sourceFeatures = config.filterByAdm2
      ? byAdm2.get(config.sourceAdm2) ?? []
      : byAdm3.get(config.sourceAdm3) ?? [];

    if (!sourceFeatures.length) {
      console.warn(`  ${config.cityName}: no shapefile features for source`);
      continue;
    }

    try {
      total += await buildMunicipalityFile(config, sourceFeatures, csvMeta);
      built++;
    } catch (err) {
      console.error(`  ${config.cityName}: ${err.message}`);
    }
  }

  console.log(
    `Done. ${total} barangay features written across ${built} cities (${skipped} already valid).`
  );
  console.log("Run: npm run data:fetch-boundaries && npm run map:sync");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
