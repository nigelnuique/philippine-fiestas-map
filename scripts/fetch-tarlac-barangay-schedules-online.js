/**
 * Fetches Tarlac City barangay pages and extracts feast-day text.
 * Caches HTML under data/raw/lgu-schedules/tarlac/ for offline reparse.
 *
 * Run: npm run data:fetch-tarlac-barangay-schedules
 *      CACHE_ONLY=1 npm run data:fetch-tarlac-barangay-schedules
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseTarlacBarangayPage } from "./lib/lgu-fiesta-schedules/parse-html-schedules.js";
import { lookupBarangayPsgc } from "./lib/barangay-psgc-index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const RAW_DIR = path.join(ROOT, "data", "raw", "lgu-schedules", "tarlac");
const OUT = path.join(
  ROOT,
  "data",
  "processed",
  "festivals",
  "tarlac-barangay-schedules-cache.json"
);

const MUNI = "City Of Tarlac";
const USER_AGENT = "philippine-fiestas-map-data-bot/0.5";
const DELAY_MS = 900;
const CACHE_ONLY = process.env.CACHE_ONLY === "1";

/** Slugs for barangays still missing curated dates. */
const TARGET_SLUGS = [
  { slug: "alvindia-segundo", barangay: "Alvindia Segundo" },
  { slug: "balete", barangay: "Balete" },
  { slug: "bantog", barangay: "Bantog" },
  { slug: "batang-batang", barangay: "Batang-Batang" },
  { slug: "calingcuan", barangay: "Calingcuan" },
  { slug: "carangian", barangay: "Carangian" },
  { slug: "de-lapaz", barangay: "Dela Paz" },
  { slug: "matadero", barangay: "Matadero" },
  { slug: "salapungan", barangay: "Salapungan" },
  { slug: "sepung-calzada", barangay: "Sepung Calzada" },
  { slug: "trinidad", barangay: "Trinidad" },
  { slug: "ungot", barangay: "Ungot" },
  { slug: "villa-bacolor", barangay: "Villa Bacolor" },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchPage(slug) {
  const url = `https://tarlaccity.gov.ph/${slug}/`;
  const filePath = path.join(RAW_DIR, `${slug}.html`);
  if (fs.existsSync(filePath)) {
    const ageMs = Date.now() - fs.statSync(filePath).mtimeMs;
    if (CACHE_ONLY || ageMs < 7 * 24 * 60 * 60 * 1000) {
      return fs.readFileSync(filePath, "utf8");
    }
  }
  if (CACHE_ONLY) return null;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const html = await res.text();
    fs.mkdirSync(RAW_DIR, { recursive: true });
    fs.writeFileSync(filePath, html);
    return html;
  } catch (liveErr) {
    const waybackUrl = `https://web.archive.org/web/2024/${url}`;
    try {
      const res = await fetch(waybackUrl, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) throw new Error(`Wayback HTTP ${res.status}`);
      const html = await res.text();
      fs.mkdirSync(RAW_DIR, { recursive: true });
      fs.writeFileSync(filePath, html);
      console.warn(`${slug}: live fetch failed (${liveErr.message}); used Wayback`);
      return html;
    } catch {
      throw liveErr;
    }
  }
}

function processHtml(html, barangay) {
  const entry = parseTarlacBarangayPage(html, barangay);
  if (!entry) return null;
  const psgc = lookupBarangayPsgc(MUNI, entry.barangay) ?? lookupBarangayPsgc(MUNI, barangay);
  if (!psgc) return { entry, psgc: null };
  return { entry, psgc };
}

async function main() {
  const byPsgc = {};
  let parsed = 0;
  let matched = 0;
  let fetchErrors = 0;
  const missedSamples = [];

  for (const { slug, barangay } of TARGET_SLUGS) {
    try {
      const html = await fetchPage(slug);
      if (!html) {
        missedSamples.push(`${barangay} (no cache)`);
        continue;
      }
      const result = processHtml(html, barangay);
      if (!result?.entry) {
        missedSamples.push(`${barangay} (no feast text)`);
        await sleep(DELAY_MS);
        continue;
      }
      parsed++;
      if (!result.psgc) {
        missedSamples.push(`${barangay} (PSGC miss)`);
        await sleep(DELAY_MS);
        continue;
      }
      matched++;
      const key = String(result.psgc).padStart(9, "0");
      byPsgc[key] = {
        month: result.entry.month,
        dayStart: result.entry.dayStart,
        dayEnd: result.entry.dayEnd,
        dateSource: result.entry.dateSource,
        patronSaint: result.entry.patronSaint,
      };
    } catch (err) {
      fetchErrors++;
      console.warn(`${slug}: ${err.message}`);
    }
    await sleep(DELAY_MS);
  }

  const payload = {
    version: 1,
    fetchedAt: new Date().toISOString(),
    municipality: MUNI,
    cacheOnly: CACHE_ONLY,
    stats: {
      targets: TARGET_SLUGS.length,
      parsed,
      matched,
      fetchErrors,
      missedSamples: missedSamples.slice(0, 15),
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
