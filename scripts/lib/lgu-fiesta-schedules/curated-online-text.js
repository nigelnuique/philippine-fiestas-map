/**
 * Hand-curated barangay fiesta dates from verified online sources
 * (LGU sites, parish news, community references).
 */
export const CURATED_ONLINE_FIESTA_ENTRIES = [
  {
    barangay: "Manlilinao",
    municipality: "Ormoc City",
    month: 5,
    dayStart: 14,
    dayEnd: 15,
    patronSaint: "San Isidro Labrador",
    dateSource: "lgu-ormoc-cultural-mapping",
  },
  {
    barangay: "Poras",
    municipality: "Boac",
    month: 6,
    dayStart: 23,
    patronSaint: "Sacred Heart of Jesus",
    dateSource: "parish-sacred-heart-poras-boac",
  },
  {
    barangay: "Santa Maria",
    municipality: "City Of Zamboanga",
    month: 2,
    dayStart: 2,
    patronSaint: "Señora de Candelaria",
    dateSource: "zamboanga-com-community-guide",
  },
  {
    barangay: "Taculing",
    municipality: "Larena",
    province: "Siquijor",
    month: 5,
    dayStart: 21,
    dayEnd: 22,
    dateSource: "siquijor-directory-com",
  },
  {
    barangay: "Libo",
    municipality: "Enrique Villanueva",
    province: "Siquijor",
    month: 7,
    dayStart: 15,
    dayEnd: 16,
    dateSource: "siquijor-directory-com",
  },
];

/** Relative dates resolved at build time via parseDateFromRaw. */
export const CURATED_ONLINE_RELATIVE_SCHEDULE = [
  {
    date: "9th Sunday after Easter Sunday",
    barangay: "Pasonanca",
    municipality: "City Of Zamboanga",
    patronSaint: "Holy Trinity",
    dateSource: "zamboanga-com-community-guide",
  },
  {
    date: "3rd Sunday of May",
    barangay: "N.S. Amoranto",
    municipality: "Quezon City",
    patronSaint: "Nuestra Señora de Salvacion",
    dateSource: "lgu-quezon-city-brgy-directory",
  },
  {
    date: "3rd Sunday of January",
    barangay: "Sto. Niño",
    municipality: "Pinamalayan",
    patronSaint: "Sto. Niño",
    dateSource: "lgu-pinamalayan-brgy-sto-nino",
  },
  {
    date: "Last Saturday of February",
    barangay: "La Paz",
    municipality: "City Of Zamboanga",
    patronSaint: "Barangay La Paz",
    dateSource: "zamboanga-com-community-guide",
  },
];
