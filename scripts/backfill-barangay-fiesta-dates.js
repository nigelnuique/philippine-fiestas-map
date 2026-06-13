/**
 * Backfill month/day on barangay fiesta records:
 * 1. Curated overrides and LGU schedule imports (barangay-fiesta-date-overrides.js)
 * 2. Wikipedia enrichment cache (enrich-barangay-fiesta-dates-online.js)
 * 3. Patron-saint feast inference from barangay name (patron-saint-calendar.js)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { lookupBarangayFiestaDateOverride } from "./lib/barangay-fiesta-date-overrides.js";
import { inferFeastFromBarangayName } from "./lib/patron-saint-calendar.js";
import { getLguBarangayFiestaDatesByPsgc } from "./lib/lgu-fiesta-schedules/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const RAW_FILE = path.join(ROOT, "data", "processed", "festivals", "barangay-fiestas-raw.json");
const ONLINE_CACHE = path.join(
  ROOT,
  "data",
  "processed",
  "festivals",
  "barangay-date-enrichment-cache.json"
);

function barangayLabel(f) {
  return f.locationText?.split(",")[0]?.trim() ?? "";
}

function hasBarangayDate(f) {
  return Boolean(f.month && (f.dayStart || f.datePrecision === "month"));
}

function applyDate(f, date) {
  if (!date?.month) return false;
  f.month = date.month;
  if (date.dayStart) {
    f.dayStart = date.dayStart;
    if (date.dayEnd && date.dayEnd !== date.dayStart) {
      f.dayEnd = date.dayEnd;
    } else {
      delete f.dayEnd;
    }
    delete f.datePrecision;
  } else if (date.datePrecision === "month") {
    delete f.dayStart;
    delete f.dayEnd;
    f.datePrecision = "month";
  } else {
    return false;
  }
  f.dateSource = date.dateSource;
  if (date.patronSaint) f.patronSaint = date.patronSaint;
  else delete f.patronSaint;
  return true;
}

function loadOnlineCache() {
  if (!fs.existsSync(ONLINE_CACHE)) return {};
  const data = JSON.parse(fs.readFileSync(ONLINE_CACHE, "utf8"));
  return data.entries ?? {};
}

/** LGU/parish curated sources — clear on re-run when override entry is removed. */
function isLguManagedDateSource(src) {
  if (!src || src === "patron-saint-calendar" || src === "wikipedia-search") return false;
  return (
    src.startsWith("lgu-") ||
    src.startsWith("parish-") ||
    src.startsWith("iloilo-provincial-") ||
    src.startsWith("curated-online") ||
    src.startsWith("siquijor-") ||
    src.startsWith("zamboanga-")
  );
}

function clearDate(f) {
  delete f.month;
  delete f.dayStart;
  delete f.dayEnd;
  delete f.datePrecision;
  delete f.dateSource;
  delete f.patronSaint;
}

