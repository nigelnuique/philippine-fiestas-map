/**
 * Gathers named festival data from:
 * 1. Tourism Promotions Board (DOT) calendar page (scraped)
 * 2. Curated seed list of major national festivals
 * 3. Wikipedia festival list
 *
 * Barangay patron fiestas are generated separately by fetch-barangay-fiestas.js.
 * Output: data/processed/festivals/raw-festivals.json
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as cheerio from "cheerio";
import { slugify } from "./lib/slugify.js";
import { enrichFestivalDates } from "./lib/date-parser.js";
import { fetchWikipediaFestivals } from "./fetch-wikipedia-festivals.js";
import { MAJOR_FESTIVAL_DESCRIPTIONS_BY_ID } from "./lib/major-festival-descriptions.js";

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
    description: MAJOR_FESTIVAL_DESCRIPTIONS_BY_ID["seed-sinulog-festival"],
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
    description: MAJOR_FESTIVAL_DESCRIPTIONS_BY_ID["seed-ati-atihan-festival"],
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
    description: MAJOR_FESTIVAL_DESCRIPTIONS_BY_ID["seed-dinagyang-festival"],
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
    description: MAJOR_FESTIVAL_DESCRIPTIONS_BY_ID["seed-feast-of-the-black-nazarene"],
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
    description: MAJOR_FESTIVAL_DESCRIPTIONS_BY_ID["seed-panagbenga-festival"],
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
    description: MAJOR_FESTIVAL_DESCRIPTIONS_BY_ID["seed-moriones-festival"],
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
    description: MAJOR_FESTIVAL_DESCRIPTIONS_BY_ID["seed-pahiyas-festival"],
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
    description: MAJOR_FESTIVAL_DESCRIPTIONS_BY_ID["seed-pintados-kasadyaan-festival"],
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
    description: MAJOR_FESTIVAL_DESCRIPTIONS_BY_ID["seed-sandugo-festival"],
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
    description: MAJOR_FESTIVAL_DESCRIPTIONS_BY_ID["seed-kadayawan-festival"],
    source: "seed",
  },
  {
    name: "MassKara Festival",
    month: 10,
    dayStart: 19,
    dayEnd: 22,
    locationText: "Bacolod City, Negros Occidental",
    province: "Negros Occidental",
    municipality: "Bacolod City",
    type: "cultural",
    description: MAJOR_FESTIVAL_DESCRIPTIONS_BY_ID["seed-masskara-festival"],
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
    description: MAJOR_FESTIVAL_DESCRIPTIONS_BY_ID["seed-giant-lantern-festival"],
    source: "seed",
  },
  {
    name: "Mantawi Festival",
    month: 5,
    dayStart: 8,
    locationText: "Mandaue City, Cebu",
    province: "Cebu",
    municipality: "Mandaue City",
    type: "cultural",
    description: MAJOR_FESTIVAL_DESCRIPTIONS_BY_ID["seed-mantawi-festival"],
    source: "seed",
  },
  {
    name: "Kadaugan sa Mactan",
    month: 4,
    dayStart: 27,
    locationText: "Lapu-Lapu City, Cebu",
    province: "Cebu",
    municipality: "Lapu-Lapu City",
    type: "historical",
    description: MAJOR_FESTIVAL_DESCRIPTIONS_BY_ID["seed-kadaugan-sa-mactan"],
    source: "seed",
  },
  {
    name: "Virgen de la Regla Festival",
    month: 11,
    dayStart: 21,
    locationText: "Lapu-Lapu City, Cebu",
    province: "Cebu",
    municipality: "Lapu-Lapu City",
    type: "religious",
    description: MAJOR_FESTIVAL_DESCRIPTIONS_BY_ID["seed-virgen-de-la-regla-festival"],
    source: "seed",
  },
];

function parseTpbRow(cells, currentMonth) {
  const name = cells[0]?.trim();
  const dateVenue = cells[1]?.trim() ?? "";
  const description = cells[2]?.trim() ?? "";

  if (!name || MONTHS.includes(name.toLowerCase())) return null;
  if (!dateVenue) return null;

  const dates = enrichFestivalDates({ month: currentMonth, dateVenueRaw: dateVenue });

  return {
    id: `tpb-${slugify(name)}`,
    name,
    month: dates.month ?? currentMonth,
    dayStart: dates.dayStart ?? null,
    dayEnd: dates.dayEnd ?? null,
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

  let wikiFestivals = [];
  try {
    wikiFestivals = await fetchWikipediaFestivals();
    console.log(`  Scraped ${wikiFestivals.length} festivals from Wikipedia`);
  } catch (err) {
    console.warn(`  Wikipedia scrape failed: ${err.message}`);
  }

  const output = {
    generatedAt: new Date().toISOString(),
    sources: [
      { id: "tpb", name: "Tourism Promotions Board", url: TPB_URL },
      { id: "seed", name: "Curated major festivals", url: null },
      {
        id: "wikipedia",
        name: "Wikipedia festival list",
        url: "https://en.wikipedia.org/wiki/List_of_festivals_in_the_Philippines",
      },
    ],
    counts: {
      tpb: tpbFestivals.length,
      seed: seedFestivals.length,
      wikipedia: wikiFestivals.length,
      totalNamed: tpbFestivals.length + seedFestivals.length + wikiFestivals.length,
    },
    festivals: {
      tpb: tpbFestivals,
      seed: seedFestivals,
      wikipedia: wikiFestivals,
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
