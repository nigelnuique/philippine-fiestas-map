/**
 * Harvest TheOldChurches parish pages → undated barangay feast candidates.
 *
 * Usage:
 *   node scripts/tmp-harvest-theoldchurches-province.mjs leyte
 *   node scripts/tmp-harvest-theoldchurches-province.mjs cebu
 */
import fs from "fs";

const PROVINCE_SLUG = process.argv[2] ?? "leyte";
const PROVINCE_NAME =
  PROVINCE_SLUG === "cebu"
    ? "Cebu"
    : PROVINCE_SLUG === "capiz"
      ? "Capiz"
      : PROVINCE_SLUG === "aklan"
        ? "Aklan"
        : PROVINCE_SLUG === "negros-occidental"
          ? "Negros Occidental"
          : "Leyte";

const MUN_ALIASES = {
  "ormoc-city": "Ormoc City",
  "tacloban-city": "City Of Tacloban (Capital)",
  "baybay-city": "City Of Baybay",
  "toledo-city": "City Of Toledo",
  "carcar-city": "City Of Carcar",
  "naga-city": "City Of Naga",
  "cebu-city": "City Of Cebu (Capital)",
  "iloilo-city": "City Of Iloilo (Capital)",
  "passi-city": "City Of Passi",
};

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
      [
        ...xml.matchAll(
          new RegExp(
            `<loc>(https:\\/\\/www\\.theoldchurches\\.com\\/philippines\\/${PROVINCE_SLUG}\\/[^<]+)<\\/loc>`,
            "gi"
          )
        ),
      ].map((m) => m[1])
    )
  ),
];

function normMun(s) {
  return s
    .toLowerCase()
    .replace(/^city of /, "")
    .replace(/ \(capital\)/, "")
    .replace(/ city$/, "")
    .trim();
}

function resolveMunicipality(slugParts) {
  const key = slugParts[0]?.toLowerCase();
  if (MUN_ALIASES[key]) return MUN_ALIASES[key];

  const guess = key
    ?.split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const exact = [
    ...new Set(
      raw.festivals
        .filter(
          (f) =>
            f.province === PROVINCE_NAME &&
            normMun(f.municipality) === normMun(guess)
        )
        .map((f) => f.municipality)
    ),
  ];
  if (exact.length === 1) return exact[0];

  const slugWords = key?.replace(/-/g, " ") ?? "";
  const partial = [
    ...new Set(
      raw.festivals
        .filter(
          (f) =>
            f.province === PROVINCE_NAME &&
            normMun(f.municipality).includes(slugWords)
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

  const addrLead = text.split(",")[0]?.toLowerCase().trim();
  if (addrLead && !/street|st\.|avenue|ave\.|road|corner|zone/i.test(addrLead)) {
    const leadHits = festivals.filter((f) => {
      const name = f.name.replace(/ Fiesta$/i, "");
      return name.toLowerCase() === addrLead || addrLead.startsWith(name.toLowerCase());
    });
    if (leadHits.length === 1) return leadHits[0].name.replace(/ Fiesta$/i, "");
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
        if (t.includes(base) && t.includes(district)) {
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
  const slugParts =
    url.split(`/philippines/${PROVINCE_SLUG}/`)[1]?.split("/").filter(Boolean) ??
    [];
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
    province: PROVINCE_NAME,
    barangay,
    month: feast.month,
    dayStart: feast.dayStart,
    feast: feast.text,
    addr,
    title,
    url: slugParts.join("/"),
  });
  await new Promise((r) => setTimeout(r, 45));
}

console.log(
  JSON.stringify(
    {
      province: PROVINCE_NAME,
      urls: urls.length,
      candidates: candidates.length,
      entries: candidates,
      debugSample: debug.slice(0, 25),
    },
    null,
    2
  )
);
