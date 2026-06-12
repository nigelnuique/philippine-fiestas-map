/**
 * Joins festival records to PSGC municipality codes using name matching.
 * Produces the main festivals index for the map app.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { resolveFestivalLocation, buildLookups } from "./lib/location-parser.js";
import { mergeSeedAndTpb, dedupeFestivals } from "./lib/dedupe-festivals.js";
import { enrichFestivalDates } from "./lib/date-parser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATE_CACHE = path.join(ROOT, "data", "processed", "festivals", "date-enrichment-cache.json");
const DESC_CACHE = path.join(
  ROOT,
  "data",
  "processed",
  "festivals",
  "description-enrichment-cache.json"
);

function loadDateEnrichmentCache() {
  if (!fs.existsSync(DATE_CACHE)) return {};
  try {
    return JSON.parse(fs.readFileSync(DATE_CACHE, "utf8"));
  } catch {
    return {};
  }
}

function loadDescriptionEnrichmentCache() {
  if (!fs.existsSync(DESC_CACHE)) return {};
  try {
    return JSON.parse(fs.readFileSync(DESC_CACHE, "utf8"));
  } catch {
    return {};
  }
}

function applyDescriptionEnrichment(festival, descCache) {
  if (festival.description && festival.description.length >= 40) {
    return festival.description;
  }
  const cached = descCache[festival.id]?.description;
  return cached ?? festival.description ?? null;
}

function applyDateEnrichment(festival, dateCache) {
  let dates = enrichFestivalDates(festival);

  if (dates.dayStart == null && dateCache[festival.id]?.dayStart != null) {
    const online = dateCache[festival.id];
    dates = {
      month: festival.month ?? online.month,
      dayStart: online.dayStart,
      dayEnd: online.dayEnd ?? null,
      dateParseMethod: online.dateParseMethod ?? "wikipedia-online",
    };
  }

  if (dates.dayStart == null) {
    dates = enrichFestivalDates(festival, { monthFallback: true });
  }

  return dates;
}

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
  const { festivals: seedTpbMerged, mergedCount, mergedNames } = mergeSeedAndTpb(
    raw.festivals.seed,
    raw.festivals.tpb
  );

  if (mergedCount > 0) {
    console.log(`  Merged ${mergedCount} TPB duplicates into seed festivals:`);
    for (const name of mergedNames) {
      console.log(`    - ${name}`);
    }
  }

  const wikiFestivals = raw.festivals.wikipedia ?? [];
  const allRaw = [...seedTpbMerged, ...wikiFestivals];
  console.log(`  Named festivals to geocode: ${allRaw.length} (incl. ${wikiFestivals.length} from Wikipedia)`);

  const dateCache = loadDateEnrichmentCache();
  const descCache = loadDescriptionEnrichmentCache();
  const dateStats = { local: 0, online: 0, inferred: 0, existing: 0 };
  let descriptionsFromCache = 0;

  const geocoded = allRaw.map((f, idx) => {
    const location = resolveFestivalLocation(f, lookups);
    const dates = applyDateEnrichment(f, dateCache);
    const description = applyDescriptionEnrichment(f, descCache);
    if (description && !f.description) descriptionsFromCache++;

    if (f.dayStart != null) dateStats.existing++;
    else if (dates.dateParseMethod === "month-inferred") dateStats.inferred++;
    else if (dates.dateParseMethod?.includes("wikipedia") || dates.dateParseMethod === "known")
      dateStats.online++;
    else if (dates.dayStart != null) dateStats.local++;

    return {
      id: f.id ?? `festival-${idx + 1}`,
      name: f.name,
      month: dates.month ?? null,
      dayStart: dates.dayStart ?? null,
      dayEnd: dates.dayEnd ?? null,
      dateVenueRaw: f.dateVenueRaw ?? f.locationText ?? null,
      type: f.type ?? "festival",
      description,
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

  const { festivals, removed: deduped } = dedupeFestivals(geocoded);

  if (deduped.length > 0) {
    console.log(`  Removed ${deduped.length} duplicate festivals after geocoding:`);
    for (const row of deduped) {
      console.log(`    - ${row.name} (${row.removedId} → ${row.keptId})`);
    }
  }

  let barangayStats = null;
  const barangayIndexPath = path.join(ROOT, "data", "processed", "festivals", "barangay-fiestas.json");
  if (fs.existsSync(barangayIndexPath)) {
    try {
      barangayStats = JSON.parse(fs.readFileSync(barangayIndexPath, "utf8")).stats;
    } catch {
      /* ignore */
    }
  }

  const stats = {
    total: festivals.length,
    totalWithBarangay: festivals.length + (barangayStats?.total ?? 0),
    barangayFiestas: barangayStats?.total ?? 0,
    mergedFromTpb: mergedCount,
    deduplicated: deduped.length,
    wikipediaIncluded: wikiFestivals.length,
    matchedMunicipality: festivals.filter((f) => f.location.psgc).length,
    matchedProvinceOnly: festivals.filter(
      (f) => !f.location.psgc && f.location.provincePsgc
    ).length,
    unmatched: festivals.filter(
      (f) => !f.location.psgc && !f.location.provincePsgc
    ).length,
    highConfidence: festivals.filter((f) => f.location.confidence === "high").length,
    withDayStart: festivals.filter((f) => f.dayStart != null).length,
    withDescription: festivals.filter((f) => f.description && f.description.length >= 40).length,
    descriptionsFromCache,
    datesFromLocalParse: dateStats.local,
    datesFromOnline: dateStats.online,
    datesMonthInferred: dateStats.inferred,
    datesPreStructured: dateStats.existing,
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
  console.log(`  Named festivals: ${stats.total}`);
  if (stats.barangayFiestas) {
    console.log(`  Barangay fiestas (separate index): ${stats.barangayFiestas}`);
    console.log(`  Combined total: ${stats.totalWithBarangay}`);
  }
  console.log(`  Matched to municipality PSGC: ${stats.matchedMunicipality}`);
  console.log(`  Province-level only: ${stats.matchedProvinceOnly}`);
  console.log(`  High confidence: ${stats.highConfidence}`);
  console.log(`  Unmatched: ${stats.unmatched}`);
  console.log(`  With description: ${stats.withDescription}/${stats.total}`);
  if (stats.descriptionsFromCache) {
    console.log(`    From description cache: ${stats.descriptionsFromCache}`);
  }
  console.log(`  With structured day: ${stats.withDayStart}/${stats.total}`);
  console.log(`    Pre-structured (seeds): ${stats.datesPreStructured}`);
  console.log(`    Parsed from dateVenueRaw: ${stats.datesFromLocalParse}`);
  console.log(`    Wikipedia / known lookup: ${stats.datesFromOnline}`);
  console.log(`    Month-only inferred: ${stats.datesMonthInferred}`);
}

main();
