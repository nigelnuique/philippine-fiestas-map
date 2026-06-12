import * as cheerio from "cheerio";
import { parseDateFromRaw } from "../date-parser.js";

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
    const main = dates.split("(")[0].trim();
    const row = entryFromDate(barangay, municipality, main, "lgu-siquijor-secrets");
    if (row) entries.push(row);
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
      barangay,
      municipality,
      dateSource: "lgu-biliran-island",
    });
  }

  return entries;
}
