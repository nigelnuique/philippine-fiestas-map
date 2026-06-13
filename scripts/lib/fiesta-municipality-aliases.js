/**
 * Maps philippines-json-maps municipality codes (often 1380… in NCR, or
 * provdist placeholders) to the adm3 keys used in barangay-fiestas.json.
 */
import { psaToAdm3, normalizeCityName } from "./psgc-adm.js";

export const MANILA_MAP_PSGC = 1380600000;
export const MANILA_FIESTA_SUBDISTRICT_PREFIX = "3139";

/** @param {Record<string, { municipalities?: { psgc: number, name: string, huc?: boolean }[] }>} muniIndex */
export function buildFiestaMunicipalityAliases(muniIndex, psgcRaw) {
  /** @type {Record<string, number>} */
  const aliases = {};

  const psgcByNorm = new Map();
  for (const row of psgcRaw) {
    if (row.interLevel === "City" || row.interLevel === "Mun") {
      const key = normalizeCityName(row.name);
      if (!psgcByNorm.has(key)) psgcByNorm.set(key, []);
      psgcByNorm.get(key).push(row);
    }
  }

  const allMunis = Object.values(muniIndex).flatMap((p) => p.municipalities ?? []);
  for (const m of allMunis) {
    const mapCode = Number(m.psgc);
    const psaCode = resolvePsaCodeForMunicipality(m, psgcByNorm);
    if (!psaCode) continue;
    const fiestaCode = psaToAdm3(psaCode);
    if (fiestaCode === mapCode) continue;

    const isNcrMap = String(mapCode).startsWith("138");
    const isDavaoPlaceholder = mapCode === 1130700000;
    if (!isNcrMap && !isDavaoPlaceholder && !m.huc) continue;

    aliases[String(mapCode)] = fiestaCode;
  }

  return aliases;
}

function resolvePsaCodeForMunicipality(municipality, psgcByNorm) {
  const candidates = psgcByNorm.get(normalizeCityName(municipality.name)) ?? [];
  if (!candidates.length) return null;
  if (candidates.length === 1) return candidates[0].code;

  if (String(municipality.psgc).startsWith("138")) {
    const ncr = candidates.find((c) => String(psaToAdm3(c.code)).startsWith("317"));
    if (ncr) return ncr.code;
  }

  if (municipality.huc) {
    const huc = candidates.find((c) => c.cityClass === "HUC");
    if (huc) return huc.code;
  }

  return candidates[0].code;
}

/**
 * Convert a map-facing barangay PSGC to the adm4 code used in fiesta records.
 * @param {number|string|null|undefined} mapBarangayPsgc
 * @param {Record<string, number>} municipalityAliases
 */
export function mapBarangayToFiestaAdm(mapBarangayPsgc, municipalityAliases = {}) {
  const bgy = Number(mapBarangayPsgc);
  if (!Number.isFinite(bgy)) return null;
  const mapMuni = Math.floor(bgy / 1000) * 1000;
  const fiestaMuni = municipalityAliases[String(mapMuni)] ?? mapMuni;
  if (fiestaMuni === mapMuni) return bgy;
  return fiestaMuni + (bgy % 1000);
}

/** @param {number|string|null|undefined} selectionBgy @param {number|string|null|undefined} festivalBarangayPsa @param {Record<string, number>} municipalityAliases */
export function barangayPsgcMatches(selectionBgy, festivalBarangayPsa, municipalityAliases = {}) {
  const sel = Number(selectionBgy);
  const festAdm = psaToAdmFromPsa(festivalBarangayPsa);
  if (!Number.isFinite(sel) || festAdm == null) return false;
  if (sel === festAdm) return true;
  return mapBarangayToFiestaAdm(sel, municipalityAliases) === festAdm;
}

function psaToAdmFromPsa(psaCode) {
  const s = String(psaCode).padStart(9, "0");
  return Number(`${s[1]}${s[0]}${s.slice(2)}`);
}

/**
 * Lookup keys for barangay-fiestas.json, including alias targets and Manila sub-districts.
 * @param {number|string|null|undefined} municipalityPsgc
 * @param {Record<string, number>} municipalityAliases
 * @param {Record<string, unknown[]>} byMunicipalityPsgc
 */
export function fiestaMunicipalityLookupKeys(
  municipalityPsgc,
  municipalityAliases = {},
  byMunicipalityPsgc = {}
) {
  const adm = Number(municipalityPsgc);
  if (!Number.isFinite(adm)) return [];

  const keys = new Set([String(adm), String(Number(adm))]);
  const alias = municipalityAliases[String(adm)];
  if (alias != null) {
    keys.add(String(alias));
    keys.add(String(Number(alias)));
  }

  if (adm === MANILA_MAP_PSGC) {
    for (const key of Object.keys(byMunicipalityPsgc)) {
      if (key.startsWith(MANILA_FIESTA_SUBDISTRICT_PREFIX)) keys.add(key);
    }
  }

  return [...keys];
}
