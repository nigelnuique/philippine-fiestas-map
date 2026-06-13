/**
 * Miagao, Iloilo — barangay feast days from verified LGU/parish/community sources.
 * Town poblacion barangays share the municipal patronal fiesta (Sept 22).
 * Source: miagao.gov.ph municipal ordinance (Santo Tomas de Villanueva).
 * Bacauan: miagao.gov.ph barangay profile (San Roque, Aug 16).
 * Banbanan: LGU profile (fiesta every January, month-only).
 * Holy Child Parish / on-day FB-YouTube posts for Sto. Niño parish barangays.
 * Cubay: Our Lady of the Miraculous Medal Parish patronal fiesta (Nov 27).
 */
const MIAGAO_POB_BARANGAYS = [
  "Baybay Norte (Pob.)",
  "Baybay Sur (Pob.)",
  "Bolho (Pob.)",
  "Mat-Y (Pob.)",
  "Tacas (Pob.)",
  "Ubos Ilawod (Pob.)",
  "Ubos Ilaya (Pob.)",
];

export const MIAGAO_FIESTA_ENTRIES = [
  ...MIAGAO_POB_BARANGAYS.map((barangay) => ({
    barangay,
    municipality: "Miagao",
    month: 9,
    dayStart: 22,
    patronSaint: "Santo Tomas de Villanueva",
    dateSource: "lgu-miagao-gov-ph",
  })),
  {
    barangay: "Bacauan",
    municipality: "Miagao",
    month: 8,
    dayStart: 16,
    patronSaint: "San Roque",
    dateSource: "lgu-miagao-gov-ph",
  },
  {
    barangay: "Banbanan",
    municipality: "Miagao",
    month: 1,
    datePrecision: "month",
    dateSource: "lgu-miagao-gov-ph",
    note: "LGU profile: observes barangay fiesta every January (no day given)",
  },
  {
    barangay: "Igbugo",
    municipality: "Miagao",
    month: 1,
    dayStart: 15,
    patronSaint: "Señor Sto. Niño",
    dateSource: "curated-online-miagao-holy-child-parish-fb",
    note: "On-day Happy Fiesta Jan 14–15 (2025); parish proclaimed on barangay fiesta Jan 15",
  },
  {
    barangay: "Naclub",
    municipality: "Miagao",
    month: 4,
    dayStart: 19,
    dateSource: "curated-online-miagao-fb",
    note: "On-day Happy Fiesta Brgy. Naclub posts (Apr 19, 2022 and 2024)",
  },
  {
    barangay: "Cawayanan",
    municipality: "Miagao",
    month: 2,
    dayStart: 7,
    dateSource: "curated-online-miagao-fb",
    note: "On-day Happy Fiesta Barangay Cawayanan video (Feb 7, 2026)",
  },
  {
    barangay: "Igsoligue",
    municipality: "Miagao",
    month: 2,
    dayStart: 22,
    dateSource: "curated-online-miagao-fb",
    note: "On-day Happy Fiesta Brgy. Igsoligue video (Feb 22, 2025)",
  },
  {
    barangay: "Fundacion",
    municipality: "Miagao",
    month: 12,
    dayStart: 28,
    patronSaint: "Nuestra Señora de los Remedios",
    dateSource: "curated-online-miagao-fb",
    note: "On-day HAPPY FIESTA BRGY. FUNDACION post (Dec 28, 2025)",
  },
  {
    barangay: "Tigbagacay",
    municipality: "Miagao",
    month: 12,
    dayStart: 27,
    dayEnd: 28,
    patronSaint: "Nuestra Señora de Guia",
    dateSource: "curated-online-miagao-fb",
    note: "On-day Happy Fiesta Brgy. Tigbagacay (Dec 27–28, 2024–2025)",
  },
  {
    barangay: "Cubay",
    municipality: "Miagao",
    month: 11,
    dayStart: 27,
    patronSaint: "Our Lady of the Miraculous Medal",
    dateSource: "parish-our-lady-of-miraculous-medal-cubay-miagao",
    note: "Parish patronal fiesta Nov 27 (Miraculous Medal Parish, Cubay)",
  },
];
