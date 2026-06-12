/**
 * Backfills festival descriptions from Wikipedia for records missing description text.
 *
 * Output: data/processed/festivals/description-enrichment-cache.json
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const RAW_FESTIVALS = path.join(ROOT, "data", "processed", "festivals", "raw-festivals.json");
const CACHE_FILE = path.join(
  ROOT,
  "data",
  "processed",
  "festivals",
  "description-enrichment-cache.json"
);

const WIKI_API = "https://en.wikipedia.org/w/api.php";
const USER_AGENT = "philippine-fiestas-map-data-bot/0.3 (description enrichment)";
const REQUEST_DELAY_MS = 2500;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function normalizeName(name) {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

function needsDescription(festival) {
  return !festival.description || festival.description.length < 40;
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
    exsentences: "6",
    titles: pageTitle,
    format: "json",
    origin: "*",
  });
  const pages = data.query?.pages ?? {};
  const page = Object.values(pages)[0];
  return page?.extract?.trim() ?? "";
}

function cleanDescription(text) {
  if (!text) return null;
  const cleaned = text
    .replace(/\s+/g, " ")
    .replace(/\(listen\)/gi, "")
    .trim();
  if (cleaned.length < 40) return null;
  return cleaned.length > 500 ? `${cleaned.slice(0, 497)}…` : cleaned;
}

async function enrichOne(festival, cache) {
  if (cache[festival.id]?.description) return cache[festival.id];

  const searches = await searchWikipedia(festival.name);
  await sleep(REQUEST_DELAY_MS);

  for (const hit of searches) {
    const extract = await fetchExtract(hit.title);
    await sleep(REQUEST_DELAY_MS);
    const description = cleanDescription(extract);
    if (description) {
      cache[festival.id] = {
        description,
        wikipediaTitle: hit.title,
        enrichedAt: new Date().toISOString(),
      };
      return cache[festival.id];
    }
  }

  cache[festival.id] = { description: null, enrichedAt: new Date().toISOString() };
  return cache[festival.id];
}

export async function enrichFestivalDescriptionsOnline(
  festivals,
  { cachePath = CACHE_FILE, maxLookups = Infinity } = {}
) {
  const cache = fs.existsSync(cachePath)
    ? JSON.parse(fs.readFileSync(cachePath, "utf8"))
    : {};

  const targets = festivals.filter(needsDescription);
  let lookedUp = 0;
  let filled = 0;

  for (const festival of targets) {
    if (lookedUp >= maxLookups) break;
    if (cache[festival.id]?.description) {
      filled++;
      continue;
    }
    if (cache[festival.id]?.description === null && cache[festival.id]?.enrichedAt) {
      continue;
    }

    try {
      const result = await enrichOne(festival, cache);
      if (result?.description) filled++;
    } catch (err) {
      console.warn(`  Skipping ${festival.name}: ${err.message}`);
      fs.mkdirSync(path.dirname(cachePath), { recursive: true });
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
      await sleep(10000);
      continue;
    }
    lookedUp++;

    if (lookedUp % 20 === 0) {
      fs.mkdirSync(path.dirname(cachePath), { recursive: true });
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
      console.log(
        `  Description enrichment: ${lookedUp}/${targets.length} looked up, ${filled} filled`
      );
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
  const maxLookups = Number(process.env.DESC_ENRICH_LIMIT ?? Infinity);

  console.log("Enriching festival descriptions from Wikipedia…");
  const result = await enrichFestivalDescriptionsOnline(festivals, { maxLookups });
  console.log(`Description enrichment cache: ${path.relative(ROOT, CACHE_FILE)}`);
  console.log(`  Targets: ${result.targets}`);
  console.log(`  Looked up this run: ${result.lookedUp}`);
  console.log(`  With description in cache: ${result.filled}`);
}

if (process.argv[1]?.endsWith("enrich-festival-descriptions-online.js")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
