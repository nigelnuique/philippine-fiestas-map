/**
 * Lists municipalities/cities missing barangay GeoJSON layers.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const PSGC_RAW = path.join(ROOT, "data", "raw", "psgc2", "raw.json");
const CITIES = path.join(ROOT, "data", "raw", "psgc2", "cities.json");
const MUNI_INDEX = path.join(ROOT, "data", "processed", "boundaries", "municipalities-index.json");
const BGY_DIR = path.join(
  ROOT,
  "data",
  "raw",
  "philippines-json-maps",
  "2023",
  "geojson",
  "municities",
  "lowres",
  "barangays"
);
const HUC_BGY_DIR = path.join(ROOT, "data", "processed", "boundaries", "huc-barangays");

function psaToAdm9(code9) {
  const s = String(code9).padStart(9, "0");
  return `${s[1]}${s[0]}${s.slice(2)}`;
}

function hasBarangayFile(adm3) {
  const adm = String(adm3).padStart(9, "0");
  const file = `bgysubmuns-municity-${adm}.0.001.json`;
  return (
    fs.existsSync(path.join(BGY_DIR, file)) || fs.existsSync(path.join(HUC_BGY_DIR, file))
  );
}

function countBarangaysByMuni() {
  const raw = JSON.parse(fs.readFileSync(PSGC_RAW, "utf8"));
  const counts = {};
  let current = null;
  for (const row of raw) {
    if (row.interLevel === "Mun" || row.interLevel === "City") {
      current = row.code;
      counts[current] = 0;
    } else if (row.interLevel === "Bgy" && current) {
      counts[current]++;
    }
  }
  return counts;
}

function main() {
  const cities = JSON.parse(fs.readFileSync(CITIES, "utf8"));
  const muniIndex = JSON.parse(fs.readFileSync(MUNI_INDEX, "utf8"));
  const bgyCounts = countBarangaysByMuni();

  const hucs = cities.filter((c) => c.cityClass === "HUC");
  const missingHuc = [];

  for (const h of hucs) {
    const adm = psaToAdm9(h.code);
    if (!hasBarangayFile(adm) && (bgyCounts[h.code] ?? 0) > 0) {
      missingHuc.push({
        name: h.name,
        psgc: h.code,
        adm3: Number(adm),
        barangays: bgyCounts[h.code],
      });
    }
  }

  missingHuc.sort((a, b) => b.barangays - a.barangays);

  console.log(`HUC cities missing barangay GeoJSON: ${missingHuc.length}`);
  for (const x of missingHuc) {
    console.log(`  ${x.adm3}  ${x.name}  (${x.barangays} barangays)`);
  }

  const municipalities = muniIndex.municipalities ?? muniIndex;
  let missingRegular = 0;
  const regularSamples = [];

  for (const [adm, info] of Object.entries(municipalities)) {
    if (!info?.name) continue;
    if (!hasBarangayFile(adm)) {
      missingRegular++;
      const code9 = `0${String(adm).charAt(0)}${String(adm).slice(2)}`;
      if (regularSamples.length < 20) {
        regularSamples.push({
          adm,
          name: info.name,
          province: info.provinceName,
          barangays: bgyCounts[code9] ?? "?",
        });
      }
    }
  }

  console.log(`\nAll municipalities missing barangay file: ${missingRegular}`);
  console.log("Samples:", regularSamples);
}

main();
