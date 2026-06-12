/**
 * Curated barangay fiesta dates from LGU / parish schedules.
 * Keys: PSA barangay PSGC (as in psgc2 / barangay-fiestas-raw).
 *
 * Sources: Magallanes Sorsogon LGU, Siargao Islands fiesta directory,
 * Biliran May calendar (latagaw.com), plus hand-curated PSGC entries below.
 */
import { lookupLguBarangayFiestaDate } from "./lgu-fiesta-schedules/index.js";

/** @type {Record<string, { month: number, dayStart: number, dayEnd?: number, dateSource: string, patronSaint?: string }>} */
export const BARANGAY_FIESTA_DATE_BY_PSGC = {
  // Magallanes, Sorsogon (506211000)
  "056211001": { month: 12, dayStart: 8, dateSource: "lgu-magallanes-sorsogon", patronSaint: "Immaculate Conception" },
  "056211002": { month: 5, dayStart: 1, dateSource: "lgu-magallanes-sorsogon", patronSaint: "Saint Joseph" },
  "056211003": { month: 8, dayStart: 25, dateSource: "lgu-magallanes-sorsogon", patronSaint: "Our Lady of Salvacion" },
  "056211004": { month: 4, dayStart: 27, dayEnd: 28, dateSource: "lgu-magallanes-sorsogon", patronSaint: "Holy Family" },
  "056211005": { month: 10, dayStart: 18, dateSource: "lgu-magallanes-sorsogon", patronSaint: "San Lorenzo Ruiz" },
  "056211006": { month: 8, dayStart: 31, dateSource: "lgu-magallanes-sorsogon", patronSaint: "Our Lady of Salvacion" },
  "056211007": { month: 2, dayStart: 14, dayEnd: 15, dateSource: "lgu-magallanes-sorsogon", patronSaint: "Our Lady of Lourdes" },
  "056211008": { month: 10, dayStart: 24, dateSource: "lgu-magallanes-sorsogon", patronSaint: "Saint Raphael" },
  "056211009": { month: 11, dayStart: 3, dateSource: "lgu-magallanes-sorsogon", patronSaint: "Saint Martin de Porres" },
  "056211010": { month: 5, dayStart: 29, dateSource: "lgu-magallanes-sorsogon", patronSaint: "Holy Trinity" },
  "056211013": { month: 5, dayStart: 12, dateSource: "lgu-magallanes-sorsogon", patronSaint: "Saint Isidore" },
  "056211014": { month: 8, dayStart: 20, dateSource: "lgu-magallanes-sorsogon", patronSaint: "Saint Bernard" },
  "056211015": { month: 8, dayStart: 4, dateSource: "lgu-magallanes-sorsogon", patronSaint: "Saint Dominic" },
  "056211016": { month: 10, dayStart: 17, dateSource: "lgu-magallanes-sorsogon", patronSaint: "Our Lady of the Holy Rosary" },
  "056211018": { month: 5, dayStart: 13, dateSource: "lgu-magallanes-sorsogon", patronSaint: "Our Lady of Fatima" },
  "056211019": { month: 10, dayStart: 24, dateSource: "lgu-magallanes-sorsogon", patronSaint: "Saint Raphael" },
  "056211020": { month: 5, dayStart: 27, dateSource: "lgu-magallanes-sorsogon", patronSaint: "Saint Francis" },
  "056211021": { month: 5, dayStart: 10, dateSource: "lgu-magallanes-sorsogon", patronSaint: "Saint Roch" },
  "056211022": { month: 8, dayStart: 17, dateSource: "lgu-magallanes-sorsogon", patronSaint: "Saint Roch" },
  "056211023": { month: 5, dayStart: 16, dateSource: "lgu-magallanes-sorsogon", patronSaint: "Saint Isidore" },
  "056211024": { month: 8, dayStart: 12, dateSource: "lgu-magallanes-sorsogon", patronSaint: "Our Lady of Salvacion" },
  "056211025": { month: 11, dayStart: 30, dateSource: "lgu-magallanes-sorsogon", patronSaint: "Saint Andrew" },
  "056211026": { month: 8, dayStart: 16, dateSource: "lgu-magallanes-sorsogon", patronSaint: "Saint Roch" },
  "056211027": { month: 5, dayStart: 20, dateSource: "lgu-magallanes-sorsogon", patronSaint: "Saint Vincent" },
  "056211028": { month: 6, dayStart: 16, dateSource: "lgu-magallanes-sorsogon", patronSaint: "Our Lady of Mount Carmel" },
  "056211029": { month: 8, dayStart: 8, dateSource: "lgu-magallanes-sorsogon", patronSaint: "Our Lady of Salvacion" },
  "056211030": { month: 5, dayStart: 14, dateSource: "lgu-magallanes-sorsogon", patronSaint: "Saint Helena" },
  "056211031": { month: 5, dayStart: 19, dateSource: "lgu-magallanes-sorsogon", patronSaint: "Saint Joseph" },
  "056211032": { month: 6, dayStart: 26, dateSource: "lgu-magallanes-sorsogon", patronSaint: "Saint Anne" },
};

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
