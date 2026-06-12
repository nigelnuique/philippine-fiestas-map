import { CITY_MAP_FOCUS } from "./constants.js";
import {
  getFestivalLocationHint,
  mapFocusForMunicipality,
  resolveCityAlias,
} from "./locationHints.js";
import { municipalityIndexKeys, normalizePsgc, psaToAdm } from "./psgc.js";

export function boundsFromFeature(feature) {
  const coords = [];
  const geom = feature?.geometry;
  if (!geom) return null;

  const pushRing = (ring) => ring.forEach((c) => coords.push(c));

  if (geom.type === "Polygon") {
    pushRing(geom.coordinates[0]);
  } else if (geom.type === "MultiPolygon") {
    geom.coordinates.forEach((poly) => pushRing(poly[0]));
  }

  if (!coords.length) return null;
  const lngs = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}

export function mergeBounds(boundsList) {
  const valid = boundsList.filter(Boolean);
  if (!valid.length) return null;
  const lngs = valid.flatMap((b) => [b[0][0], b[1][0]]);
  const lats = valid.flatMap((b) => [b[0][1], b[1][1]]);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}

export function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function selectionToFilter(selection) {
  if (!selection || selection.level === "country") {
    return ["==", ["literal", 1], 2];
  }
  if (selection.level === "region") {
    return ["==", ["to-number", ["get", "adm1_psgc"]], selection.regionPsgc];
  }
  if (selection.level === "province") {
    return ["==", ["to-number", ["get", "adm2_psgc"]], selection.provincePsgc];
  }
  if (selection.level === "municipality" || selection.level === "barangay") {
    if (selection.provincePsgc) {
      return ["==", ["to-number", ["get", "adm2_psgc"]], selection.provincePsgc];
    }
  }
  return ["==", ["literal", 1], 2];
}

export function findProvinceName(manifest, provincePsgc) {
  for (const region of manifest.regions) {
    const prov = region.provinceLayer?.provinces?.find(
      (p) => p.psgc === provincePsgc
    );
    if (prov) return prov.name;
  }
  return null;
}

export function findRegionName(manifest, regionPsgc) {
  return manifest.regions.find((r) => r.psgc === regionPsgc)?.name ?? "Region";
}

export function boundsForSelection(
  selection,
  provincesGeoJson,
  municipalityGeoJson,
  barangayGeoJson = null
) {
  if (!selection || selection.level === "country") return null;

  if (selection.level === "barangay" && barangayGeoJson && selection.barangayPsgc) {
    const feat = barangayGeoJson.features.find(
      (f) => num(f.properties?.adm4_psgc) === selection.barangayPsgc
    );
    return boundsFromFeature(feat);
  }

  if (
    (selection.level === "municipality" || selection.level === "barangay") &&
    municipalityGeoJson
  ) {
    const feat = municipalityGeoJson.features.find(
      (f) => num(f.properties?.adm3_psgc) === selection.municipalityPsgc
    );
    return boundsFromFeature(feat);
  }

  if (selection.level === "province") {
    const feat = provincesGeoJson.features.find(
      (f) => num(f.properties?.adm2_psgc) === selection.provincePsgc
    );
    return boundsFromFeature(feat);
  }

  if (selection.level === "region") {
    const regionFeatures = provincesGeoJson.features.filter(
      (f) => num(f.properties?.adm1_psgc) === selection.regionPsgc
    );
    return mergeBounds(regionFeatures.map(boundsFromFeature));
  }

  return null;
}

