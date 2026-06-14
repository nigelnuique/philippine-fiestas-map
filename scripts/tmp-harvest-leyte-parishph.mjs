/**
 * Harvest ParishPH barangay feast candidates for Leyte municipalities.
 * Outputs JSON with PSGC match status for curated module authoring.
 */
import fs from "fs";

const QUERIES = [
  ["Palo", "Palo Leyte"],
  ["Tanauan", "Tanauan Leyte"],
  ["Hilongos", "Hilongos Leyte"],
  ["Baybay City", "Baybay City Leyte"],
  ["Abuyog", "Abuyog Leyte"],
  ["Jaro", "Jaro Leyte"],
  ["Barugo", "Barugo Leyte"],
  ["Tolosa", "Tolosa Leyte"],
  ["Alangalang", "Alangalang Leyte"],
  ["Pastrana", "Pastrana Leyte"],
  ["Capoocan", "Capoocan Leyte"],
  ["Kananga", "Kananga Leyte"],
  ["MacArthur", "MacArthur Leyte"],
  ["Tabontabon", "Tabontabon Leyte"],
  ["Villaba", "Villaba Leyte"],
  ["Isabel", "Isabel Leyte"],
  ["Calubian", "Calubian Leyte"],
  ["Merida", "Merida Leyte"],
  ["Inopacan", "Inopacan Leyte"],
  ["Bato", "Bato Leyte"],
  ["Matalom", "Matalom Leyte"],
  ["Hindang", "Hindang Leyte"],
  ["City Of Tacloban (Capital)", "Tacloban City Leyte"],
];

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
    const m = h.match(/-\s*([^,]+),\s*([^,]+),\s*Leyte/i);
    if (m) return { barangay: m[1].trim(), municipalityHint: m[2].trim() };
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

const all = [];

for (const [municipality, query] of QUERIES) {
  const searchHtml = await fetch(`https://www.parishph.com/search?q=${encodeURIComponent(query)}`, {
    headers: { "User-Agent": "Mozilla/5.0 philippine-fiestas-map" },
  }).then((r) => r.text());

  const urls = [
    ...new Set([...searchHtml.matchAll(/https:\/\/www\.parishph\.com\/2022\/06\/[a-z0-9-]+\.html/gi)].map((m) => m[0])),
  ];

  for (const url of urls) {
    const html = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } }).then((r) => r.text());
    const feast = parseFeast(html);
    if (!feast) continue;
    const date = parseMonthDay(feast.feast);
    if (!date) continue;
    const loc = headingBarangay(html);
    if (!loc) continue;
    const munHint = loc.municipalityHint.toLowerCase();
    const munKey = municipality.toLowerCase();
    if (!munHint.includes(munKey.replace("city of ", "").replace(" (capital)", "").split(" ")[0])) {
      continue;
    }
    const psgc = matchPsgc(municipality, loc.barangay);
    all.push({
      municipality,
      barangayHint: loc.barangay,
      ...date,
      patronSaint: feast.patron,
      feast: feast.feast,
      url: url.split("/").pop(),
      psgc,
    });
    await new Promise((r) => setTimeout(r, 250));
  }
}

const unique = all.filter((r) => r.psgc?.unique);
console.log(JSON.stringify({ total: all.length, uniqueMatches: unique.length, unique, ambiguous: all.filter((r) => r.psgc && !r.psgc.unique) }, null, 2));
