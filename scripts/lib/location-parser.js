/**
 * Parses TPB-style date/venue strings and matches to PSGC municipalities.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  getFestivalLocationHint,
  getRegionFromText,
  inferMunicipalityFromFestivalName,
  resolveAliasMunicipality,
  resolveMunicipalityAlias,
} from "./location-overrides.js";
import { psaToAdm3 } from "./psgc-adm.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HUC_CITIES_FILE = path.resolve(
  __dirname,
  "../../data/processed/boundaries/huc-cities.json"
);

const PROVINCE_ALIASES = {
  "mis or": "misamis oriental",
  "mis. or": "misamis oriental",
  "mis occ": "misamis occidental",
  "mis. occ": "misamis occidental",
  "cam norte": "camarines norte",
  "cam. norte": "camarines norte",
  "cam sur": "camarines sur",
  "cam. sur": "camarines sur",
  "compostela valley province": "davao de oro",
  "compostela valley": "davao de oro",
  "davao de oro": "davao de oro",
  "davao del norte": "davao del norte",
  "davao oriental": "davao oriental",
  "ncr": "metro manila",
  "national capital region": "metro manila",
  "manila": "metro manila",
  "albay": "albay",
};

const DATE_PREFIX =
  /^(?:(?:january|february|march|april|may|june|july|august|september|october|november|december)\s*)?(?:\d{1,2}(?:\s*[-–—]\s*\d{1,2})?)?\s*(?:or\s+)?(?:(?:every\s+)?(?:\d+(?:st|nd|rd|th)\s+)?(?:week(?:day|end)?|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+of\s+\w+\s*)?(?:good\s+friday\s*)?/i;

export function normalize(text) {
  if (text == null) return "";
  if (typeof text !== "string") text = String(text);
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\bcity of\b/g, "")
    .replace(/\bmunicipality of\b/g, "")
    .trim();
}

export function slug(text) {
  return normalize(text).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Compact alphanumeric form for fuzzy municipality matching (miag-ao → miagao). */
export function compact(text) {
  return normalize(text).replace(/[^a-z0-9]/g, "");
}

