/**
 * Per-municipality barangay date coverage and backfill ROI ranking.
 */
import { LGU_SCHEDULE_REGISTRY, registryByMunicipalityKey } from "./lgu-fiesta-schedules/registry.js";

export function summarizeMunicipalityCoverage(rawFestivals) {
  const byMuni = {};
  for (const f of rawFestivals) {
    const key = `${f.province}::${f.municipality}`;
    if (!byMuni[key]) {
      byMuni[key] = {
        province: f.province,
        municipality: f.municipality,
        total: 0,
        dated: 0,
        missing: 0,
      };
    }
    byMuni[key].total++;
    if (f.month && (f.dayStart || f.datePrecision === "month")) {
      byMuni[key].dated++;
    } else {
      byMuni[key].missing++;
    }
  }
  return byMuni;
}

export function rankMunicipalityBackfillRoi(rawFestivals, { limit = 25 } = {}) {
  const byMuni = summarizeMunicipalityCoverage(rawFestivals);
  const registry = registryByMunicipalityKey();

  return Object.values(byMuni)
    .filter((m) => m.missing > 0)
    .map((m) => {
      const key = `${m.province}::${m.municipality}`;
      const sources = registry.get(key) ?? [];
      const pct = m.total ? (m.dated / m.total) * 100 : 0;
      const hasPartialSource = sources.some((s) => s.status === "partial");
      const hasPlannedSource = sources.some((s) => s.status === "planned");
      const hasBlockedSource = sources.some((s) => s.status === "blocked");
      const hasCompleteSource = sources.some((s) => s.status === "complete");

      let priority = m.missing;
      if (hasPartialSource) priority += 500;
      if (hasPlannedSource) priority += 200;
      if (hasBlockedSource && hasPartialSource) priority += 100;
      if (hasCompleteSource) priority -= 1000;

      const sourceLabel = sources.length
        ? sources.map((s) => `${s.id} (${s.status})`).join(", ")
        : "none";

      return {
        ...m,
        pctDated: pct,
        roiScore: priority,
        sources,
        sourceLabel,
      };
    })
    .sort((a, b) => b.roiScore - a.roiScore || b.missing - a.missing)
    .slice(0, limit);
}

export function buildRegistryStatusReport(rawFestivals) {
  const byMuni = summarizeMunicipalityCoverage(rawFestivals);
  return LGU_SCHEDULE_REGISTRY.map((row) => {
    const key = `${row.province}::${row.municipality}`;
    const m = byMuni[key];
    return {
      id: row.id,
      municipality: row.municipality,
      province: row.province,
      status: row.status,
      format: row.format,
      coverage: m
        ? `${m.dated}/${m.total} (${((m.dated / m.total) * 100).toFixed(1)}%)`
        : "n/a",
      missing: m?.missing ?? null,
      url: row.url ?? null,
      notes: row.notes ?? null,
    };
  });
}
