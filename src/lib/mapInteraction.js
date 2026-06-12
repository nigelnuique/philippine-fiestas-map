import { lookupBarangaysForMunicipality } from "./data.js";
import {
  boundsFromFeature,
  findProvinceName,
  findRegionName,
  num,
} from "./mapUtils.js";

function adminDepth(props) {
  if (!props) return 0;
  if (num(props.adm4_psgc)) return 4;
  if (num(props.adm3_psgc)) return 3;
  if (num(props.adm2_psgc)) return 2;
  if (num(props.adm1_psgc)) return 1;
  return 0;
}

/** Pick the most specific admin feature under the cursor. */
export function pickDeepestFeature(features) {
  if (!features?.length) return null;
  return features.reduce((best, f) =>
    adminDepth(f.properties) > adminDepth(best?.properties) ? f : best
  );
}

export function selectionFromFeature(feature, manifest, { flyBounds } = {}) {
  const p = feature?.properties ?? {};
  const adm1 = num(p.adm1_psgc);
  const adm2 = num(p.adm2_psgc);
  const adm3 = num(p.adm3_psgc);
  const adm4 = num(p.adm4_psgc);
  const regionName = adm1 ? findRegionName(manifest, adm1) : null;
  const provinceName =
    p.adm2_en ?? (adm2 ? findProvinceName(manifest, adm2) : null) ?? "Province";
  const bounds = flyBounds ?? boundsFromFeature(feature);

  if (adm4) {
    return {
      level: "barangay",
      regionPsgc: adm1,
      regionName,
      provincePsgc: adm2,
      provinceName,
      municipalityPsgc: adm3,
      municipalityName: p.adm3_en,
      barangayPsgc: adm4,
      barangayName: p.adm4_en,
      flyBounds: bounds,
    };
  }

  if (adm3) {
    return {
      level: "municipality",
      regionPsgc: adm1,
      regionName,
      provincePsgc: adm2,
      provinceName,
      municipalityPsgc: adm3,
      municipalityName: p.adm3_en,
      flyBounds: bounds,
    };
  }

  if (adm2) {
    return {
      level: "province",
      regionPsgc: adm1,
      regionName,
      provincePsgc: adm2,
      provinceName,
      flyBounds: bounds,
    };
  }

  if (adm1) {
    return {
      level: "region",
      regionPsgc: adm1,
      regionName,
      flyBounds: bounds,
    };
  }

  return null;
}

function regionSelectionFromProvinceClick(manifest, adm1) {
  const regionName = findRegionName(manifest, adm1);
  return {
    level: "region",
    regionPsgc: adm1,
    regionName,
    // Region bounds are computed from all provinces in the region at fly time.
  };
}

/** Drill down exactly one admin level per map click. */
export function selectionFromMapClick(feature, manifest, currentSelection) {
  const p = feature?.properties ?? {};
  const adm1 = num(p.adm1_psgc);
  const adm2 = num(p.adm2_psgc);
  const adm3 = num(p.adm3_psgc);
  const adm4 = num(p.adm4_psgc);
  const curLevel = currentSelection?.level;
  const curRegion = num(currentSelection?.regionPsgc);
  const sameRegion = curRegion === adm1;

  if (adm4) {
    return selectionFromFeature(feature, manifest);
  }

  if (adm3) {
    if (curLevel === "municipality" || curLevel === "barangay") {
      return selectionFromFeature(feature, manifest);
    }
    if (curLevel === "province" && sameRegion) {
      return selectionFromFeature(feature, manifest);
    }
    return null;
  }

  if (adm2 && adm1) {
    if (!currentSelection) {
      return regionSelectionFromProvinceClick(manifest, adm1);
    }
    if (curLevel === "region") {
      return sameRegion
        ? selectionFromFeature(feature, manifest)
        : regionSelectionFromProvinceClick(manifest, adm1);
    }
    if (curLevel === "province" && sameRegion) {
      return selectionFromFeature(feature, manifest);
    }
    if (curLevel === "municipality" || curLevel === "barangay") {
      return sameRegion
        ? selectionFromFeature(feature, manifest)
        : regionSelectionFromProvinceClick(manifest, adm1);
    }
    return regionSelectionFromProvinceClick(manifest, adm1);
  }

  if (adm1) {
    return regionSelectionFromProvinceClick(manifest, adm1);
  }

  return null;
}

export function hasBarangayMap(barangaysIndex, municipalityPsgc) {
  const entry = lookupBarangaysForMunicipality(barangaysIndex, municipalityPsgc);
  return Boolean(entry?.featureCount > 0);
}

/** Name shown on hover — matches the admin unit you can drill into at the current level. */
export function featureHoverLabel(feature, manifest, selection) {
  if (!feature?.properties) return null;

  const p = feature.properties;
  const adm1 = num(p.adm1_psgc);
  const adm2 = num(p.adm2_psgc);
  const adm3 = num(p.adm3_psgc);
  const adm4 = num(p.adm4_psgc);
  const level = selection?.level ?? "country";

  if (level === "barangay") {
    return p.adm4_en ?? p.adm3_en ?? null;
  }

  if (level === "municipality") {
    if (adm4) return p.adm4_en;
    if (adm3) return p.adm3_en;
  }

  if (level === "province") {
    if (adm3) return p.adm3_en;
  }

  if (level === "region") {
    if (adm2) {
      return p.adm2_en ?? (adm2 ? findProvinceName(manifest, adm2) : null);
    }
  }

  if (!selection && adm1) {
    return findRegionName(manifest, adm1);
  }

  if (adm4) return p.adm4_en;
  if (adm3) return p.adm3_en;
  if (adm2) return p.adm2_en ?? findProvinceName(manifest, adm2);
  if (adm1) return findRegionName(manifest, adm1);

  return null;
}
