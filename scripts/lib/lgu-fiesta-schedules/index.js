/**
 * LGU-published barangay fiesta schedules resolved to PSGC codes.
 */
import { lookupBarangayPsgc, normalizePlaceName } from "../barangay-psgc-index.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SIARGAO_FIESTA_TEXT } from "./siargao-text.js";
import { GMA_FIESTA_TEXT, GMA_RELATIVE_FIESTA_SCHEDULE } from "./gma-text.js";
import { BILIRAN_APRIL_TEXT } from "./biliran-april-text.js";
import { BILIRAN_THEOLDCHURCHES_ENTRIES } from "./biliran-theoldchurches-text.js";
import { BAYAWAN_FIESTA_TEXT } from "./bayawan-text.js";
import { PINAMUNGAHAN_FIESTA_ENTRIES } from "./pinamungahan-text.js";
import { MACABEBE_FIESTA_ENTRIES } from "./macabebe-text.js";
import { LUCENA_FIESTA_ENTRIES } from "./lucena-text.js";
import { MULANAY_FIESTA_ENTRIES } from "./mulanay-text.js";
import { MIAGAO_FIESTA_ENTRIES, MIAGAO_RELATIVE_FIESTA_SCHEDULE } from "./miagao-text.js";
import { ILOILO_CITY_FIESTA_ENTRIES } from "./iloilo-city-text.js";
import { TARLAC_FIESTA_ENTRIES, TARLAC_RELATIVE_FIESTA_SCHEDULE } from "./tarlac-text.js";
import { ANGONO_FIESTA_ENTRIES, ANGONO_RELATIVE_FIESTA_SCHEDULE } from "./angono-text.js";
import { BALILIHAN_FIESTA_ENTRIES } from "./balilihan-text.js";
import { BULA_FIESTA_ENTRIES, BULA_FIESTA_RELATIVE_SCHEDULE } from "./bula-text.js";
import { OTON_FIESTA_ENTRIES, OTON_FIESTA_RELATIVE_SCHEDULE } from "./oton-text.js";
import { SANTA_MARIA_BULACAN_FIESTA_SCHEDULE } from "./santa-maria-bulacan-text.js";
import { LAGONOY_FIESTA_SCHEDULE } from "./lagonoy-text.js";
import { SAN_PASCUAL_FIESTA_SCHEDULE } from "./san-pascual-text.js";
import { SAN_VICENTE_PALAWAN_FIESTA_SCHEDULE } from "./san-vicente-palawan-text.js";
import { UBAY_WIKIPEDIA_FIESTA_SCHEDULE } from "./ubay-wikipedia-text.js";
import { MASANTOL_FIESTA_SCHEDULE } from "./masantol-text.js";
import { MALOLOS_FIESTA_SCHEDULE } from "./malolos-text.js";
import {
  ANGAT_PDPFP_FIESTA_SCHEDULE,
  BALAGTAS_PDPFP_FIESTA_SCHEDULE,
  BULACAN_TOWN_PDPFP_FIESTA_SCHEDULE,
  BUSTOS_PDPFP_FIESTA_SCHEDULE,
  CALUMPIT_PDPFP_FIESTA_SCHEDULE,
  GUIGUINTO_PDPFP_FIESTA_SCHEDULE,
  HAGONOY_PDPFP_FIESTA_SCHEDULE,
  MARILAO_PDPFP_FIESTA_SCHEDULE,
  MEYCAUAYAN_PDPFP_FIESTA_SCHEDULE,
  OBANDO_PDPFP_FIESTA_SCHEDULE,
  PANDI_PDPFP_FIESTA_SCHEDULE,
  PAOMBONG_PDPFP_FIESTA_SCHEDULE,
  PULILAN_PDPFP_FIESTA_SCHEDULE,
  SAN_ILDEFONSO_BULACAN_PDPFP_FIESTA_SCHEDULE,
  SAN_JOSE_DEL_MONTE_PDPFP_FIESTA_SCHEDULE,
  SAN_RAFAEL_PDPFP_FIESTA_SCHEDULE,
} from "./bulacan-pdpfp-text.js";
import {
  ALUBIJID_MISOR_FIESTA_SCHEDULE,
  CLAVERIA_MISOR_FIESTA_SCHEDULE,
  EL_SALVADOR_MISOR_FIESTA_SCHEDULE,
  GITAGUM_MISOR_FIESTA_SCHEDULE,
  INITAO_MISOR_FIESTA_SCHEDULE,
  JASAAN_FIESTA_SCHEDULE,
  LAGUINDINGAN_MISOR_FIESTA_SCHEDULE,
  LIBERTAD_MISOR_FIESTA_SCHEDULE,
  LUGAIT_FIESTA_SCHEDULE,
  MANTICAO_MISOR_FIESTA_SCHEDULE,
  NAAWAN_MISOR_FIESTA_SCHEDULE,
  OPOL_FIESTA_SCHEDULE,
  TAGOLOAN_MISOR_FIESTA_SCHEDULE,
  VILLANUEVA_MISOR_FIESTA_SCHEDULE,
} from "./misamis-oriental-text.js";
import {
  BALINGASAG_FIESTA_SCHEDULE,
  BALINGOAN_FIESTA_SCHEDULE,
  BINUANGAN_FIESTA_SCHEDULE,
  GINGOOG_OUTLYING_FIESTA_SCHEDULE,
  GINGOOG_POBLACION_FIESTA_SCHEDULE,
  KINOGUITAN_FIESTA_SCHEDULE,
  LAGONGLONG_MISOR_FIESTA_SCHEDULE,
  MAGSAYSAY_MISOR_FIESTA_SCHEDULE,
  MEDINA_FIESTA_SCHEDULE,
  SALAY_FIESTA_SCHEDULE,
  SUGBONGCOGON_FIESTA_SCHEDULE,
  TALISAYAN_FIESTA_SCHEDULE,
} from "./misamis-oriental-1st-district-text.js";
import { ORMOC_FIESTA_ENTRIES } from "./ormoc-text.js";
import { TACLOBAN_FIESTA_ENTRIES } from "./tacloban-text.js";
import { DULAG_FIESTA_ENTRIES, CARIGARA_FIESTA_ENTRIES } from "./dulag-carigara-text.js";
import { LEYTE_PARISH_FIESTA_ENTRIES } from "./leyte-parish-text.js";
import { PANGASINAN_PARISH_FIESTA_ENTRIES } from "./pangasinan-parish-text.js";
import { ILOILO_PROVINCE_THEOLDCHURCHES_ENTRIES } from "./iloilo-province-theoldchurches-text.js";
import { LEYTE_THEOLDCHURCHES_ENTRIES } from "./leyte-theoldchurches-text.js";
import { CEBU_THEOLDCHURCHES_ENTRIES } from "./cebu-theoldchurches-text.js";
import { CAPIZ_THEOLDCHURCHES_ENTRIES } from "./capiz-theoldchurches-text.js";
import { NEGROS_OCCIDENTAL_THEOLDCHURCHES_ENTRIES } from "./negros-occidental-theoldchurches-text.js";
import { AKLAN_THEOLDCHURCHES_ENTRIES } from "./aklan-theoldchurches-text.js";
import { BOHOL_THEOLDCHURCHES_ENTRIES } from "./bohol-theoldchurches-text.js";
import { CAMARINES_SUR_THEOLDCHURCHES_ENTRIES } from "./camarines-sur-theoldchurches-text.js";
import { NEGROS_ORIENTAL_THEOLDCHURCHES_ENTRIES } from "./negros-oriental-theoldchurches-text.js";
import { SAMAR_THEOLDCHURCHES_ENTRIES } from "./samar-theoldchurches-text.js";
import { EASTERN_SAMAR_THEOLDCHURCHES_ENTRIES } from "./eastern-samar-theoldchurches-text.js";
import { NORTHERN_SAMAR_THEOLDCHURCHES_ENTRIES } from "./northern-samar-theoldchurches-text.js";
import { SOUTHERN_LEYTE_THEOLDCHURCHES_ENTRIES } from "./southern-leyte-theoldchurches-text.js";
import { ANTIQUE_THEOLDCHURCHES_ENTRIES } from "./antique-theoldchurches-text.js";
import { ROMBLON_THEOLDCHURCHES_ENTRIES } from "./romblon-theoldchurches-text.js";
import { GUIMARAS_THEOLDCHURCHES_ENTRIES } from "./guimaras-theoldchurches-text.js";
import { CAMARINES_NORTE_THEOLDCHURCHES_ENTRIES } from "./camarines-norte-theoldchurches-text.js";
import {
  CURATED_ONLINE_FIESTA_ENTRIES,
  CURATED_ONLINE_RELATIVE_SCHEDULE,
} from "./curated-online-text.js";
import { parseDateFromRaw } from "../date-parser.js";
import {
  CABATUAN_FIESTA_SCHEDULE,
  CABATUAN_BARANGAY_ALIASES,
  CABATUAN_OLC_PARISH_SCHEDULE,
  CABATUAN_OLC_PARISH_DATE_SOURCE,
  CABATUAN_CURATED_SCHEDULE,
} from "./cabatuan-text.js";
import { parseBayawanFiestaBlock, parseBiliranMayBlock, parseGmaFiestaBlock, mapSiargaoBarangay } from "./parse-schedule.js";
import {
  parseBiliranIslandDateLines,
  parseDagupanFiestaTable,
  parseMagallanesFiestaTable,
  parseMaasinBarangayDirectory,
  parseSantaBarbaraFiestaTable,
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
const MAASIN_CACHE = path.join(
  ROOT,
  "data",
  "processed",
  "festivals",
  "maasin-barangay-schedules-cache.json"
);
const TARLAC_CACHE = path.join(
  ROOT,
  "data",
  "processed",
  "festivals",
  "tarlac-barangay-schedules-cache.json"
);
const RAW_SCHEDULES = path.join(ROOT, "data", "raw", "lgu-schedules");

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** Hand-curated Wikipedia / festival-list barangay-specific dates. */
const WIKIPEDIA_BARANGAY_ENTRIES = [];

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
- Pinangumhan, Biliran
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
      const parsed = parseSiargaoBrgyTail(line);
      if (parsed && current) {
        entries.push({
          ...current,
          ...parsed,
          dateSource: "lgu-siargao-islands",
        });
      }
    }
  }

  return entries;
}

