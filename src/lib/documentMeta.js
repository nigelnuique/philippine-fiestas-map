import { getCanonicalUrl, getSiteUrl } from "./siteConfig.js";

const DEFAULT_TITLE = "Philippine Fiestas Map — Festivals & Barangay Fiestas";
const DEFAULT_DESCRIPTION =
  "Explore ~1,000 Philippine festivals and ~42,000 barangay fiestas on an interactive map. Sinulog, Ati-Atihan, Dinagyang, and more. Unofficial — verify dates locally.";

const BREADCRUMB_ID = "breadcrumb-jsonld";

function setMetaContent(selector, content) {
  if (!content) return;
  const el = document.querySelector(selector);
  if (el) el.setAttribute("content", content);
}

function setLinkHref(selector, href) {
  if (!href) return;
  const el = document.querySelector(selector);
  if (el) el.setAttribute("href", href);
}

/**
 * @param {import("./mapUtils.js").Selection | null | undefined} selection
 */
function breadcrumbItems(selection) {
  const items = [{ name: "Philippines" }];
  if (!selection || selection.level === "country") return items;

  if (selection.regionName) items.push({ name: selection.regionName });
  if (selection.provinceName) items.push({ name: selection.provinceName });
  if (selection.municipalityName) items.push({ name: selection.municipalityName });
  if (selection.barangayName) items.push({ name: selection.barangayName });

  return items;
}

/**
 * @param {import("./mapUtils.js").Selection | null | undefined} selection
 */
function updateBreadcrumbJsonLd(selection) {
  const items = breadcrumbItems(selection);
  const siteUrl = getSiteUrl();
  const payload = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(index === 0 ? { item: `${siteUrl}/` } : {}),
    })),
  };

  let script = document.getElementById(BREADCRUMB_ID);
  if (!script) {
    script = document.createElement("script");
    script.id = BREADCRUMB_ID;
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(payload);
}

/**
 * @param {import("./mapUtils.js").Selection | null | undefined} selection
 */
export function updateDocumentMeta(selection) {
  const canonical = getCanonicalUrl();

  if (!selection || selection.level === "country") {
    document.title = DEFAULT_TITLE;
    setMetaContent('meta[name="description"]', DEFAULT_DESCRIPTION);
    setMetaContent('meta[property="og:title"]', DEFAULT_TITLE);
    setMetaContent('meta[property="og:description"]', DEFAULT_DESCRIPTION);
    setMetaContent('meta[name="twitter:title"]', DEFAULT_TITLE);
    setMetaContent('meta[name="twitter:description"]', DEFAULT_DESCRIPTION);
    setMetaContent('meta[property="og:url"]', canonical);
    setLinkHref('link[rel="canonical"]', canonical);
    updateBreadcrumbJsonLd(null);
    return;
  }

  const place =
    selection.barangayName ??
    selection.municipalityName ??
    selection.provinceName ??
    selection.regionName;

  if (!place) {
    document.title = DEFAULT_TITLE;
    return;
  }

  const levelLabel =
    selection.level === "barangay"
      ? "barangay fiestas"
      : selection.level === "municipality"
        ? "fiestas"
        : selection.level === "province"
          ? "provincial festivals"
          : "regional festivals";

  const title = `${place} ${levelLabel} | Philippine Fiestas Map`;
  const description = `Festivals and barangay fiestas in ${place}, Philippines. Browse dates and locations on the interactive Philippine Fiestas Map. Unofficial — verify with local sources.`;

  document.title = title;
  setMetaContent('meta[name="description"]', description);
  setMetaContent('meta[property="og:title"]', title);
  setMetaContent('meta[property="og:description"]', description);
  setMetaContent('meta[name="twitter:title"]', title);
  setMetaContent('meta[name="twitter:description"]', description);
  setMetaContent('meta[property="og:url"]', canonical);
  setLinkHref('link[rel="canonical"]', canonical);
  updateBreadcrumbJsonLd(selection);
}
