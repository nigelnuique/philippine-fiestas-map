/**
 * Harvest ParishPH barangay feast candidates (generic province/municipality lists).
 * Filters out entries already present in curated LGU modules.
 *
 * Usage:
 *   node scripts/tmp-harvest-parishph-batch.mjs leyte
 *   node scripts/tmp-harvest-parishph-batch.mjs pangasinan
 */
import fs from "fs";
import { LEYTE_PARISH_FIESTA_ENTRIES } from "./lib/lgu-fiesta-schedules/leyte-parish-text.js";
import { TACLOBAN_FIESTA_ENTRIES } from "./lib/lgu-fiesta-schedules/tacloban-text.js";
import { ORMOC_FIESTA_ENTRIES } from "./lib/lgu-fiesta-schedules/ormoc-text.js";
import { DULAG_FIESTA_ENTRIES, CARIGARA_FIESTA_ENTRIES } from "./lib/lgu-fiesta-schedules/dulag-carigara-text.js";

const BATCH = process.argv[2] ?? "leyte";

const QUERIES = {
  leyte: [
    ["Hilongos", "Hilongos Leyte"],
    ["Baybay City", "Baybay City Leyte"],
    ["Baybay City", "Baybay Leyte"],
    ["Alangalang", "Alangalang Leyte"],
    ["Pastrana", "Pastrana Leyte"],
    ["Barugo", "Barugo Leyte"],
    ["Jaro", "Jaro Leyte"],
    ["La Paz", "La Paz Leyte"],
    ["San Miguel", "San Miguel Leyte"],
    ["Tunga", "Tunga Leyte"],
    ["Babatngon", "Babatngon Leyte"],
    ["Tabango", "Tabango Leyte"],
    ["Calubian", "Calubian Leyte"],
    ["Merida", "Merida Leyte"],
    ["Inopacan", "Inopacan Leyte"],
    ["Bato", "Bato Leyte"],
    ["Matalom", "Matalom Leyte"],
    ["Hindang", "Hindang Leyte"],
    ["MacArthur", "MacArthur Leyte"],
    ["Tabontabon", "Tabontabon Leyte"],
    ["City Of Baybay", "Baybay City Leyte"],
    ["Carigara", "Carigara Leyte"],
    ["Burauen", "Burauen Leyte"],
    ["Dagami", "Dagami Leyte"],
    ["Palompon", "Palompon Leyte"],
    ["City Of Tacloban (Capital)", "Tacloban City Leyte"],
  ],
  pangasinan: [
    ["City Of Dagupan", "Dagupan City Pangasinan"],
    ["Lingayen", "Lingayen Pangasinan"],
    ["San Carlos City", "San Carlos City Pangasinan"],
    ["Urdaneta City", "Urdaneta City Pangasinan"],
    ["Alaminos City", "Alaminos City Pangasinan"],
    ["Binmaley", "Binmaley Pangasinan"],
    ["Calasiao", "Calasiao Pangasinan"],
    ["Mangaldan", "Mangaldan Pangasinan"],
  ],
};

const provinceFilter = BATCH === "pangasinan" ? "Pangasinan" : "Leyte";

const existing = new Set(
  [
    ...LEYTE_PARISH_FIESTA_ENTRIES,
    ...TACLOBAN_FIESTA_ENTRIES,
    ...ORMOC_FIESTA_ENTRIES,
    ...DULAG_FIESTA_ENTRIES,
    ...CARIGARA_FIESTA_ENTRIES,
  ].map((e) => `${e.municipality}::${e.barangay}`.toLowerCase())
);

const raw = JSON.parse(
  fs.readFileSync("data/processed/festivals/barangay-fiestas-raw.json", "utf8")
);

