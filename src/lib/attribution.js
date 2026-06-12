/** Project repository link for the sidebar footer. */
export const PROJECT_REPO = {
  label: "GitHub",
  url: "https://github.com/nigelnuique/philippine-fiestas-map",
};



/**

 * Full provenance for the footer — single source of truth.

 * Mirrors docs/data-sources.md — update both when sources change.

 *

 * @typedef {'map' | 'fiesta'} SourceCategory

 * @typedef {{ label: string, shortLabel?: string, url?: string, license?: string, note?: string, primary?: boolean }} DataSource

 * @typedef {{ title: string, category: SourceCategory, sources: DataSource[] }} DataSourceGroup

 */



/** @type {DataSourceGroup[]} */

export const DATA_SOURCE_GROUPS = [

  {

    title: "Map boundaries",

    category: "map",

    sources: [

      {

        label: "philippines-json-maps",

        shortLabel: "Boundaries",

        url: "https://github.com/faeldon/philippines-json-maps",

        license: "MIT",

        note: "Province, municipality, and barangay polygons (PSGC Dec 2023)",

        primary: true,

      },

      {

        label: "geoBoundaries PHL ADM3",

        shortLabel: "geoBoundaries",

        url: "https://www.geoboundaries.org/",

        license: "CC-BY 4.0",

        note: "Highly urbanized city (HUC) polygons missing from province files",

        primary: true,

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

    category: "map",

    sources: [

      {

        label: "psgc2 (Philippine Statistics Authority)",

        shortLabel: "PSGC",

        url: "https://github.com/xemasiv/psgc2",

        license: "CC-BY 4.0",

        note: "Region, province, municipality, and barangay names and PSGC codes",

        primary: true,

      },

    ],

  },

  {

    title: "Named festivals",

    category: "fiesta",

    sources: [

      {

        label: "Tourism Promotions Board calendar",

        shortLabel: "TPB / DOT",

        url: "https://tpb.gov.ph/tpb-calendar-of-promotions-and-marketing-activities/calendar-of-philippine-festivals-and-monthly-observances-theme/",

        note: "DOT/TPB festival listings",

        primary: true,

      },

      {

        label: "Wikipedia — List of festivals in the Philippines",

        shortLabel: "Wikipedia",

        url: "https://en.wikipedia.org/wiki/List_of_festivals_in_the_Philippines",

        license: "CC-BY-SA 4.0",

        primary: true,

      },

      {

        label: "Curated seed list",

        note: "Major national and regional festivals (project-maintained)",

      },

    ],

  },

  {

    title: "Barangay patron fiestas",

    category: "fiesta",

    sources: [

      {

        label: "PSGC barangay hierarchy",

        shortLabel: "PSGC",

        url: "https://github.com/xemasiv/psgc2",

        license: "CC-BY 4.0",

        note: "One patronal fiesta record per barangay (names and locations)",

        primary: true,

      },

      {

        label: "LGU fiesta schedules (Siargao Islands)",

        shortLabel: "LGU schedules",

        url: "https://www.siargaoislands.net/p/fiesta.html",

        note: "Surigao del Norte barangay fiesta directory",

        primary: true,

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

        label: "City of Bayawan LGU",

        url: "https://www.bayawancity.gov.ph/experiences/tourism-display.php?id=7-barangay-festivals",

        note: "Negros Oriental barangay fiesta calendar",

      },

      {

        label: "General Mariano Alvarez, Cavite LGU",

        url: "https://genmarianoalvarez.gov.ph/barangay-feast/",

        note: "Barangay feast schedule on official city site",

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



/** @param {SourceCategory} category */

function getPrimarySources(category) {

  return DATA_SOURCE_GROUPS.filter((group) => group.category === category)

    .flatMap((group) => group.sources.filter((source) => source.primary))

    .map(({ label, shortLabel, url }) => ({

      label: shortLabel ?? label,

      url,

    }));

}



/** Shown inline in the sidebar footer — map layers (derived from DATA_SOURCE_GROUPS). */

export const PRIMARY_DATA_SOURCES = getPrimarySources("map");



/** Shown inline in the sidebar footer — festival & fiesta data (derived). */

export const PRIMARY_FIESTA_DATA_SOURCES = getPrimarySources("fiesta");



/** @param {SourceCategory} category */

function summarizeCategory(category) {

  return DATA_SOURCE_GROUPS.filter((group) => group.category === category)

    .flatMap((group) => group.sources.map((source) => source.label))

    .join(", ");

}



/** Legal disclaimer copy — derived from DATA_SOURCE_GROUPS so sources stay in sync. */

export const ATTRIBUTION_DISCLAIMER_PARAGRAPHS = [

  `Map boundaries and place names come from ${summarizeCategory("map")}.`,

  `Named festivals and barangay patron fiestas come from ${summarizeCategory("fiesta")}.`,

  'See “Data sources & references” below for links and licenses. If you redistribute derived data, you must comply with each upstream license.',

];

