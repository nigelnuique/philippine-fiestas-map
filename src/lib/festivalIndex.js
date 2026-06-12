import { MONTH_NAMES } from "./constants.js";
import { psaToAdm } from "./psgc.js";

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

    if (loc.psgc) {
      const list = byPsgc.get(loc.psgc) ?? [];
      list.push(f);
      byPsgc.set(loc.psgc, list);
    }

    if (loc.provincePsgc) {
      const list = byProvincePsgc.get(loc.provincePsgc) ?? [];
      list.push(f);
      byProvincePsgc.set(loc.provincePsgc, list);

      if (regionPsgc) {
        const rList = byRegionPsgc.get(regionPsgc) ?? [];
        if (!rList.includes(f)) rList.push(f);
        byRegionPsgc.set(regionPsgc, rList);
      }
    }
  }

  return { festivals, byPsgc, byProvincePsgc, byRegionPsgc, provinceToRegion };
}

export function festivalsForSelection(index, selection, barangayFestivals = []) {
  if (!selection) return index.festivals;

  const { level, regionPsgc, provincePsgc, municipalityPsgc, barangayPsgc } =
    selection;

  if (level === "barangay" && barangayPsgc) {
    const bgyFestivals = barangayFestivals.filter(
      (f) => psaToAdm(f.barangayPsgc) === barangayPsgc
    );
    if (municipalityPsgc) {
      const named = (index.byPsgc.get(municipalityPsgc) ?? []).filter(
        (f) => f.barangayPsgc && psaToAdm(f.barangayPsgc) === barangayPsgc
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
    if (municipalityPsgc) {
      const named = index.byPsgc.get(municipalityPsgc) ?? [];
      if (!barangayFestivals.length) return named;
      const seen = new Set(named.map((f) => f.id));
      const merged = [...named];
      for (const f of barangayFestivals) {
        if (!seen.has(f.id)) merged.push(f);
      }
      return merged;
    }
    if (provincePsgc) {
      return index.byProvincePsgc.get(provincePsgc) ?? [];
    }
  }

  if (level === "province" && provincePsgc) {
    const direct = index.byProvincePsgc.get(provincePsgc) ?? [];
    return direct;
  }

  if (level === "region" && regionPsgc) {
    return index.byRegionPsgc.get(regionPsgc) ?? [];
  }

  return index.festivals;
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
  return (index.byPsgc.get(psgc) ?? []).length;
}

export function festivalCountByProvince(index, provincePsgc) {
  return (index.byProvincePsgc.get(provincePsgc) ?? []).length;
}
