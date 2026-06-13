/**
 * Online backfill for barangay fiesta dates via Wikipedia search + snippet parsing.
 * Output: data/processed/festivals/barangay-date-enrichment-cache.json
 *
 * Usage:
 *   node scripts/enrich-barangay-fiesta-dates-online.js
 *   LIMIT=500 node scripts/enrich-barangay-fiesta-dates-online.js
 *   RETRY_FAILED=1 LIMIT=300 node scripts/enrich-barangay-fiesta-dates-online.js
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseDateFromRaw } from "./lib/date-parser.js";
import { inferFeastFromBarangayName } from "./lib/patron-saint-calendar.js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const RAW_FILE = path.join(ROOT, "data", "processed", "festivals", "barangay-fiestas-raw.json");
const CACHE_FILE = path.join(
  ROOT,
  "data",
  "processed",
  "festivals",
  "barangay-date-enrichment-cache.json"
);

const WIKI_API = "https://en.wikipedia.org/w/api.php";
const USER_AGENT = "philippine-fiestas-map-data-bot/0.5 (barangay date enrichment)";
const REQUEST_DELAY_MS = Number(process.env.REQUEST_DELAY_MS ?? "7000");
const LIMIT = Number(process.env.LIMIT ?? "500");
const RETRY_FAILED = process.env.RETRY_FAILED === "1";
const RATE_LIMIT_COOLDOWN_MS = Number(process.env.RATE_LIMIT_COOLDOWN_MS ?? "45000");
/** Provinces with the largest date gaps — try Wikipedia here first. */
const HIGH_GAP_PROVINCES = [
  "Iloilo",
  "Leyte",
  "Pangasinan",
  "Lanao Del Sur",
  "Cebu",
  "Quezon",
  "Bohol",
  "Batangas",
  "Negros Occidental",
  "Camarines Sur",
  "Misamis Oriental",
  "Zamboanga Del Sur",
  "Palawan",
  "Masbate",
  "Cagayan",
];

