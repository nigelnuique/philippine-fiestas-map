/**
 * LGU-published barangay fiesta schedules resolved to PSGC codes.
 */
import { lookupBarangayPsgc } from "../barangay-psgc-index.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SIARGAO_FIESTA_TEXT } from "./siargao-text.js";
import { GMA_FIESTA_TEXT } from "./gma-text.js";
import { BILIRAN_APRIL_TEXT } from "./biliran-april-text.js";
import { BAYAWAN_FIESTA_TEXT } from "./bayawan-text.js";
import { PINAMUNGAHAN_FIESTA_ENTRIES } from "./pinamungahan-text.js";
import { MACABEBE_FIESTA_ENTRIES } from "./macabebe-text.js";
import { parseDateFromRaw } from "../date-parser.js";
import { CABATUAN_FIESTA_SCHEDULE, CABATUAN_BARANGAY_ALIASES } from "./cabatuan-text.js";
import { parseBayawanFiestaBlock, parseBiliranMayBlock, parseGmaFiestaBlock } from "./parse-schedule.js";
import {
  parseBiliranIslandDateLines,
  parseDagupanFiestaTable,
  parseMagallanesFiestaTable,
  parseSiquijorFiestaTable,
} from "./parse-html-schedules.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..", "..");
const LGU_CACHE = path.join(
  ROOT,
  "data",
  "processed",
  "festivals",
  "lgu-barangay-schedules-cache.json"
);
const RAW_SCHEDULES = path.join(ROOT, "data", "raw", "lgu-schedules");

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** Hand-curated Wikipedia / festival-list barangay-specific dates. */
const WIKIPEDIA_BARANGAY_ENTRIES = [
  {
    barangay: "San Ildefonso",
    municipality: "Tanay",
    province: "Rizal",
    month: 1,
    dayStart: 22,
    dayEnd: 24,
    dateSource: "wikipedia-festivals-ph",
    patronSaint: "Saint Ildefonsus",
  },
];

/** Curated Biliran May schedule (latagaw.com). */
const BILIRAN_MAY_TEXT = `
May 1-2
- Agpangi, Naval
- Ungale, Kawayan
- Union, Caibiran
May 2-3
- Pili, Almeria
May 3-4
- Larrazabal, Naval
May 4-5
- Burabod, Kawayan
- Calipayan, Culaba
- Victory, Caibiran
- Bato, Biliran
May 5-6
- Libertad, Cabucgayan
- Iyusan, Almeria
- Ungale, Kawayan
- Hugpa, Biliran
May 6-7
- Trabugan, Maripipi
- Patag, Culaba
- Tomalistis, Caibiran
May 7-8
- Cabibihan, Caibiran
- Bato, Biliran
- Calumpang, Naval
May 8-9
- Maurang, Caibiran
May 9-10
- Masagongsong, Kawayan
- Ungale, Kawayan
- Magbangon, Cabucgayan
- Haguikhikan, Naval
May 11-12
- Kaulangohan, Caibiran
May 12-13
- Calumpang, Naval
May 13-14
- Union, Caibiran
- Casiawan, Cabucgayan
May 14-15
- Kansanoc, Kawayan
- Lo-ok, Almeria
- P.I. Garcia, Naval
- Canduhao, Maripipi
- Marvel, Culaba
- Talustusan, Naval
- Matanggo, Almeria
May 16-17
- Villa Caneja, Naval
- Caibiran
May 17-18
- Baganito, Kawayan
- Talibong, Cabucgayan
- Lucsoon, Naval
- Caray-Caray, Naval
May 19-20
- Baso, Cabucgayan
- Lico, Naval
May 20-21
- Burabod, Biliran
May 21-22
- Tucdao, Kawayan
May 23-24
- Pinangomhan, Biliran
May 24-25
- Capinahan, Naval
- Villa Cornejo, Kawayan
- Binohangan, Caibiran
May 25-26
- Palanay, Caibiran
May 26-27
- Binalayan, Maripipi
May 27-28
- Victory, Caibiran
- Cabunga-an, Naval
May 28-29
- Caucab, Almeria
- Burabod, Biliran
May 29-30
- Palenque, Caibiran
- Imelda, Naval
`;

