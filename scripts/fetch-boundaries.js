/**
 * Builds a boundary layer manifest from philippines-json-maps (cloned to data/raw/).
 * Does not copy GeoJSON (too large); manifest points at raw paths for the map app.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const RAW = path.join(ROOT, "data", "raw", "philippines-json-maps", "2023", "geojson");
const OUT = path.join(ROOT, "data", "processed", "boundaries");
const HUC_BGY_DIR = path.join(OUT, "huc-barangays");

const REGION_NAMES = {
  100000000: "Region I – Ilocos",
  200000000: "Region II – Cagayan Valley",
  300000000: "Region III – Central Luzon",
  400000000: "Region IV-A – CALABARZON",
  500000000: "Region V – Bicol",
  600000000: "Region VI – Western Visayas",
  700000000: "Region VII – Central Visayas",
  800000000: "Region VIII – Eastern Visayas",
  900000000: "Region IX – Zamboanga Peninsula",
  1000000000: "Region X – Northern Mindanao",
  1100000000: "Region XI – Davao",
  1200000000: "Region XII – SOCCSKSARGEN",
  1300000000: "Region XIII – Caraga",
  1400000000: "BARMM",
  1600000000: "NCR",
  1700000000: "CAR",
  1900000000: "MIMAROPA",
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort();
}

function readFeatureMeta(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const fc = JSON.parse(raw);
  if (!Array.isArray(fc.features)) {
    console.warn(`  Skipping ${path.basename(filePath)}: not a FeatureCollection`);
    return [];
  }
  return fc.features.map((f) => ({
    id: f.id ?? f.properties?.adm2_psgc ?? f.properties?.adm3_psgc,
    name:
      f.properties?.adm2_en ??
      f.properties?.adm3_en ??
      f.properties?.adm1_en ??
      "Unknown",
    geoLevel: f.properties?.geo_level,
    adm1Psgc: f.properties?.adm1_psgc,
    adm2Psgc: f.properties?.adm2_psgc,
    adm3Psgc: f.properties?.adm3_psgc,
  }));
}

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

function main() {
  if (!fs.existsSync(RAW)) {
    console.error(
      "Missing boundary source. Run: git clone https://github.com/faeldon/philippines-json-maps.git data/raw/philippines-json-maps"
    );
    process.exit(1);
  }

  ensureDir(OUT);

  const resolution = "lowres";
  const regionsDir = path.join(RAW, "regions", resolution);
  const provdistDir = path.join(RAW, "provdists", resolution);
  const countryFile = path.join(RAW, "country", resolution, "country.0.001.json");

  const regionFiles = listJsonFiles(regionsDir);
  const provinceLayers = [];
  const municipalitiesByProvince = {};

  for (const file of regionFiles) {
    const match = file.match(/provdists-region-(\d+)\./);
    if (!match) continue;
    const regionPsgc = Number(match[1]);
    const filePath = path.join(regionsDir, file);
    const features = readFeatureMeta(filePath);

    provinceLayers.push({
      regionPsgc,
      regionName: REGION_NAMES[regionPsgc] ?? `Region ${regionPsgc}`,
      file: rel(filePath),
      featureCount: features.length,
      provinces: features.map((f) => ({
        psgc: f.adm2Psgc,
        name: f.name,
      })),
    });
  }

  const municitiesDir = path.join(RAW, "municities", resolution);
  const barangaysByMunicipality = {};

  function indexBarangayFile(filePath, municipalityPsgc) {
    const raw = fs.readFileSync(filePath, "utf8");
    let fc;
    try {
      fc = JSON.parse(raw);
    } catch {
      return;
    }
    if (!Array.isArray(fc.features)) return;

    const barangays = fc.features
      .filter((f) => f.geometry)
      .map((f) => ({
        psgc: f.properties?.adm4_psgc,
        name: f.properties?.adm4_en ?? "Barangay",
      }))
      .filter((b) => b.psgc);

    if (!barangays.length) return;

    barangaysByMunicipality[municipalityPsgc] = {
      municipalityPsgc,
      file: rel(filePath),
      featureCount: barangays.length,
      barangays,
    };
  }

  for (const file of listJsonFiles(municitiesDir)) {
    const match = file.match(/bgysubmuns-municity-(\d+)\./);
    if (!match) continue;
    indexBarangayFile(path.join(municitiesDir, file), Number(match[1]));
  }

  for (const file of listJsonFiles(HUC_BGY_DIR)) {
    const match = file.match(/bgysubmuns-municity-(\d+)\./);
    if (!match) continue;
    // HUC backfill polygons override incomplete philippines-json-maps barangay layers.
    indexBarangayFile(path.join(HUC_BGY_DIR, file), Number(match[1]));
  }

  const muniFiles = listJsonFiles(provdistDir);
  for (const file of muniFiles) {
    const match = file.match(/municities-provdist-(\d+)\./);
    if (!match) continue;
    const provincePsgc = Number(match[1]);
    const filePath = path.join(provdistDir, file);
    const features = readFeatureMeta(filePath);

    municipalitiesByProvince[provincePsgc] = {
      provincePsgc,
      file: rel(filePath),
      featureCount: features.length,
      municipalities: features.map((f) => ({
        psgc: f.adm3Psgc,
        name: f.name,
        adm1Psgc: f.adm1Psgc,
        adm2Psgc: f.adm2Psgc,
      })),
    };
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: "faeldon/philippines-json-maps (PSGC Dec 2023)",
    resolution,
    country: fs.existsSync(countryFile)
      ? { file: rel(countryFile) }
      : null,
    regions: Object.entries(REGION_NAMES).map(([psgc, name]) => ({
      psgc: Number(psgc),
      name,
      provinceLayer: provinceLayers.find((l) => l.regionPsgc === Number(psgc)) ?? null,
    })),
    provinceLayers,
    municipalityLayerCount: Object.keys(municipalitiesByProvince).length,
    barangayLayerCount: Object.keys(barangaysByMunicipality).length,
  };

  fs.writeFileSync(
    path.join(OUT, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );
  fs.writeFileSync(
    path.join(OUT, "municipalities-index.json"),
    JSON.stringify(municipalitiesByProvince, null, 2)
  );
  fs.writeFileSync(
    path.join(OUT, "barangays-index.json"),
    JSON.stringify(barangaysByMunicipality, null, 2)
  );

  const totalMuni = Object.values(municipalitiesByProvince).reduce(
    (sum, p) => sum + p.featureCount,
    0
  );
  const totalBgy = Object.values(barangaysByMunicipality).reduce(
    (sum, m) => sum + m.featureCount,
    0
  );

  console.log(`Boundary manifest written to ${rel(path.join(OUT, "manifest.json"))}`);
  console.log(`  Regions: ${manifest.regions.length}`);
  console.log(`  Province layers: ${provinceLayers.length}`);
  console.log(`  Municipality layers: ${manifest.municipalityLayerCount}`);
  console.log(`  Total municipalities/cities indexed: ${totalMuni}`);
  console.log(`  Barangay layers: ${manifest.barangayLayerCount}`);
  console.log(`  Total barangays indexed: ${totalBgy}`);
}

main();
