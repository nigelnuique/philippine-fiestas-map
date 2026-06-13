/**
 * Geocodes barangay fiesta records to municipality PSGC and builds a per-municipality index.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { resolveBarangayFiestaLocation, buildLookups } from "./lib/location-parser.js";
import {
  buildFiestaMunicipalityAliases,
  MANILA_FIESTA_SUBDISTRICT_PREFIX,
  MANILA_MAP_PSGC,
} from "./lib/fiesta-municipality-aliases.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const RAW_FILE = path.join(ROOT, "data", "processed", "festivals", "barangay-fiestas-raw.json");
const MUNI_INDEX = path.join(ROOT, "data", "processed", "boundaries", "municipalities-index.json");
const MANIFEST = path.join(ROOT, "data", "processed", "boundaries", "manifest.json");
const PSGC_RAW = path.join(ROOT, "data", "raw", "psgc2", "raw.json");
const OUT_FILE = path.join(ROOT, "data", "processed", "festivals", "barangay-fiestas.json");

function applyMunicipalityAliases(byMunicipalityPsgc, aliases) {
  for (const [mapCode, fiestaCode] of Object.entries(aliases)) {
    const source = byMunicipalityPsgc[String(fiestaCode)];
    if (source?.length && !byMunicipalityPsgc[mapCode]) {
      byMunicipalityPsgc[mapCode] = source;
    }
  }

  const manilaKey = String(MANILA_MAP_PSGC);
  if (!byMunicipalityPsgc[manilaKey]) {
    const merged = [];
    const seen = new Set();
    for (const [key, list] of Object.entries(byMunicipalityPsgc)) {
      if (!key.startsWith(MANILA_FIESTA_SUBDISTRICT_PREFIX)) continue;
      for (const f of list) {
        if (seen.has(f.id)) continue;
        seen.add(f.id);
        merged.push(f);
      }
    }
    if (merged.length) byMunicipalityPsgc[manilaKey] = merged;
  }
}

function main() {
  for (const f of [RAW_FILE, MUNI_INDEX, MANIFEST]) {
    if (!fs.existsSync(f)) {
      console.error(`Missing: ${f}`);
      console.error("Run: npm run data:fetch-barangay-fiestas");
      process.exit(1);
    }
  }

  const raw = JSON.parse(fs.readFileSync(RAW_FILE, "utf8"));
  const muniIndex = JSON.parse(fs.readFileSync(MUNI_INDEX, "utf8"));
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  const psgcRaw = JSON.parse(fs.readFileSync(PSGC_RAW, "utf8"));
  const lookups = buildLookups(muniIndex, manifest);

  const byMunicipalityPsgc = {};
  let matched = 0;
  let unmatched = 0;
  let withDates = 0;

  for (const f of raw.festivals) {
    const location = resolveBarangayFiestaLocation(f, lookups);
    const muniPsgc = location.psgc ?? null;

    const record = {
      id: f.id,
      name: f.name,
      type: f.type,
      source: f.source,
      barangayPsgc: f.barangayPsgc,
      barangayName: f.locationText?.split(",")[0]?.trim() ?? null,
      ...(f.month ? { month: f.month } : {}),
      ...(f.dayStart ? { dayStart: f.dayStart } : {}),
      ...(f.dayEnd ? { dayEnd: f.dayEnd } : {}),
      ...(f.datePrecision ? { datePrecision: f.datePrecision } : {}),
      ...(f.dateSource ? { dateSource: f.dateSource } : {}),
      ...(f.patronSaint ? { patronSaint: f.patronSaint } : {}),
      location: {
        text: f.locationText,
        municipality: location.municipality ?? f.municipality,
        province: location.province ?? f.province,
        psgc: muniPsgc,
        provincePsgc: location.provincePsgc,
        regionPsgc: location.regionPsgc,
        matchMethod: location.matchMethod,
        confidence: location.confidence,
      },
    };

    if (record.month && (record.dayStart || record.datePrecision === "month")) {
      withDates++;
    }

    if (muniPsgc) {
      matched++;
      const key = String(muniPsgc);
      if (!byMunicipalityPsgc[key]) byMunicipalityPsgc[key] = [];
      byMunicipalityPsgc[key].push(record);
    } else {
      unmatched++;
    }
  }

  const municipalityAliases = buildFiestaMunicipalityAliases(muniIndex, psgcRaw);
  applyMunicipalityAliases(byMunicipalityPsgc, municipalityAliases);

  const output = {
    generatedAt: new Date().toISOString(),
    stats: {
      total: raw.festivals.length,
      matchedMunicipality: matched,
      unmatched,
      municipalitiesWithBarangays: Object.keys(byMunicipalityPsgc).length,
      withDates,
    },
    municipalityAliases,
    byMunicipalityPsgc,
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(output));

  console.log(`Barangay fiestas index written to ${path.relative(ROOT, OUT_FILE)}`);
  console.log(`  Total barangay fiestas: ${output.stats.total}`);
  console.log(`  Matched to municipality: ${matched}`);
  console.log(`  Municipalities covered: ${output.stats.municipalitiesWithBarangays}`);
  console.log(`  With feast dates: ${withDates}`);
}

main();