function parseSiargaoLines(text) {
  const entries = [];
  let current = null;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const crossMonth = line.match(
      /^(Apr|May|Jun|Jul|Aug|Sep|Oct|Dec|Jan|Feb|Mar)\s+(\d{1,2})-(Apr|May|Jun|Jul|Aug|Sep|Oct|Dec|Jan|Feb|Mar)\s+(\d{1,2})\s*(.*)$/i
    );
    if (crossMonth) {
      const m1 = MONTHS[crossMonth[1].slice(0, 3).toLowerCase()];
      const m2 = MONTHS[crossMonth[3].slice(0, 3).toLowerCase()];
      current = { month: m1, dayStart: Number(crossMonth[2]), dayEnd: Number(crossMonth[4]) };
      const tail = crossMonth[5];
      if (tail) processSiargaoTail(tail, current, entries);
      if (m1 !== m2) {
        // Apr 30-May 1 style: also add May portion for tail barangays
        current = { month: m2, dayStart: 1, dayEnd: Number(crossMonth[4]) };
      }
      continue;
    }

    const dateMatch = line.match(
      /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})-(\d{1,2})\s*(.*)$/i
    );
    if (dateMatch) {
      current = {
        month: MONTHS[dateMatch[1].slice(0, 3).toLowerCase()],
        dayStart: Number(dateMatch[2]),
        dayEnd: Number(dateMatch[3]),
      };
      const tail = dateMatch[4];
      if (tail) processSiargaoTail(tail, current, entries);
      continue;
    }

    if (line.startsWith("Brgy.")) {
      const brgyMatch = line.match(/^Brgy\.?\s*(.+?)\s*-\s*(.+)$/i);
      if (brgyMatch && current) {
        entries.push({
          ...current,
          barangay: brgyMatch[1].trim(),
          municipality: mapSiargaoMuni(brgyMatch[2]),
          dateSource: "lgu-siargao-islands",
        });
      }
    }
  }

  return entries;
}

function processSiargaoTail(tail, current, entries) {
  const brgyMatch = tail.match(/^Brgy\.?\s*(.+?)\s*-\s*(.+)$/i);
  if (brgyMatch) {
    entries.push({
      ...current,
      barangay: brgyMatch[1].trim(),
      municipality: mapSiargaoMuni(brgyMatch[2]),
      dateSource: "lgu-siargao-islands",
    });
  }
}

function mapSiargaoMuni(name) {
  const n = String(name).trim().toLowerCase();
  const map = {
    dapa: "Dapa",
    pilar: "Pilar",
    "del carmen": "Del Carmen",
    "gen. luna": "General Luna",
    burgos: "Burgos",
    socorro: "Socorro",
    "sta. monica": "Santa Monica (Sapao)",
    "san isidro": "San Isidro",
    "san benito": "San Benito",
  };
  return map[n] ?? name.trim();
}

function resolveScheduleEntries(scheduleEntries) {
  const byPsgc = {};
  let matched = 0;
  let missed = 0;

  for (const entry of scheduleEntries) {
    if (!entry.barangay || !entry.municipality) continue;
    const psgc = lookupBarangayPsgc(entry.municipality, entry.barangay);
    if (!psgc) {
      missed++;
      continue;
    }
    matched++;
    const key = String(psgc).padStart(9, "0");
    const next = {
      month: entry.month,
      dayStart: entry.dayStart,
      dayEnd: entry.dayEnd !== entry.dayStart ? entry.dayEnd : undefined,
      dateSource: entry.dateSource,
      patronSaint: entry.patronSaint,
      fromSitio: Boolean(entry.fromSitio),
    };

    const existing = byPsgc[key];
    if (existing) {
      if (next.fromSitio && !existing.fromSitio) continue;
      if (!next.fromSitio && existing.fromSitio) {
        byPsgc[key] = next;
        continue;
      }
      if (next.fromSitio && existing.fromSitio) continue;
    }

    byPsgc[key] = next;
  }

  for (const key of Object.keys(byPsgc)) {
    delete byPsgc[key].fromSitio;
  }

  return { byPsgc, matched, missed };
}

let _cache = null;

export function resetLguBarangayFiestaCache() {
  _cache = null;
}

function loadFetchedLguByPsgc() {
  if (!fs.existsSync(LGU_CACHE)) return { byPsgc: {}, stats: {} };
  const data = JSON.parse(fs.readFileSync(LGU_CACHE, "utf8"));
  return {
    byPsgc: data.byPsgc ?? {},
    stats: data.sources ?? {},
  };
}

function loadEmbeddedHtmlSchedules() {
  const byPsgc = {};
  const stats = {};

  const dagupanPath = path.join(RAW_SCHEDULES, "dagupan-calendar.html");
  if (fs.existsSync(dagupanPath)) {
    const entries = parseDagupanFiestaTable(fs.readFileSync(dagupanPath, "utf8"));
    const resolved = resolveScheduleEntries(entries);
    Object.assign(byPsgc, resolved.byPsgc);
    stats.dagupan = {
      entries: entries.length,
      matched: resolved.matched,
      missed: resolved.missed,
    };
  }

  const siquijorPath = path.join(RAW_SCHEDULES, "siquijor-fiestas.html");
  if (fs.existsSync(siquijorPath)) {
    const entries = parseSiquijorFiestaTable(fs.readFileSync(siquijorPath, "utf8"));
    const resolved = resolveScheduleEntries(entries);
    Object.assign(byPsgc, resolved.byPsgc);
    stats.siquijor = {
      entries: entries.length,
      matched: resolved.matched,
      missed: resolved.missed,
    };
  }

  const magallanesPath = path.join(RAW_SCHEDULES, "magallanes-fiestas.html");
  if (fs.existsSync(magallanesPath)) {
    const entries = parseMagallanesFiestaTable(fs.readFileSync(magallanesPath, "utf8"));
    const resolved = resolveScheduleEntries(entries);
    Object.assign(byPsgc, resolved.byPsgc);
    stats.magallanes = {
      entries: entries.length,
      matched: resolved.matched,
      missed: resolved.missed,
    };
  }

  return { byPsgc, stats };
}

