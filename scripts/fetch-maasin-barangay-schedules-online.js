/**
 * Downloads Maasin City barangay schedules and writes a resolved cache.
 * Primary source: LGU barangay directory (government/barangay).
 * Secondary: individual barangay article pages when present.
 *
 * Run: npm run data:fetch-maasin-barangay-schedules
 *      CACHE_ONLY=1 npm run data:fetch-maasin-barangay-schedules
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  parseMaasinBarangayArticle,
  parseMaasinBarangayDirectory,
} from "./lib/lgu-fiesta-schedules/parse-html-schedules.js";
import { lookupBarangayPsgc } from "./lib/barangay-psgc-index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const RAW_DIR = path.join(ROOT, "data", "raw", "lgu-schedules", "maasin");
const DIRECTORY_FILE = path.join(RAW_DIR, "barangay-directory.html");
const DIRECTORY_URL = "http://www.maasincity.gov.ph/index.php/government/barangay";
const OUT = path.join(ROOT, "data", "processed", "festivals", "maasin-barangay-schedules-cache.json");

const MUNI = "City Of Maasin (Capital)";
const USER_AGENT = "philippine-fiestas-map-data-bot/0.5";
const DELAY_MS = 900;
const CACHE_ONLY = process.env.CACHE_ONLY === "1";

const SLUG_ALIASES = {
  "tunga-tunga-poblacion": "Tunga-Tunga (Pob.)",
  abgao: "Abgao (Pob.)",
  mantahan: "Mantahan (Pob.)",
  tagnipa: "Tagnipa (Pob.)",
  mambajao: "Mambajao (Pob.)",
  "bactul-ii": "Bactul Ii",
  "bactul-i": "Bactul I",
  "bato-i": "Bato I",
  "bato-ii": "Bato Ii",
  "panan-awan": "Panan-Awan",
  "san-agustin": "San Agustin",
  "san-isidro": "San Isidro",
  "san-jose": "San Jose",
  "san-rafael": "San Rafael",
  "santa-rosa": "Santa Rosa",
  "santo-rosario": "Santo Rosario",
  "soro-soro": "Soro-Soro",
  "malapoc-norte": "Malapoc Norte",
  "malapoc-sur": "Malapoc Sur",
  "nonok-sur": "Nonok Sur",
  "nonok-norte": "Nonok Norte",
  "hinapu-daku": "Hinapu Daku",
  "hinapu-gamay": "Hinapu Gamay",
  "tam-is": "Tam-Is",
  "sto-nino": "Santo NiñO",
};

function barangayFromSlug(slug) {
  const tail = slug.replace(/^\d+-/, "").replace(/^barangay-directory$/, "");
  if (!tail || tail === "barangay-directory") return null;
  if (SLUG_ALIASES[tail]) return SLUG_ALIASES[tail];
  return tail
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
    .replace(/\bIi\b/g, "II")
    .replace(/\bIii\b/g, "III");
}

function listCachedSlugs() {
  if (!fs.existsSync(RAW_DIR)) return [];
  return fs
    .readdirSync(RAW_DIR)
    .filter((f) => f.endsWith(".html") && f !== "barangay-directory.html")
    .map((f) => f.replace(/\.html$/, ""));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function entryToPsgcRecord(entry, dateSource) {
  const psgc = lookupBarangayPsgc(MUNI, entry.barangay);
  if (!psgc) return null;
  return {
    key: String(psgc).padStart(9, "0"),
    value: {
      month: entry.month,
      dayStart: entry.dayStart,
      dayEnd: entry.dayEnd,
      dateSource,
      patronSaint: entry.patronSaint,
    },
  };
}

async function loadDirectoryHtml() {
  if (fs.existsSync(DIRECTORY_FILE)) {
    const ageMs = Date.now() - fs.statSync(DIRECTORY_FILE).mtimeMs;
    if (CACHE_ONLY || ageMs < 7 * 24 * 60 * 60 * 1000) {
      return fs.readFileSync(DIRECTORY_FILE, "utf8");
    }
  }
  if (CACHE_ONLY) return null;

  const res = await fetch(DIRECTORY_URL, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${DIRECTORY_URL}`);
  const html = await res.text();
  fs.mkdirSync(RAW_DIR, { recursive: true });
  fs.writeFileSync(DIRECTORY_FILE, html);
  return html;
}

async function collectSlugs() {
  const links = new Set(listCachedSlugs());
  if (CACHE_ONLY) return [...links];

  for (let start = 0; start <= 70; start += 5) {
    const url = `https://maasincity.gov.ph/index.php/barangays/14-barangays?start=${start}`;
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) continue;
    const html = await res.text();
    for (const m of html.matchAll(/\/index.php\/barangays\/14-barangays\/(\d+-[^"'?]+)/g)) {
      links.add(m[1]);
    }
    await sleep(DELAY_MS);
  }
  return [...links];
}

async function fetchArticle(slug) {
  const url = `https://maasincity.gov.ph/index.php/barangays/brgy/14-barangays/${slug}`;
  const filePath = path.join(RAW_DIR, `${slug}.html`);
  if (fs.existsSync(filePath)) {
    const ageMs = Date.now() - fs.statSync(filePath).mtimeMs;
    if (CACHE_ONLY || ageMs < 7 * 24 * 60 * 60 * 1000) {
      return fs.readFileSync(filePath, "utf8");
    }
  }
  if (CACHE_ONLY) return null;

  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const html = await res.text();
  fs.mkdirSync(RAW_DIR, { recursive: true });
  fs.writeFileSync(filePath, html);
  return html;
}

async function main() {
  const byPsgc = {};
  const stats = {
    directoryParsed: 0,
    directoryMatched: 0,
    directoryMissed: [],
    articleParsed: 0,
    articleMatched: 0,
    articleAdded: 0,
    slugs: 0,
    cachedHtml: listCachedSlugs().length,
  };

  const directoryHtml = await loadDirectoryHtml();
  if (directoryHtml) {
    const entries = parseMaasinBarangayDirectory(directoryHtml);
    stats.directoryParsed = entries.length;
    for (const entry of entries) {
      const row = entryToPsgcRecord(entry, "lgu-maasin-city-directory");
      if (!row) {
        stats.directoryMissed.push(entry.barangay);
        continue;
      }
      stats.directoryMatched++;
      byPsgc[row.key] = row.value;
    }
  }

  const slugs = await collectSlugs();
  stats.slugs = slugs.length;

  for (const slug of slugs) {
    try {
      const html = await fetchArticle(slug);
      if (!html) continue;
      const barangay = barangayFromSlug(slug);
      if (!barangay) continue;
      const entry = parseMaasinBarangayArticle(html, barangay);
      if (!entry) {
        await sleep(DELAY_MS);
        continue;
      }
      stats.articleParsed++;
      let resolvedBarangay = entry.barangay;
      let row = entryToPsgcRecord(entry, "lgu-maasin-city-gov-ph");
      if (!row && entry.barangay !== barangay) {
        resolvedBarangay = barangay;
        row = entryToPsgcRecord({ ...entry, barangay }, "lgu-maasin-city-gov-ph");
      }
      if (!row) {
        await sleep(DELAY_MS);
        continue;
      }
      stats.articleMatched++;
      if (!byPsgc[row.key]) {
        stats.articleAdded++;
        byPsgc[row.key] = row.value;
      }
    } catch (err) {
      console.warn(`${slug}: ${err.message}`);
    }
    await sleep(DELAY_MS);
  }

  const payload = {
    version: 2,
    fetchedAt: new Date().toISOString(),
    municipality: MUNI,
    cacheOnly: CACHE_ONLY,
    stats: {
      ...stats,
      totalPsgc: Object.keys(byPsgc).length,
    },
    byPsgc,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${path.relative(ROOT, OUT)} (${Object.keys(byPsgc).length} PSGC dates)`);
  console.log(payload.stats);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
