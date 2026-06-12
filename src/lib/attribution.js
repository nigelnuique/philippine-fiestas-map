/** Front-end creator attribution (edit here). */
export const CREATOR = {
  name: "Nigel Nuique",
  url: "https://github.com/nigelnuique",
};

/** Shown inline in the sidebar footer — map layers (keep short). */
export const PRIMARY_DATA_SOURCES = [
  {
    label: "Boundaries",
    url: "https://github.com/faeldon/philippines-json-maps",
  },
  {
    label: "PSGC",
    url: "https://github.com/xemasiv/psgc2",
  },
  {
    label: "geoBoundaries",
    url: "https://www.geoboundaries.org/",
  },
];

/** Shown inline in the sidebar footer — festival & fiesta data (keep short). */
export const PRIMARY_FIESTA_DATA_SOURCES = [
  {
    label: "TPB / DOT",
    url: "https://tpb.gov.ph/tpb-calendar-of-promotions-and-marketing-activities/calendar-of-philippine-festivals-and-monthly-observances-theme/",
  },
  {
    label: "Wikipedia",
    url: "https://en.wikipedia.org/wiki/List_of_festivals_in_the_Philippines",
  },
  {
    label: "PSGC",
    url: "https://github.com/xemasiv/psgc2",
  },
  {
    label: "LGU schedules",
    url: "https://www.siargaoislands.net/p/fiesta.html",
  },
];

/** @deprecated Use PRIMARY_DATA_SOURCES */
export const DATA_SOURCES = PRIMARY_DATA_SOURCES;

/**
 * Full provenance for the expandable footer panel.
 * Mirrors docs/data-sources.md — update both when sources change.
 */
export const DATA_SOURCE_GROUPS = [
  {
    title: "Map boundaries",
    sources: [
      {
        label: "philippines-json-maps",
        url: "https://github.com/faeldon/philippines-json-maps",
        license: "MIT",
        note: "Province, municipality, and barangay polygons (PSGC Dec 2023)",
      },
      {
        label: "geoBoundaries PHL ADM3",
        url: "https://www.geoboundaries.org/",
        license: "CC-BY 4.0",
        note: "Highly urbanized city (HUC) polygons missing from province files",
      },
      {
        label: "altcoder PSGC shapefiles",
        url: "https://github.com/altcoder/philippines-psgc-shapefiles",
        license: "Upstream PSA/OCHA",
        note: "HUC barangay patches (e.g. Mandaue City)",
      },
    ],
  },
  {
    title: "Administrative codes",
    sources: [
      {
        label: "psgc2 (Philippine Statistics Authority)",
        url: "https://github.com/xemasiv/psgc2",
        license: "CC-BY 4.0",
        note: "Region, province, municipality, and barangay names and PSGC codes",
      },
    ],
  },
  {
    title: "Named festivals",
    sources: [
      {
        label: "Tourism Promotions Board calendar",
        url: "https://tpb.gov.ph/tpb-calendar-of-promotions-and-marketing-activities/calendar-of-philippine-festivals-and-monthly-observances-theme/",
        note: "DOT/TPB festival listings",
      },
      {
        label: "Wikipedia — List of festivals in the Philippines",
        url: "https://en.wikipedia.org/wiki/List_of_festivals_in_the_Philippines",
        license: "CC-BY-SA 4.0",
      },
      {
        label: "Curated seed list",
        note: "Major national and regional festivals (project-maintained)",
      },
    ],
  },
  {
    title: "Barangay patron fiestas",
    sources: [
      {
        label: "PSGC barangay hierarchy",
        url: "https://github.com/xemasiv/psgc2",
        license: "CC-BY 4.0",
        note: "One patronal fiesta record per barangay (names and locations)",
      },
      {
        label: "LGU fiesta schedules (Siargao Islands)",
        url: "https://www.siargaoislands.net/p/fiesta.html",
        note: "Surigao del Norte barangay fiesta directory",
      },
      {
        label: "Biliran Island fiesta calendars",
        url: "https://www.biliranisland.com/festivals/",
        note: "April/May barangay schedules (biliranisland.com, latagaw.com)",
      },
      {
        label: "Dagupan City LGU calendar",
        url: "https://www.dagupan.gov.ph/the-city/calendar-of-activities/",
        note: "Barangay fiesta table on official city site",
      },
      {
        label: "Siquijor Fiestas guide",
        url: "https://siquijor-secrets.com/siquijor-fiestas/",
        note: "Province-wide barangay fiesta calendar",
      },
      {
        label: "Magallanes, Sorsogon LGU",
        url: "https://magallanessorsogon.gov.ph",
        note: "Hand-curated barangay feast-day table",
      },
      {
        label: "Patron-saint feast calendar",
        note: "Inferred dates for saint-named barangays (approximate)",
      },
      {
        label: "Wikipedia search enrichment",
        url: "https://en.wikipedia.org/",
        license: "CC-BY-SA 4.0",
        note: "Optional batch lookup for barangay feast dates",
      },
    ],
  },
];

/** Map vs fiesta groupings for footer panels. */
export const MAP_DATA_SOURCE_GROUPS = DATA_SOURCE_GROUPS.filter(
  (g) => g.title === "Map boundaries" || g.title === "Administrative codes"
);

export const FIESTA_DATA_SOURCE_GROUPS = DATA_SOURCE_GROUPS.filter(
  (g) => g.title === "Named festivals" || g.title === "Barangay patron fiestas"
);
