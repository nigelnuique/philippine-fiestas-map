import { boundsFromFeature, mergeBounds } from "./mapUtils.js";

async function fetchJson(url, label) {
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Failed to load ${label} (${res.status}): ${url}`);
  }
  if (text.trimStart().startsWith("<")) {
    throw new Error(
      `Expected JSON but got HTML for ${label}. Run: npm run map:sync`
    );
  }
  return JSON.parse(text);
}

export async function loadManifest() {
  return fetchJson("/data/processed/boundaries/manifest.json", "boundary manifest");
}

export async function loadFestivals() {
  return fetchJson("/data/processed/festivals/festivals.json", "festivals");
}

export async function loadMunicipalitiesIndex() {
  return fetchJson(
    "/data/processed/boundaries/municipalities-index.json",
    "municipalities index"
  );
}

export async function loadBarangaysIndex() {
  try {
    return await fetchJson(
      "/data/processed/boundaries/barangays-index.json",
      "barangays index"
    );
  } catch {
    return {};
  }
}

export function geojsonUrl(manifestPath) {
  // manifest paths: data/raw/philippines-json-maps/2023/geojson/regions/lowres/...
  const relative = manifestPath.replace(/^data\/raw\/philippines-json-maps\/2023\/geojson\//, "");
  return `/geojson/${relative}`;
}

export async function fetchGeoJson(url) {
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Failed to load GeoJSON (${res.status}): ${url}`);
  }
  if (text.trimStart().startsWith("<")) {
    throw new Error(
      `Expected JSON but got HTML for ${url}. Run: npm run map:sync`
    );
  }
  return JSON.parse(text);
}

let provincesCache = null;

export async function loadAllProvinces(manifest) {
  const features = [];
  const layers = manifest.regions
    .map((r) => r.provinceLayer)
    .filter(Boolean);

  const results = await Promise.all(
    layers.map((layer) => fetchGeoJson(geojsonUrl(layer.file)))
  );

  for (const fc of results) {
    if (fc.features) features.push(...fc.features);
  }

  provincesCache = { type: "FeatureCollection", features };
  return provincesCache;
}

let hucCitiesCache = null;
let hucByProvinceCache = null;

async function loadHucIndex() {
  if (hucCitiesCache && hucByProvinceCache) {
    return { cities: hucCitiesCache, byProvince: hucByProvinceCache };
  }
  try {
    const [cities, byProv] = await Promise.all([
      fetchJson("/data/processed/boundaries/huc-cities.json", "HUC cities"),
      fetchJson("/data/processed/boundaries/huc-by-province.json", "HUC index"),
    ]);
    hucCitiesCache = cities;
    hucByProvinceCache = byProv.byProvincePsgc ?? {};
  } catch {
    hucCitiesCache = { features: [] };
    hucByProvinceCache = {};
  }
  return { cities: hucCitiesCache, byProvince: hucByProvinceCache };
}

export async function loadMunicipalities(provincePsgc) {
  const file = `/geojson/provdists/lowres/municities-provdist-${provincePsgc}.0.001.json`;
  let base;
  try {
    base = await fetchGeoJson(file);
  } catch {
    base = { type: "FeatureCollection", features: [] };
  }
  const { cities, byProvince } = await loadHucIndex();
  const hucIds = byProvince[String(provincePsgc)] ?? [];
  if (!hucIds.length) return base;

  const hucFeatures = cities.features.filter((f) =>
    hucIds.includes(f.properties?.adm3_psgc)
  );
  if (!hucFeatures.length) return base;

  return {
    type: "FeatureCollection",
    features: [...base.features, ...hucFeatures],
  };
}

export async function loadMunicipalitiesForRegion(manifest, regionPsgc) {
  const region = manifest.regions.find((r) => r.psgc === regionPsgc);
  const provinces = region?.provinceLayer?.provinces ?? [];
  if (!provinces.length) {
    return { type: "FeatureCollection", features: [] };
  }

  const results = await Promise.all(
    provinces.map((prov) => loadMunicipalities(prov.psgc))
  );
  const features = results.flatMap((fc) => fc.features ?? []);
  return { type: "FeatureCollection", features };
}

let barangayIndexCache = null;

export async function loadBarangayFiestaIndex() {
  if (barangayIndexCache) return barangayIndexCache;
  try {
    barangayIndexCache = await fetchJson(
      "/data/processed/festivals/barangay-fiestas.json",
      "barangay fiestas"
    );
  } catch {
    barangayIndexCache = { byMunicipalityPsgc: {}, stats: { total: 0 } };
  }
  return barangayIndexCache;
}

export async function loadBarangayFiestasForMunicipality(municipalityPsgc) {
  if (!municipalityPsgc) return [];
  const index = await loadBarangayFiestaIndex();
  return index.byMunicipalityPsgc?.[String(municipalityPsgc)] ?? [];
}

export async function loadBarangays(municipalityPsgc) {
  if (!municipalityPsgc) return null;
  const file = `/geojson/municities/lowres/bgysubmuns-municity-${municipalityPsgc}.0.001.json`;
  try {
    const fc = await fetchGeoJson(file);
    if (!fc.features?.length) return null;
    const features = fc.features.filter((f) => f.geometry);
    if (!features.length) return null;
    return { type: "FeatureCollection", features };
  } catch {
    return null;
  }
}

function findGeoFeature(features, prop, value) {
  if (!features?.length || value == null) return null;
  const target = Number(value);
  return (
    features.find((f) => Number(f.properties?.[prop]) === target) ?? null
  );
}

/** Load GeoJSON bounds for the deepest available selection level. */
export async function resolveSelectionFlyBounds(selection) {
  if (!selection) return null;

  if (
    selection.level === "barangay" &&
    selection.municipalityPsgc &&
    selection.barangayPsgc
  ) {
    const fc = await loadBarangays(selection.municipalityPsgc);
    const feat = findGeoFeature(fc?.features, "adm4_psgc", selection.barangayPsgc);
    if (feat) return boundsFromFeature(feat);
  }

  if (selection.municipalityPsgc && selection.provincePsgc) {
    const fc = await loadMunicipalities(selection.provincePsgc);
    const feat = findGeoFeature(
      fc?.features,
      "adm3_psgc",
      selection.municipalityPsgc
    );
    if (feat) return boundsFromFeature(feat);
  }

  if (selection.level === "province" && selection.provincePsgc && provincesCache) {
    const feat = findGeoFeature(
      provincesCache.features,
      "adm2_psgc",
      selection.provincePsgc
    );
    if (feat) return boundsFromFeature(feat);
  }

  if (selection.level === "region" && selection.regionPsgc && provincesCache) {
    const feats = provincesCache.features.filter(
      (f) => Number(f.properties?.adm1_psgc) === Number(selection.regionPsgc)
    );
    return mergeBounds(feats.map(boundsFromFeature));
  }

  return null;
}
