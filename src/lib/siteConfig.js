/** Runtime site URL from build-injected meta tag (GitHub Pages, Netlify, etc.). */

let cachedSiteUrl = null;

export function getSiteUrl() {
  if (cachedSiteUrl) return cachedSiteUrl;

  const meta = document.querySelector('meta[name="application-url"]');
  const fromMeta = meta?.getAttribute("content")?.replace(/\/$/, "");
  if (fromMeta) {
    cachedSiteUrl = fromMeta;
    return cachedSiteUrl;
  }

  cachedSiteUrl = window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, "");
  return cachedSiteUrl;
}

export function getCanonicalUrl() {
  return `${getSiteUrl()}/`;
}