function main() {
  if (!fs.existsSync(RAW_FILE)) {
    console.error(`Missing ${RAW_FILE}. Run: npm run data:fetch-barangay-fiestas`);
    process.exit(1);
  }

  const lguStats = getLguBarangayFiestaDatesByPsgc().stats;
  const onlineCache = loadOnlineCache();

  const raw = JSON.parse(fs.readFileSync(RAW_FILE, "utf8"));
  const stats = {
    total: raw.festivals.length,
    alreadyHadDate: 0,
    fromOverride: 0,
    fromPatronSaint: 0,
    fromOnline: 0,
    stillMissing: 0,
  };

  for (const f of raw.festivals) {
    const override = lookupBarangayFiestaDateOverride(f);
    if (override && applyDate(f, override)) {
      stats.fromOverride++;
      continue;
    }

    if (hasBarangayDate(f) && isLguManagedDateSource(f.dateSource)) {
      clearDate(f);
    }

    if (hasBarangayDate(f)) {
      stats.alreadyHadDate++;
      continue;
    }

    const online = onlineCache[f.id];
    if (
      online?.month &&
      (online?.dayStart || online?.datePrecision === "month") &&
      applyDate(f, online)
    ) {
      stats.fromOnline++;
      continue;
    }

    const name = barangayLabel(f);
    const inferred = inferFeastFromBarangayName(name);
    if (inferred && applyDate(f, inferred)) {
      stats.fromPatronSaint++;
      continue;
    }

    stats.stillMissing++;
  }

  raw.generatedAt = new Date().toISOString();
  raw.dateBackfill = {
    appliedAt: raw.generatedAt,
    stats,
    lguScheduleStats: lguStats,
    methods: [
      "lgu-overrides",
      "lgu-siargao-islands",
      "lgu-biliran-latagaw",
      "lgu-biliran-island",
      "lgu-dagupan-gov-ph",
      "lgu-siquijor-secrets",
      "lgu-gma-cavite",
      "lgu-bayawan-city",
      "lgu-pinamungajan-gov-ph",
      "lgu-cabatuan-parish",
      "lgu-lucena-community-guide",
      "lgu-mulanay-gov-ph",
      "lgu-tarlac-city-gov-ph",
      "lgu-angono-brief-profile",
      "lgu-santa-barbara-iloilo-gov-ph",
      "lgu-balilihan-hanopol-parish",
      "lgu-ormoc-cultural-mapping",
      "lgu-quezon-city-brgy-directory",
      "zamboanga-com-community-guide",
      "parish-sacred-heart-poras-boac",
      "siquijor-directory-com",
      "parish-saint-joseph-palsong-bula",
      "parish-saint-mary-magdalene-bula",
      "parish-san-vicente-ferrer-ombao-polpog-bula",
      "parish-immaculate-conception-oton",
      "parish-sta-monica-oton",
      "parish-our-lady-of-candles-jelicuon-cabatuan",
      "iloilo-provincial-gov-brgy-sta-rita-oton",
      "curated-online",
      "lgu-maasin-city-gov-ph",
      "lgu-maasin-city-directory",
      "wikipedia-search-cache",
      "patron-saint-calendar",
    ],
  };
  raw.note =
    "One patronal fiesta per barangay. Dates from LGU schedules, patron-saint feast calendar, and Wikipedia enrichment cache where available.";

  fs.writeFileSync(RAW_FILE, JSON.stringify(raw, null, 2));

  const withDate = stats.total - stats.stillMissing;
  console.log(`Barangay fiesta dates backfilled → ${path.relative(ROOT, RAW_FILE)}`);
  console.log(`  Total:            ${stats.total}`);
  console.log(`  Already had date: ${stats.alreadyHadDate}`);
  console.log(`  LGU schedules:    ${stats.fromOverride}`);
  console.log(`  Patron saint:     ${stats.fromPatronSaint}`);
  console.log(`  Wikipedia cache:  ${stats.fromOnline}`);
  console.log(`  With date now:    ${withDate} (${((withDate / stats.total) * 100).toFixed(1)}%)`);
  console.log(`  Still missing:    ${stats.stillMissing}`);
  const siargao = lguStats.siargao;
  const biliranMay = lguStats.biliranMay ?? lguStats.biliran;
  const biliranApril = lguStats.biliranApril;
  const dagupan = lguStats.embeddedHtml?.dagupan ?? lguStats.fetchedOnline?.dagupan;
  const siquijor = lguStats.embeddedHtml?.siquijor ?? lguStats.fetchedOnline?.siquijor;
  if (siargao) {
    console.log(`  LGU index: Siargao ${siargao.matched}/${siargao.entries}`);
  }
  if (biliranMay) {
    console.log(`  LGU index: Biliran May ${biliranMay.matched}/${biliranMay.entries}`);
  }
  if (biliranApril) {
    console.log(`  LGU index: Biliran April ${biliranApril.matched}/${biliranApril.entries}`);
  }
  if (dagupan?.matched != null) {
    console.log(`  LGU index: Dagupan ${dagupan.matched}/${dagupan.entries}`);
  }
  if (siquijor?.matched != null) {
    console.log(`  LGU index: Siquijor ${siquijor.matched}/${siquijor.entries}`);
  }

  const samples = raw.festivals
    .filter((f) => f.dateSource?.startsWith("lgu-"))
    .slice(0, 5)
    .map((f) => `${barangayLabel(f)} → ${f.month}/${f.dayStart} (${f.dateSource})`);
  if (samples.length) {
    console.log("  Sample LGU matches:");
    for (const s of samples) console.log(`    ${s}`);
  }
}

main();
