/**
 * Joins festival records to PSGC municipality codes using name matching.
 * Produces the main festivals index for the map app.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { resolveFestivalLocation, buildLookups } from "./lib/location-parser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const RAW_FESTIVALS = path.join(ROOT, "data", "processed", "festivals", "raw-festivals.json");
const MUNI_INDEX = path.join(ROOT, "data", "processed", "boundaries", "municipalities-index.json");
const MANIFEST = path.join(ROOT, "data", "processed", "boundaries", "manifest.json");
const OUT_FILE = path.join(ROOT, "data", "processed", "festivals", "festivals.json");

function main() {
  for (const f of [RAW_FESTIVALS, MUNI_INDEX, MANIFEST]) {
    if (!fs.existsSync(f)) {
      console.error(`Missing required file: ${f}`);
      console.error("Run: npm run data:all");
      process.exit(1);
    }
  }

  const raw = JSON.parse(fs.readFileSync(RAW_FESTIVALS, "utf8"));
  const muniIndex = JSON.parse(fs.readFileSync(MUNI_INDEX, "utf8"));
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));

  const lookups = buildLookups(muniIndex, manifest);
  const allRaw = [...raw.festivals.seed, ...raw.festivals.tpb];

  const festivals = allRaw.map((f, idx) => {
    const location = resolveFestivalLocation(f, lookups);
    return {
      id: f.id ?? `festival-${idx + 1}`,
      name: f.name,
      month: f.month ?? null,
      dayStart: f.dayStart ?? null,
      dayEnd: f.dayEnd ?? null,
      dateVenueRaw: f.dateVenueRaw ?? f.locationText ?? null,
      type: f.type ?? "festival",
      description: f.description ?? null,
      source: f.source,
      sourceUrl: f.sourceUrl ?? null,
      location: {
        text: f.locationText ?? f.dateVenueRaw ?? null,
        municipality: location.municipality,
        province: location.province,
        psgc: location.psgc,
        provincePsgc: location.provincePsgc,
        regionPsgc: location.regionPsgc,
        matchMethod: location.matchMethod,
        confidence: location.confidence,
      },
    };
  });

  const stats = {
    total: festivals.length,
    matchedMunicipality: festivals.filter((f) => f.location.psgc).length,
    matchedProvinceOnly: festivals.filter(
      (f) => !f.location.psgc && f.location.provincePsgc
    ).length,
    unmatched: festivals.filter(
      (f) => !f.location.psgc && !f.location.provincePsgc
    ).length,
    highConfidence: festivals.filter((f) => f.location.confidence === "high").length,
  };

  const output = {
    generatedAt: new Date().toISOString(),
    stats,
    festivals,
    byPsgc: Object.groupBy(
      festivals.filter((f) => f.location.psgc),
      (f) => String(f.location.psgc)
    ),
    byProvincePsgc: Object.groupBy(
      festivals.filter((f) => f.location.provincePsgc),
      (f) => String(f.location.provincePsgc)
    ),
    byRegionPsgc: Object.groupBy(
      festivals.filter((f) => f.location.regionPsgc),
      (f) => String(f.location.regionPsgc)
    ),
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));

  console.log(`Dataset written to ${path.relative(ROOT, OUT_FILE)}`);
  console.log(`  Total festivals: ${stats.total}`);
  console.log(`  Matched to municipality PSGC: ${stats.matchedMunicipality}`);
  console.log(`  Province-level only: ${stats.matchedProvinceOnly}`);
  console.log(`  High confidence: ${stats.highConfidence}`);
  console.log(`  Unmatched: ${stats.unmatched}`);
}

main();
