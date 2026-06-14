/**
 * Harvest TheOldChurches Iloilo province parish pages → undated barangay feast candidates.
 */
import fs from "fs";

const raw = JSON.parse(
  fs.readFileSync("data/processed/festivals/barangay-fiestas-raw.json", "utf8")
);

const sitemaps = await Promise.all(
  ["post-sitemap.xml", "post-sitemap2.xml"].map((path) =>
    fetch(`https://www.theoldchurches.com/${path}`, {
      headers: { "User-Agent": "Mozilla/5.0 philippine-fiestas-map" },
    })
      .then((r) => r.text())
      .catch(() => "")
  )
);

const urls = [
  ...new Set(
    sitemaps.flatMap((xml) =>
      [...xml.matchAll(/<loc>(https:\/\/www\.theoldchurches\.com\/philippines\/iloilo\/[^<]+)<\/loc>/gi)].map(
        (m) => m[1]
      )
    )
  ),
];

const MUN_ALIASES = {
  "iloilo-city": "City Of Iloilo (Capital)",
  "passi-city": "City Of Passi",
  "san-enrique-iloilo": "San Enrique",
  "san-miguel-iloilo": "San Miguel",
  "santa-barbara": "Santa Barbara",
};

function resolveMunicipality(slugParts) {
  const key = slugParts[0]?.toLowerCase();
  if (MUN_ALIASES[key]) return MUN_ALIASES[key];
  const guess = key
    ?.split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  const hits = [
    ...new Set(
      raw.festivals
        .filter(
          (f) =>
            f.province === "Iloilo" &&
            f.municipality.toLowerCase().replace(/^city of /, "") ===
              guess?.toLowerCase()
        )
        .map((f) => f.municipality)
    ),
  ];
  if (hits.length === 1) return hits[0];
  const partial = [
    ...new Set(
      raw.festivals
        .filter(
          (f) =>
            f.province === "Iloilo" &&
            f.municipality.toLowerCase().includes(key?.replace(/-/g, " ") ?? "")
        )
        .map((f) => f.municipality)
    ),
  ];
  return partial.length === 1 ? partial[0] : null;
}

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
  return null;
}

function extractBarangayHint(text) {
  const brgy =
    text.match(/Brgy\.?\s*([^,]+)/i)?.[1]?.trim() ??
    text.match(/Barangay\s+([^,]+)/i)?.[1]?.trim();
  if (brgy) return brgy.replace(/\s*\(pob\.?\)/i, "").trim();
  return null;
}

function matchBarangay(municipality, text) {
  const festivals = raw.festivals.filter((f) => f.municipality === municipality);
  const hint = extractBarangayHint(text);
  const t = text.toLowerCase();

  if (hint) {
    const key = hint.toLowerCase();
    const hits = festivals.filter((f) => {
      const name = f.name.replace(/ Fiesta$/i, "");
      const nk = name.toLowerCase();
      return (
        nk === key ||
        nk.startsWith(key + " ") ||
        nk.includes(`(${key})`) ||
        nk.includes(` ${key}`)
      );
    });
    if (hits.length === 1) return hits[0].name.replace(/ Fiesta$/i, "");
  }

  const scored = [];
  for (const f of festivals) {
    const name = f.name.replace(/ Fiesta$/i, "");
    const nk = name.toLowerCase();
    if (t.includes(nk)) scored.push({ name, len: nk.length });
    else {
      const paren = nk.match(/^(.+?)\s*\(([^)]+)\)$/);
      if (paren) {
        const [, base, district] = paren;
        if (
          t.includes(base) &&
          (t.includes(district) ||
            t.includes(district.replace("lapuz", "la paz")))
        ) {
          scored.push({ name, len: nk.length });
        }
      }
    }
  }
  scored.sort((a, b) => b.len - a.len);
  const uniq = [...new Set(scored.map((s) => s.name))];
  return uniq.length === 1 ? uniq[0] : null;
}

function undated(municipality, barangay) {
  const f = raw.festivals.find(
    (x) =>
      x.municipality === municipality &&
      x.name.replace(/ Fiesta$/i, "") === barangay
  );
  return f && !f.month;
}

const candidates = [];
const debug = [];

for (const url of urls) {
  const slugParts = url.split("/philippines/iloilo/")[1]?.split("/").filter(Boolean) ?? [];
  const municipality = resolveMunicipality(slugParts);
  if (!municipality) continue;

  const html = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } })
    .then((r) => (r.ok ? r.text() : null))
    .catch(() => null);
  if (!html || /<title>[^<]*page not found/i.test(html)) continue;

  const feast = parseFeast(html);
  if (!feast) continue;

  const addr =
    (html.match(/Address<\/td><td>([^<]+)/i) ?? [])[1]?.trim() ?? "";
  const title = (html.match(/<h1[^>]*>([^<]+)/i) ?? [])[1]?.trim() ?? url;
  const barangay = matchBarangay(municipality, `${addr} ${title}`);

  if (!barangay) {
    debug.push({ municipality, title, addr, feast, url: slugParts.join("/") });
    continue;
  }
  if (!undated(municipality, barangay)) continue;

  candidates.push({
    municipality,
    barangay,
    month: feast.month,
    dayStart: feast.dayStart,
    feast: feast.text,
    addr,
    title,
    url: slugParts.join("/"),
  });
  await new Promise((r) => setTimeout(r, 50));
}

console.log(
  JSON.stringify(
    {
      urls: urls.length,
      candidates: candidates.length,
      entries: candidates,
      debugSample: debug.slice(0, 20),
    },
    null,
    2
  )
);
