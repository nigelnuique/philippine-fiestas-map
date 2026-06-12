/**
 * Seeds date/description enrichment caches from known lookups (no network).
 * Run before data:enrich-dates for faster, rate-limit-safe backfill.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { enrichFestivalDates } from "./lib/date-parser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const RAW_FESTIVALS = path.join(ROOT, "data", "processed", "festivals", "raw-festivals.json");
const DATE_CACHE = path.join(ROOT, "data", "processed", "festivals", "date-enrichment-cache.json");
const DESC_CACHE = path.join(
  ROOT,
  "data",
  "processed",
  "festivals",
  "description-enrichment-cache.json"
);

/** Mirrors KNOWN_DATES in enrich-festival-dates-online.js */
const KNOWN_DATES = {
  "masskara festival": { month: 10, dayStart: 19, dayEnd: 22, source: "known" },
  "kadayawan festival": { month: 8, dayStart: 10, dayEnd: 20, source: "known" },
  "higalaay festival": { month: 8, dayStart: 1, dayEnd: 31, source: "known" },
  "pintados-kasadyaan festival": { month: 6, dayStart: 29, dayEnd: 29, source: "known" },
  "lechon festival": { month: 6, dayStart: 24, dayEnd: 24, source: "known" },
  "sandugo festival": { month: 7, dayStart: 25, dayEnd: 25, source: "known" },
  "panagbenga festival": { month: 2, dayStart: 1, dayEnd: 28, source: "known" },
  "ati-atihan festival": { month: 1, dayStart: 15, dayEnd: 21, source: "known" },
  "dinagyang festival": { month: 1, dayStart: 22, dayEnd: 28, source: "known" },
  "moriones festival": { month: 4, dayStart: 1, dayEnd: 7, source: "known" },
  "pahiyas festival": { month: 5, dayStart: 15, dayEnd: 15, source: "known" },
  "giant lantern festival": { month: 12, dayStart: 14, dayEnd: 20, source: "known" },
  "san fernando giant lantern festival": { month: 12, dayStart: 14, dayEnd: 20, source: "known" },
  "peñafrancia festival": { month: 9, dayStart: 9, dayEnd: 21, source: "known" },
  "penafrancia festival": { month: 9, dayStart: 9, dayEnd: 21, source: "known" },
  "kaamulan festival": { month: 3, dayStart: 1, dayEnd: 31, source: "known" },
  "aliwan fiesta": { month: 4, dayStart: 25, dayEnd: 27, source: "known" },
  "ibalong festival": { month: 8, dayStart: 12, dayEnd: 30, source: "known" },
  "rodeo masbateño": { month: 4, dayStart: 13, dayEnd: 17, source: "known" },
  "rodeo masbateno": { month: 4, dayStart: 13, dayEnd: 17, source: "known" },
  "turumba festival": { month: 4, dayStart: 21, dayEnd: 26, source: "known" },
  "butanding festival": { month: 3, dayStart: 1, dayEnd: 31, source: "known" },
  "higantes festival": { month: 11, dayStart: 22, dayEnd: 23, source: "known" },
  "paraw regatta festival": { month: 2, dayStart: 1, dayEnd: 28, source: "known" },
  "bangus festival": { month: 4, dayStart: 1, dayEnd: 30, source: "known" },
  "manggahan festival": { month: 5, dayStart: 15, dayEnd: 22, source: "known" },
  "tuna festival": { month: 9, dayStart: 1, dayEnd: 30, source: "known" },
  "lanzones festival": { month: 10, dayStart: 1, dayEnd: 31, source: "known" },
  "pintados festival": { month: 6, dayStart: 29, dayEnd: 29, source: "known" },
  "pasigarbo sa sugbo": { month: 8, dayStart: 1, dayEnd: 31, source: "known" },
  "pasigarbo sa sugbo festival of festivals": { month: 8, dayStart: 1, dayEnd: 31, source: "known" },
  "diyandi festival": { month: 9, dayStart: 27, dayEnd: 29, source: "known" },
  "diyandi festival sa iligan": { month: 9, dayStart: 27, dayEnd: 29, source: "known" },
  "kalilangan festival": { month: 2, dayStart: 27, dayEnd: 27, source: "known" },
  "cimarrones festival": { month: 10, dayStart: 1, dayEnd: 26, source: "known" },
};