function normalizeProvince(name) {
  return String(name ?? "")
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const provinceRank = new Map(
  HIGH_GAP_PROVINCES.map((p, i) => [normalizeProvince(p), i])
);

function pendingRank(f, cache) {
  const cached = cache.entries[f.id];
  if (!cached) return 0;
  if (cached.error) return 1;
  if (cached.notFound) return 2;
  return 3;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function barangayLabel(f) {
  return f.locationText?.split(",")[0]?.trim() ?? "";
}

function loadCache() {
  if (!fs.existsSync(CACHE_FILE)) {
    return { version: 1, entries: {} };
  }
  return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
}

function saveCache(cache) {
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

async function wikiApi(params, retries = 4) {
  const url = new URL(WIKI_API);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (res.status === 429) {
      const waitMs = Math.min(RATE_LIMIT_COOLDOWN_MS, 8000 * (attempt + 1));
      await sleep(waitMs);
      continue;
    }
    if (!res.ok) throw new Error(`Wikipedia API ${res.status}`);
    return res.json();
  }
  const err = new Error("Wikipedia API rate limited");
  err.code = "RATE_LIMITED";
  throw err;
}
async function searchWikipedia(query, limit = 5) {
  const data = await wikiApi({
    action: "query",
    list: "search",
    srsearch: query,
    srlimit: String(limit),
    format: "json",
    origin: "*",
  });
  return data.query?.search ?? [];
}

async function opensearchWikipedia(query, limit = 5) {
  const data = await wikiApi({
    action: "opensearch",
    search: query,
    limit: String(limit),
    namespace: "0",
    format: "json",
    origin: "*",
  });
  const titles = data[1] ?? [];
  const descriptions = data[2] ?? [];
  return titles.map((title, i) => ({
    title,
    snippet: descriptions[i] ?? "",
  }));
}

async function fetchExtract(title) {
  const data = await wikiApi({
    action: "query",
    prop: "extracts|revisions",
    exintro: "1",
    explaintext: "1",
    rvprop: "content",
    rvslots: "main",
    titles: title,
    format: "json",
    origin: "*",
  });
  const pages = data.query?.pages ?? {};
  const page = Object.values(pages)[0];
  const extract = page?.extract ?? "";
  const wikitext = page?.revisions?.[0]?.slots?.main?.["*"] ?? "";
  return { extract, wikitext };
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasFiestaContext(text) {
  return /\b(fiesta|feast|festival|patron(?:al| saint)?|fiestang|kapistahan)\b/i.test(text);
}

function parseDateFromText(text, hintMonth = null) {
  if (!text) return null;

  const fiestaContext = text.match(
    /(?:fiesta|feast|festival|patronal|patron saint|fiestang|kapistahan|celebrat(?:e|es|ed)|honou?rs?)[^.]{0,120}?((?:january|february|march|april|may|june|july|august|september|october|november|december)[^.]{0,80})/i
  );
  if (fiestaContext) {
    const parsed = parseDateFromRaw(fiestaContext[1], hintMonth);
    if (parsed?.month && parsed?.dayStart) {
      return {
        month: parsed.month,
        dayStart: parsed.dayStart,
        dayEnd: parsed.dayEnd ?? parsed.dayStart,
        dateSource: "wikipedia-search",
      };
    }
  }

  if (!hasFiestaContext(text)) return null;

  const parsed = parseDateFromRaw(text, hintMonth);
  if (parsed?.month && parsed?.dayStart) {
    if (parsed.month === 1 && parsed.dayStart === 1) return null;
    if (parsed.month === 12 && parsed.dayStart === 31) return null;
    if (parsed.month === 12 && parsed.dayStart === 25) return null;
    return {
      month: parsed.month,
      dayStart: parsed.dayStart,
      dayEnd: parsed.dayEnd ?? parsed.dayStart,
      dateSource: "wikipedia-search",
    };
  }

  return null;
}

function buildQueries(f) {
  const barangay = barangayLabel(f);
  const muni = f.municipality ?? "";
  const prov = f.province ?? "";
  const inferred = inferFeastFromBarangayName(barangay);
  const queries = [
    `${barangay} barangay ${muni} ${prov} Philippines fiesta`,
    `${barangay} ${muni} feast day patron`,
    `Barangay ${barangay} ${muni} Philippines`,
  ];
  if (inferred?.patronSaint) {
    queries.push(`${inferred.patronSaint} feast ${barangay} ${muni} Philippines`);
  }
  return queries;
}
function textMatchesBarangay(blob, barangay, municipality) {
  const bRe = new RegExp(escapeRegExp(barangay), "i");
  if (bRe.test(blob)) return true;
  const stripped = barangay.replace(/\s*\([^)]*\)/, "").trim();
  if (stripped && new RegExp(escapeRegExp(stripped), "i").test(blob)) return true;
  if (municipality && new RegExp(escapeRegExp(municipality), "i").test(blob)) {
    return /barangay/i.test(blob) || /fiesta|feast|patron/i.test(blob);
  }
  return false;
}

async function tryTitle(title, barangay, municipality, hintMonth = null) {
  const { extract, wikitext } = await fetchExtract(title);
  const blob = `${title}. ${extract} ${wikitext}`;
  if (!textMatchesBarangay(blob, barangay, municipality)) return null;
  return parseDateFromText(blob, hintMonth);
}
async function enrichFestival(f) {
  const barangay = barangayLabel(f);
  const inferred = inferFeastFromBarangayName(barangay);
  const hintMonth = inferred?.month ?? null;
  const queries = buildQueries(f).slice(0, 2);
  const seenTitles = new Set();

  for (const query of queries) {
    const searchHits = await searchWikipedia(query, 3);

    for (const hit of searchHits) {
      if (!hit.title || seenTitles.has(hit.title)) continue;
      seenTitles.add(hit.title);

      const snippetBlob = `${hit.title} ${hit.snippet ?? ""}`;
      if (!textMatchesBarangay(snippetBlob, barangay, f.municipality)) continue;

      let date = parseDateFromText(snippetBlob, hintMonth);
      if (
        !date &&
        /fiesta|feast|patron|kapistahan/i.test(snippetBlob) &&
        /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(
          snippetBlob
        )
      ) {
        date = await tryTitle(hit.title, barangay, f.municipality, hintMonth);
        await sleep(2000);
      }

      if (date) {
        return { ...date, wikiTitle: hit.title, query };
      }
    }

    await sleep(1500);
  }

  return null;
}
async function main() {
  if (!fs.existsSync(RAW_FILE)) {
    console.error(`Missing ${RAW_FILE}`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(RAW_FILE, "utf8"));
  const cache = loadCache();
  const pending = raw.festivals
    .filter((f) => {
      if (f.month) return false;
      const cached = cache.entries[f.id];
      if (!cached) return true;
      if (RETRY_FAILED && cached.notFound) return true;
      if (RETRY_FAILED && cached.error && cached.error !== "rate limited") return true;
      return false;
    })
    .sort((a, b) => {
      const rankDiff = pendingRank(a, cache) - pendingRank(b, cache);
      if (rankDiff !== 0) return rankDiff;
      const provA = provinceRank.get(normalizeProvince(a.province)) ?? 999;
      const provB = provinceRank.get(normalizeProvince(b.province)) ?? 999;
      if (provA !== provB) return provA - provB;
      return String(a.municipality).localeCompare(String(b.municipality));
    });
  console.log(`Barangay online date enrichment (limit ${LIMIT}, retry failed ${RETRY_FAILED})`);
  console.log(`  Pending: ${pending.length}`);

  let enriched = 0;
  let tried = 0;
  let rateLimitStreak = 0;

  for (const f of pending) {
    if (tried >= LIMIT) break;

    try {
      const result = await enrichFestival(f);
      cache.entries[f.id] = result ?? { notFound: true, checkedAt: new Date().toISOString() };
      if (result) {
        enriched++;
        console.log(
          `  ✓ ${barangayLabel(f)}, ${f.municipality} → ${result.month}/${result.dayStart}`
        );
      }
      tried++;
      rateLimitStreak = 0;
    } catch (err) {
      if (err.code === "RATE_LIMITED" || /rate limit/i.test(err.message)) {
        rateLimitStreak++;
        console.warn(
          `  ⏳ rate limited (${rateLimitStreak}) — cooling down ${RATE_LIMIT_COOLDOWN_MS / 1000}s`
        );
        saveCache(cache);
        await sleep(RATE_LIMIT_COOLDOWN_MS);
        if (rateLimitStreak >= 3) {
          cache.entries[f.id] = {
            error: "rate limited",
            checkedAt: new Date().toISOString(),
          };
          tried++;
          rateLimitStreak = 0;
        }
        continue;
      }
      cache.entries[f.id] = { error: err.message, checkedAt: new Date().toISOString() };
      console.warn(`  ! ${f.id}: ${err.message}`);
      tried++;
      rateLimitStreak = 0;
    }

    if (tried % 10 === 0) saveCache(cache);
    await sleep(REQUEST_DELAY_MS);
  }
  cache.updatedAt = new Date().toISOString();
  saveCache(cache);

  const found = Object.values(cache.entries).filter((e) => e?.month).length;
  console.log(`Done. Tried ${tried}, newly enriched ${enriched}, cache hits with dates: ${found}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
