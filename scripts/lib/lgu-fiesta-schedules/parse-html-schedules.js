import * as cheerio from "cheerio";
import { parseDateFromRaw } from "../date-parser.js";
import { normalizePlaceName } from "../barangay-psgc-index.js";
import { normalizeMaasinDirectoryBarangay } from "./maasin-text.js";
import { mapBiliranBarangay } from "./parse-schedule.js";

function cleanCell(text) {
  return String(text ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function entryFromDate(barangay, municipality, dateRaw, dateSource) {
  if (!barangay || !dateRaw || /by sitio/i.test(dateRaw)) return null;
  const parsed = parseDateFromRaw(dateRaw);
  if (!parsed?.month || !parsed?.dayStart) return null;
  return {
    barangay,
    municipality,
    month: parsed.month,
    dayStart: parsed.dayStart,
    dayEnd: parsed.dayEnd !== parsed.dayStart ? parsed.dayEnd : undefined,
    dateSource,
  };
}

/** Dagupan City LGU calendar table (two barangays per row). */
export function parseDagupanFiestaTable(html) {
  const $ = cheerio.load(html);
  const entries = [];

  $("h4")
    .filter((_, el) => /barangay fiesta/i.test($(el).text()))
    .next("table")
    .find("tr")
    .each((_, tr) => {
      const cells = $(tr)
        .find("td")
        .map((__, td) => cleanCell($(td).text()))
        .get();
      for (const [bi, di] of [
        [0, 1],
        [2, 3],
      ]) {
        const row = entryFromDate(
          cells[bi],
          "City of Dagupan",
          cells[di],
          "lgu-dagupan-gov-ph"
        );
        if (row) entries.push(row);
      }
    });

  return entries;
}

const MAGALLANES_BARANGAY_ALIASES = {
  "tula tula norte": "Tulatula Norte",
  "tula tula sur": "Tulatula Sur",
  "sta elena": "Santa Elena",
  "binisitahan norte": "Binisitahan del Norte",
  "binisitahan sur": "Binisitahan del Sur",
  "sitio bayawas salvacion": "Salvacion",
  "sitio dumalwa incarizan": "Incarizan",
  "sitio san isidro salvacion": "Salvacion",
  "sitio maransas pili": "Pili",
  "sitio binalyuhan caditaan": "Caditaan",
  "sitio balagting hubo": "Hubo",
  "sitio looc cagbolo": "Cagbolo",
  "sitio pangpang caditaan": "Caditaan",
  "sitio sua caditaan": "Caditaan",
  "sitio gibalon siuton": "Siuton",
  "sitio sagpan siuton": "Siuton",
  "sitio tinago": null,
  "sitio sta lourdes": null,
  "sitio telegrapo": null,
};

function normalizeMagallanesBarangay(name) {
  const cleaned = String(name ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const fromSitio = /^sitio\b/i.test(cleaned);
  const key = cleaned
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(sta|sto)\b/g, (m) => (m === "sta" ? "santa" : "santo"))
    .replace(/\s+/g, " ")
    .trim();
  if (MAGALLANES_BARANGAY_ALIASES[key] === null) return null;
  if (MAGALLANES_BARANGAY_ALIASES[key]) {
    return { barangay: MAGALLANES_BARANGAY_ALIASES[key], fromSitio };
  }
  const barangay =
    cleaned.replace(/^sitio\s+/i, "").replace(/\s*\([^)]+\)\s*$/, "").trim() || cleaned;
  return { barangay, fromSitio };
}

function normalizeSantaBarbaraBarangay(name) {
  return String(name ?? "")
    .replace(/^barangay\s+/i, "")
    .replace(/\s*\(poblacion\)/i, " (Pob.)")
    .replace(/\bzone\s+([ivxlc]+)\b/gi, (_, num) => `Zone ${num.toUpperCase()}`)
    .replace(/\bIi\b/g, "II")
    .replace(/\bIii\b/g, "III")
    .replace(/\bIv\b/g, "IV")
    .replace(/\bVi\b/g, "VI")
    .trim();
}

/** Santa Barbara, Iloilo LGU barangay directory fiesta table. */
export function parseSantaBarbaraFiestaTable(html) {
  const $ = cheerio.load(html);
  const entries = [];

  $("table tr").each((_, tr) => {
    const cells = $(tr)
      .find("td, th")
      .map((__, td) => cleanCell($(td).text()))
      .get();
    if (cells.length < 6 || /^barangay$/i.test(cells[0])) return;

    const barangay = normalizeSantaBarbaraBarangay(cells[0]);
    const dateRaw = cells[4];
    const patronSaint = cells[5] || undefined;

    const row = entryFromDate(
      barangay,
      "Santa Barbara",
      dateRaw,
      "lgu-santa-barbara-iloilo-gov-ph"
    );
    if (!row) return;
    if (patronSaint) row.patronSaint = patronSaint;
    entries.push(row);
  });

  return entries;
}

/** Magallanes, Sorsogon LGU feast-day table. */
export function parseMagallanesFiestaTable(html) {
  const $ = cheerio.load(html);
  const entries = [];
  const seen = new Set();

  $("table tr").each((_, tr) => {
    const cells = $(tr)
      .find("td")
      .map((__, td) => cleanCell($(td).html()))
      .get();
    if (cells.length < 2) return;
    const [barangayRaw, dateRaw] = cells;
    if (/barangay|feast day|patron saint/i.test(barangayRaw)) return;

    const normalized = normalizeMagallanesBarangay(barangayRaw);
    if (!normalized) return;

    const row = entryFromDate(
      normalized.barangay,
      "Magallanes",
      dateRaw,
      "lgu-magallanes-sorsogon"
    );
    if (!row) return;
    row.fromSitio = normalized.fromSitio;

    const key = `${row.barangay}|${row.month}|${row.dayStart}|${row.fromSitio}`;
    if (seen.has(key)) return;
    seen.add(key);
    entries.push(row);
  });

  return entries;
}

/** Tarlac City individual barangay page (tarlaccity.gov.ph/{slug}/). */
export function parseTarlacBarangayPage(html, barangay) {
  const text = cheerio.load(html)("body").text().replace(/\s+/g, " ").trim();
  const feastMatch = text.match(
    /celebrates their fea[s]?t day every ([^.]{3,120}?)(?:\s+as|\s+in|\s+to|\s+for|\.)/i
  );
  if (!feastMatch) return null;

  const dateRaw = feastMatch[1].trim();
  const patronMatch = text.match(/Patron(?:\s+Saint)?(?:\s+is|\s+Saint)?\s+(.+?)(?:\.|Saint|$)/i);
  const patronSaint = patronMatch?.[1]?.trim().replace(/\.$/, "") || undefined;

  const parsed = parseDateFromRaw(dateRaw);
  if (!parsed?.month || !parsed?.dayStart) return null;

  return {
    barangay,
    municipality: "City Of Tarlac",
    month: parsed.month,
    dayStart: parsed.dayStart,
    dayEnd: parsed.dayEnd !== parsed.dayStart ? parsed.dayEnd : undefined,
    dateSource: "lgu-tarlac-city-gov-ph",
    patronSaint,
    dateRaw,
  };
}

/** Maasin City individual barangay article page. */
export function parseMaasinBarangayArticle(html, barangay) {
  const $ = cheerio.load(html);
  const text = $("body").text().replace(/\s+/g, " ").trim();
  const feastMatch = text.match(
    /FEAST DAY:\s*(?:Celebrated Annually every\s+)?(.+?)\s+(?:PAT(?:RON|N)\s+SAINT:|BARANGAY DAY:)/i
  );
  if (!feastMatch) return null;
  const dateRaw = feastMatch[1].replace(/^Celebrated Annually every\s+/i, "").trim();
  if (!dateRaw || dateRaw.length < 3) return null;

  const patronMatch = text.match(/PAT(?:RON|N)\s+SAINT:\s*(.+?)\s+BARANGAY DAY:/i);
  const patronSaint = patronMatch?.[1]?.trim() || undefined;

  const parsed = parseDateFromRaw(dateRaw);
  if (!parsed?.month || !parsed?.dayStart) return null;

  return {
    barangay,
    municipality: "City Of Maasin (Capital)",
    month: parsed.month,
    dayStart: parsed.dayStart,
    dayEnd: parsed.dayEnd !== parsed.dayStart ? parsed.dayEnd : undefined,
    dateSource: "lgu-maasin-city-gov-ph",
    patronSaint,
    dateRaw,
  };
}

/** Maasin City LGU barangay directory (government/barangay page). */
export function parseMaasinBarangayDirectory(html) {
  const $ = cheerio.load(html);
  const paragraphs = $("p")
    .map((_, el) => cleanCell($(el).text()))
    .get()
    .filter(Boolean);

  const entries = [];
  for (let i = 0; i < paragraphs.length; i++) {
    const fiestaMatch = paragraphs[i].match(/^BRGY\.?\s*FIESTA:\s*(.+)$/i);
    if (!fiestaMatch) continue;

    let barangayRaw = null;
    for (let j = i - 1; j >= Math.max(0, i - 4); j--) {
      const line = paragraphs[j];
      if (/^BRGY\.?\s*CAPT\./i.test(line)) continue;
      if (/^CONTACT NO\./i.test(line)) break;
      if (/^BRGY\.?\s*FIESTA:/i.test(line)) break;
      if (line.length > 40) continue;
      if (/^(BARANGAYS|PUNONG|FEAST|PATRON|SK |Copyright)/i.test(line)) continue;
      barangayRaw = line;
      break;
    }
    if (!barangayRaw) continue;

    const dateCandidates = fiestaMatch[1]
      .split(/\s*\/\s*/)
      .map((part) => part.trim())
      .filter(Boolean);

    let parsed = null;
    let dateRaw = null;
    for (const candidate of dateCandidates) {
      parsed = parseDateFromRaw(candidate);
      if (parsed?.month && parsed?.dayStart) {
        dateRaw = candidate;
        break;
      }
    }
    if (!parsed?.month || !parsed?.dayStart) continue;

    entries.push({
      barangay: normalizeMaasinDirectoryBarangay(barangayRaw),
      municipality: "City Of Maasin (Capital)",
      month: parsed.month,
      dayStart: parsed.dayStart,
      dayEnd: parsed.dayEnd !== parsed.dayStart ? parsed.dayEnd : undefined,
      dateSource: "lgu-maasin-city-directory",
      dateRaw,
    });
  }

  return entries;
}

/** Maasin City paginated barangay list (blocks with images). */
export function parseMaasinBarangayListPage(html) {
  const $ = cheerio.load(html);
  const entries = [];
  const IMAGE_ALIASES = {
    bactul: "Bactul I",
    tunga: "Tunga-Tunga (Pob.)",
  };

  function barangayFromImage(src) {
    const base = String(src ?? "")
      .split("/")
      .pop()
      ?.replace(/\.[^.]+$/, "") ?? "";
    const key = base.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (IMAGE_ALIASES[key]) return IMAGE_ALIASES[key];
    if (/logo$/i.test(base)) return null;
    return base.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  $(".leading-0, .item").each((_, el) => {
    const block$ = cheerio.load($(el).html() ?? "");
    const text = block$("root").text().replace(/\s+/g, " ").trim();
    const feastMatch = text.match(
      /FEAST DAY:\s*(?:Celebrated Annually every\s+)?(.+?)\s+(?:PAT(?:RON|N)\s+SAINT:|BARANGAY DAY:)/i
    );
    if (!feastMatch) return;
    const dateRaw = feastMatch[1].replace(/^Celebrated Annually every\s+/i, "").trim();
    const barangay = barangayFromImage(block$("img").first().attr("src"));
    if (!barangay) return;
    const parsed = parseDateFromRaw(dateRaw);
    if (!parsed?.month || !parsed?.dayStart) return;
    entries.push({
      barangay,
      municipality: "City Of Maasin (Capital)",
      month: parsed.month,
      dayStart: parsed.dayStart,
      dayEnd: parsed.dayEnd !== parsed.dayStart ? parsed.dayEnd : undefined,
      dateSource: "lgu-maasin-city-gov-ph",
    });
  });

  return entries;
}

const SIQUIJOR_BARANGAY_ALIASES = {
  minalunan: "Minalulan",
  liloan: "Lilo-an",
  cangtugbas: "Cantugbas",
  licoan: "Lico-an",
  "can asagan": "Canasagan",
  mananao: "Manan-ao",
  pulangyuta: "Polangyuta",
};

function mapSiquijorLocation(barangay, municipality) {
  const raw = String(barangay ?? "").trim();
  const muni = String(municipality ?? "").trim();
  if (!raw || raw === "-") return null;

  const key = normalizePlaceName(raw);
  if (key === "cang inte") {
    return { barangay: "Cang-inte", municipality: "Siquijor" };
  }
  if (muni === "Larena") {
    if (/^Poblacion Sur$/i.test(raw)) return { barangay: "South Poblacion", municipality: muni };
    if (/^Poblacion Norte$/i.test(raw)) return { barangay: "North Poblacion", municipality: muni };
  }

  const mapped = SIQUIJOR_BARANGAY_ALIASES[key];
  return {
    barangay: mapped ?? raw,
    municipality: muni,
  };
}

/** Siquijor Secrets fiesta calendar table. */
export function parseSiquijorFiestaTable(html) {
  const $ = cheerio.load(html);
  const entries = [];
  const muniRe = /^(Lazi|Larena|Siquijor|Maria|San Juan|Enrique Villanueva)$/i;

  $("table tr").each((_, tr) => {
    const cells = $(tr)
      .find("td")
      .map((__, td) => cleanCell($(td).text()))
      .get();
    if (cells.length < 3) return;
    const [municipality, barangay, dates] = cells;
    if (!muniRe.test(municipality)) return;
    const mapped = mapSiquijorLocation(barangay, municipality);
    if (!mapped) return;
    const main = dates.split("(")[0].trim();
    const row = entryFromDate(mapped.barangay, mapped.municipality, main, "lgu-siquijor-secrets");
    if (row) {
      row.province = "Siquijor";
      entries.push(row);
    }
  });

  return entries;
}

/**
 * Biliran Island blog format:
 * "April 4-5 Bacolod Culaba San Vicente de Ferrer"
 */
export function parseBiliranIslandDateLines(text) {
  const entries = [];
  const monthRe =
    /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})-(\d{1,2})\s+(.+)$/i;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    const m = line.match(monthRe);
    if (!m) continue;

    const monthNames = {
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
    const month = monthNames[m[1].toLowerCase()];
    const dayStart = Number(m[2]);
    const dayEnd = Number(m[3]);
    let rest = m[4].trim();

    // Drop patron saint suffix when present as trailing words after municipality.
    rest = rest.replace(/\s+San\s+.+$/i, "").replace(/\s+Sr\.?\s+.+$/i, "");
    rest = rest.replace(/\s+Mother of Perpetual.+$/i, "");

    let barangay;
    let municipality;

    const sitioComma = rest.match(/^Sitio\s+(.+?),\s*(.+?),\s*(.+)$/i);
    if (sitioComma) {
      barangay = sitioComma[2].trim();
      municipality = sitioComma[3].trim();
    } else {
      const comma = rest.match(/^([^,]+),\s*([^,]+)$/);
      if (comma) {
        barangay = comma[1].trim();
        municipality = comma[2].trim();
      } else {
        const parts = rest.split(/\s+/);
        if (parts.length < 2) continue;
        municipality = parts[parts.length - 1];
        barangay = parts.slice(0, -1).join(" ");
      }
    }

    if (/anniversary|festival/i.test(rest)) continue;

    entries.push({
      month,
      dayStart,
      dayEnd: dayEnd !== dayStart ? dayEnd : undefined,
      barangay: mapBiliranBarangay(barangay),
      municipality,
      dateSource: "lgu-biliran-island",
    });
  }

  return entries;
}