function parseFeast(html) {
  const feast = (html.match(/Feast Day[^A-Za-z0-9]+([^<\|]+)/i) ?? [])[1]
    ?.replace(/&nbsp;/g, " ")
    .replace(/^b>\s*-\s*/i, "")
    .trim();
  if (!feast || /no record/i.test(feast)) return null;
  const patron = (html.match(/Patron Saint[^A-Za-z0-9]+([^<\|]+)/i) ?? [])[1]
    ?.replace(/&nbsp;/g, " ")
    .replace(/^b>\s*-\s*/i, "")
    .trim();
  return {
    feast,
    patron: patron && !/no record/i.test(patron) ? patron : undefined,
  };
}

function parseMonthDay(feast) {
  const m = feast.match(
    /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?/i
  );
  if (!m) return null;
  const months = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  };
  return {
    month: months[m[1].toLowerCase()],
    dayStart: Number(m[2]),
    dayEnd: m[3] ? Number(m[3]) : undefined,
  };
}

function headingBarangay(html) {
  const headings = [...html.matchAll(/<h3[^>]*>([^<]+)</gi)]
    .map((m) => m[1].trim())
    .filter((t) => /parish|mission|shrine|station|chapel/i.test(t) && !/search churches/i.test(t));
  for (const h of headings) {
    const m = h.match(/-\s*([^,]+),\s*([^,]+),\s*(Leyte|Pangasinan)/i);
    if (m) return { barangay: m[1].trim(), municipalityHint: m[2].trim(), province: m[3] };
  }
  return null;
}

function matchPsgc(municipality, barangayName) {
  const festivals = raw.festivals.filter((f) => f.municipality === municipality);
  const key = barangayName.toLowerCase().replace(/\s*\(pob\.?\)/i, "").trim();
  const hits = festivals.filter((f) => {
    const name = f.name.replace(/ Fiesta$/i, "");
    const nk = name.toLowerCase();
    return nk === key || nk.startsWith(key + " ") || nk.includes(`(${key})`) || nk.includes(` ${key}`);
  });
  if (hits.length === 1) return { barangay: hits[0].name.replace(/ Fiesta$/i, ""), unique: true };
  if (hits.length > 1) return { barangay: hits.map((h) => h.name.replace(/ Fiesta$/i, "")), unique: false };
  return null;
}

function munMatches(municipality, munHint) {
  const key = municipality
    .toLowerCase()
    .replace("city of ", "")
    .replace(" (capital)", "")
    .split(" ")[0];
  return munHint.toLowerCase().includes(key);
}

const all = [];
const seenUrls = new Set();

for (const [municipality, query] of QUERIES[BATCH] ?? []) {
  const searchHtml = await fetch(`https://www.parishph.com/search?q=${encodeURIComponent(query)}`, {
    headers: { "User-Agent": "Mozilla/5.0 philippine-fiestas-map" },
  }).then((r) => r.text());

  const urls = [
    ...new Set([...searchHtml.matchAll(/https:\/\/www\.parishph\.com\/2022\/06\/[a-z0-9-]+\.html/gi)].map((m) => m[0])),
  ];

  for (const url of urls) {
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);
    const html = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } }).then((r) => r.text());
    const feast = parseFeast(html);
    if (!feast) continue;
    const date = parseMonthDay(feast.feast);
    if (!date) continue;
    const loc = headingBarangay(html);
    if (!loc || loc.province.toLowerCase() !== provinceFilter.toLowerCase()) continue;
    if (!munMatches(municipality, loc.municipalityHint)) continue;
    const psgc = matchPsgc(municipality, loc.barangay);
    if (!psgc?.unique) continue;
    const dedupeKey = `${municipality}::${psgc.barangay}`.toLowerCase();
    if (existing.has(dedupeKey)) continue;
    all.push({
      municipality,
      province: provinceFilter,
      barangay: psgc.barangay,
      barangayHint: loc.barangay,
      ...date,
      patronSaint: feast.patron,
      feast: feast.feast,
      url: url.split("/").pop(),
    });
    await new Promise((r) => setTimeout(r, 200));
  }
}

console.log(JSON.stringify({ batch: BATCH, newUnique: all.length, entries: all }, null, 2));