function normalizePlaceName(name) {
  return String(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bcity of\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function cityMapFocus(municipalityName) {
  if (!municipalityName) return null;
  const key = normalizePlaceName(municipalityName);
  return CITY_MAP_FOCUS[key] ?? null;
}

export function findMunicipalityByName(municipalitiesIndex, municipalityName, provincePsgc) {
  if (!municipalitiesIndex || !municipalityName) return null;

  const target = normalizePlaceName(municipalityName);
  const searchKeys = provincePsgc
    ? [String(provincePsgc)]
    : Object.keys(municipalitiesIndex);

  for (const provKey of searchKeys) {
    const entry = municipalitiesIndex[provKey];
    if (!entry?.municipalities) continue;

    const muni = entry.municipalities.find((m) => {
      const name = normalizePlaceName(m.name);
      return (
        name === target ||
        name.replace(/\s+city$/, "") === target.replace(/\s+city$/, "")
      );
    });

    if (muni) {
      return {
        psgc: muni.psgc,
        name: muni.name,
        provincePsgc: entry.provincePsgc ?? muni.adm2Psgc,
        regionPsgc: muni.adm1Psgc,
      };
    }
  }

  return null;
}

export function findMunicipalityByPsgc(municipalitiesIndex, psgc) {
  if (!municipalitiesIndex || psgc == null) return null;
  const target = num(psgc);
  for (const entry of Object.values(municipalitiesIndex)) {
    const muni = entry.municipalities?.find((m) => num(m.psgc) === target);
    if (muni) {
      return {
        psgc: muni.psgc,
        name: muni.name,
        provincePsgc: entry.provincePsgc ?? muni.adm2Psgc,
        regionPsgc: muni.adm1Psgc,
      };
    }
  }
  return null;
}

function lookupBarangaysEntry(barangaysIndex, municipalityPsgc) {
  if (!barangaysIndex || municipalityPsgc == null) return null;
  for (const key of municipalityIndexKeys(municipalityPsgc)) {
    if (barangaysIndex[key]) return barangaysIndex[key];
  }
  return null;
}

function buildMunicipalitySelection({
  regionPsgc,
  regionName,
  provincePsgc,
  provinceName,
  municipalityPsgc,
  municipalityName,
}) {
  const focus = mapFocusForMunicipality(municipalityName);
  return {
    level: "municipality",
    regionPsgc: normalizePsgc(regionPsgc),
    regionName,
    provincePsgc: normalizePsgc(provincePsgc),
    provinceName,
    municipalityPsgc: normalizePsgc(municipalityPsgc),
    municipalityName,
    ...(focus ? { mapFocusFallback: focus } : {}),
  };
}

export function selectionFromFestival(
  festival,
  festivalIndex,
  manifest,
  municipalitiesIndex = null,
  barangaysIndex = null
) {
  const nameHint = getFestivalLocationHint(festival.name);

  if (festival.barangayPsgc) {
    const loc = festival.location ?? {};
    const barangayPsgc = psaToAdm(festival.barangayPsgc);
    const municipalityPsgc = loc.psgc ?? null;
    let provincePsgc = loc.provincePsgc ?? null;
    let regionPsgc =
      loc.regionPsgc ?? festivalIndex.provinceToRegion.get(provincePsgc) ?? null;
    const resolved = municipalityPsgc
      ? findMunicipalityByPsgc(municipalitiesIndex, municipalityPsgc)
      : null;

    provincePsgc = provincePsgc ?? resolved?.provincePsgc ?? null;
    regionPsgc =
      regionPsgc ??
      resolved?.regionPsgc ??
      festivalIndex.provinceToRegion.get(provincePsgc) ??
      null;

    const bgyEntry = lookupBarangaysEntry(
      barangaysIndex,
      municipalityPsgc
    )?.barangays?.find((b) => Number(b.psgc) === barangayPsgc);

    if (municipalityPsgc && provincePsgc) {
      const regionName = regionPsgc ? findRegionName(manifest, regionPsgc) : null;
      return {
        level: "barangay",
        regionPsgc,
        regionName,
        provincePsgc,
        provinceName:
          loc.province ??
          (provincePsgc ? findProvinceName(manifest, provincePsgc) : null),
        municipalityPsgc,
        municipalityName: loc.municipality ?? resolved?.name ?? null,
        barangayPsgc,
        barangayName: festival.barangayName ?? bgyEntry?.name ?? null,
      };
    }
  }

  const loc = festival.location ?? {};
  let municipalityPsgc = normalizePsgc(loc.psgc);
  let provincePsgc = normalizePsgc(loc.provincePsgc);
  let regionPsgc = normalizePsgc(
    loc.regionPsgc ?? festivalIndex.provinceToRegion.get(provincePsgc) ?? null
  );
  let municipalityName =
    resolveCityAlias(loc.municipality) ??
    loc.municipality ??
    nameHint?.municipality ??
    null;
  let provinceName = loc.province ?? nameHint?.province ?? null;

  if (municipalityPsgc) {
    const resolved = findMunicipalityByPsgc(municipalitiesIndex, municipalityPsgc);
    provincePsgc = provincePsgc ?? normalizePsgc(resolved?.provincePsgc) ?? null;
    regionPsgc =
      regionPsgc ??
      normalizePsgc(resolved?.regionPsgc) ??
      normalizePsgc(festivalIndex.provinceToRegion.get(provincePsgc)) ??
      null;
    municipalityName = municipalityName ?? resolved?.name ?? null;
    provinceName =
      provinceName ??
      (provincePsgc ? findProvinceName(manifest, provincePsgc) : null);
  } else if (municipalityName) {
    const resolved = findMunicipalityByName(
      municipalitiesIndex,
      municipalityName,
      provincePsgc
    );
    if (resolved) {
      municipalityPsgc = normalizePsgc(resolved.psgc);
      provincePsgc = provincePsgc ?? normalizePsgc(resolved.provincePsgc) ?? null;
      regionPsgc =
        regionPsgc ??
        normalizePsgc(resolved?.regionPsgc) ??
        normalizePsgc(festivalIndex.provinceToRegion.get(provincePsgc)) ??
        null;
      municipalityName = resolved.name ?? municipalityName;
      provinceName =
        provinceName ??
        (provincePsgc ? findProvinceName(manifest, provincePsgc) : null);
    }
  }

  if (!provincePsgc && provinceName) {
    for (const region of manifest.regions) {
      const prov = region.provinceLayer?.provinces?.find(
        (p) => p.name.toLowerCase() === provinceName.toLowerCase()
      );
      if (prov) {
        provincePsgc = normalizePsgc(prov.psgc);
        regionPsgc = regionPsgc ?? normalizePsgc(region.psgc);
        break;
      }
    }
  }

  const regionName = regionPsgc ? findRegionName(manifest, regionPsgc) : null;
  provinceName =
    provinceName ?? (provincePsgc ? findProvinceName(manifest, provincePsgc) : null);

  if (municipalityPsgc && provincePsgc) {
    return buildMunicipalitySelection({
      regionPsgc,
      regionName,
      provincePsgc,
      provinceName,
      municipalityPsgc,
      municipalityName,
    });
  }

  const focus = municipalityName ? cityMapFocus(municipalityName) : null;
  if (focus && provincePsgc) {
    return {
      level: "municipality",
      regionPsgc,
      regionName,
      provincePsgc,
      provinceName,
      municipalityPsgc: null,
      municipalityName,
      mapFocus: focus,
      mapFocusFallback: focus,
    };
  }

  if (provincePsgc) {
    return {
      level: "province",
      regionPsgc,
      regionName,
      provincePsgc,
      provinceName,
      municipalityName,
    };
  }

  if (regionPsgc) {
    return { level: "region", regionPsgc, regionName };
  }

  return null;
}
