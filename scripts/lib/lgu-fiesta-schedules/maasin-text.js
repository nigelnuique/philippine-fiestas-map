/** Barangay name aliases for Maasin City LGU directory (uppercase source labels). */
export const MAASIN_DIRECTORY_BARANGAY_ALIASES = {
  abgao: "Abgao (Pob.)",
  mambajao: "Mambajao (Pob.)",
  mantahan: "Mantahan (Pob.)",
  tagnipa: "Tagnipa (Pob.)",
  "tunga tunga": "Tunga-Tunga (Pob.)",
  "bactul i": "Bactul I",
  "bactul ii": "Bactul Ii",
  "bato i": "Bato I",
  "bato ii": "Bato Ii",
  "canyu om": "Canyuom",
  "hinapu daku": "Hinapu Daku",
  "hinapu gamay": "Hinapu Gamay",
  "lib og": "Lib-Og",
  "matin ao": "Matin-Ao",
  "malapoc norte": "Malapoc Norte",
  "malapoc sur": "Malapoc Sur",
  "maria clara": "Maria Clara",
  "nonok norte": "Nonok Norte",
  "nonok sur": "Nonok Sur",
  "panan awan": "Panan-Awan",
  "santa cruz": "Santa Cruz",
  "santa rosa": "Santa Rosa",
  "santo nino": "Santo NiñO",
  "santo rosario": "Santo Rosario",
  "san agustin": "San Agustin",
  "san isidro": "San Isidro",
  "san jose": "San Jose",
  "san rafael": "San Rafael",
  "soro soro": "Soro-Soro",
  "tam is": "Tam-Is",
  "tomoy tomoy": "Tomoy-Tomoy",
  pinaskohan: "Pinascohan",
  pinascohan: "Pinascohan",
};

export function normalizeMaasinDirectoryBarangay(raw) {
  const key = String(raw ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (MAASIN_DIRECTORY_BARANGAY_ALIASES[key]) return MAASIN_DIRECTORY_BARANGAY_ALIASES[key];
  return String(raw ?? "")
    .trim()
    .split(/\s+/)
    .map((w) => {
      if (/^i+$/i.test(w)) return w.toUpperCase();
      if (/^(de|del|la|san|santa|santo|sto)$/i.test(w)) {
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      }
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ")
    .replace(/\bIi\b/g, "II")
    .replace(/\bIii\b/g, "III");
}
