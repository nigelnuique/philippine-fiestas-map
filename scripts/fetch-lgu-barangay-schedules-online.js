/**
 * Downloads LGU-published barangay fiesta schedules and writes a resolved cache.
 * Run: npm run data:fetch-lgu-barangay-schedules
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  parseDagupanFiestaTable,
  parseSiquijorFiestaTable,
} from "./lib/lgu-fiesta-schedules/parse-html-schedules.js";
import { lookupBarangayPsgc } from "./lib/barangay-psgc-index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const RAW_DIR = path.join(ROOT, "data", "raw", "lgu-schedules");
const OUT = path.join(ROOT, "data", "processed", "festivals", "lgu-barangay-schedules-cache.json");

const USER_AGENT = "philippine-fiestas-map-data-bot/0.5 (LGU barangay schedule fetch)";

const SOURCES = [
  {
    id: "dagupan",
    url: "https://www.dagupan.gov.ph/the-city/calendar-of-activities/",
    file: "dagupan-calendar.html",
    parse: parseDagupanFiestaTable,
    dateSource: "lgu-dagupan-gov-ph",
  },
  {
    id: "siquijor",
    url: "https://siquijor-secrets.com/siquijor-fiestas/",
    file: "siquijor-fiestas.html",
    parse: parseSiquijorFiestaTable,
    dateSource: "lgu-siquijor-secrets",
  },
];

async function fetchToFile(url, filePath) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const html = await res.text();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, html);
  return html;
}

function loadOrFetch(source) {
  const filePath = path.join(RAW_DIR, source.file);
  if (fs.existsSync(filePath)) {
    const ageMs = Date.now() - fs.statSync(filePath).mtimeMs;
    if (ageMs < 7 * 24 * 60 * 60 * 1000) {
      return fs.readFileSync(filePath, "utf8");
    }
  }
  return fetchToFile(source.url, filePath);
}

function resolveEntries(entries, dateSource) {
  const byPsgc = {};
  let matched = 0;
  let missed = 0;
  const missedSamples = [];

  for (const entry of entries) {
    const psgc = lookupBarangayPsgc(entry.municipality, entry.barangay);
    if (!psgc) {
      missed++;
      if (missedSamples.length < 8) {
        missedSamples.push(`${entry.barangay} / ${entry.municipality}`);
      }
      continue;
    }
    matched++;
    const key = String(psgc).padStart(9, "0");
    byPsgc[key] = {
      month: entry.month,
      dayStart: entry.dayStart,
      dayEnd: entry.dayEnd,
      dateSource: entry.dateSource ?? dateSource,
    };
  }

  return { byPsgc, matched, missed, missedSamples };
}

async function main() {
  const payload = {
    version: 1,
    fetchedAt: new Date().toISOString(),
    sources: {},
    byPsgc: {},
  };

  for (const source of SOURCES) {
    try {
      const html = await loadOrFetch(source);
      const entries = source.parse(html);
      const resolved = resolveEntries(entries, source.dateSource);
      payload.sources[source.id] = {
        url: source.url,
        entries: entries.length,
        matched: resolved.matched,
        missed: resolved.missed,
        missedSamples: resolved.missedSamples,
      };
      Object.assign(payload.byPsgc, resolved.byPsgc);
      console.log(
        `${source.id}: ${entries.length} parsed, ${resolved.matched} matched PSGC`
      );
    } catch (err) {
      payload.sources[source.id] = { error: err.message, url: source.url };
      console.warn(`${source.id}: ${err.message}`);
      if (fs.existsSync(path.join(RAW_DIR, source.file))) {
        const html = fs.readFileSync(path.join(RAW_DIR, source.file), "utf8");
        const entries = source.parse(html);
        const resolved = resolveEntries(entries, source.dateSource);
        Object.assign(payload.byPsgc, resolved.byPsgc);
        payload.sources[source.id].fallback = {
          entries: entries.length,
          matched: resolved.matched,
        };
        console.log(`  fallback cache: ${resolved.matched} matched`);
      }
    }
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${path.relative(ROOT, OUT)} (${Object.keys(payload.byPsgc).length} PSGC dates)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
