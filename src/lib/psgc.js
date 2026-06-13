/** PSA 9/10-digit PSGC (012802001) → philippines-json-maps adm code (102802001). */
export function psaToAdm(psaCode) {
  const s = String(psaCode).padStart(9, "0");
  return Number(`${s[1]}${s[0]}${s.slice(2)}`);
}

/** Admin code (102802001) → PSA string (012802001). */
export function admToPsa(admCode) {
  const s = String(admCode).padStart(9, "0");
  return `${s[1]}${s[0]}${s.slice(2)}`;
}

export function normalizePsgc(code) {
  if (code == null || code === "") return null;
  const n = Number(code);
  return Number.isFinite(n) ? n : null;
}

/**
 * NCR + other map codes that differ from barangay-fiesta index keys.
 * Kept in sync with scripts/lib/fiesta-municipality-aliases.js (build output).
 */
export const FIESTA_MUNICIPALITY_ALIASES = {
  1130700000: 112402000,
  1380100000: 317501000,
  1380200000: 317601000,
  1380300000: 317602000,
  1380400000: 317502000,
  1380500000: 317401000,
  1380600000: 313900000,
  1380700000: 317402000,
  1380800000: 317603000,
  1380900000: 317503000,
  1381000000: 317604000,
  1381100000: 317605000,
  1381200000: 317403000,
  1381300000: 317404000,
  1381400000: 317405000,
  1381500000: 317607000,
  1381600000: 317504000,
  1381701000: 317606000,
};

export const MANILA_MAP_PSGC = 1380600000;
export const MANILA_FIESTA_SUBDISTRICT_PREFIX = "3139";

/** Candidate string keys for municipality-level indexes (ADM + PSA formats). */
export function municipalityIndexKeys(municipalityPsgc) {
  const adm = normalizePsgc(municipalityPsgc);
  if (adm == null) return [];
  const psa = admToPsa(adm);
  const keys = new Set([String(adm), psa, String(Number(psa))]);

  const alias = FIESTA_MUNICIPALITY_ALIASES[adm];
  if (alias != null) {
    keys.add(String(alias));
    keys.add(String(Number(alias)));
  }

  return [...keys];
}

export function mapBarangayToFiestaAdm(mapBarangayPsgc) {
  const bgy = normalizePsgc(mapBarangayPsgc);
  if (bgy == null) return null;
  const mapMuni = Math.floor(bgy / 1000) * 1000;
  const fiestaMuni = FIESTA_MUNICIPALITY_ALIASES[mapMuni] ?? mapMuni;
  if (fiestaMuni === mapMuni) return bgy;
  return fiestaMuni + (bgy % 1000);
}

export function barangayPsgcMatches(selectionBgy, festivalBarangayPsa) {
  const sel = normalizePsgc(selectionBgy);
  const festAdm = psaToAdm(festivalBarangayPsa);
  if (sel == null || festAdm == null) return false;
  if (sel === festAdm) return true;
  return mapBarangayToFiestaAdm(sel) === festAdm;
}

/** Keys for barangay-fiestas.json lookup (includes Manila sub-district buckets). */
export function fiestaMunicipalityLookupKeys(municipalityPsgc, byMunicipalityPsgc = {}) {
  const adm = normalizePsgc(municipalityPsgc);
  if (adm == null) return [];

  const keys = [];
  const alias = FIESTA_MUNICIPALITY_ALIASES[adm];
  if (alias != null) {
    keys.push(String(alias), String(Number(alias)));
  }
  for (const key of municipalityIndexKeys(adm)) {
    if (!keys.includes(key)) keys.push(key);
  }

  if (adm === MANILA_MAP_PSGC) {
    for (const key of Object.keys(byMunicipalityPsgc)) {
      if (key.startsWith(MANILA_FIESTA_SUBDISTRICT_PREFIX) && !keys.includes(key)) {
        keys.push(key);
      }
    }
  }

  return keys;
}
