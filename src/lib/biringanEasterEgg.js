/** Hidden sidebar easter egg — not a real PSGC location. */

export function isBiringanEasterEggQuery(query) {
  const normalized = String(query ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return normalized.includes("biringan");
}
