/**
 * Parses TPB-style date/venue strings and matches to PSGC municipalities.
 */

const PROVINCE_ABBREV = {
  "mis or": "misamis oriental",
  "mis. or": "misamis oriental",
  "mis occ": "misamis occidental",
  "mis. occ": "misamis occidental",
  "cam norte": "camarines norte",
  "cam. norte": "camarines norte",
  "cam sur": "camarines sur",
  "cam. sur": "camarines sur",
  "compostela valley": "compostela valley",
  "ncr": "metro manila",
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
    .replace(/\s+/g, " ")
    .replace(/[()]/g, "")
    .replace(/\bcity of\b/g, "")
    .replace(/\bmunicipality of\b/g, "")
    .trim();
}

export function slug(text) {
  return normalize(text).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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
  const n = normalize(text).replace(/\.$/, "");
  return PROVINCE_ABBREV[n] ?? n;
}

export function buildLookups(muniIndex, manifest) {
  const provincesByName = new Map();
  const provincesByPsgc = new Map();
  const municipalities = [];

  for (const region of manifest.regions) {
    for (const prov of region.provinceLayer?.provinces ?? []) {
      provincesByName.set(normalize(prov.name), prov);
      provincesByName.set(slug(prov.name), prov);
      provincesByPsgc.set(prov.psgc, prov);
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

  return { provincesByName, provincesByPsgc, municipalities };
}

export function resolveFestivalLocation(festival, lookups) {
  const { provincesByName, municipalities } = lookups;

  const raw =
    festival.locationText ?? festival.dateVenueRaw ?? festival.municipality ?? "";
  const parsed = parseVenueParts(raw);

  const muniCandidate =
    festival.municipality ?? parsed.municipality;
  const provCandidate =
    festival.province ?? parsed.province;

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
    const hits = municipalities.filter(
      (m) =>
        m.normalizedName === norm ||
        m.normalizedName === normalize(muniCandidate.replace(/\s+city$/i, "")) ||
        normalize(m.name).includes(norm) ||
        norm.includes(normalize(m.name.replace(/^city of\s+/i, "")))
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
        regionPsgc: null,
        matchMethod: "province-only",
        confidence: "low",
      };
    }
  }

  // 4. Search municipality names inside raw text
  const rawNorm = normalize(stripDatePrefix(raw));
  for (const m of municipalities) {
    const muniNorm = normalize(m.name.replace(/^city of\s+/i, ""));
    if (rawNorm.includes(muniNorm) && muniNorm.length > 3) {
      return matchResult(m, "text-contains-municipality", "medium");
    }
  }

  // 5. Search province names inside raw text
  for (const [name, prov] of provincesByName.entries()) {
    if (name.startsWith("muni::")) continue;
    if (name.length > 4 && rawNorm.includes(name)) {
      return {
        psgc: null,
        municipality: muniCandidate,
        province: prov.name,
        provincePsgc: prov.psgc,
        regionPsgc: null,
        matchMethod: "text-contains-province",
        confidence: "low",
      };
    }
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
