/** Prefix public asset paths with Vite base (GitHub Pages subpath deploy). */
export function staticUrl(path) {
  const base = import.meta.env.BASE_URL;
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return `${base}${normalized}`;
}
