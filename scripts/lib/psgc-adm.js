/** PSGC / philippines-json-maps admin code helpers. */

export function psaToAdm3(code9) {
  const s = String(code9).padStart(9, "0");
  return Number(`${s[1]}${s[0]}${s.slice(2)}`);
}

export function adm3ToPsgc9(adm3) {
  const s = String(adm3).padStart(9, "0");
  return `${s[1]}${s[0]}${s.slice(2)}`;
}

/** PSGC 9-digit (072219000) → philippines-json-maps adm codes (702219000). */
export function psgcToAdmCodes(code9) {
  const s = String(code9).padStart(9, "0");
  return {
    adm1: Number(`${s[1]}${s[0]}0000000`),
    adm2: Number(`${s[1]}${s[0]}${s.slice(2, 4)}00000`),
    adm3: Number(`${s[1]}${s[0]}${s.slice(2)}`),
  };
}

/** PSA 9-digit barangay code → adm4_psgc used in GeoJSON. */
export function psgc9ToAdm4(code9) {
  const s = String(code9).padStart(9, "0");
  return Number(`${s[1]}${s[0]}${s.slice(2)}`);
}

const ROMAN = {
  i: 1,
  ii: 2,
  iii: 3,
  iv: 4,
  v: 5,
  vi: 6,
  vii: 7,
  viii: 8,
  ix: 9,
  x: 10,
  xi: 11,
  xii: 12,
};

export function normalizeBarangayName(name) {
  let s = String(name ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s*\(pob\.?\)/gi, "")
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const romanBarangay = s.match(/^barangay\s+([ivx]+)$/i);
  if (romanBarangay && ROMAN[romanBarangay[1].toLowerCase()]) {
    s = `barangay ${ROMAN[romanBarangay[1].toLowerCase()]}`;
  }

  return s;
}

export function normalizeCityName(name) {
  return String(name ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^city of\s+/i, "")
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s+city$/i, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
