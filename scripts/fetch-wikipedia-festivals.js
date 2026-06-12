/**
 * Scrapes the Wikipedia "List of festivals in the Philippines" tables.
 * ~1,000+ named festivals (not the full ~42k barangay fiestas).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as cheerio from "cheerio";
import { slugify } from "./lib/slugify.js";
import { enrichFestivalDates } from "./lib/date-parser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "data", "processed", "festivals", "wikipedia-festivals.json");

const WIKI_API =
  "https://en.wikipedia.org/w/api.php?action=parse&page=List_of_festivals_in_the_Philippines&prop=text&format=json";

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

function cleanCell(html) {
  return html
    .replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[.*?\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function monthFromHeading(text) {
  const lower = text.toLowerCase();
  const idx = MONTHS.findIndex((m) => lower.includes(m));
  return idx >= 0 ? idx + 1 : null;
}

function parseMonthFromDate(dateText) {
  const lower = dateText.toLowerCase();
  for (let i = 0; i < MONTHS.length; i++) {
    if (lower.includes(MONTHS[i])) return i + 1;
  }
  return null;
}

function isFestivalTable(headers) {
  const h = headers.map((x) => x.toLowerCase());
  return h.includes("name") && (h.includes("location") || h.includes("date"));
}

export async function fetchWikipediaFestivals() {
  const res = await fetch(WIKI_API, {
    headers: { "User-Agent": "philippine-fiestas-map-data-bot/0.2" },
  });
  if (!res.ok) throw new Error(`Wikipedia fetch failed: ${res.status}`);

  const data = await res.json();
  const html = data.parse?.text?.["*"];
  if (!html) throw new Error("Wikipedia parse response missing HTML");

  const $ = cheerio.load(html);
  const festivals = [];
  let currentMonth = null;

  $("h3, table").each((_, el) => {
    const tag = el.tagName?.toLowerCase();
    if (tag === "h3") {
      const month = monthFromHeading($(el).text());
      if (month) currentMonth = month;
      return;
    }

    const headers = $(el)
      .find("tr")
      .first()
      .find("th")
      .map((__, th) => cleanCell($(th).html() ?? ""))
      .get();

    if (!isFestivalTable(headers)) return;

    const nameIdx = headers.findIndex((h) => h.toLowerCase() === "name");
    const dateIdx = headers.findIndex((h) => h.toLowerCase() === "date");
    const locIdx = headers.findIndex((h) => h.toLowerCase() === "location");
    const notesIdx = headers.findIndex((h) => h.toLowerCase() === "notes");

    $(el)
      .find("tr")
      .slice(1)
      .each((__, row) => {
        const cells = $(row)
          .find("td")
          .map((___, td) => cleanCell($(td).html() ?? ""))
          .get();
        if (cells.length < 3) return;

        const name = cells[nameIdx] ?? cells[0];
        const dateVenue = cells[dateIdx] ?? "";
        const location = cells[locIdx] ?? cells[1] ?? "";
        const description = notesIdx >= 0 ? cells[notesIdx] : "";

        if (!name || name.length < 2) return;
        if (/^(name|date|location)/i.test(name)) return;

        const locationText = location || dateVenue;
        if (!locationText || /^(nationwide|world)/i.test(locationText)) return;

        const month = currentMonth ?? parseMonthFromDate(dateVenue);

        const dateVenueRaw = [dateVenue, location].filter(Boolean).join(" ").trim();
        const dates = enrichFestivalDates({ month, dateVenueRaw });

        festivals.push({
          id: `wiki-${slugify(name)}-${slugify(locationText).slice(0, 40)}`,
          name,
          month: dates.month ?? month,
          dayStart: dates.dayStart ?? null,
          dayEnd: dates.dayEnd ?? null,
          dateVenueRaw,
          locationText,
          description: description || null,
          source: "wikipedia",
          sourceUrl: "https://en.wikipedia.org/wiki/List_of_festivals_in_the_Philippines",
        });
      });
  });

  const seen = new Set();
  return festivals.filter((f) => {
    const key = `${f.name.toLowerCase()}|${f.locationText.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function main() {
  const festivals = await fetchWikipediaFestivals();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(
    OUT,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: "Wikipedia List of festivals in the Philippines",
        count: festivals.length,
        festivals,
      },
      null,
      2
    )
  );
  console.log(`Wikipedia festivals written to ${path.relative(ROOT, OUT)}`);
  console.log(`  Count: ${festivals.length}`);
}

if (process.argv[1]?.endsWith("fetch-wikipedia-festivals.js")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
