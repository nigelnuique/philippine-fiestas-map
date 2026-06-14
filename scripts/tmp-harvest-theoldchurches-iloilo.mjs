/**
 * Harvest TheOldChurches Iloilo City parish pages → undated barangay feast candidates.
 */
import fs from "fs";

const raw = JSON.parse(
  fs.readFileSync("data/processed/festivals/barangay-fiestas-raw.json", "utf8")
);
const MUN = "City Of Iloilo (Capital)";
const festivals = raw.festivals.filter((f) => f.municipality === MUN);

function undated(barangay) {
  const f = festivals.find(
    (x) => x.name.replace(/ Fiesta$/i, "") === barangay
  );
  return f && !f.month;
}

const sitemap = await fetch("https://www.theoldchurches.com/post-sitemap.xml", {
  headers: { "User-Agent": "Mozilla/5.0 philippine-fiestas-map" },
})
  .then((r) => r.text())
  .catch(() => "");

const slugs = [
  ...new Set(
    [...sitemap.matchAll(/iloilo-city\/([^<]+)/g)].map((m) =>
      m[1].replace(/\/$/, "")
    )
  ),
];

function parseFeast(html) {
  const table = (html.match(/Feast day<\/td><td>([^<]+)/i) ?? [])[1]
    ?.replace(/<[^>]+>/g, "")
    .trim();
  if (table) {
    const months = {
      january: 1,
      february: 2,
      march: 3,
      april: 4,
      may: 5,
      june: 6,
      july: 7,
      august: 8,
      september: 9,
      october: 10,
      november: 11,
      december: 12,
    };
    const md = table.match(
      /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})/i
    );
    if (md)
      return {
        month: months[md[1].toLowerCase()],
        dayStart: Number(md[2]),
        text: table,
      };
    const mdOnly = table.match(
      /^(January|February|March|April|May|June|July|August|September|October|November|December)$/i
    );
    if (mdOnly)
      return { month: months[mdOnly[1].toLowerCase()], dayStart: 1, text: table, monthOnly: true };
  }
  const prose = html.match(
    /feast[^.]{0,40}(?:every|on|falls on|scheduled every|observed every|set every|is every)\s+([^.]+?)(?:\.|<)/i
  );
  if (!prose) return null;
  const s = prose[1].replace(/<[^>]+>/g, "").trim();
  const months = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12,
  };
  const md = s.match(
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})/i
  );
  if (md)
    return {
      month: months[md[1].toLowerCase()],
      dayStart: Number(md[2]),
      text: s,
    };
  const ord = s.match(
    /(\d{1,2})(?:st|nd|rd|th)?\s+of\s+(January|February|March|April|May|June|July|August|September|October|November|December)/i
  );
  if (ord)
    return {
      month: months[ord[2].toLowerCase()],
      dayStart: Number(ord[1]),
      text: s,
    };
  const first = s.match(
    /first\s+of\s+(January|February|March|April|May|June|July|August|September|October|November|December)/i
  );
  if (first)
    return {
      month: months[first[1].toLowerCase()],
      dayStart: 1,
      text: s,
    };
  return null;
}

function matchBarangay(text) {
  const t = text.toLowerCase();
  const hits = [];
  for (const f of festivals) {
    const name = f.name.replace(/ Fiesta$/i, "");
    const nk = name.toLowerCase();
    if (t.includes(nk)) {
      hits.push(name);
      continue;
    }
    const paren = nk.match(/^(.+?)\s*\(([^)]+)\)$/);
    if (paren) {
      const [, base, district] = paren;
      if (
        t.includes(base) &&
        (t.includes(district) ||
          t.includes(district.replace("lapuz", "la paz")) ||
          t.includes(district.replace("jaro", "jaro")))
      ) {
        hits.push(name);
      }
    }
  }
  return [...new Set(hits)];
}

const allPages = [];
const candidates = [];

for (const slug of slugs) {
  const url = `https://www.theoldchurches.com/philippines/iloilo/iloilo-city/${slug}/`;
  const html = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  })
    .then((r) => (r.ok ? r.text() : null))
    .catch(() => null);
  if (!html || /<title>[^<]*page not found/i.test(html)) continue;
  const feast = parseFeast(html);
  if (!feast) continue;
  const addr =
    (html.match(/Address<\/td><td>([^<]+)/i) ?? [])[1]?.trim() ??
    (html.match(/Address[^|]*\|\s*([^|<]+)/i) ?? [])[1]?.trim() ??
    "";
  const title = (html.match(/<h1[^>]*>([^<]+)/i) ?? [])[1]?.trim() ?? slug;
  const hits = matchBarangay(`${addr} ${title}`);
  allPages.push({ slug, title, addr, feast, hits });
  if (hits.length === 1 && undated(hits[0])) {
    candidates.push({
      barangay: hits[0],
      month: feast.month,
      dayStart: feast.dayStart,
      feast: feast.text,
      addr,
      slug,
      title,
    });
  }
  await new Promise((r) => setTimeout(r, 60));
}

console.log(
  JSON.stringify(
    {
      slugs: slugs.length,
      withFeast: allPages.length,
      candidates: candidates.length,
      entries: candidates,
      debugAmbiguous: allPages.filter((p) => p.hits.length !== 1).slice(0, 15),
    },
    null,
    2
  )
);
