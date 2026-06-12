/**
 * Copies lowres GeoJSON into public/geojson for the map app (dev + production).
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

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirRecursive(s, d);
    else fs.copyFileSync(s, d);
  }
}

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

function main() {
  if (!fs.existsSync(SRC)) {
    console.error("Missing boundary source. Run: .\\scripts\\clone-sources.ps1");
    process.exit(1);
  }

  // Preserve lowres/ subpaths so URLs match manifest → geojsonUrl() output
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

  copyDirRecursive(PROCESSED_SRC, PROCESSED_DEST);

  console.log(
    `Synced GeoJSON to public/geojson/ (${regions} region, ${provdist} province, ${municities + hucBarangays} barangay files)`
  );
  console.log(`Synced processed data to public/data/processed/`);
}

main();
