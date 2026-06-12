/**
 * Gathers festival data from:
 * 1. Tourism Promotions Board (DOT) calendar page (scraped)
 * 2. Curated seed list of major national festivals
 *
 * Output: data/processed/festivals/raw-festivals.json
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as cheerio from "cheerio";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "data", "processed", "festivals");

const TPB_URL =
  "https://tpb.gov.ph/tpb-calendar-of-promotions-and-marketing-activities/calendar-of-philippine-festivals-and-monthly-observances-theme/";

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

/** Major festivals with structured location hints for geocoding */
const SEED_FESTIVALS = [
  {
    name: "Sinulog Festival",
    month: 1,
    dayStart: 15,
    locationText: "Cebu City, Cebu",
    province: "Cebu",
    municipality: "Cebu City",
    type: "religious-cultural",
    description:
      "Grand festival honoring the Santo Niño with street dancing and fluvial parade.",
    source: "seed",
  },
  {
    name: "Ati-Atihan Festival",
    month: 1,
    dayStart: 20,
    locationText: "Kalibo, Aklan",
    province: "Aklan",
    municipality: "Kalibo",
    type: "religious-cultural",
    description: "Street festival with tribal face paint honoring the Santo Niño.",
    source: "seed",
  },
  {
    name: "Dinagyang Festival",
    month: 1,
    dayStart: 25,
    locationText: "Iloilo City, Iloilo",
    province: "Iloilo",
    municipality: "Iloilo City",
    type: "religious-cultural",
    description: "Warrior-painted tribes dance in honor of the Santo Niño.",
    source: "seed",
  },
  {
    name: "Feast of the Black Nazarene",
    month: 1,
    dayStart: 9,
    locationText: "Quiapo, Manila",
    province: "Metro Manila",
    municipality: "Manila",
    type: "religious",
    description: "Procession honoring the Black Nazarene in Quiapo.",
    source: "seed",
  },
  {
    name: "Panagbenga Festival",
    month: 2,
    dayStart: 1,
    dayEnd: 28,
    locationText: "Baguio City, Benguet",
    province: "Benguet",
    municipality: "Baguio City",
    type: "cultural",
    description: "Flower festival with floats and street dancing.",
    source: "seed",
  },
  {
    name: "Moriones Festival",
    month: 3,
    dayStart: 15,
    dayEnd: 21,
    locationText: "Marinduque",
    province: "Marinduque",
    municipality: null,
    type: "religious-cultural",
    description: "Holy Week reenactment with Roman centurion masks.",
    source: "seed",
  },
  {
    name: "Pahiyas Festival",
    month: 5,
    dayStart: 15,
    locationText: "Lucban, Quezon",
    province: "Quezon",
    municipality: "Lucban",
    type: "harvest",
    description: "Homes decorated with colorful kiping rice wafers.",
    source: "seed",
  },
  {
    name: "Pintados-Kasadyaan Festival",
    month: 6,
    dayStart: 29,
    locationText: "Tacloban City, Leyte",
    province: "Leyte",
    municipality: "Tacloban City",
    type: "cultural",
    description: "Body-paint festival honoring pre-colonial warrior traditions.",
    source: "seed",
  },
  {
    name: "Sandugo Festival",
    month: 7,
    dayStart: 1,
    dayEnd: 31,
    locationText: "Tagbilaran City, Bohol",
    province: "Bohol",
    municipality: "Tagbilaran City",
    type: "historical",
    description: "Commemorates the blood compact between Sikatuna and Legazpi.",
    source: "seed",
  },
  {
    name: "Kadayawan Festival",
    month: 8,
    dayStart: 1,
    dayEnd: 31,
    locationText: "Davao City, Davao del Sur",
    province: "Davao del Sur",
    municipality: "Davao City",
    type: "harvest-cultural",
    description: "Thanksgiving festival celebrating tribal heritage and harvest.",
    source: "seed",
  },
  {
    name: "MassKara Festival",
    month: 10,
    dayStart: 1,
    dayEnd: 31,
    locationText: "Bacolod City, Negros Occidental",
    province: "Negros Occidental",
    municipality: "Bacolod City",
    type: "cultural",
    description: "Festival of smiling masks and street dancing.",
    source: "seed",
  },
  {
    name: "Giant Lantern Festival",
    month: 12,
    dayStart: 15,
    locationText: "San Fernando, Pampanga",
    province: "Pampanga",
    municipality: "San Fernando City",
    type: "cultural",
    description: "Giant parol lanterns competition.",
    source: "seed",
  },
];

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseTpbRow(cells, currentMonth) {
  const name = cells[0]?.trim();
  const dateVenue = cells[1]?.trim() ?? "";
  const description = cells[2]?.trim() ?? "";

  if (!name || MONTHS.includes(name.toLowerCase())) return null;
  if (!dateVenue) return null;

  return {
    id: `tpb-${slugify(name)}`,
    name,
    month: currentMonth,
    dateVenueRaw: dateVenue,
    locationText: dateVenue,
    description,
    source: "tpb",
    sourceUrl: TPB_URL,
  };
}

