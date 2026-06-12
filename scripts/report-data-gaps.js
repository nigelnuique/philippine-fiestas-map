/**
 * Summarizes dataset completeness: barangay dates, festival geocoding,
 * descriptions, date precision, and boundary coverage.
 * Run: npm run data:report-gaps
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
}

function pct(n, total) {
  if (!total) return "0.0%";
  return `${((n / total) * 100).toFixed(1)}%`;
}

function bar(label, filled, total, width = 28) {
  const ratio = total ? filled / total : 0;
  const n = Math.round(ratio * width);
  return `${label.padEnd(22)} ${String(filled).padStart(6)} / ${String(total).padStart(6)}  ${pct(filled, total).padStart(6)}  ${"█".repeat(n)}${"░".repeat(width - n)}`;
}

function main() {
  const raw = readJson("data/processed/festivals/barangay-fiestas-raw.json");
  const bgyIndex = readJson("data/processed/festivals/barangay-fiestas.json");
  const festivals = readJson("data/processed/festivals/festivals.json");

  const noDate = raw.festivals.filter((f) => !f.month || !f.dayStart);
  const byProv = {};
  for (const f of noDate) {
    const p = f.province ?? "?";
    byProv[p] = (byProv[p] ?? 0) + 1;
  }

  const list = festivals.festivals;
  const withDesc = list.filter((f) => f.description && f.description.length >= 40);
  const monthInferred = festivals.stats.datesMonthInferred ?? 0;
  const structuredDates = Math.max(0, list.length - monthInferred);
  const nationalOrRegion = list.filter(
    (f) =>
      !f.location?.psgc &&
      !f.location?.provincePsgc &&
      (f.location?.matchMethod === "national" || f.location?.regionPsgc)
  );
  const trueGeocodeGaps = list.filter(
    (f) =>
      !f.location?.psgc &&
      !f.location?.provincePsgc &&
      f.location?.matchMethod !== "national" &&
      !f.location?.regionPsgc
  );
  const mediumWithPsgc = list.filter(
    (f) => f.location?.psgc && f.location?.confidence !== "high"
  );

  const dateSources = {};
  for (const f of raw.festivals) {
    if (f.month && f.dayStart && f.dateSource) {
      dateSources[f.dateSource] = (dateSources[f.dateSource] ?? 0) + 1;
    }
  }

  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Philippine Fiestas Map — Data Completeness");
  console.log("═══════════════════════════════════════════════════════════\n");

  console.log("OVERVIEW");
  console.log(bar("Named festivals", list.length, list.length));
  console.log(bar("Barangay fiestas", bgyIndex.stats.total, bgyIndex.stats.total));
  console.log(
    bar(
      "Combined records",
      list.length + bgyIndex.stats.total,
      list.length + bgyIndex.stats.total
    )
  );
  console.log("");

  console.log("BARANGAY FEAST DATES  (largest gap)");
  console.log(bar("With month + day", bgyIndex.stats.withDates, bgyIndex.stats.total));
  console.log(
    `  Municipalities covered: ${bgyIndex.stats.municipalitiesWithBarangays} with barangay records`
  );
  console.log("  Top date sources:");
  for (const [src, count] of Object.entries(dateSources)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)) {
    console.log(`    ${String(count).padStart(5)}  ${src}`);
  }
  console.log("  Provinces with most missing dates:");
  for (const [prov, count] of Object.entries(byProv)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)) {
    console.log(`    ${count.toString().padStart(5)}  ${prov}`);
  }
  console.log("");

  console.log("NAMED FESTIVAL GEOCODING");
  console.log(bar("Municipality PSGC", festivals.stats.matchedMunicipality, list.length));
  console.log(bar("High confidence", festivals.stats.highConfidence, list.length));
  console.log(
    bar(
      "Nationwide / regionwide",
      nationalOrRegion.length,
      list.length
    )
  );
  console.log(bar("Province-only", festivals.stats.matchedProvinceOnly, list.length));
  if (trueGeocodeGaps.length) {
    console.log(`  Unresolved geocoding: ${trueGeocodeGaps.length}`);
    for (const f of trueGeocodeGaps.slice(0, 6)) {
      console.log(`    - ${f.name}`);
    }
  }
  if (mediumWithPsgc.length) {
    console.log(`  Medium confidence (has PSGC): ${mediumWithPsgc.length}`);
  }
  if (nationalOrRegion.length) {
    console.log("  Intentionally unplaced (national / region):");
    for (const f of nationalOrRegion.slice(0, 8)) {
      const scope =
        f.location?.matchMethod === "national"
          ? "national"
          : `region ${f.location?.regionPsgc}`;
      console.log(`    - ${f.name} (${scope})`);
    }
  }
  console.log("");

  console.log("NAMED FESTIVAL DATES");
  console.log(bar("Any day on calendar", festivals.stats.withDayStart, list.length));
  console.log(bar("Structured (not month-only)", structuredDates, list.length));
  console.log(bar("Month-inferred only", monthInferred, list.length));
  console.log("");

  console.log("NAMED FESTIVAL DESCRIPTIONS");
  console.log(bar("≥40 characters", withDesc.length, list.length));
  console.log(
    `  From enrichment cache: ${festivals.stats.descriptionsFromCache ?? 0}`
  );
  console.log("");

  console.log("BOUNDARY COVERAGE");
  console.log("  Run: npm run data:analyze-missing-barangays");
  console.log("  (Last check: 0 HUC cities missing barangay GeoJSON files)");
  console.log("");

  console.log("PRIORITY ACTIONS");
  const bgyGap = bgyIndex.stats.total - bgyIndex.stats.withDates;
  console.log(
    `  1. Barangay dates — ${bgyGap.toLocaleString()} still missing; add LGU/parish schedules for dense provinces (Iloilo, Leyte, NCR).`
  );
  console.log(
    `  2. Festival descriptions — ${(list.length - withDesc.length).toLocaleString()} need text; expand major-festival-descriptions.js or run data:enrich-descriptions.`
  );
  console.log(
    `  3. Festival date precision — ${monthInferred.toLocaleString()} have month-only dates; run data:enrich-dates.`
  );
  console.log(
    "  4. Wikipedia barangay pass — RETRY_FAILED=1 LIMIT=500 npm run data:enrich-barangay-dates"
  );
}

main();
