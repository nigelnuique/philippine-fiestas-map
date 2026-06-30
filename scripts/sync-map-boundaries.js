/**
 * Copies lowres GeoJSON and app-facing JSON into public/ (dev + production).
 * Only whitelisted datasets are published — pipeline caches and raw sources stay out of dist/.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "data", "raw", "philippines-json-maps", "2023", "geojson");
const DEST = path.join(ROOT, "public", "geojson");
const PROCESSED_SRC = path.join(ROOT, "data", "processed");
const PROCESSED_DEST = path.join(ROOT, "public", "data", "processed");

/** JSON paths under data/processed/ served to the browser. */
const PUBLIC_PROCESSED_FILES = [
  "boundaries/manifest.json",
  "boundaries/municipalities-index.json",
  "boundaries/barangays-index.json",
  "boundaries/huc-cities.json",
  "boundaries/huc-by-province.json",
  "festivals/festivals.json",
  "festivals/barangay-fiestas.json",
];

function copyDir(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return 0;
  fs.mkdirSync(destDir, { recursive: true });
  let count = 0;
  for (const file of fs.readdirSync(srcDir)) {
    if (!file.endsWith(".json")) continue;
    fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
    count++;
  }
  return count;
}

function rmDirRecursive(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) rmDirRecursive(target);
    else fs.unlinkSync(target);
  }
  fs.rmdirSync(dir);
}

function syncPublicProcessed() {
  if (fs.existsSync(PROCESSED_DEST)) rmDirRecursive(PROCESSED_DEST);

  let copied = 0;
  for (const rel of PUBLIC_PROCESSED_FILES) {
    const src = path.join(PROCESSED_SRC, rel);
    if (!fs.existsSync(src)) continue;
    const dest = path.join(PROCESSED_DEST, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    copied++;
  }
  return copied;
}

function main() {
  if (!fs.existsSync(SRC)) {
    console.error("Missing boundary source. Run: .\\scripts\\clone-sources.ps1");
    process.exit(1);
  }

  const regions = copyDir(
    path.join(SRC, "regions", "lowres"),
    path.join(DEST, "regions", "lowres")
  );
  const provdist = copyDir(
    path.join(SRC, "provdists", "lowres"),
    path.join(DEST, "provdists", "lowres")
  );
  const municities = copyDir(
    path.join(SRC, "municities", "lowres"),
    path.join(DEST, "municities", "lowres")
  );
  const hucBarangays = copyDir(
    path.join(ROOT, "data", "processed", "boundaries", "huc-barangays"),
    path.join(DEST, "municities", "lowres")
  );
  fs.mkdirSync(path.join(DEST, "country", "lowres"), { recursive: true });
  fs.copyFileSync(
    path.join(SRC, "country", "lowres", "country.0.001.json"),
    path.join(DEST, "country", "lowres", "country.0.001.json")
  );

  const processed = syncPublicProcessed();

  console.log(
    `Synced GeoJSON to public/geojson/ (${regions} region, ${provdist} province, ${municities + hucBarangays} barangay files)`
  );
  console.log(`Synced ${processed} public dataset(s) to public/data/processed/`);
}

main();