function normalizeName(name) {
  return String(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function loadRawFestivals() {
  const raw = JSON.parse(fs.readFileSync(RAW_FESTIVALS, "utf8"));
  return [...raw.festivals.seed, ...raw.festivals.tpb, ...raw.festivals.wikipedia];
}

function main() {
  const festivals = loadRawFestivals();
  const cache = fs.existsSync(DATE_CACHE)
    ? JSON.parse(fs.readFileSync(DATE_CACHE, "utf8"))
    : {};

  let knownSeeded = 0;
  let parsedSeeded = 0;

  for (const festival of festivals) {
    if (festival.dayStart != null) continue;
    if (cache[festival.id]?.dayStart != null) continue;

    const key = normalizeName(festival.name);
    const known = KNOWN_DATES[key];
    if (known) {
      cache[festival.id] = {
        month: known.month ?? festival.month,
        dayStart: known.dayStart,
        dayEnd: known.dayEnd ?? null,
        dateParseMethod: known.source,
        enrichedAt: new Date().toISOString(),
      };
      knownSeeded++;
      continue;
    }

    const parsed = enrichFestivalDates(festival);
    if (parsed.dayStart != null) {
      cache[festival.id] = {
        month: parsed.month ?? festival.month,
        dayStart: parsed.dayStart,
        dayEnd: parsed.dayEnd ?? null,
        dateParseMethod: parsed.dateParseMethod ?? "local-parse",
        enrichedAt: new Date().toISOString(),
      };
      parsedSeeded++;
    }
  }

  fs.mkdirSync(path.dirname(DATE_CACHE), { recursive: true });
  fs.writeFileSync(DATE_CACHE, JSON.stringify(cache, null, 2));

  console.log(`Date cache seeded: ${path.relative(ROOT, DATE_CACHE)}`);
  console.log(`  Known festival dates: ${knownSeeded}`);
  console.log(`  Parsed from dateVenueRaw: ${parsedSeeded}`);
  console.log(`  Total cache entries: ${Object.keys(cache).length}`);

  // Seed descriptions from any raw source that already has text (esp. Wikipedia scrape).
  const descCache = fs.existsSync(DESC_CACHE)
    ? JSON.parse(fs.readFileSync(DESC_CACHE, "utf8"))
    : {};
  const descByNormName = new Map();
  for (const f of festivals) {
    if (f.description && f.description.length >= 40) {
      const key = normalizeName(f.name);
      const existing = descByNormName.get(key);
      if (!existing || f.description.length > existing.description.length) {
        descByNormName.set(key, { description: f.description, sourceId: f.id });
      }
    }
  }

  let descSeeded = 0;
  for (const festival of festivals) {
    if (festival.description && festival.description.length >= 40) continue;
    if (descCache[festival.id]?.description) continue;

    const fromName = descByNormName.get(normalizeName(festival.name));
    if (fromName) {
      descCache[festival.id] = {
        description: fromName.description,
        seededFrom: fromName.sourceId,
        enrichedAt: new Date().toISOString(),
      };
      descSeeded++;
    }
  }

  fs.mkdirSync(path.dirname(DESC_CACHE), { recursive: true });
  fs.writeFileSync(DESC_CACHE, JSON.stringify(descCache, null, 2));
  console.log(`Description cache seeded: ${path.relative(ROOT, DESC_CACHE)}`);
  console.log(`  Cross-source descriptions: ${descSeeded}`);
  console.log(`  Total description cache entries: ${Object.keys(descCache).length}`);
}

main();
