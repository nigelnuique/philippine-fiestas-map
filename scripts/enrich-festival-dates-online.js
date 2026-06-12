/**
 * Backfills festival dates from Wikipedia for records still missing dayStart
 * after local dateVenueRaw parsing.
 *
 * Output: data/processed/festivals/date-enrichment-cache.json
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { enrichFestivalDates, parseDateFromRaw } from "./lib/date-parser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const RAW_FESTIVALS = path.join(ROOT, "data", "processed", "festivals", "raw-festivals.json");
const CACHE_FILE = path.join(ROOT, "data", "processed", "festivals", "date-enrichment-cache.json");

const WIKI_API = "https://en.wikipedia.org/w/api.php";
const USER_AGENT = "philippine-fiestas-map-data-bot/0.3 (date enrichment)";
const REQUEST_DELAY_MS = 2500;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Well-known festivals where list data lacks explicit days. */
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
  "holy week": { month: 4, dayStart: 1, dayEnd: 30, source: "known-movable" },
};

function normalizeName(name) {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

function needsOnlineEnrichment(festival) {
  if (festival.dayStart != null) return false;
  if (lookupKnown(festival)) return true;
  return enrichFestivalDates(festival).dayStart == null;
}

async function wikiApi(params, retries = 4) {
  const url = new URL(WIKI_API);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (res.status === 429) {
      await sleep(5000 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`Wikipedia API ${res.status}`);
    return res.json();
  }
  throw new Error("Wikipedia API 429 (rate limited)");
}

async function searchWikipedia(title) {
  const data = await wikiApi({
    action: "query",
    list: "search",
    srsearch: `${title} Philippines festival`,
    srlimit: "3",
    format: "json",
    origin: "*",
  });
  return data.query?.search ?? [];
}

async function fetchExtract(pageTitle) {
  const data = await wikiApi({
    action: "query",
    prop: "extracts",
    explaintext: "1",
    exintro: "1",
    exsentences: "8",
    titles: pageTitle,
    format: "json",
    origin: "*",
  });
  const pages = data.query?.pages ?? {};
  const page = Object.values(pages)[0];
  return page?.extract ?? "";
}

function parseExtractForDates(text, hintMonth = null) {
  if (!text) return null;

  const patterns = [
    /\b(?:held|celebrated|observed|takes place)\s+(?:every\s+)?(?:on\s+)?([^.]{5,80})/i,
    /\b(?:every|each)\s+([^.]{5,60}?(?:january|february|march|april|may|june|july|august|september|october|november|december)[^.]{0,40})/i,
    /\b((?:\d+(?:st|nd|rd|th)\s+)?(?:week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+of\s+\w+[^.]{0,30})/i,
    /\b((?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:\s*[-–—]\s*\d{1,2})?)/i,
    /\b((?:jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\.?\s+\d{1,2}(?:\s*[-–—]\s*\d{1,2})?)/i,
  ];

  for (const pat of patterns) {
    const m = text.match(pat);
    if (m?.[1]) {
      const parsed = parseDateFromRaw(m[1].trim(), hintMonth);
      if (parsed?.dayStart) {
        return { ...parsed, dateParseMethod: "wikipedia-extract", extractSnippet: m[1].trim() };
      }
    }
  }

  return parseDateFromRaw(text.slice(0, 200), hintMonth)
    ? {
        ...parseDateFromRaw(text.slice(0, 200), hintMonth),
        dateParseMethod: "wikipedia-extract-fallback",
      }
    : null;
}

function lookupKnown(festival) {
  const key = normalizeName(festival.name);
  const hit = KNOWN_DATES[key];
  if (!hit) return null;
  return {
    month: hit.month ?? festival.month,
    dayStart: hit.dayStart,
    dayEnd: hit.dayEnd ?? null,
    dateParseMethod: hit.source,
  };
}

async function enrichOne(festival, cache) {
  if (cache[festival.id]) return cache[festival.id];

  const known = lookupKnown(festival);
  if (known) {
    cache[festival.id] = { ...known, enrichedAt: new Date().toISOString() };
    return cache[festival.id];
  }

  const searches = await searchWikipedia(festival.name);
  await sleep(REQUEST_DELAY_MS);

  for (const hit of searches) {
    const extract = await fetchExtract(hit.title);
    await sleep(REQUEST_DELAY_MS);
    const parsed = parseExtractForDates(extract, festival.month);
    if (parsed?.dayStart) {
      cache[festival.id] = {
        ...parsed,
        wikipediaTitle: hit.title,
        enrichedAt: new Date().toISOString(),
      };
      return cache[festival.id];
    }
  }

  cache[festival.id] = { month: festival.month, dayStart: null, enrichedAt: new Date().toISOString() };
  return cache[festival.id];
}

export async function enrichFestivalDatesOnline(festivals, { cachePath = CACHE_FILE, maxLookups = Infinity } = {}) {
  const cache = fs.existsSync(cachePath)
    ? JSON.parse(fs.readFileSync(cachePath, "utf8"))
    : {};

  const targets = festivals.filter(needsOnlineEnrichment);
  let lookedUp = 0;
  let filled = 0;

  for (const festival of targets) {
    if (lookedUp >= maxLookups) break;
    if (cache[festival.id]?.dayStart != null) {
      filled++;
      continue;
    }
    if (cache[festival.id]?.dayStart === null && cache[festival.id]?.enrichedAt) {
      continue;
    }

    try {
      const result = await enrichOne(festival, cache);
      if (result?.dayStart != null) filled++;
    } catch (err) {
      console.warn(`  Skipping ${festival.name}: ${err.message}`);
      fs.mkdirSync(path.dirname(cachePath), { recursive: true });
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
      await sleep(10000);
      continue;
    }
    lookedUp++;

    if (lookedUp % 25 === 0) {
      fs.mkdirSync(path.dirname(cachePath), { recursive: true });
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
      console.log(`  Online date enrichment: ${lookedUp}/${targets.length} looked up, ${filled} filled`);
    }
  }

  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));

  return { cache, targets: targets.length, lookedUp, filled };
}

function loadAllRawFestivals() {
  const raw = JSON.parse(fs.readFileSync(RAW_FESTIVALS, "utf8"));
  return [...raw.festivals.seed, ...raw.festivals.tpb, ...raw.festivals.wikipedia];
}

async function main() {
  if (!fs.existsSync(RAW_FESTIVALS)) {
    console.error("Missing raw-festivals.json — run npm run data:fetch-festivals first");
    process.exit(1);
  }

  const festivals = loadAllRawFestivals();
  const maxLookups = Number(process.env.DATE_ENRICH_LIMIT ?? Infinity);

  console.log("Enriching festival dates from Wikipedia…");
  const result = await enrichFestivalDatesOnline(festivals, { maxLookups });
  console.log(`Date enrichment cache: ${path.relative(ROOT, CACHE_FILE)}`);
  console.log(`  Targets: ${result.targets}`);
  console.log(`  Looked up this run: ${result.lookedUp}`);
  console.log(`  With dayStart in cache: ${result.filled}`);
}

if (process.argv[1]?.endsWith("enrich-festival-dates-online.js")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
