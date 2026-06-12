import { MONTH_NAMES } from "./constants.js";
import { normalizePsgc, psaToAdm } from "./psgc.js";

function festivalsAtPsgc(byPsgc, psgc) {
  const key = normalizePsgc(psgc);
  if (key == null) return [];
  return byPsgc.get(key) ?? byPsgc.get(String(key)) ?? [];
}

function normalizePlaceName(name) {
  return String(name)
    .toLowerCase()
    .replace(/\bcity of\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function festivalsForMunicipalityName(index, municipalityName, provincePsgc) {
  const target = normalizePlaceName(municipalityName);
  const stripCity = (s) => s.replace(/\s+city$/, "");
  const pool = provincePsgc
    ? festivalsAtPsgc(index.byProvincePsgc, provincePsgc)
    : index.festivals;
  return pool.filter((f) => {
    const muni = f.location?.municipality;
    if (!muni) return false;
    const name = normalizePlaceName(muni);
    return name === target || stripCity(name) === stripCity(target);
  });
}

export function buildFestivalIndex(festivalData, manifest) {
  const festivals = festivalData.festivals ?? [];
  const provinceToRegion = new Map();

  for (const region of manifest.regions) {
    for (const prov of region.provinceLayer?.provinces ?? []) {
      provinceToRegion.set(prov.psgc, region.psgc);
    }
  }

  const byPsgc = new Map();
  const byProvincePsgc = new Map();
  const byRegionPsgc = new Map();

  for (const f of festivals) {
    const loc = f.location ?? {};
    const regionPsgc =
      loc.regionPsgc ?? provinceToRegion.get(loc.provincePsgc) ?? null;

    const muniPsgc = normalizePsgc(loc.psgc);
    if (muniPsgc != null) {
      const list = byPsgc.get(muniPsgc) ?? [];
      list.push(f);
      byPsgc.set(muniPsgc, list);
    }

    const provPsgc = normalizePsgc(loc.provincePsgc);
    if (provPsgc != null) {
      const list = byProvincePsgc.get(provPsgc) ?? [];
      list.push(f);
      byProvincePsgc.set(provPsgc, list);

      const regPsgc = normalizePsgc(regionPsgc);
      if (regPsgc != null) {
        const rList = byRegionPsgc.get(regPsgc) ?? [];
        if (!rList.includes(f)) rList.push(f);
        byRegionPsgc.set(regPsgc, rList);
      }
    }
  }

  return { festivals, byPsgc, byProvincePsgc, byRegionPsgc, provinceToRegion };
}

export function festivalsForSelection(index, selection, barangayFestivals = []) {
  if (!selection) return index.festivals;

  const { level, regionPsgc, provincePsgc, municipalityPsgc, barangayPsgc } =
    selection;

  const muniPsgc = normalizePsgc(municipalityPsgc);
  const bgyPsgc = normalizePsgc(barangayPsgc);
  const provPsgc = normalizePsgc(provincePsgc);
  const regPsgc = normalizePsgc(regionPsgc);

  if (level === "barangay" && bgyPsgc) {
    const bgyFestivals = barangayFestivals.filter(
      (f) => psaToAdm(f.barangayPsgc) === bgyPsgc
    );
    if (muniPsgc) {
      const named = festivalsAtPsgc(index.byPsgc, muniPsgc).filter(
        (f) => f.barangayPsgc && psaToAdm(f.barangayPsgc) === bgyPsgc
      );
      if (!named.length) return bgyFestivals;
      const seen = new Set(bgyFestivals.map((f) => f.id));
      const merged = [...bgyFestivals];
      for (const f of named) {
        if (!seen.has(f.id)) merged.push(f);
      }
      return merged;
    }
    return bgyFestivals;
  }

  if (level === "municipality") {
    if (muniPsgc) {
      const named = festivalsAtPsgc(index.byPsgc, muniPsgc);
      if (!barangayFestivals.length) return named;
      const seen = new Set(named.map((f) => f.id));
      const merged = [...named];
      for (const f of barangayFestivals) {
        if (!seen.has(f.id)) merged.push(f);
      }
      return merged;
    }
    if (selection.municipalityName) {
      return festivalsForMunicipalityName(
        index,
        selection.municipalityName,
        provPsgc
      );
    }
    if (provPsgc) {
      return festivalsAtPsgc(index.byProvincePsgc, provPsgc);
    }
  }

  if (level === "province" && provPsgc) {
    return festivalsAtPsgc(index.byProvincePsgc, provPsgc);
  }

  if (level === "region" && regPsgc) {
    return festivalsAtPsgc(index.byRegionPsgc, regPsgc);
  }

  return index.festivals;
}

/** First festival shown in the sidebar for a barangay selection (list order). */
export function defaultBarangayFestival(index, selection, barangayFestivals = []) {
  if (!index || selection?.level !== "barangay") return null;
  const festivals = festivalsForSelection(index, selection, barangayFestivals);
  return festivals[0] ?? null;
}

export function formatFestivalDate(f) {
  if (f.dayStart && f.month) {
    const month = MONTH_NAMES[f.month] ?? "";
    if (f.dayEnd && f.dayEnd !== f.dayStart) {
      return `${month} ${f.dayStart}–${f.dayEnd}`;
    }
    return `${month} ${f.dayStart}`;
  }
  if (f.month) return MONTH_NAMES[f.month] ?? "";
  return f.dateVenueRaw?.split(/\s+/).slice(0, 3).join(" ") ?? "Date TBA";
}

export function festivalCountByPsgc(index, psgc) {
  return festivalsAtPsgc(index.byPsgc, psgc).length;
}

export function festivalCountByProvince(index, provincePsgc) {
  return festivalsAtPsgc(index.byProvincePsgc, provincePsgc).length;
}
