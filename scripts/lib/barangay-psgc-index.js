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
  return String(name ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(brgy|barangay|sitio|purok|pob|poblacion|city of|municipality of)\b/gi, " ")
    .replace(/\b(sta|sto)\b/gi, (m) => (m.toLowerCase() === "sta" ? "santa" : "santo"))
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
  let municipality = null;
  let municipalityCode = null;

  for (const entry of raw) {
    const level = entry.interLevel;
    if (level === "Mun" || level === "City" || level === "SubMun") {
      municipality = entry.name;
      municipalityCode = entry.code;
      const mKey = normalizePlaceName(municipality);
      if (!byMuni.has(mKey)) byMuni.set(mKey, []);
      byMuni.get(mKey).push({ code: municipalityCode, name: municipality });
      continue;
    }
    if (level !== "Bgy" || !municipality) continue;

    const bKey = normalizePlaceName(entry.name);
    const mKey = normalizePlaceName(municipality);
    const composite = `${mKey}|${bKey}`;
    if (!byMuniBgy.has(composite)) {
      byMuniBgy.set(composite, {
        barangayPsgc: entry.code,
        barangayName: entry.name,
        municipality,
        municipalityCode,
      });
    }
  }

  return { byMuniBgy, byMuni };
}

export function getBarangayPsgcIndex() {
  if (!_index) _index = buildIndex();
  return _index;
}

export function lookupBarangayPsgc(municipalityName, barangayName) {
  const { byMuniBgy } = getBarangayPsgcIndex();
  const mKeys = municipalityKeys(municipalityName);
  const bKey = normalizePlaceName(barangayName);

  for (const mKey of mKeys) {
    const direct = byMuniBgy.get(`${mKey}|${bKey}`);
    if (direct) return direct.barangayPsgc;
  }

  // Fuzzy: barangay name contained in indexed name or vice versa
  for (const mKey of mKeys) {
    for (const [key, rec] of byMuniBgy) {
      if (!key.startsWith(`${mKey}|`)) continue;
      const indexedBgy = key.slice(mKey.length + 1);
      if (indexedBgy === bKey || indexedBgy.includes(bKey) || bKey.includes(indexedBgy)) {
        return rec.barangayPsgc;
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
