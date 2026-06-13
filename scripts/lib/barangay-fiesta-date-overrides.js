/**
 * Curated barangay fiesta dates not covered by LGU schedule modules.
 * Keys: PSA barangay PSGC (as in psgc2 / barangay-fiestas-raw).
 *
 * Most LGU schedules live in `lgu-fiesta-schedules/` (including Magallanes HTML
 * at `data/raw/lgu-schedules/magallanes-fiestas.html`). Add PSGC entries here
 * only when a source is not yet wired into that pipeline.
 */
import { lookupLguBarangayFiestaDate } from "./lgu-fiesta-schedules/index.js";

/** @type {Record<string, { month: number, dayStart: number, dayEnd?: number, dateSource: string, patronSaint?: string }>} */
export const BARANGAY_FIESTA_DATE_BY_PSGC = {};

/**
 * Municipality ADM PSGC + normalized barangay name → date record.
 * @type {Record<string, Record<string, { month: number, dayStart: number, dayEnd?: number, dateSource: string }>>}
 */
export const BARANGAY_FIESTA_DATE_BY_MUNI_NAME = {};

export function lookupBarangayFiestaDateOverride(festival) {
  const psgc = String(festival.barangayPsgc ?? "").padStart(9, "0");
  if (BARANGAY_FIESTA_DATE_BY_PSGC[psgc]) {
    return BARANGAY_FIESTA_DATE_BY_PSGC[psgc];
  }
  const numeric = String(Number(psgc));
  if (BARANGAY_FIESTA_DATE_BY_PSGC[numeric]) {
    return BARANGAY_FIESTA_DATE_BY_PSGC[numeric];
  }

  const lgu = lookupLguBarangayFiestaDate(festival);
  if (lgu) return lgu;

  return null;
}
