/** PSA 9/10-digit PSGC (012802001) → philippines-json-maps adm code (102802001). */
export function psaToAdm(psaCode) {
  const s = String(psaCode).padStart(9, "0");
  return Number(`${s[1]}${s[0]}${s.slice(2)}`);
}
