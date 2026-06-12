/**
 * Quick audit: municipalities with missing barangay fiesta dates.
 * Run: node scripts/audit-missing-dates.js
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const raw = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data/processed/festivals/barangay-fiestas-raw.json"), "utf8")
);

const byMuni = {};
for (const f of raw.festivals) {
  const key = `${f.province}::${f.municipality}`;
  if (!byMuni[key]) byMuni[key] = { province: f.province, municipality: f.municipality, total: 0, missing: [] };
  byMuni[key].total++;
  if (!f.month || !f.dayStart) {
    byMuni[key].missing.push(f.locationText?.split(",")[0]?.trim() ?? f.name);
  }
}

const ranked = Object.values(byMuni)
  .filter((m) => m.missing.length > 0)
  .sort((a, b) => b.missing.length - a.missing.length);

console.log(`Total missing dates: ${ranked.reduce((n, m) => n + m.missing.length, 0)}`);
console.log("\nTop municipalities:");
for (const m of ranked.slice(0, 15)) {
  console.log(`  ${m.missing.length}/${m.total}  ${m.municipality}, ${m.province}`);
}

const target = process.argv[2];
if (target) {
  const needle = target.toLowerCase();
  const m = Object.values(byMuni).find((x) =>
    x.municipality.toLowerCase().includes(needle)
  );
  if (!m) {
    console.log(`\nNo municipality matching "${target}".`);
  } else if (m.missing.length === 0) {
    console.log(`\n${m.municipality}, ${m.province}: all ${m.total} barangays have dates.`);
  } else {
    console.log(`\nMissing in ${m.municipality}, ${m.province}:`);
    for (const name of m.missing) console.log(`  - ${name}`);
  }
}
