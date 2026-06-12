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

/**
 * Map click drill-down rules:
 * - Country view + province click → region (shows municipality grid)
 * - Region view + same-region province click → province
 * - Otherwise → deepest admin level under cursor
 */
export function selectionFromMapClick(feature, manifest, currentSelection) {
  const p = feature?.properties ?? {};
  const adm1 = num(p.adm1_psgc);
  const adm2 = num(p.adm2_psgc);
  const adm3 = num(p.adm3_psgc);
  const adm4 = num(p.adm4_psgc);
  const regionName = adm1 ? findRegionName(manifest, adm1) : null;

  if (adm4 || adm3) {
    return selectionFromFeature(feature, manifest);
  }

  if (adm2) {
    if (!currentSelection) {
      return { level: "region", regionPsgc: adm1, regionName };
    }

    if (
      currentSelection.level === "region" &&
      adm1 === currentSelection.regionPsgc
    ) {
      return selectionFromFeature(feature, manifest);
    }

    if (adm1 !== currentSelection.regionPsgc) {
      return { level: "region", regionPsgc: adm1, regionName };
    }

    return selectionFromFeature(feature, manifest);
  }

  if (adm1) {
    return { level: "region", regionPsgc: adm1, regionName };
  }

  return null;
}

export function hasBarangayMap(barangaysIndex, municipalityPsgc) {
  return Boolean(
    municipalityPsgc &&
      barangaysIndex?.[String(municipalityPsgc)]?.featureCount > 0
  );
}
