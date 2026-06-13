/**
 * Hanopol parish barangays, Balilihan — shared Santo Niño fiesta (Jan 16).
 * Sources: Wikipedia/Balilihan LGU profile; Santo Niño Parish Hanopol (theoldchurches.com).
 */
const HANOPOL_BARANGAYS = [
  "Hanopol Este",
  "Hanopol Norte",
  "Hanopol Weste",
  "Santo Niño",
  "Tagustusan",
  "San Isidro",
  "San Roque",
  "Sal-Ing",
  "Cogon",
];

export const BALILIHAN_FIESTA_ENTRIES = HANOPOL_BARANGAYS.map((barangay) => ({
  barangay,
  municipality: "Balilihan",
  month: 1,
  dayStart: 16,
  patronSaint: "Señor Santo Niño",
  dateSource: "lgu-balilihan-hanopol-parish",
}));