function mapCabatuanBarangay(name) {
  const key = String(name ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return CABATUAN_BARANGAY_ALIASES[key] ?? name.trim();
}

function buildCabatuanFiestaEntries() {
  const entries = [];
  for (const row of CABATUAN_FIESTA_SCHEDULE) {
    const parsed = parseDateFromRaw(row.date);
    if (!parsed?.month || !parsed?.dayStart) continue;
    entries.push({
      month: parsed.month,
      dayStart: parsed.dayStart,
      dayEnd: parsed.dayEnd !== parsed.dayStart ? parsed.dayEnd : undefined,
      barangay: mapCabatuanBarangay(row.barangay),
      municipality: "Cabatuan",
      dateSource: "lgu-cabatuan-parish",
    });
  }
  return entries;
}

export function getLguBarangayFiestaDatesByPsgc() {
  if (_cache) return _cache;

  const siargaoEntries = parseSiargaoLines(SIARGAO_FIESTA_TEXT);
  const biliranMayEntries = parseBiliranMayBlock(BILIRAN_MAY_TEXT);
  const biliranAprilEntries = parseBiliranIslandDateLines(BILIRAN_APRIL_TEXT);
  const gmaEntries = parseGmaFiestaBlock(GMA_FIESTA_TEXT);
  const bayawanEntries = parseBayawanFiestaBlock(BAYAWAN_FIESTA_TEXT);
  const pinamungahanEntries = PINAMUNGAHAN_FIESTA_ENTRIES.map((e) => ({
    ...e,
    dateSource: e.dateSource ?? "lgu-pinamungajan-gov-ph",
  }));
  const macabebeEntries = MACABEBE_FIESTA_ENTRIES.map((e) => ({
    ...e,
    dateSource: e.dateSource ?? "lgu-pampanga-tourism",
  }));
  const cabatuanEntries = buildCabatuanFiestaEntries();
  const wikiEntries = WIKIPEDIA_BARANGAY_ENTRIES.map((e) => ({
    ...e,
    dateSource: e.dateSource ?? "wikipedia-festivals-ph",
  }));

  const siargao = resolveScheduleEntries(siargaoEntries);
  const biliranMay = resolveScheduleEntries(biliranMayEntries);
  const biliranApril = resolveScheduleEntries(biliranAprilEntries);
  const gma = resolveScheduleEntries(gmaEntries);
  const bayawan = resolveScheduleEntries(bayawanEntries);
  const pinamungahan = resolveScheduleEntries(pinamungahanEntries);
  const macabebe = resolveScheduleEntries(macabebeEntries);
  const cabatuan = resolveScheduleEntries(cabatuanEntries);
  const wiki = resolveScheduleEntries(wikiEntries);
  const fetched = loadFetchedLguByPsgc();
  const embeddedHtml = loadEmbeddedHtmlSchedules();

  _cache = {
    byPsgc: {
      ...siargao.byPsgc,
      ...biliranMay.byPsgc,
      ...biliranApril.byPsgc,
      ...gma.byPsgc,
      ...bayawan.byPsgc,
      ...pinamungahan.byPsgc,
      ...macabebe.byPsgc,
      ...cabatuan.byPsgc,
      ...wiki.byPsgc,
      ...embeddedHtml.byPsgc,
      ...fetched.byPsgc,
    },
    stats: {
      siargao: {
        entries: siargaoEntries.length,
        matched: siargao.matched,
        missed: siargao.missed,
      },
      biliranMay: {
        entries: biliranMayEntries.length,
        matched: biliranMay.matched,
        missed: biliranMay.missed,
      },
      biliranApril: {
        entries: biliranAprilEntries.length,
        matched: biliranApril.matched,
        missed: biliranApril.missed,
      },
      gma: { entries: gmaEntries.length, matched: gma.matched, missed: gma.missed },
      bayawan: {
        entries: bayawanEntries.length,
        matched: bayawan.matched,
        missed: bayawan.missed,
      },
      pinamungahan: {
        entries: pinamungahanEntries.length,
        matched: pinamungahan.matched,
        missed: pinamungahan.missed,
      },
      macabebe: {
        entries: macabebeEntries.length,
        matched: macabebe.matched,
        missed: macabebe.missed,
      },
      cabatuan: {
        entries: cabatuanEntries.length,
        matched: cabatuan.matched,
        missed: cabatuan.missed,
      },
      wikipedia: { entries: wikiEntries.length, matched: wiki.matched, missed: wiki.missed },
      embeddedHtml: embeddedHtml.stats,
      fetchedOnline: fetched.stats,
    },
  };
  return _cache;
}

export function lookupLguBarangayFiestaDate(festival) {
  const { byPsgc } = getLguBarangayFiestaDatesByPsgc();
  const psgc = String(festival.barangayPsgc ?? "").padStart(9, "0");
  return byPsgc[psgc] ?? byPsgc[String(Number(psgc))] ?? null;
}