async function scrapeTpb() {
  console.log(`Fetching TPB calendar from ${TPB_URL}`);
  const res = await fetch(TPB_URL, {
    headers: { "User-Agent": "philippine-fiestas-map-data-bot/0.1" },
  });

  if (!res.ok) {
    throw new Error(`TPB fetch failed: ${res.status} ${res.statusText}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const festivals = [];
  let currentMonth = null;

  $("table tr").each((_, row) => {
    const cells = $(row)
      .find("td")
      .map((__, td) => $(td).text().replace(/\s+/g, " ").trim())
      .get();

    if (cells.length === 0) {
      const header = $(row).find("th, td").first().text().trim().toLowerCase();
      if (MONTHS.includes(header)) currentMonth = MONTHS.indexOf(header) + 1;
      return;
    }

    if (cells.length === 1) {
      const maybeMonth = cells[0].toLowerCase();
      if (MONTHS.includes(maybeMonth)) {
        currentMonth = MONTHS.indexOf(maybeMonth) + 1;
      }
      return;
    }

    const parsed = parseTpbRow(cells, currentMonth);
    if (parsed) festivals.push(parsed);
  });

  // Fallback: parse pipe tables in page text blocks
  if (festivals.length < 10) {
    $("table").each((_, table) => {
      $(table)
        .find("tr")
        .each((__, row) => {
          const cells = $(row)
            .find("td")
            .map((___, td) => $(td).text().replace(/\s+/g, " ").trim())
            .get();
          if (cells.length >= 2) {
            const first = cells[0].toLowerCase();
            if (MONTHS.includes(first)) {
              currentMonth = MONTHS.indexOf(first) + 1;
              return;
            }
            const parsed = parseTpbRow(cells, currentMonth);
            if (parsed) festivals.push(parsed);
          }
        });
    });
  }

  const seen = new Set();
  return festivals.filter((f) => {
    const key = f.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildSeedRecords() {
  return SEED_FESTIVALS.map((f) => ({
    id: `seed-${slugify(f.name)}`,
    name: f.name,
    month: f.month,
    dayStart: f.dayStart ?? null,
    dayEnd: f.dayEnd ?? null,
    locationText: f.locationText,
    province: f.province,
    municipality: f.municipality,
    type: f.type,
    description: f.description,
    source: f.source,
  }));
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let tpbFestivals = [];
  try {
    tpbFestivals = await scrapeTpb();
    console.log(`  Scraped ${tpbFestivals.length} festivals from TPB`);
  } catch (err) {
    console.warn(`  TPB scrape failed: ${err.message}`);
    console.warn("  Continuing with seed data only.");
  }

  const seedFestivals = buildSeedRecords();
  const output = {
    generatedAt: new Date().toISOString(),
    sources: [
      { id: "tpb", name: "Tourism Promotions Board", url: TPB_URL },
      { id: "seed", name: "Curated major festivals", url: null },
    ],
    counts: {
      tpb: tpbFestivals.length,
      seed: seedFestivals.length,
      total: tpbFestivals.length + seedFestivals.length,
    },
    festivals: {
      tpb: tpbFestivals,
      seed: seedFestivals,
    },
  };

  const outFile = path.join(OUT_DIR, "raw-festivals.json");
  fs.writeFileSync(outFile, JSON.stringify(output, null, 2));
  console.log(`Festival data written to ${path.relative(ROOT, outFile)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
