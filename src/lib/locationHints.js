import { CITY_MAP_FOCUS } from "./constants.js";

/** Festival name → location hint when dataset geocoding is incomplete. */
const FESTIVAL_LOCATION_HINTS = {
  "sinulog festival": { municipality: "Cebu City", province: "Cebu" },
  "dinagyang festival": { municipality: "Iloilo City", province: "Iloilo" },
  "masskara festival": { municipality: "Bacolod City", province: "Negros Occidental" },
  "panagbenga festival": { municipality: "Baguio City", province: "Benguet" },
  "kadayawan festival": { municipality: "Davao City", province: "Davao del Sur" },
  "ati atihan festival": { municipality: "Kalibo", province: "Aklan" },
  "kumbira": { municipality: "Cagayan de Oro City", province: "Misamis Oriental" },
  "higalaay festival": { municipality: "Cagayan de Oro City", province: "Misamis Oriental" },
  "paraw regatta festival": { municipality: "Iloilo City", province: "Iloilo" },
  "paskuhan sa barangay": { municipality: "Cebu City", province: "Cebu" },
  "mantawi festival": { municipality: "Mandaue City", province: "Cebu" },
  "kadaugan sa mactan": { municipality: "Lapu-Lapu City", province: "Cebu" },
  "virgen de la regla festival": { municipality: "Lapu-Lapu City", province: "Cebu" },
  "sandugo festival": { municipality: "City of Tagbilaran", province: "Bohol" },
};

const CITY_ALIASES = {
  "cebu city": "Cebu City",
  "city of cebu": "Cebu City",
  bacolod: "Bacolod City",
  "bacolod city": "Bacolod City",
  iloilo: "Iloilo City",
  "iloilo city": "Iloilo City",
  davao: "Davao City",
  "davao city": "Davao City",
  arevalo: "Iloilo City",
  "limketkai atrium": "Cagayan de Oro City",
  "camiguin island": "Mambajao",
  mandaue: "Mandaue City",
  "mandaue city": "Mandaue City",
  "lapu-lapu": "Lapu-Lapu City",
  "lapu lapu": "Lapu-Lapu City",
  "lapu-lapu city": "Lapu-Lapu City",
  tagbilaran: "City of Tagbilaran",
  "tagbilaran city": "City of Tagbilaran",
};

function normalizeKey(name) {
  return String(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getFestivalLocationHint(festivalName) {
  return FESTIVAL_LOCATION_HINTS[normalizeKey(festivalName)] ?? null;
}

export function resolveCityAlias(name) {
  if (!name) return null;
  const key = normalizeKey(name);
  return CITY_ALIASES[key] ?? CITY_ALIASES[key.replace(/\s+city$/, "")] ?? null;
}

export function mapFocusForMunicipality(municipalityName) {
  if (!municipalityName) return null;
  const key = normalizeKey(municipalityName);
  return CITY_MAP_FOCUS[key] ?? CITY_MAP_FOCUS[resolveCityAlias(municipalityName)?.toLowerCase()] ?? null;
}
