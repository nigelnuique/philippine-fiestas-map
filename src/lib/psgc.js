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

/** Candidate string keys for municipality-level indexes (ADM + PSA formats). */
export function municipalityIndexKeys(municipalityPsgc) {
  const adm = normalizePsgc(municipalityPsgc);
  if (adm == null) return [];
  const psa = admToPsa(adm);
  return [...new Set([String(adm), psa, String(Number(psa))])];
}