export function stripDatePrefix(raw) {
  if (!raw) return "";
  let text = raw.trim();

  // Remove leading month/day patterns repeatedly
  for (let i = 0; i < 3; i++) {
    const next = text.replace(DATE_PREFIX, "").trim();
    if (next === text) break;
    text = next;
  }

  // Remove ordinal fragments left by bad regex (e.g. "rd Monday of January")
  text = text.replace(/^(?:\d*(?:st|nd|rd|th)\s+)?(?:week(?:day|end)?|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+of\s+\w+\s*/i, "");
  text = text.replace(/^(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+(?:or\s+)?(?:every\s+)?/i, "");

  return text.trim();
}

export function parseVenueParts(raw) {
  const cleaned = stripDatePrefix(raw);
  if (!cleaned) return { municipality: null, province: null, venue: null };

  // "Quiapo, Manila" or "Balingasag, Misamis Oriental"
  const commaParts = cleaned.split(",").map((p) => p.trim()).filter(Boolean);
  if (commaParts.length >= 2) {
    return {
      municipality: commaParts[0],
      province: expandProvince(commaParts.slice(1).join(", ")),
      venue: cleaned,
    };
  }

  // "Cebu City" or "Pagadian City" or "Provincial Capitol ground, Mis Or"
  const provinceSuffix = cleaned.match(
    /\b([^,]+(?:\s+del\s+\w+|\s+occidental|\s+oriental|\s+norte|\s+sur)?)\s*\.?\s*$/i
  );

  // Try to find known city pattern at end
  const cityMatch = cleaned.match(
    /^(.+?)\s+((?:City|city)(?:\s+of\s+\w+)?)\s*$/
  );
  if (cityMatch) {
    return {
      municipality: `${cityMatch[1]} ${cityMatch[2]}`.trim(),
      province: null,
      venue: cleaned,
    };
  }

  // "Legazpi City" at end without comma
  const legazpiStyle = cleaned.match(/([A-Za-z\s.'-]+(?:City|city))\s*$/);
  if (legazpiStyle) {
    const muni = legazpiStyle[1].trim();
    const before = cleaned.slice(0, cleaned.length - muni.length).trim();
    return {
      municipality: muni,
      province: before ? expandProvince(before) : null,
      venue: cleaned,
    };
  }

  // Province-only: "Province of Zamboanga Sibugay"
  const provOnly = cleaned.match(/^(?:province of\s+)?(.+)$/i);
  if (provOnly && /province/i.test(cleaned)) {
    return {
      municipality: null,
      province: expandProvince(provOnly[1]),
      venue: cleaned,
    };
  }

  return { municipality: cleaned, province: null, venue: cleaned };
}

function expandProvince(text) {
  const n = normalize(text).replace(/\.$/, "").replace(/\s+province$/, "");
  return PROVINCE_ALIASES[n] ?? PROVINCE_ALIASES[`${n} province`] ?? n;
}

function stripCitySuffix(name) {
  return name.replace(/\s+city$/, "").trim();
}

/** Avoid false positives like Mandaue→Anda or Tagbilaran→Bilar. */
function municipalityNamesMatch(candidateNorm, candidateCompact, muni) {
  const muniNorm = muni.normalizedName;
  const muniCompact = compact(muni.name);
  const muniCore = stripCitySuffix(muniNorm.replace(/^city of\s+/, ""));
  const candCore = stripCitySuffix(candidateNorm.replace(/^city of\s+/, ""));

  if (candidateNorm === muniNorm) return true;
  if (candCore === muniCore) return true;
  if (candidateCompact && candidateCompact === muniCompact) return true;
  if (candidateNorm === stripCitySuffix(muniNorm)) return true;

  // Prefix containment only (e.g. "santa maria" vs "santa maria aurora")
  const MIN_CONTAIN_LEN = 6;
  if (muniCore.length >= MIN_CONTAIN_LEN && candidateNorm.startsWith(`${muniCore} `)) {
    return true;
  }
  if (candCore.length >= MIN_CONTAIN_LEN && muniCore.startsWith(`${candCore} `)) {
    return true;
  }

  return false;
}

function provinceNamesInText(rawNorm, provincesByName) {
  const matches = [];
  for (const [name, prov] of provincesByName.entries()) {
    if (name.startsWith("muni::") || name.length < 4) continue;
    if (rawNorm.includes(name)) {
      matches.push({ name, prov, length: name.length });
    }
  }
  return matches.sort((a, b) => b.length - a.length);
}

function muniNameConflictsWithProvince(rawNorm, muniNorm, provincesByName) {
  for (const [name] of provincesByName.entries()) {
    if (name.startsWith("muni::")) continue;
    if (
      name.length > muniNorm.length &&
      name.includes(muniNorm) &&
      rawNorm.includes(name)
    ) {
      return true;
    }
  }
  return false;
}

export function buildLookups(muniIndex, manifest) {
  const provincesByName = new Map();
  const provincesByPsgc = new Map();
  const municipalities = [];

  for (const region of manifest.regions) {
    for (const prov of region.provinceLayer?.provinces ?? []) {
      const entry = { ...prov, regionPsgc: region.psgc, regionName: region.name };
      provincesByName.set(normalize(prov.name), entry);
      provincesByName.set(slug(prov.name), entry);
      provincesByPsgc.set(prov.psgc, entry);
    }
  }

  for (const layer of Object.values(muniIndex)) {
    const prov = provincesByPsgc.get(layer.provincePsgc);
    const provName = prov?.name ?? "";

    for (const m of layer.municipalities) {
      const entry = {
        psgc: m.psgc,
        name: m.name,
        normalizedName: normalize(m.name),
        provincePsgc: m.adm2Psgc,
        provinceName: provName,
        regionPsgc: m.adm1Psgc,
      };
      municipalities.push(entry);

      const keys = new Set([
        slug(m.name),
        slug(m.name.replace(/^city of\s+/i, "")),
        `${slug(provName)}::${slug(m.name)}`,
      ]);
      for (const k of keys) {
        if (!provincesByName.has(`muni::${k}`)) {
          provincesByName.set(`muni::${k}`, entry);
        }
      }
    }
  }

  if (fs.existsSync(HUC_CITIES_FILE)) {
    try {
      const huc = JSON.parse(fs.readFileSync(HUC_CITIES_FILE, "utf8"));
      for (const feature of huc.features ?? []) {
        const props = feature.properties ?? {};
        const psgc = props.adm3_psgc;
        if (!psgc || municipalities.some((m) => m.psgc === psgc)) continue;

        const prov = provincesByPsgc.get(props.adm2_psgc);
        const entry = {
          psgc,
          name: props.adm3_en,
          normalizedName: normalize(props.adm3_en),
          provincePsgc: props.adm2_psgc,
          provinceName: prov?.name ?? "",
          regionPsgc: props.adm1_psgc,
        };
        municipalities.push(entry);

        const keys = new Set([
          slug(entry.name),
          slug(entry.name.replace(/^city of\s+/i, "")),
          `${slug(entry.provinceName)}::${slug(entry.name)}`,
        ]);
        for (const k of keys) {
          if (!provincesByName.has(`muni::${k}`)) {
            provincesByName.set(`muni::${k}`, entry);
          }
        }
      }
    } catch {
      // HUC index optional during early pipeline runs
    }
  }

  return { provincesByName, provincesByPsgc, municipalities };
}

function isDateOnlyVenue(text) {
  if (!text) return true;
  const norm = normalize(text);
  if (/^(first|second|third|fourth|last)\s+week/i.test(text)) return true;
  if (/^\d{1,2}\s*[-–—]\s*\d{1,2}$/.test(text.trim())) return true;
  if (/^(march|april|may|june|july|august|september|october|november|december|january|february)\b/i.test(text) && !/,/.test(text)) {
    return !/\bcity\b|\bmunicipality\b/i.test(text);
  }
  return false;
}

export function resolveFestivalLocation(festival, lookups) {
  const { provincesByName, municipalities } = lookups;

  const hint = getFestivalLocationHint(festival);
  if (hint?.national) {
    return {
      psgc: null,
      municipality: null,
      province: null,
      provincePsgc: null,
      regionPsgc: null,
      matchMethod: "national",
      confidence: "medium",
    };
  }

  const raw =
    festival.locationText ?? festival.dateVenueRaw ?? festival.municipality ?? "";
  const parsed = parseVenueParts(raw);

  let muniCandidate = hint?.municipality ?? festival.municipality ?? parsed.municipality;
  let provCandidate = hint?.province ?? festival.province ?? parsed.province;

  if ((!muniCandidate || isDateOnlyVenue(muniCandidate)) && festival.name) {
    const inferred = inferMunicipalityFromFestivalName(festival.name);
    if (inferred) muniCandidate = resolveAliasMunicipality(inferred) ?? inferred;
  }

  if (muniCandidate) {
    muniCandidate =
      resolveMunicipalityAlias(muniCandidate) ??
      resolveAliasMunicipality(muniCandidate) ??
      muniCandidate;
  }

  if (hint?.regionPsgc) {
    return {
      psgc: null,
      municipality: muniCandidate,
      province: provCandidate,
      provincePsgc: null,
      regionPsgc: hint.regionPsgc,
      matchMethod: "festival-hint-region",
      confidence: "medium",
    };
  }

  const regionFromText = getRegionFromText(raw);
  const regionWideMuni =
    muniCandidate && /regionwide|region\s+(?:i{1,3}|iv|v|vi{0,2}|ix|x{1,3}|\d+)/i.test(muniCandidate);
  if (regionFromText && (!provCandidate || regionWideMuni || isDateOnlyVenue(muniCandidate))) {
    return {
      psgc: null,
      municipality: null,
      province: null,
      provincePsgc: null,
      regionPsgc: regionFromText,
      matchMethod: "region-text",
      confidence: "medium",
    };
  }

  // 1. Municipality + province
  if (muniCandidate && provCandidate) {
    const key = `muni::${slug(provCandidate)}::${slug(muniCandidate)}`;
    const hit = provincesByName.get(key);
    if (hit?.psgc) {
      return matchResult(hit, "muni+province", "high");
    }
  }

  // 2. Municipality name globally (prefer exact normalized match)
  if (muniCandidate) {
    const norm = normalize(muniCandidate);
    const compactNorm = compact(muniCandidate);
    const hits = municipalities.filter((m) =>
      municipalityNamesMatch(norm, compactNorm, m)
    );

    if (hits.length === 1) {
      return matchResult(hits[0], "municipality-unique", "high");
    }

    if (hits.length > 1 && provCandidate) {
      const provNorm = expandProvince(provCandidate);
      const filtered = hits.filter(
        (m) => normalize(m.provinceName).includes(provNorm) || provNorm.includes(normalize(m.provinceName))
      );
      if (filtered.length === 1) {
        return matchResult(filtered[0], "municipality+province-disambig", "high");
      }
    }

    if (hits.length > 1) {
      return matchResult(hits[0], "municipality-fuzzy-first", "medium");
    }
  }

  // 3. Province only
  if (provCandidate) {
    const prov = provincesByName.get(normalize(provCandidate)) ??
      provincesByName.get(expandProvince(provCandidate));
    if (prov?.psgc) {
      return {
        psgc: null,
        municipality: muniCandidate,
        province: prov.name ?? provCandidate,
        provincePsgc: prov.psgc,
        regionPsgc: prov.regionPsgc ?? null,
        matchMethod: "province-only",
        confidence: "low",
      };
    }
  }

  const rawNorm = normalize(stripDatePrefix(raw));

  // 4. Province names in raw text (longest match first — avoids "Compostela" vs "Compostela Valley")
  const provMatches = provinceNamesInText(rawNorm, provincesByName);
  if (provMatches.length > 0) {
    const { prov } = provMatches[0];
    return {
      psgc: null,
      municipality: muniCandidate,
      province: prov.name,
      provincePsgc: prov.psgc,
      regionPsgc: prov.regionPsgc ?? null,
      matchMethod: "text-contains-province",
      confidence: "medium",
    };
  }

  // 5. Municipality names in raw text (skip if name is part of a province in the same string)
  const rawCompact = compact(stripDatePrefix(raw));
  for (const m of municipalities) {
    const muniNorm = normalize(m.name.replace(/^city of\s+/i, ""));
    const muniCompact = compact(m.name);
    if (muniNorm.length <= 3) continue;
    if (!rawNorm.includes(muniNorm) && !rawCompact.includes(muniCompact)) continue;
    if (muniNameConflictsWithProvince(rawNorm, muniNorm, provincesByName)) {
      continue;
    }
    return matchResult(m, "text-contains-municipality", "medium");
  }

  return {
    psgc: null,
    municipality: muniCandidate,
    province: provCandidate,
    provincePsgc: null,
    regionPsgc: null,
    matchMethod: null,
    confidence: "unmatched",
  };
}

/** Resolves barangay patron fiesta records (PSGC hierarchy includes municipality code). */
export function resolveBarangayFiestaLocation(festival, lookups) {
  if (festival.municipalityPsgcPsa) {
    const psgc = psaToAdm3(festival.municipalityPsgcPsa);
    const muni = lookups.municipalities.find((m) => m.psgc === psgc);
    if (muni) {
      return matchResult(muni, "psgc-municipality-code", "high");
    }

    let provincePsgc = null;
    let regionPsgc = null;
    if (festival.province) {
      const prov =
        lookups.provincesByName.get(normalize(festival.province)) ??
        lookups.provincesByName.get(expandProvince(festival.province));
      provincePsgc = prov?.psgc ?? null;
      regionPsgc = prov?.regionPsgc ?? null;
    }

    return {
      psgc,
      municipality: festival.municipality ?? null,
      province: festival.province ?? null,
      provincePsgc,
      regionPsgc,
      matchMethod: "psgc-municipality-code",
      confidence: "high",
    };
  }

  return resolveFestivalLocation(festival, lookups);
}

function matchResult(m, method, confidence) {
  return {
    psgc: m.psgc,
    municipality: m.name,
    province: m.provinceName,
    provincePsgc: m.provincePsgc,
    regionPsgc: m.regionPsgc,
    matchMethod: method,
    confidence,
  };
}
