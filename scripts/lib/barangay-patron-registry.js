/**
 * Verified barangay patron saints from LGU/parish profiles (no feast date on source).
 * Used with inferFeastFromPatronSaint() during backfill.
 */
import { MIAGAO_PATRON_REGISTRY } from "./lgu-fiesta-schedules/miagao-patron-registry.js";
import { normalizePlaceName } from "./barangay-psgc-index.js";

const REGISTRY = [...MIAGAO_PATRON_REGISTRY];

function registryKey(municipality, barangay) {
  return `${normalizePlaceName(municipality)}|${normalizePlaceName(barangay)}`;
}

const BY_MUNI_BARANGAY = new Map(
  REGISTRY.map((row) => [registryKey(row.municipality, row.barangay), row])
);

export function lookupBarangayPatronRegistry(festival) {
  const parts = festival.locationText?.split(",").map((s) => s.trim()) ?? [];
  if (parts.length < 2) return null;
  const barangay = parts[0];
  const municipality = festival.municipality ?? parts[1];
  return BY_MUNI_BARANGAY.get(registryKey(municipality, barangay)) ?? null;
}

export function listPatronRegistryEntries() {
  return REGISTRY;
}