function parseSiargaoBrgyTail(tail) {
  const m = String(tail).trim().match(/^Brgy\.?\s*(.+)$/i);
  if (!m) return null;
  const rest = m[1].trim();
  const sep = rest.lastIndexOf(" - ");
  if (sep < 0) return null;
  return finalizeSiargaoLocation(rest.slice(0, sep).trim(), rest.slice(sep + 3).trim());
}

function finalizeSiargaoLocation(barangay, municipality) {
  const mappedBarangay = mapSiargaoBarangay(barangay);
  const muniKey = normalizePlaceName(municipality);
  let mappedMuni = mapSiargaoMuni(municipality);
  if (normalizePlaceName(mappedBarangay) === "asinan" && muniKey === "dapa") {
    mappedMuni = "Pilar";
  }
  return { barangay: mappedBarangay, municipality: mappedMuni };
}

function processSiargaoTail(tail, current, entries) {
  const parsed = parseSiargaoBrgyTail(tail);
  if (!parsed) return;
  entries.push({
    ...current,
    ...parsed,
    dateSource: "lgu-siargao-islands",
  });
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
    const psgc = lookupBarangayPsgc(entry.municipality, entry.barangay, entry.province);
    if (!psgc) {
      missed++;
      continue;
    }
    const key = String(psgc).padStart(9, "0");
    const next = {
      month: entry.month,
      ...(entry.dayStart
        ? {
            dayStart: entry.dayStart,
            dayEnd: entry.dayEnd !== entry.dayStart ? entry.dayEnd : undefined,
          }
        : entry.datePrecision === "month"
          ? { datePrecision: "month" }
          : {}),
      dateSource: entry.dateSource,
      patronSaint: entry.patronSaint,
      fromSitio: Boolean(entry.fromSitio),
    };
    if (!next.dayStart && next.datePrecision !== "month") {
      missed++;
      continue;
    }
    matched++;

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
  const byPsgc = {};
  const stats = {};

  if (fs.existsSync(LGU_CACHE)) {
    const data = JSON.parse(fs.readFileSync(LGU_CACHE, "utf8"));
    Object.assign(byPsgc, data.byPsgc ?? {});
    Object.assign(stats, data.sources ?? {});
  }

  if (fs.existsSync(MAASIN_CACHE)) {
    const data = JSON.parse(fs.readFileSync(MAASIN_CACHE, "utf8"));
    Object.assign(byPsgc, data.byPsgc ?? {});
    stats.maasin = data.stats ?? { matched: Object.keys(data.byPsgc ?? {}).length };
  }

  if (fs.existsSync(TARLAC_CACHE)) {
    const data = JSON.parse(fs.readFileSync(TARLAC_CACHE, "utf8"));
    Object.assign(byPsgc, data.byPsgc ?? {});
    stats.tarlacFetched = data.stats ?? { matched: Object.keys(data.byPsgc ?? {}).length };
  }

  return { byPsgc, stats };
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

  const santaBarbaraPath = path.join(RAW_SCHEDULES, "santa-barbara-about.html");
  if (fs.existsSync(santaBarbaraPath)) {
    const entries = parseSantaBarbaraFiestaTable(fs.readFileSync(santaBarbaraPath, "utf8"));
    const resolved = resolveScheduleEntries(entries);
    Object.assign(byPsgc, resolved.byPsgc);
    stats.santaBarbara = {
      entries: entries.length,
      matched: resolved.matched,
      missed: resolved.missed,
    };
  }

  const maasinDirectoryPath = path.join(RAW_SCHEDULES, "maasin", "barangay-directory.html");
  if (fs.existsSync(maasinDirectoryPath)) {
    const entries = parseMaasinBarangayDirectory(fs.readFileSync(maasinDirectoryPath, "utf8"));
    const resolved = resolveScheduleEntries(entries);
    Object.assign(byPsgc, resolved.byPsgc);
    stats.maasinDirectory = {
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

function buildCabatuanScheduleEntries(rows, dateSource) {
  const entries = [];
  for (const row of rows) {
    const parsed = parseDateFromRaw(row.date);
    if (!parsed?.month || !parsed?.dayStart) continue;
    entries.push({
      month: parsed.month,
      dayStart: parsed.dayStart,
      dayEnd: parsed.dayEnd !== parsed.dayStart ? parsed.dayEnd : undefined,
      barangay: mapCabatuanBarangay(row.barangay),
      municipality: "Cabatuan",
      dateSource: row.dateSource ?? dateSource,
      patronSaint: row.patronSaint,
    });
  }
  return entries;
}

function buildCabatuanFiestaEntries() {
  return [
    ...buildCabatuanScheduleEntries(CABATUAN_FIESTA_SCHEDULE, "lgu-cabatuan-parish"),
    ...buildCabatuanScheduleEntries(
      CABATUAN_OLC_PARISH_SCHEDULE,
      CABATUAN_OLC_PARISH_DATE_SOURCE,
    ),
    ...buildCabatuanScheduleEntries(
      CABATUAN_CURATED_SCHEDULE,
      "curated-online-banguit-cabatuan-ig",
    ),
  ];
}

function buildGmaRelativeFiestaEntries() {
  const entries = [];
  for (const row of GMA_RELATIVE_FIESTA_SCHEDULE) {
    const parsed = parseDateFromRaw(row.date);
    if (!parsed?.month || !parsed?.dayStart) continue;
    entries.push({
      month: parsed.month,
      dayStart: parsed.dayStart,
      dayEnd: parsed.dayEnd !== parsed.dayStart ? parsed.dayEnd : undefined,
      barangay: row.barangay,
      municipality: "Gen. Mariano Alvarez",
      dateSource: "lgu-gma-cavite",
      patronSaint: row.patronSaint,
    });
  }
  return entries;
}

function buildTarlacRelativeFiestaEntries() {
  const entries = [];
  for (const row of TARLAC_RELATIVE_FIESTA_SCHEDULE) {
    const parsed = parseDateFromRaw(row.date);
    if (!parsed?.month || !parsed?.dayStart) continue;
    entries.push({
      month: parsed.month,
      dayStart: parsed.dayStart,
      dayEnd: parsed.dayEnd !== parsed.dayStart ? parsed.dayEnd : undefined,
      barangay: row.barangay,
      municipality: "City Of Tarlac",
      dateSource: "lgu-tarlac-city-gov-ph",
      patronSaint: row.patronSaint,
    });
  }
  return entries;
}

function buildAngonoRelativeFiestaEntries() {
  const entries = [];
  for (const row of ANGONO_RELATIVE_FIESTA_SCHEDULE) {
    const parsed = parseDateFromRaw(row.date);
    if (!parsed?.month || !parsed?.dayStart) continue;
    entries.push({
      month: parsed.month,
      dayStart: parsed.dayStart,
      dayEnd: parsed.dayEnd !== parsed.dayStart ? parsed.dayEnd : undefined,
      barangay: row.barangay,
      municipality: "Angono",
      dateSource: "lgu-angono-brief-profile",
      patronSaint: row.patronSaint,
    });
  }
  return entries;
}

function buildBulaRelativeFiestaEntries() {
  const entries = [];
  for (const row of BULA_FIESTA_RELATIVE_SCHEDULE) {
    const parsed = parseDateFromRaw(row.date);
    if (!parsed?.month || !parsed?.dayStart) continue;
    entries.push({
      month: parsed.month,
      dayStart: parsed.dayStart,
      dayEnd: parsed.dayEnd !== parsed.dayStart ? parsed.dayEnd : undefined,
      barangay: row.barangay,
      municipality: row.municipality ?? "Bula",
      dateSource: row.dateSource ?? "parish-san-vicente-ferrer-ombao-polpog-bula",
      patronSaint: row.patronSaint,
    });
  }
  return entries;
}

function buildOtonRelativeFiestaEntries() {
  const entries = [];
  for (const row of OTON_FIESTA_RELATIVE_SCHEDULE) {
    const parsed = parseDateFromRaw(row.date);
    if (!parsed?.month || !parsed?.dayStart) continue;
    entries.push({
      month: parsed.month,
      dayStart: parsed.dayStart,
      dayEnd: parsed.dayEnd !== parsed.dayStart ? parsed.dayEnd : undefined,
      barangay: row.barangay,
      municipality: row.municipality ?? "Oton",
      dateSource: row.dateSource ?? "lgu-oton-gov-ph-wayback-2021",
      patronSaint: row.patronSaint,
    });
  }
  return entries;
}

function buildSanPascualFiestaEntries() {
  return buildMunicipalDateRows(SAN_PASCUAL_FIESTA_SCHEDULE, {
    municipality: "San Pascual",
    province: "Batangas",
    dateSource: "lgu-san-pascual-mtcas-scribd",
  });
}

function buildMunicipalDateRows(rows, defaults) {
  const entries = [];
  for (const row of rows) {
    const parsed = parseDateFromRaw(row.date);
    if (!parsed?.month || !parsed?.dayStart) continue;
    entries.push({
      month: parsed.month,
      dayStart: parsed.dayStart,
      dayEnd: parsed.dayEnd !== parsed.dayStart ? parsed.dayEnd : undefined,
      barangay: row.barangay,
      municipality: row.municipality ?? defaults.municipality,
      province: row.province ?? defaults.province,
      dateSource: row.dateSource ?? defaults.dateSource,
      patronSaint: row.patronSaint,
    });
  }
  return entries;
}

function buildMiagaoRelativeFiestaEntries() {
  const entries = [];
  for (const row of MIAGAO_RELATIVE_FIESTA_SCHEDULE) {
    const parsed = parseDateFromRaw(row.date);
    if (!parsed?.month || !parsed?.dayStart) continue;
    entries.push({
      month: parsed.month,
      dayStart: parsed.dayStart,
      dayEnd: parsed.dayEnd !== parsed.dayStart ? parsed.dayEnd : undefined,
      barangay: row.barangay,
      municipality: row.municipality ?? "Miagao",
      dateSource: row.dateSource ?? "curated-online-miagao-tripod",
      patronSaint: row.patronSaint,
    });
  }
  return entries;
}

function buildCuratedOnlineRelativeEntries() {
  const entries = [];
  for (const row of CURATED_ONLINE_RELATIVE_SCHEDULE) {
    const parsed = parseDateFromRaw(row.date);
    if (!parsed?.month || !parsed?.dayStart) continue;
    entries.push({
      month: parsed.month,
      dayStart: parsed.dayStart,
      dayEnd: parsed.dayEnd !== parsed.dayStart ? parsed.dayEnd : undefined,
      barangay: row.barangay,
      municipality: row.municipality,
      dateSource: row.dateSource ?? "curated-online",
      patronSaint: row.patronSaint,
    });
  }
  return entries;
}

export function getLguBarangayFiestaDatesByPsgc() {
  if (_cache) return _cache;

  const siargaoEntries = parseSiargaoLines(SIARGAO_FIESTA_TEXT);
  const biliranMayEntries = parseBiliranMayBlock(BILIRAN_MAY_TEXT);
  const biliranAprilEntries = parseBiliranIslandDateLines(BILIRAN_APRIL_TEXT);
  const biliranTheoldchurchesEntries = BILIRAN_THEOLDCHURCHES_ENTRIES.map((e) => ({ ...e }));
  const gmaEntries = parseGmaFiestaBlock(GMA_FIESTA_TEXT);
  const gmaRelativeEntries = buildGmaRelativeFiestaEntries();
  const bayawanEntries = parseBayawanFiestaBlock(BAYAWAN_FIESTA_TEXT);
  const pinamungahanEntries = PINAMUNGAHAN_FIESTA_ENTRIES.map((e) => ({
    ...e,
    dateSource: e.dateSource ?? "lgu-pinamungajan-gov-ph",
  }));
  const macabebeEntries = MACABEBE_FIESTA_ENTRIES.map((e) => ({
    ...e,
    dateSource: e.dateSource ?? "lgu-pampanga-tourism",
  }));
  const lucenaEntries = LUCENA_FIESTA_ENTRIES.map((e) => ({
    ...e,
    dateSource: e.dateSource ?? "lgu-lucena-community-guide",
  }));
  const mulanayEntries = MULANAY_FIESTA_ENTRIES.map((e) => ({
    ...e,
    dateSource: e.dateSource ?? "lgu-mulanay-gov-ph",
  }));
  const miagaoEntries = [
    ...MIAGAO_FIESTA_ENTRIES.map((e) => ({
      ...e,
      dateSource: e.dateSource ?? "lgu-miagao-gov-ph",
    })),
    ...buildMiagaoRelativeFiestaEntries(),
  ];
  const iloiloCityEntries = ILOILO_CITY_FIESTA_ENTRIES.map((e) => ({
    ...e,
    dateSource: e.dateSource ?? "curated-online-iloilo-city-youtube",
  }));
  const tarlacEntries = TARLAC_FIESTA_ENTRIES.map((e) => ({
    ...e,
    dateSource: e.dateSource ?? "lgu-tarlac-city-gov-ph",
  }));
  const tarlacRelativeEntries = buildTarlacRelativeFiestaEntries();
  const angonoEntries = ANGONO_FIESTA_ENTRIES.map((e) => ({
    ...e,
    dateSource: e.dateSource ?? "lgu-angono-brief-profile",
  }));
  const angonoRelativeEntries = buildAngonoRelativeFiestaEntries();
  const balilihanEntries = BALILIHAN_FIESTA_ENTRIES.map((e) => ({
    ...e,
    dateSource: e.dateSource ?? "lgu-balilihan-hanopol-parish",
  }));
  const bulaEntries = BULA_FIESTA_ENTRIES.map((e) => ({
    ...e,
    dateSource: e.dateSource ?? "parish-saint-joseph-palsong-bula",
  }));
  const bulaRelativeEntries = buildBulaRelativeFiestaEntries();
  const otonEntries = [
    ...OTON_FIESTA_ENTRIES.map((e) => ({
      ...e,
      dateSource: e.dateSource ?? "iloilo-provincial-gov-news",
    })),
    ...buildOtonRelativeFiestaEntries(),
  ];
  const santaMariaBulacanEntries = buildMunicipalDateRows(SANTA_MARIA_BULACAN_FIESTA_SCHEDULE, {
    municipality: "Santa Maria",
    province: "Bulacan",
    dateSource: "lgu-santa-maria-bulacan-clup",
  });
  const lagonoyEntries = buildMunicipalDateRows(LAGONOY_FIESTA_SCHEDULE, {
    municipality: "Lagonoy",
    province: "Camarines Sur",
    dateSource: "lgu-lagonoy-dahom",
  });
  const sanPascualEntries = buildSanPascualFiestaEntries();
  const sanVicentePalawanEntries = buildMunicipalDateRows(SAN_VICENTE_PALAWAN_FIESTA_SCHEDULE, {
    municipality: "San Vicente",
    province: "Palawan",
    dateSource: "lgu-san-vicente-palawan-clup",
  });
  const ubayWikipediaEntries = buildMunicipalDateRows(UBAY_WIKIPEDIA_FIESTA_SCHEDULE, {
    municipality: "Ubay",
    province: "Bohol",
    dateSource: "wikipedia-ubay-bohol-barangay-table",
  });
  const masantolEntries = buildMunicipalDateRows(MASANTOL_FIESTA_SCHEDULE, {
    municipality: "Masantol",
    province: "Pampanga",
    dateSource: "lgu-masantol-mpdo-scribd",
  });
  const malolosEntries = buildMunicipalDateRows(MALOLOS_FIESTA_SCHEDULE, {
    municipality: "City Of Malolos (Capital)",
    province: "Bulacan",
    dateSource: "lgu-malolos-ecological-profile-scribd",
  });
  const marilaoPdpfpEntries = buildMunicipalDateRows(MARILAO_PDPFP_FIESTA_SCHEDULE, {
    municipality: "Marilao",
    province: "Bulacan",
    dateSource: "lgu-bulacan-pdpfp-2024",
  });
  const meycauayanPdpfpEntries = buildMunicipalDateRows(MEYCAUAYAN_PDPFP_FIESTA_SCHEDULE, {
    municipality: "City Of Meycauayan",
    province: "Bulacan",
    dateSource: "lgu-bulacan-pdpfp-2024",
  });
  const pandiPdpfpEntries = buildMunicipalDateRows(PANDI_PDPFP_FIESTA_SCHEDULE, {
    municipality: "Pandi",
    province: "Bulacan",
    dateSource: "lgu-bulacan-pdpfp-2024",
  });
  const paombongPdpfpEntries = buildMunicipalDateRows(PAOMBONG_PDPFP_FIESTA_SCHEDULE, {
    municipality: "Paombong",
    province: "Bulacan",
    dateSource: "lgu-bulacan-pdpfp-2024",
  });
  const sanIldefonsoBulacanPdpfpEntries = buildMunicipalDateRows(SAN_ILDEFONSO_BULACAN_PDPFP_FIESTA_SCHEDULE, {
    municipality: "San Ildefonso",
    province: "Bulacan",
    dateSource: "lgu-bulacan-pdpfp-2024",
  });
  const angatPdpfpEntries = buildMunicipalDateRows(ANGAT_PDPFP_FIESTA_SCHEDULE, {
    municipality: "Angat",
    province: "Bulacan",
    dateSource: "lgu-bulacan-pdpfp-2024",
  });
  const bulacanTownPdpfpEntries = buildMunicipalDateRows(BULACAN_TOWN_PDPFP_FIESTA_SCHEDULE, {
    municipality: "Bulacan",
    province: "Bulacan",
    dateSource: "lgu-bulacan-pdpfp-2024",
  });
  const guiguintoPdpfpEntries = buildMunicipalDateRows(GUIGUINTO_PDPFP_FIESTA_SCHEDULE, {
    municipality: "Guiguinto",
    province: "Bulacan",
    dateSource: "lgu-bulacan-pdpfp-2024",
  });
  const hagonoyPdpfpEntries = buildMunicipalDateRows(HAGONOY_PDPFP_FIESTA_SCHEDULE, {
    municipality: "Hagonoy",
    province: "Bulacan",
    dateSource: "lgu-bulacan-pdpfp-2024",
  });
  const sanRafaelPdpfpEntries = buildMunicipalDateRows(SAN_RAFAEL_PDPFP_FIESTA_SCHEDULE, {
    municipality: "San Rafael",
    province: "Bulacan",
    dateSource: "lgu-bulacan-pdpfp-2024",
  });
  const bustosPdpfpEntries = buildMunicipalDateRows(BUSTOS_PDPFP_FIESTA_SCHEDULE, {
    municipality: "Bustos",
    province: "Bulacan",
    dateSource: "lgu-bulacan-pdpfp-2024",
  });
  const pulilanPdpfpEntries = buildMunicipalDateRows(PULILAN_PDPFP_FIESTA_SCHEDULE, {
    municipality: "Pulilan",
    province: "Bulacan",
    dateSource: "lgu-bulacan-pdpfp-2024",
  });
  const calumpitPdpfpEntries = buildMunicipalDateRows(CALUMPIT_PDPFP_FIESTA_SCHEDULE, {
    municipality: "Calumpit",
    province: "Bulacan",
    dateSource: "lgu-bulacan-pdpfp-2024",
  });
  const obandoPdpfpEntries = buildMunicipalDateRows(OBANDO_PDPFP_FIESTA_SCHEDULE, {
    municipality: "Obando",
    province: "Bulacan",
    dateSource: "lgu-bulacan-pdpfp-2024",
  });
  const balagtasPdpfpEntries = buildMunicipalDateRows(BALAGTAS_PDPFP_FIESTA_SCHEDULE, {
    municipality: "Balagtas (Bigaa)",
    province: "Bulacan",
    dateSource: "lgu-bulacan-pdpfp-2024",
  });
  const sanJoseDelMontePdpfpEntries = buildMunicipalDateRows(SAN_JOSE_DEL_MONTE_PDPFP_FIESTA_SCHEDULE, {
    municipality: "City Of San Jose Del Monte",
    province: "Bulacan",
    dateSource: "lgu-bulacan-pdpfp-2024",
  });
  const jasaanEntries = buildMunicipalDateRows(JASAAN_FIESTA_SCHEDULE, {
    municipality: "Jasaan",
    province: "Misamis Oriental",
    dateSource: "lgu-misamis-oriental-2nd-district-scribd",
  });
  const villanuevaMisorEntries = buildMunicipalDateRows(VILLANUEVA_MISOR_FIESTA_SCHEDULE, {
    municipality: "Villanueva",
    province: "Misamis Oriental",
    dateSource: "lgu-misamis-oriental-2nd-district-scribd",
  });
  const tagoloanMisorEntries = buildMunicipalDateRows(TAGOLOAN_MISOR_FIESTA_SCHEDULE, {
    municipality: "Tagoloan",
    province: "Misamis Oriental",
    dateSource: "lgu-misamis-oriental-2nd-district-scribd",
  });
  const opolEntries = buildMunicipalDateRows(OPOL_FIESTA_SCHEDULE, {
    municipality: "Opol",
    province: "Misamis Oriental",
    dateSource: "lgu-misamis-oriental-2nd-district-scribd",
  });
  const lugaitEntries = buildMunicipalDateRows(LUGAIT_FIESTA_SCHEDULE, {
    municipality: "Lugait",
    province: "Misamis Oriental",
    dateSource: "lgu-misamis-oriental-2nd-district-scribd",
  });
  const elSalvadorMisorEntries = buildMunicipalDateRows(EL_SALVADOR_MISOR_FIESTA_SCHEDULE, {
    municipality: "City Of El Salvador",
    province: "Misamis Oriental",
    dateSource: "lgu-misamis-oriental-2nd-district-scribd",
  });
  const initaoMisorEntries = buildMunicipalDateRows(INITAO_MISOR_FIESTA_SCHEDULE, {
    municipality: "Initao",
    province: "Misamis Oriental",
    dateSource: "lgu-misamis-oriental-2nd-district-scribd",
  });
  const naawanMisorEntries = buildMunicipalDateRows(NAAWAN_MISOR_FIESTA_SCHEDULE, {
    municipality: "Naawan",
    province: "Misamis Oriental",
    dateSource: "lgu-misamis-oriental-2nd-district-scribd",
  });
  const gitagumMisorEntries = buildMunicipalDateRows(GITAGUM_MISOR_FIESTA_SCHEDULE, {
    municipality: "Gitagum",
    province: "Misamis Oriental",
    dateSource: "lgu-misamis-oriental-2nd-district-scribd",
  });
  const laguindinganMisorEntries = buildMunicipalDateRows(LAGUINDINGAN_MISOR_FIESTA_SCHEDULE, {
    municipality: "Laguindingan",
    province: "Misamis Oriental",
    dateSource: "lgu-misamis-oriental-2nd-district-scribd",
  });
  const manticaoMisorEntries = buildMunicipalDateRows(MANTICAO_MISOR_FIESTA_SCHEDULE, {
    municipality: "Manticao",
    province: "Misamis Oriental",
    dateSource: "lgu-misamis-oriental-2nd-district-scribd",
  });
  const claveriaMisorEntries = buildMunicipalDateRows(CLAVERIA_MISOR_FIESTA_SCHEDULE, {
    municipality: "Claveria",
    province: "Misamis Oriental",
    dateSource: "lgu-misamis-oriental-2nd-district-scribd",
  });
  const alubijidMisorEntries = buildMunicipalDateRows(ALUBIJID_MISOR_FIESTA_SCHEDULE, {
    municipality: "Alubijid",
    province: "Misamis Oriental",
    dateSource: "lgu-misamis-oriental-2nd-district-scribd",
  });
  const libertadMisorEntries = buildMunicipalDateRows(LIBERTAD_MISOR_FIESTA_SCHEDULE, {
    municipality: "Libertad",
    province: "Misamis Oriental",
    dateSource: "lgu-misamis-oriental-2nd-district-scribd",
  });
  const magsaysayMisorEntries = buildMunicipalDateRows(MAGSAYSAY_MISOR_FIESTA_SCHEDULE, {
    municipality: "Magsaysay (Linugos)",
    province: "Misamis Oriental",
    dateSource: "lgu-misamis-oriental-1st-district-scribd",
  });
  const balingoanEntries = buildMunicipalDateRows(BALINGOAN_FIESTA_SCHEDULE, {
    municipality: "Balingoan",
    province: "Misamis Oriental",
    dateSource: "lgu-misamis-oriental-1st-district-scribd",
  });
  const gingoogOutlyingEntries = buildMunicipalDateRows(GINGOOG_OUTLYING_FIESTA_SCHEDULE, {
    municipality: "City Of Gingoog",
    province: "Misamis Oriental",
    dateSource: "lgu-misamis-oriental-1st-district-scribd",
  });
  const gingoogPoblacionEntries = buildMunicipalDateRows(GINGOOG_POBLACION_FIESTA_SCHEDULE, {
    municipality: "City Of Gingoog",
    province: "Misamis Oriental",
    dateSource: "lgu-misamis-oriental-1st-district-scribd",
  });
  const balingasagEntries = buildMunicipalDateRows(BALINGASAG_FIESTA_SCHEDULE, {
    municipality: "Balingasag",
    province: "Misamis Oriental",
    dateSource: "lgu-misamis-oriental-1st-district-scribd",
  });
  const kinoguitanEntries = buildMunicipalDateRows(KINOGUITAN_FIESTA_SCHEDULE, {
    municipality: "Kinoguitan",
    province: "Misamis Oriental",
    dateSource: "lgu-misamis-oriental-1st-district-scribd",
  });
  const sugbongcogonEntries = buildMunicipalDateRows(SUGBONGCOGON_FIESTA_SCHEDULE, {
    municipality: "Sugbongcogon",
    province: "Misamis Oriental",
    dateSource: "lgu-misamis-oriental-1st-district-scribd",
  });
  const binuanganEntries = buildMunicipalDateRows(BINUANGAN_FIESTA_SCHEDULE, {
    municipality: "Binuangan",
    province: "Misamis Oriental",
    dateSource: "parish-binuangan-our-lady-of-lourdes",
  });
  const salayEntries = buildMunicipalDateRows(SALAY_FIESTA_SCHEDULE, {
    municipality: "Salay",
    province: "Misamis Oriental",
    dateSource: "lgu-misamis-oriental-1st-district-scribd",
  });
  const lagonglongMisorEntries = buildMunicipalDateRows(LAGONGLONG_MISOR_FIESTA_SCHEDULE, {
    municipality: "Lagonglong",
    province: "Misamis Oriental",
    dateSource: "lgu-misamis-oriental-1st-district-scribd",
  });
  const talisayanEntries = buildMunicipalDateRows(TALISAYAN_FIESTA_SCHEDULE, {
    municipality: "Talisayan",
    province: "Misamis Oriental",
    dateSource: "lgu-misamis-oriental-1st-district-scribd",
  });
  const medinaEntries = buildMunicipalDateRows(MEDINA_FIESTA_SCHEDULE, {
    municipality: "Medina",
    province: "Misamis Oriental",
    dateSource: "lgu-misamis-oriental-1st-district-scribd",
  });
  const ormocEntries = ORMOC_FIESTA_ENTRIES.map((e) => ({ ...e }));
  const taclobanEntries = TACLOBAN_FIESTA_ENTRIES.map((e) => ({ ...e }));
  const dulagEntries = DULAG_FIESTA_ENTRIES.map((e) => ({ ...e }));
  const carigaraEntries = CARIGARA_FIESTA_ENTRIES.map((e) => ({ ...e }));
  const leyteParishEntries = LEYTE_PARISH_FIESTA_ENTRIES.map((e) => ({ ...e }));
  const pangasinanParishEntries = PANGASINAN_PARISH_FIESTA_ENTRIES.map((e) => ({ ...e }));
  const iloiloProvinceTheoldchurchesEntries = ILOILO_PROVINCE_THEOLDCHURCHES_ENTRIES.map((e) => ({
    ...e,
  }));
  const leyteTheoldchurchesEntries = LEYTE_THEOLDCHURCHES_ENTRIES.map((e) => ({ ...e }));
  const cebuTheoldchurchesEntries = CEBU_THEOLDCHURCHES_ENTRIES.map((e) => ({ ...e }));
  const capizTheoldchurchesEntries = CAPIZ_THEOLDCHURCHES_ENTRIES.map((e) => ({ ...e }));
  const negrosOccidentalTheoldchurchesEntries =
    NEGROS_OCCIDENTAL_THEOLDCHURCHES_ENTRIES.map((e) => ({ ...e }));
  const aklanTheoldchurchesEntries = AKLAN_THEOLDCHURCHES_ENTRIES.map((e) => ({ ...e }));
  const boholTheoldchurchesEntries = BOHOL_THEOLDCHURCHES_ENTRIES.map((e) => ({ ...e }));
  const camarinesSurTheoldchurchesEntries = CAMARINES_SUR_THEOLDCHURCHES_ENTRIES.map((e) => ({
    ...e,
  }));
  const negrosOrientalTheoldchurchesEntries = NEGROS_ORIENTAL_THEOLDCHURCHES_ENTRIES.map((e) => ({
    ...e,
  }));
  const samarTheoldchurchesEntries = SAMAR_THEOLDCHURCHES_ENTRIES.map((e) => ({ ...e }));
  const easternSamarTheoldchurchesEntries = EASTERN_SAMAR_THEOLDCHURCHES_ENTRIES.map((e) => ({
    ...e,
  }));
  const northernSamarTheoldchurchesEntries = NORTHERN_SAMAR_THEOLDCHURCHES_ENTRIES.map((e) => ({
    ...e,
  }));
  const southernLeyteTheoldchurchesEntries = SOUTHERN_LEYTE_THEOLDCHURCHES_ENTRIES.map((e) => ({
    ...e,
  }));
  const antiqueTheoldchurchesEntries = ANTIQUE_THEOLDCHURCHES_ENTRIES.map((e) => ({ ...e }));
  const romblonTheoldchurchesEntries = ROMBLON_THEOLDCHURCHES_ENTRIES.map((e) => ({ ...e }));
  const guimarasTheoldchurchesEntries = GUIMARAS_THEOLDCHURCHES_ENTRIES.map((e) => ({ ...e }));
  const camarinesNorteTheoldchurchesEntries = CAMARINES_NORTE_THEOLDCHURCHES_ENTRIES.map((e) => ({
    ...e,
  }));
  const curatedOnlineEntries = CURATED_ONLINE_FIESTA_ENTRIES.map((e) => ({
    ...e,
    dateSource: e.dateSource ?? "curated-online",
  }));
  const curatedOnlineRelativeEntries = buildCuratedOnlineRelativeEntries();
  const cabatuanEntries = buildCabatuanFiestaEntries();
  const wikiEntries = WIKIPEDIA_BARANGAY_ENTRIES.map((e) => ({
    ...e,
    dateSource: e.dateSource ?? "wikipedia-festivals-ph",
  }));

  const siargao = resolveScheduleEntries(siargaoEntries);
  const biliranMay = resolveScheduleEntries(biliranMayEntries);
  const biliranApril = resolveScheduleEntries(biliranAprilEntries);
  const biliranTheoldchurches = resolveScheduleEntries(biliranTheoldchurchesEntries);
  const gma = resolveScheduleEntries([...gmaEntries, ...gmaRelativeEntries]);
  const bayawan = resolveScheduleEntries(bayawanEntries);
  const pinamungahan = resolveScheduleEntries(pinamungahanEntries);
  const macabebe = resolveScheduleEntries(macabebeEntries);
  const lucena = resolveScheduleEntries(lucenaEntries);
  const mulanay = resolveScheduleEntries(mulanayEntries);
  const miagao = resolveScheduleEntries(miagaoEntries);
  const iloiloCity = resolveScheduleEntries(iloiloCityEntries);
  const tarlac = resolveScheduleEntries([...tarlacEntries, ...tarlacRelativeEntries]);
  const angono = resolveScheduleEntries([...angonoEntries, ...angonoRelativeEntries]);
  const balilihan = resolveScheduleEntries(balilihanEntries);
  const bula = resolveScheduleEntries([...bulaEntries, ...bulaRelativeEntries]);
  const oton = resolveScheduleEntries(otonEntries);
  const santaMariaBulacan = resolveScheduleEntries(santaMariaBulacanEntries);
  const lagonoy = resolveScheduleEntries(lagonoyEntries);
  const sanPascual = resolveScheduleEntries(sanPascualEntries);
  const sanVicentePalawan = resolveScheduleEntries(sanVicentePalawanEntries);
  const ubayWikipedia = resolveScheduleEntries(ubayWikipediaEntries);
  const masantol = resolveScheduleEntries(masantolEntries);
  const malolos = resolveScheduleEntries(malolosEntries);
  const marilaoPdpfp = resolveScheduleEntries(marilaoPdpfpEntries);
  const meycauayanPdpfp = resolveScheduleEntries(meycauayanPdpfpEntries);
  const pandiPdpfp = resolveScheduleEntries(pandiPdpfpEntries);
  const paombongPdpfp = resolveScheduleEntries(paombongPdpfpEntries);
  const sanIldefonsoBulacanPdpfp = resolveScheduleEntries(sanIldefonsoBulacanPdpfpEntries);
  const angatPdpfp = resolveScheduleEntries(angatPdpfpEntries);
  const bulacanTownPdpfp = resolveScheduleEntries(bulacanTownPdpfpEntries);
  const guiguintoPdpfp = resolveScheduleEntries(guiguintoPdpfpEntries);
  const hagonoyPdpfp = resolveScheduleEntries(hagonoyPdpfpEntries);
  const sanRafaelPdpfp = resolveScheduleEntries(sanRafaelPdpfpEntries);
  const bustosPdpfp = resolveScheduleEntries(bustosPdpfpEntries);
  const pulilanPdpfp = resolveScheduleEntries(pulilanPdpfpEntries);
  const calumpitPdpfp = resolveScheduleEntries(calumpitPdpfpEntries);
  const obandoPdpfp = resolveScheduleEntries(obandoPdpfpEntries);
  const balagtasPdpfp = resolveScheduleEntries(balagtasPdpfpEntries);
  const sanJoseDelMontePdpfp = resolveScheduleEntries(sanJoseDelMontePdpfpEntries);
  const jasaan = resolveScheduleEntries(jasaanEntries);
  const villanuevaMisor = resolveScheduleEntries(villanuevaMisorEntries);
  const tagoloanMisor = resolveScheduleEntries(tagoloanMisorEntries);
  const opol = resolveScheduleEntries(opolEntries);
  const lugait = resolveScheduleEntries(lugaitEntries);
  const elSalvadorMisor = resolveScheduleEntries(elSalvadorMisorEntries);
  const initaoMisor = resolveScheduleEntries(initaoMisorEntries);
  const naawanMisor = resolveScheduleEntries(naawanMisorEntries);
  const gitagumMisor = resolveScheduleEntries(gitagumMisorEntries);
  const laguindinganMisor = resolveScheduleEntries(laguindinganMisorEntries);
  const manticaoMisor = resolveScheduleEntries(manticaoMisorEntries);
  const claveriaMisor = resolveScheduleEntries(claveriaMisorEntries);
  const alubijidMisor = resolveScheduleEntries(alubijidMisorEntries);
  const libertadMisor = resolveScheduleEntries(libertadMisorEntries);
  const magsaysayMisor = resolveScheduleEntries(magsaysayMisorEntries);
  const balingoan = resolveScheduleEntries(balingoanEntries);
  const gingoogOutlying = resolveScheduleEntries(gingoogOutlyingEntries);
  const gingoogPoblacion = resolveScheduleEntries(gingoogPoblacionEntries);
  const balingasag = resolveScheduleEntries(balingasagEntries);
  const kinoguitan = resolveScheduleEntries(kinoguitanEntries);
  const sugbongcogon = resolveScheduleEntries(sugbongcogonEntries);
  const binuangan = resolveScheduleEntries(binuanganEntries);
  const salay = resolveScheduleEntries(salayEntries);
  const lagonglongMisor = resolveScheduleEntries(lagonglongMisorEntries);
  const talisayan = resolveScheduleEntries(talisayanEntries);
  const medina = resolveScheduleEntries(medinaEntries);
  const ormoc = resolveScheduleEntries(ormocEntries);
  const tacloban = resolveScheduleEntries(taclobanEntries);
  const dulag = resolveScheduleEntries(dulagEntries);
  const carigara = resolveScheduleEntries(carigaraEntries);
  const leyteParish = resolveScheduleEntries(leyteParishEntries);
  const pangasinanParish = resolveScheduleEntries(pangasinanParishEntries);
  const iloiloProvinceTheoldchurches = resolveScheduleEntries(iloiloProvinceTheoldchurchesEntries);
  const leyteTheoldchurches = resolveScheduleEntries(leyteTheoldchurchesEntries);
  const cebuTheoldchurches = resolveScheduleEntries(cebuTheoldchurchesEntries);
  const capizTheoldchurches = resolveScheduleEntries(capizTheoldchurchesEntries);
  const negrosOccidentalTheoldchurches = resolveScheduleEntries(
    negrosOccidentalTheoldchurchesEntries
  );
  const aklanTheoldchurches = resolveScheduleEntries(aklanTheoldchurchesEntries);
  const boholTheoldchurches = resolveScheduleEntries(boholTheoldchurchesEntries);
  const camarinesSurTheoldchurches = resolveScheduleEntries(camarinesSurTheoldchurchesEntries);
  const negrosOrientalTheoldchurches = resolveScheduleEntries(negrosOrientalTheoldchurchesEntries);
  const samarTheoldchurches = resolveScheduleEntries(samarTheoldchurchesEntries);
  const easternSamarTheoldchurches = resolveScheduleEntries(easternSamarTheoldchurchesEntries);
  const northernSamarTheoldchurches = resolveScheduleEntries(northernSamarTheoldchurchesEntries);
  const southernLeyteTheoldchurches = resolveScheduleEntries(southernLeyteTheoldchurchesEntries);
  const antiqueTheoldchurches = resolveScheduleEntries(antiqueTheoldchurchesEntries);
  const romblonTheoldchurches = resolveScheduleEntries(romblonTheoldchurchesEntries);
  const guimarasTheoldchurches = resolveScheduleEntries(guimarasTheoldchurchesEntries);
  const camarinesNorteTheoldchurches = resolveScheduleEntries(camarinesNorteTheoldchurchesEntries);
  const curatedOnline = resolveScheduleEntries([
    ...curatedOnlineEntries,
    ...curatedOnlineRelativeEntries,
  ]);
  const cabatuan = resolveScheduleEntries(cabatuanEntries);
  const wiki = resolveScheduleEntries(wikiEntries);
  const fetched = loadFetchedLguByPsgc();
  const embeddedHtml = loadEmbeddedHtmlSchedules();

  _cache = {
    byPsgc: {
      ...siargao.byPsgc,
      ...biliranMay.byPsgc,
      ...biliranApril.byPsgc,
      ...biliranTheoldchurches.byPsgc,
      ...gma.byPsgc,
      ...bayawan.byPsgc,
      ...pinamungahan.byPsgc,
      ...macabebe.byPsgc,
      ...lucena.byPsgc,
      ...mulanay.byPsgc,
      ...miagao.byPsgc,
      ...iloiloCity.byPsgc,
      ...tarlac.byPsgc,
      ...angono.byPsgc,
      ...balilihan.byPsgc,
      ...bula.byPsgc,
      ...oton.byPsgc,
      ...santaMariaBulacan.byPsgc,
      ...lagonoy.byPsgc,
      ...sanPascual.byPsgc,
      ...sanVicentePalawan.byPsgc,
      ...ubayWikipedia.byPsgc,
      ...masantol.byPsgc,
      ...malolos.byPsgc,
      ...marilaoPdpfp.byPsgc,
      ...meycauayanPdpfp.byPsgc,
      ...pandiPdpfp.byPsgc,
      ...paombongPdpfp.byPsgc,
      ...sanIldefonsoBulacanPdpfp.byPsgc,
      ...angatPdpfp.byPsgc,
      ...bulacanTownPdpfp.byPsgc,
      ...guiguintoPdpfp.byPsgc,
      ...hagonoyPdpfp.byPsgc,
      ...sanRafaelPdpfp.byPsgc,
      ...bustosPdpfp.byPsgc,
      ...pulilanPdpfp.byPsgc,
      ...calumpitPdpfp.byPsgc,
      ...obandoPdpfp.byPsgc,
      ...balagtasPdpfp.byPsgc,
      ...sanJoseDelMontePdpfp.byPsgc,
      ...jasaan.byPsgc,
      ...villanuevaMisor.byPsgc,
      ...tagoloanMisor.byPsgc,
      ...opol.byPsgc,
      ...lugait.byPsgc,
      ...elSalvadorMisor.byPsgc,
      ...initaoMisor.byPsgc,
      ...naawanMisor.byPsgc,
      ...gitagumMisor.byPsgc,
      ...laguindinganMisor.byPsgc,
      ...manticaoMisor.byPsgc,
      ...claveriaMisor.byPsgc,
      ...alubijidMisor.byPsgc,
      ...libertadMisor.byPsgc,
      ...magsaysayMisor.byPsgc,
      ...balingoan.byPsgc,
      ...gingoogOutlying.byPsgc,
      ...gingoogPoblacion.byPsgc,
      ...balingasag.byPsgc,
      ...kinoguitan.byPsgc,
      ...sugbongcogon.byPsgc,
      ...binuangan.byPsgc,
      ...salay.byPsgc,
      ...lagonglongMisor.byPsgc,
      ...talisayan.byPsgc,
      ...medina.byPsgc,
      ...ormoc.byPsgc,
      ...tacloban.byPsgc,
      ...dulag.byPsgc,
      ...carigara.byPsgc,
      ...leyteParish.byPsgc,
      ...pangasinanParish.byPsgc,
      ...iloiloProvinceTheoldchurches.byPsgc,
      ...leyteTheoldchurches.byPsgc,
      ...cebuTheoldchurches.byPsgc,
      ...capizTheoldchurches.byPsgc,
      ...negrosOccidentalTheoldchurches.byPsgc,
      ...aklanTheoldchurches.byPsgc,
      ...boholTheoldchurches.byPsgc,
      ...camarinesSurTheoldchurches.byPsgc,
      ...negrosOrientalTheoldchurches.byPsgc,
      ...samarTheoldchurches.byPsgc,
      ...easternSamarTheoldchurches.byPsgc,
      ...northernSamarTheoldchurches.byPsgc,
      ...southernLeyteTheoldchurches.byPsgc,
      ...antiqueTheoldchurches.byPsgc,
      ...romblonTheoldchurches.byPsgc,
      ...guimarasTheoldchurches.byPsgc,
      ...camarinesNorteTheoldchurches.byPsgc,
      ...curatedOnline.byPsgc,
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
      biliranTheoldchurches: {
        entries: biliranTheoldchurchesEntries.length,
        matched: biliranTheoldchurches.matched,
        missed: biliranTheoldchurches.missed,
      },
      gma: {
        entries: gmaEntries.length + gmaRelativeEntries.length,
        matched: gma.matched,
        missed: gma.missed,
      },
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
      lucena: {
        entries: lucenaEntries.length,
        matched: lucena.matched,
        missed: lucena.missed,
      },
      mulanay: {
        entries: mulanayEntries.length,
        matched: mulanay.matched,
        missed: mulanay.missed,
      },
      miagao: {
        entries: miagaoEntries.length,
        matched: miagao.matched,
        missed: miagao.missed,
      },
      iloiloCity: {
        entries: iloiloCityEntries.length,
        matched: iloiloCity.matched,
        missed: iloiloCity.missed,
      },
      tarlac: {
        entries: tarlacEntries.length + tarlacRelativeEntries.length,
        matched: tarlac.matched,
        missed: tarlac.missed,
      },
      angono: {
        entries: angonoEntries.length + angonoRelativeEntries.length,
        matched: angono.matched,
        missed: angono.missed,
      },
      balilihan: {
        entries: balilihanEntries.length,
        matched: balilihan.matched,
        missed: balilihan.missed,
      },
      bula: {
        entries: bulaEntries.length + bulaRelativeEntries.length,
        matched: bula.matched,
        missed: bula.missed,
      },
      oton: {
        entries: otonEntries.length,
        matched: oton.matched,
        missed: oton.missed,
      },
      santaMariaBulacan: {
        entries: santaMariaBulacanEntries.length,
        matched: santaMariaBulacan.matched,
        missed: santaMariaBulacan.missed,
      },
      lagonoy: {
        entries: lagonoyEntries.length,
        matched: lagonoy.matched,
        missed: lagonoy.missed,
      },
      sanPascual: {
        entries: sanPascualEntries.length,
        matched: sanPascual.matched,
        missed: sanPascual.missed,
      },
      sanVicentePalawan: {
        entries: sanVicentePalawanEntries.length,
        matched: sanVicentePalawan.matched,
        missed: sanVicentePalawan.missed,
      },
      ubayWikipedia: {
        entries: ubayWikipediaEntries.length,
        matched: ubayWikipedia.matched,
        missed: ubayWikipedia.missed,
      },
      masantol: {
        entries: masantolEntries.length,
        matched: masantol.matched,
        missed: masantol.missed,
      },
      malolos: {
        entries: malolosEntries.length,
        matched: malolos.matched,
        missed: malolos.missed,
      },
      marilaoPdpfp: {
        entries: marilaoPdpfpEntries.length,
        matched: marilaoPdpfp.matched,
        missed: marilaoPdpfp.missed,
      },
      meycauayanPdpfp: {
        entries: meycauayanPdpfpEntries.length,
        matched: meycauayanPdpfp.matched,
        missed: meycauayanPdpfp.missed,
      },
      pandiPdpfp: {
        entries: pandiPdpfpEntries.length,
        matched: pandiPdpfp.matched,
        missed: pandiPdpfp.missed,
      },
      paombongPdpfp: {
        entries: paombongPdpfpEntries.length,
        matched: paombongPdpfp.matched,
        missed: paombongPdpfp.missed,
      },
      sanIldefonsoBulacanPdpfp: {
        entries: sanIldefonsoBulacanPdpfpEntries.length,
        matched: sanIldefonsoBulacanPdpfp.matched,
        missed: sanIldefonsoBulacanPdpfp.missed,
      },
      angatPdpfp: {
        entries: angatPdpfpEntries.length,
        matched: angatPdpfp.matched,
        missed: angatPdpfp.missed,
      },
      bulacanTownPdpfp: {
        entries: bulacanTownPdpfpEntries.length,
        matched: bulacanTownPdpfp.matched,
        missed: bulacanTownPdpfp.missed,
      },
      guiguintoPdpfp: {
        entries: guiguintoPdpfpEntries.length,
        matched: guiguintoPdpfp.matched,
        missed: guiguintoPdpfp.missed,
      },
      hagonoyPdpfp: {
        entries: hagonoyPdpfpEntries.length,
        matched: hagonoyPdpfp.matched,
        missed: hagonoyPdpfp.missed,
      },
      sanRafaelPdpfp: {
        entries: sanRafaelPdpfpEntries.length,
        matched: sanRafaelPdpfp.matched,
        missed: sanRafaelPdpfp.missed,
      },
      bustosPdpfp: {
        entries: bustosPdpfpEntries.length,
        matched: bustosPdpfp.matched,
        missed: bustosPdpfp.missed,
      },
      pulilanPdpfp: {
        entries: pulilanPdpfpEntries.length,
        matched: pulilanPdpfp.matched,
        missed: pulilanPdpfp.missed,
      },
      calumpitPdpfp: {
        entries: calumpitPdpfpEntries.length,
        matched: calumpitPdpfp.matched,
        missed: calumpitPdpfp.missed,
      },
      obandoPdpfp: {
        entries: obandoPdpfpEntries.length,
        matched: obandoPdpfp.matched,
        missed: obandoPdpfp.missed,
      },
      balagtasPdpfp: {
        entries: balagtasPdpfpEntries.length,
        matched: balagtasPdpfp.matched,
        missed: balagtasPdpfp.missed,
      },
      sanJoseDelMontePdpfp: {
        entries: sanJoseDelMontePdpfpEntries.length,
        matched: sanJoseDelMontePdpfp.matched,
        missed: sanJoseDelMontePdpfp.missed,
      },
      jasaan: {
        entries: jasaanEntries.length,
        matched: jasaan.matched,
        missed: jasaan.missed,
      },
      villanuevaMisor: {
        entries: villanuevaMisorEntries.length,
        matched: villanuevaMisor.matched,
        missed: villanuevaMisor.missed,
      },
      tagoloanMisor: {
        entries: tagoloanMisorEntries.length,
        matched: tagoloanMisor.matched,
        missed: tagoloanMisor.missed,
      },
      opol: {
        entries: opolEntries.length,
        matched: opol.matched,
        missed: opol.missed,
      },
      lugait: {
        entries: lugaitEntries.length,
        matched: lugait.matched,
        missed: lugait.missed,
      },
      elSalvadorMisor: {
        entries: elSalvadorMisorEntries.length,
        matched: elSalvadorMisor.matched,
        missed: elSalvadorMisor.missed,
      },
      initaoMisor: {
        entries: initaoMisorEntries.length,
        matched: initaoMisor.matched,
        missed: initaoMisor.missed,
      },
      naawanMisor: {
        entries: naawanMisorEntries.length,
        matched: naawanMisor.matched,
        missed: naawanMisor.missed,
      },
      gitagumMisor: {
        entries: gitagumMisorEntries.length,
        matched: gitagumMisor.matched,
        missed: gitagumMisor.missed,
      },
      laguindinganMisor: {
        entries: laguindinganMisorEntries.length,
        matched: laguindinganMisor.matched,
        missed: laguindinganMisor.missed,
      },
      manticaoMisor: {
        entries: manticaoMisorEntries.length,
        matched: manticaoMisor.matched,
        missed: manticaoMisor.missed,
      },
      claveriaMisor: {
        entries: claveriaMisorEntries.length,
        matched: claveriaMisor.matched,
        missed: claveriaMisor.missed,
      },
      alubijidMisor: {
        entries: alubijidMisorEntries.length,
        matched: alubijidMisor.matched,
        missed: alubijidMisor.missed,
      },
      libertadMisor: {
        entries: libertadMisorEntries.length,
        matched: libertadMisor.matched,
        missed: libertadMisor.missed,
      },
      magsaysayMisor: {
        entries: magsaysayMisorEntries.length,
        matched: magsaysayMisor.matched,
        missed: magsaysayMisor.missed,
      },
      balingoan: {
        entries: balingoanEntries.length,
        matched: balingoan.matched,
        missed: balingoan.missed,
      },
      gingoogOutlying: {
        entries: gingoogOutlyingEntries.length,
        matched: gingoogOutlying.matched,
        missed: gingoogOutlying.missed,
      },
      gingoogPoblacion: {
        entries: gingoogPoblacionEntries.length,
        matched: gingoogPoblacion.matched,
        missed: gingoogPoblacion.missed,
      },
      balingasag: {
        entries: balingasagEntries.length,
        matched: balingasag.matched,
        missed: balingasag.missed,
      },
      kinoguitan: {
        entries: kinoguitanEntries.length,
        matched: kinoguitan.matched,
        missed: kinoguitan.missed,
      },
      sugbongcogon: {
        entries: sugbongcogonEntries.length,
        matched: sugbongcogon.matched,
        missed: sugbongcogon.missed,
      },
      binuangan: {
        entries: binuanganEntries.length,
        matched: binuangan.matched,
        missed: binuangan.missed,
      },
      salay: {
        entries: salayEntries.length,
        matched: salay.matched,
        missed: salay.missed,
      },
      lagonglongMisor: {
        entries: lagonglongMisorEntries.length,
        matched: lagonglongMisor.matched,
        missed: lagonglongMisor.missed,
      },
      talisayan: {
        entries: talisayanEntries.length,
        matched: talisayan.matched,
        missed: talisayan.missed,
      },
      medina: {
        entries: medinaEntries.length,
        matched: medina.matched,
        missed: medina.missed,
      },
      ormoc: {
        entries: ormocEntries.length,
        matched: ormoc.matched,
        missed: ormoc.missed,
      },
      tacloban: {
        entries: taclobanEntries.length,
        matched: tacloban.matched,
        missed: tacloban.missed,
      },
      dulag: {
        entries: dulagEntries.length,
        matched: dulag.matched,
        missed: dulag.missed,
      },
      carigara: {
        entries: carigaraEntries.length,
        matched: carigara.matched,
        missed: carigara.missed,
      },
      leyteParish: {
        entries: leyteParishEntries.length,
        matched: leyteParish.matched,
        missed: leyteParish.missed,
      },
      pangasinanParish: {
        entries: pangasinanParishEntries.length,
        matched: pangasinanParish.matched,
        missed: pangasinanParish.missed,
      },
      iloiloProvinceTheoldchurches: {
        entries: iloiloProvinceTheoldchurchesEntries.length,
        matched: iloiloProvinceTheoldchurches.matched,
        missed: iloiloProvinceTheoldchurches.missed,
      },
      leyteTheoldchurches: {
        entries: leyteTheoldchurchesEntries.length,
        matched: leyteTheoldchurches.matched,
        missed: leyteTheoldchurches.missed,
      },
      cebuTheoldchurches: {
        entries: cebuTheoldchurchesEntries.length,
        matched: cebuTheoldchurches.matched,
        missed: cebuTheoldchurches.missed,
      },
      capizTheoldchurches: {
        entries: capizTheoldchurchesEntries.length,
        matched: capizTheoldchurches.matched,
        missed: capizTheoldchurches.missed,
      },
      negrosOccidentalTheoldchurches: {
        entries: negrosOccidentalTheoldchurchesEntries.length,
        matched: negrosOccidentalTheoldchurches.matched,
        missed: negrosOccidentalTheoldchurches.missed,
      },
      aklanTheoldchurches: {
        entries: aklanTheoldchurchesEntries.length,
        matched: aklanTheoldchurches.matched,
        missed: aklanTheoldchurches.missed,
      },
      boholTheoldchurches: {
        entries: boholTheoldchurchesEntries.length,
        matched: boholTheoldchurches.matched,
        missed: boholTheoldchurches.missed,
      },
      camarinesSurTheoldchurches: {
        entries: camarinesSurTheoldchurchesEntries.length,
        matched: camarinesSurTheoldchurches.matched,
        missed: camarinesSurTheoldchurches.missed,
      },
      negrosOrientalTheoldchurches: {
        entries: negrosOrientalTheoldchurchesEntries.length,
        matched: negrosOrientalTheoldchurches.matched,
        missed: negrosOrientalTheoldchurches.missed,
      },
      samarTheoldchurches: {
        entries: samarTheoldchurchesEntries.length,
        matched: samarTheoldchurches.matched,
        missed: samarTheoldchurches.missed,
      },
      easternSamarTheoldchurches: {
        entries: easternSamarTheoldchurchesEntries.length,
        matched: easternSamarTheoldchurches.matched,
        missed: easternSamarTheoldchurches.missed,
      },
      northernSamarTheoldchurches: {
        entries: northernSamarTheoldchurchesEntries.length,
        matched: northernSamarTheoldchurches.matched,
        missed: northernSamarTheoldchurches.missed,
      },
      southernLeyteTheoldchurches: {
        entries: southernLeyteTheoldchurchesEntries.length,
        matched: southernLeyteTheoldchurches.matched,
        missed: southernLeyteTheoldchurches.missed,
      },
      antiqueTheoldchurches: {
        entries: antiqueTheoldchurchesEntries.length,
        matched: antiqueTheoldchurches.matched,
        missed: antiqueTheoldchurches.missed,
      },
      romblonTheoldchurches: {
        entries: romblonTheoldchurchesEntries.length,
        matched: romblonTheoldchurches.matched,
        missed: romblonTheoldchurches.missed,
      },
      guimarasTheoldchurches: {
        entries: guimarasTheoldchurchesEntries.length,
        matched: guimarasTheoldchurches.matched,
        missed: guimarasTheoldchurches.missed,
      },
      camarinesNorteTheoldchurches: {
        entries: camarinesNorteTheoldchurchesEntries.length,
        matched: camarinesNorteTheoldchurches.matched,
        missed: camarinesNorteTheoldchurches.missed,
      },
      curatedOnline: {
        entries: curatedOnlineEntries.length + curatedOnlineRelativeEntries.length,
        matched: curatedOnline.matched,
        missed: curatedOnline.missed,
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
