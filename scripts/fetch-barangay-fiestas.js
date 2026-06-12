/**
 * Generates ~42,000 barangay-level patron fiesta records from PSA PSGC (psgc2/raw.json).
 * Each barangay traditionally has a patron-saint fiesta; dates are not in PSGC.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { slugify } from "./lib/slugify.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const RAW_PSGC = path.join(ROOT, "data", "raw", "psgc2", "raw.json");
const OUT = path.join(ROOT, "data", "processed", "festivals", "barangay-fiestas-raw.json");

function titleCase(name) {
  return String(name)
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function buildBarangayFiestasFromPsgc(rawEntries) {
  const festivals = [];
  let region = null;
  let province = null;
  let municipality = null;
  let municipalityCode = null;

  for (const entry of rawEntries) {
    const level = entry.interLevel;
    if (level === "Reg") {
      region = titleCase(entry.name.replace(/REGION\s+[^(]+\(?/i, "").replace(/\).*/, "").trim()) || entry.name;
      province = null;
      municipality = null;
      continue;
    }
    if (level === "Prov" || level === "Dist") {
      province = titleCase(entry.name);
      municipality = null;
      continue;
    }
    if (level === "Mun" || level === "City" || level === "SubMun") {
      municipality = titleCase(entry.name);
      municipalityCode = entry.code;
      continue;
    }
    if (level !== "Bgy" || !municipality || !province) continue;

    const barangayName = titleCase(entry.name);
    const locationText = `${barangayName}, ${municipality}, ${province}`;

    festivals.push({
      id: `bgy-${entry.code}`,
      name: `${barangayName} Fiesta`,
      locationText,
      municipality,
      province,
      region,
      barangayPsgc: entry.code,
      municipalityPsgcPsa: municipalityCode,
      type: "patron-saint",
      source: "psgc-barangay",
      description: `Barangay patronal fiesta for ${barangayName}, ${municipality}.`,
    });
  }

  return festivals;
}

function main() {
  if (!fs.existsSync(RAW_PSGC)) {
    console.error("Missing PSGC raw.json. Run: git clone https://github.com/xemasiv/psgc2.git data/raw/psgc2");
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(RAW_PSGC, "utf8"));
  const festivals = buildBarangayFiestasFromPsgc(raw);

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(
    OUT,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: "xemasiv/psgc2 raw.json (PSA PSGC 2018)",
        note: "One patronal fiesta per barangay. Feast dates are not in PSGC and are not included.",
        count: festivals.length,
        festivals,
      },
      null,
      2
    )
  );

  console.log(`Barangay fiestas written to ${path.relative(ROOT, OUT)}`);
  console.log(`  Count: ${festivals.length}`);
}

if (process.argv[1]?.endsWith("fetch-barangay-fiestas.js")) {
  main();
}
