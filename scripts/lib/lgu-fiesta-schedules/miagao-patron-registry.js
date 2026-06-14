/**
 * Miagao barangay patron saints from miagao.tripod.com profiles (Wayback).
 * Used with inferFeastFromPatronSaint() during backfill when no explicit LGU date exists.
 * Only includes patrons that map to a fixed liturgical feast in patron-saint-calendar.js.
 * Run scripts/tmp-scrape-miagao-patrons.mjs to refresh raw scrape, then re-curate.
 */
export const MIAGAO_PATRON_REGISTRY = [
  {
    barangay: "Bugtong Lumangan",
    municipality: "Miagao",
    patronSaint: "St. Joaquin and St. Anna",
    dateSource: "curated-online-miagao-tripod-patron",
    note: "miagao.tripod.com/barangays/bugtong_lumangan.htm: patronal fiesta in honor of St. Joaquin and St. Anna",
  },
];
