/**
 * Legal / informational disclaimers shown in the app footer.
 * Edit here when scope or data practices change. Not legal advice.
 * Third-party attribution text is derived from src/lib/attribution.js.
 */
import { ATTRIBUTION_DISCLAIMER_PARAGRAPHS } from "./attribution.js";
export const DISCLAIMER_TAGLINE =
  "Unofficial cultural map — not affiliated with any government agency.";
/**
 * @typedef {{ title: string, paragraphs: string[] }} DisclaimerSection
 */
/** @type {DisclaimerSection[]} */
export const LEGAL_DISCLAIMER_SECTIONS = [

  {

    title: "Not an official source",
    paragraphs: [

      "This website is an independent project by the creator listed above. It is not published by, endorsed by, or affiliated with the Philippine Statistics Authority (PSA), Department of Tourism (DOT), Tourism Promotions Board (TPB), any local government unit (LGU), parish, or diocese.",
      "Do not treat information here as an official government record, travel advisory, or religious authority.",

    ],

  },
  {

    title: "Accuracy & completeness",
    paragraphs: [

      "Festival names, dates, locations, and barangay feast schedules are compiled from third-party and community sources and automated inference. Coverage is incomplete; many barangay fiestas have no date shown.",
      "Dates marked from patron-saint names or open web sources are approximate. Actual fiestas may fall on a different day, weekend, or year. Boundaries are simplified open data and may not match official cadastral or survey maps.",
      "Always confirm dates, venues, and schedules with the relevant LGU, parish, or organizer before making travel or business plans.",

    ],

  },
  {

    title: "No professional advice",
    paragraphs: [

      "Content is provided for general cultural and geographic interest only. It does not constitute legal, tourism, financial, medical, or religious advice.",

    ],

  },
  {

    title: "Third-party data & attribution",
    paragraphs: ATTRIBUTION_DISCLAIMER_PARAGRAPHS,

  },
  {

    title: "Limitation of liability",
    paragraphs: [

      "This site and its data are provided “as is” without warranties of any kind, express or implied, including accuracy, fitness for a particular purpose, or non-infringement.",
      "To the fullest extent permitted by applicable law, the creator and contributors are not liable for any loss, injury, inconvenience, or damages arising from use of or reliance on this site or its content.",

    ],

  },
  {

    title: "Trademarks & names",
    paragraphs: [

      "Festival, place, and organization names are used for identification and cultural reference. Trademarks and official marks belong to their respective owners; their use here does not imply endorsement of this project.",

    ],

  },

];
export const DISCLAIMER_FOOTNOTE =
  "By using this map you acknowledge that it is unofficial reference material and that you will verify important details with primary sources.";
