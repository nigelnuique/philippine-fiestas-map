/**
 * Maps HUC cities missing barangay GeoJSON to altcoder shapefile source codes.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { normalizeCityName, psaToAdm3 } from "./psgc-adm.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const PSGC_RAW = path.join(ROOT, "data", "raw", "psgc2", "raw.json");
const BGY_INDEX = path.join(ROOT, "data", "processed", "boundaries", "barangays-index.json");
const ADM3_CSV = path.join(ROOT, "data", "raw", "altcoder", "PH_Adm3_MuniCities.csv");

/** Manual overrides when name matching is ambiguous or collection uses adm2. */
export const HUC_BARANGAY_SOURCE_OVERRIDES = {
  313900000: { sourceAdm2: 1380600000, cityName: "City of Manila" },
  317404000: { sourceAdm3: 1381300000, cityName: "Quezon City" },
  317405000: { sourceAdm3: 1381400000, cityName: "City of San Juan" },
  702230000: { sourceAdm3: 731300000, cityName: "City of Mandaue" },
};

function loadAdm3Catalog() {
  if (!fs.existsSync(ADM3_CSV)) return [];
  const rows = [];
  for (const line of fs.readFileSync(ADM3_CSV, "utf8").split("\n").slice(1)) {
    if (!line.trim()) continue;
    const [adm1, adm2, adm3, name, geoLevel] = line.split(",");
    rows.push({
      adm1: Number(adm1),
      adm2: Number(adm2),
      adm3: Number(adm3),
      name,
      geoLevel,
      norm: normalizeCityName(name),
    });
  }
  return rows;
}

function findSourceAdm3(cityName, targetAdm1) {
  const catalog = loadAdm3Catalog();
  const target = normalizeCityName(cityName);

  const cityRows = catalog.filter(
    (r) => r.geoLevel === "City" && r.norm === target
  );
  if (cityRows.length === 1) return cityRows[0].adm3;
  if (cityRows.length > 1) {
    const regional = cityRows.find((r) => Math.floor(r.adm1 / 1e9) === Math.floor(targetAdm1 / 1e9));
    return (regional ?? cityRows[0]).adm3;
  }

  const fuzzy = catalog.filter(
    (r) =>
      r.geoLevel === "City" &&
      (r.norm.includes(target) || target.includes(r.norm)) &&
      Math.abs(r.norm.length - target.length) <= 6
  );
  if (fuzzy.length === 1) return fuzzy[0].adm3;
  return null;
}

/**
 * PSGC barangay name (normalized) → altcoder shape name key (normalized).
 * Used when spellings differ between PSGC and altcoder shapefile.
 */
export const BARANGAY_SHAPE_ALIASES_BY_ADM3 = {
  305401000: {
    malabanias: "malabanas",
    "ninoy aquino": "ninoy aquino",
  },
  307107000: {
    barreto: "barretto",
  },
  13504000: {
    mahayhay: "mahayahay",
    acmac: "acmac mariano badelles sr",
  },
};

function countPsgcBarangays(raw, cityCode9) {
  let inCity = false;
  let count = 0;
  for (const row of raw) {
    if (row.interLevel === "City" && row.code === cityCode9) {
      inCity = true;
      continue;
    }
    if (inCity && (row.interLevel === "City" || row.interLevel === "Mun")) break;
    if (inCity && row.interLevel === "Bgy") count++;
  }
  return count;
}

function resolveHucConfig(h, raw, bgyIndex) {
  const targetAdm3 = psaToAdm3(h.code);
  const adm1 = Number(
    `${String(h.code).padStart(9, "0")[1]}${String(h.code).padStart(9, "0")[0]}0000000`
  );
  const override = HUC_BARANGAY_SOURCE_OVERRIDES[targetAdm3];
  const sourceAdm3 = override?.sourceAdm3 ?? findSourceAdm3(h.name, adm1);
  const sourceAdm2 = override?.sourceAdm2 ?? null;

  if (!sourceAdm3 && !sourceAdm2) return null;

  const indexed = bgyIndex[targetAdm3];
  const expected = countPsgcBarangays(raw, h.code);

  return {
    targetAdm3,
    sourceAdm3,
    sourceAdm2,
    cityName: override?.cityName ?? h.name,
    psgc9: h.code,
    filterByAdm2: Boolean(sourceAdm2),
    expectedBarangays: expected,
    indexedBarangays: indexed?.featureCount ?? 0,
    needsBuild: !indexed || indexed.featureCount < expected,
  };
}

/** All HUC cities with altcoder source mapping. */
export function listAllHucBarangayConfigs() {
  const raw = JSON.parse(fs.readFileSync(PSGC_RAW, "utf8"));
  const bgyIndex = fs.existsSync(BGY_INDEX)
    ? JSON.parse(fs.readFileSync(BGY_INDEX, "utf8"))
    : {};
  const hucs = raw.filter((r) => r.interLevel === "City" && r.cityClass === "HUC");

  return hucs.map((h) => resolveHucConfig(h, raw, bgyIndex)).filter(Boolean);
}

/** HUC cities missing or with fewer barangays than PSGC expects. */
export function listHucBarangayBackfillTargets() {
  return listAllHucBarangayConfigs().filter((c) => c.needsBuild);
}

/** @deprecated Use listHucBarangayBackfillTargets */
export function listMissingHucBarangayCities() {
  return listHucBarangayBackfillTargets();
}
