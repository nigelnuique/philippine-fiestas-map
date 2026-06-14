/**
 * Fast lookup: municipality + barangay name → PSA PSGC code.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const PSGC_RAW = path.join(ROOT, "data", "raw", "psgc2", "raw.json");

let _index = null;

const MUNICIPALITY_ALIASES = {
  naval: ["naval capital", "naval"],
  "santa monica sapao": ["santa monica", "sta monica", "sapao"],
  "general luna": ["gen luna", "general luna"],
  "city of calbayog": ["calbayog", "calbayog capital"],
  "city of iloilo capital": ["iloilo", "iloilo city", "city of iloilo"],
  "city of tacloban capital": ["tacloban", "tacloban city"],
  "city of davao": ["davao", "davao city"],
  "city of caloocan": ["caloocan"],
  "city of baguio": ["baguio"],
  "city of manila": ["manila"],
  "city of dagupan": ["dagupan", "dagupan city"],
  "gen mariano alvarez": [
    "general mariano alvarez",
    "gen mariano alvarez",
    "gma cavite",
    "general mariano alvarez cavite",
  ],
};

export function normalizePlaceName(name) {
  const raw = String(name ?? "").trim();
  let s = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\(\s*capital\s*\)/gi, " ")
    .replace(/\(([^)]+)\)/g, " $1 ")
    .replace(/\b(brgy|barangay|sitio|purok|pob|poblacion|city of|municipality of)\b/gi, " ")
    .replace(/\b(sta|sto)\b/gi, (m) => (m.toLowerCase() === "sta" ? "santa" : "santo"))
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!s && /\bpoblacion\b/i.test(raw)) return "poblacion";
  if (!s && /\bpob\b/i.test(raw)) return "pob";
  return s;
}

function municipalityKeys(name) {
  const base = normalizePlaceName(name);
  const keys = new Set([base]);
  for (const [canonical, aliases] of Object.entries(MUNICIPALITY_ALIASES)) {
    if (base === canonical || aliases.includes(base)) {
      keys.add(canonical);
      for (const a of aliases) keys.add(a);
    }
  }
  return keys;
}

function buildIndex() {
  const raw = JSON.parse(fs.readFileSync(PSGC_RAW, "utf8"));
  const byMuniBgy = new Map();
  const byMuni = new Map();
  let province = null;
  let municipality = null;
  let municipalityCode = null;

  for (const entry of raw) {
    const level = entry.interLevel;
    if (level === "Prov") {
      province = entry.name;
      continue;
    }
    if (level === "Mun" || level === "City" || level === "SubMun") {
      municipality = entry.name;
      municipalityCode = entry.code;
      const mKey = normalizePlaceName(municipality);
      if (!byMuni.has(mKey)) byMuni.set(mKey, []);
      byMuni.get(mKey).push({ code: municipalityCode, name: municipality, province });
      continue;
    }
    if (level !== "Bgy" || !municipality) continue;

    const bKey = normalizePlaceName(entry.name);
    const mKey = normalizePlaceName(municipality);
    const composite = `${mKey}|${bKey}`;
    const rec = {
      barangayPsgc: entry.code,
      barangayName: entry.name,
      municipality,
      municipalityCode,
      province,
      provinceKey: normalizePlaceName(province),
    };
    const existing = byMuniBgy.get(composite);
    if (!existing) byMuniBgy.set(composite, [rec]);
    else existing.push(rec);
  }

  return { byMuniBgy, byMuni };
}

function pickBarangayRecord(records, provinceName, municipalityName) {
  if (!records?.length) return null;
  let pool = records;

  if (provinceName) {
    const pKey = normalizePlaceName(provinceName);
    const filtered = pool.filter((r) => r.provinceKey === pKey);
    if (filtered.length) pool = filtered;
  }

  if (municipalityName && pool.length > 1) {
    const wanted = String(municipalityName).trim().toLowerCase();
    const exact = pool.filter((r) => r.municipality.toLowerCase() === wanted);
    if (exact.length === 1) return exact[0];

    const mKey = normalizePlaceName(municipalityName);
    const byNorm = pool.filter((r) => normalizePlaceName(r.municipality) === mKey);
    if (byNorm.length === 1) return byNorm[0];
    if (byNorm.length) pool = byNorm;
  }

  return pool[0] ?? null;
}

export function getBarangayPsgcIndex() {
  if (!_index) _index = buildIndex();
  return _index;
}

export function lookupBarangayPsgc(municipalityName, barangayName, provinceName) {
  const { byMuniBgy } = getBarangayPsgcIndex();
  const mKeys = municipalityKeys(municipalityName);
  const bKey = normalizePlaceName(barangayName);
  if (!bKey) return null;

  for (const mKey of mKeys) {
    const direct = pickBarangayRecord(byMuniBgy.get(`${mKey}|${bKey}`), provinceName, municipalityName);
    if (direct) return direct.barangayPsgc;
  }

  // Fuzzy: barangay name contained in indexed name or vice versa
  for (const mKey of mKeys) {
    for (const [key, records] of byMuniBgy) {
      if (!key.startsWith(`${mKey}|`)) continue;
      const indexedBgy = key.slice(mKey.length + 1);
      if (indexedBgy === bKey || indexedBgy.includes(bKey) || bKey.includes(indexedBgy)) {
        const hit = pickBarangayRecord(records, provinceName, municipalityName);
        if (hit) return hit.barangayPsgc;
      }
    }
  }
  return null;
}

export function lookupMunicipalityCode(municipalityName) {
  const { byMuni } = getBarangayPsgcIndex();
  const mKey = normalizePlaceName(municipalityName);
  const hits = byMuni.get(mKey);
  if (!hits?.length) return null;
  return hits[0].code;
}
