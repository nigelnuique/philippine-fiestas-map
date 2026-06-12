/**
 * Normalizes PSGC administrative data from xemasiv/psgc2 into a flat lookup index.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const RAW = path.join(ROOT, "data", "raw", "psgc2");
const OUT = path.join(ROOT, "data", "processed", "psgc");

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[()]/g, "")
    .trim();
}

function regionSlug(name) {
  const m = name.match(/REGION\s+([IVXLC\d-A]+)/i);
  if (m) return m[1].replace(/\s+/g, "");
  if (/NCR|NATIONAL CAPITAL/i.test(name)) return "NCR";
  if (/CAR|CORDILLERA/i.test(name)) return "CAR";
  if (/MIMAROPA/i.test(name)) return "MIMAROPA";
  if (/BARMM|ARMM|MUSLIM MINDANAO/i.test(name)) return "BARMM";
  if (/Caraga/i.test(name)) return "XIII";
  return normalizeName(name);
}

function main() {
  if (!fs.existsSync(RAW)) {
    console.error(
      "Missing PSGC source. Run: git clone https://github.com/xemasiv/psgc2.git data/raw/psgc2"
    );
    process.exit(1);
  }

  fs.mkdirSync(OUT, { recursive: true });

  const regions = JSON.parse(
    fs.readFileSync(path.join(RAW, "regions.json"), "utf8")
  );
  const provinces = JSON.parse(
    fs.readFileSync(path.join(RAW, "provinces.json"), "utf8")
  );
  const cities = JSON.parse(
    fs.readFileSync(path.join(RAW, "cities.json"), "utf8")
  );
  const municipalities = JSON.parse(
    fs.readFileSync(path.join(RAW, "municipalities.json"), "utf8")
  );

  const regionIndex = regions.map((r, i) => ({
    id: i + 1,
    name: r.name,
    slug: regionSlug(r.name),
    normalizedName: normalizeName(r.name),
  }));

  const provinceIndex = provinces.map((p) => ({
    name: p.name,
    normalizedName: normalizeName(p.name),
    region: p.region,
    population: p.population ?? null,
    notes: p.notes ?? null,
  }));

  const lguIndex = [
    ...cities.map((c) => ({
      name: c.name,
      normalizedName: normalizeName(c.name),
      type: "city",
      cityClass: c.cityClass ?? null,
      province: c.province ?? null,
      region: c.region,
      population: c.population ?? null,
    })),
    ...municipalities.map((m) => ({
      name: m.name,
      normalizedName: normalizeName(m.name),
      type: "municipality",
      province: m.province,
      region: m.region,
      population: m.population ?? null,
    })),
  ];

  const output = {
    generatedAt: new Date().toISOString(),
    source: "xemasiv/psgc2 (PSA PSGC 2018.3.31)",
    note: "PSGC codes for join with GeoJSON come from philippines-json-maps adm*_psgc fields",
    counts: {
      regions: regionIndex.length,
      provinces: provinceIndex.length,
      cities: cities.length,
      municipalities: municipalities.length,
      totalLgu: lguIndex.length,
    },
    regions: regionIndex,
    provinces: provinceIndex,
    lgu: lguIndex,
  };

  const outFile = path.join(OUT, "admin-index.json");
  fs.writeFileSync(outFile, JSON.stringify(output, null, 2));

  console.log(`PSGC index written to ${path.relative(ROOT, outFile)}`);
  console.log(`  Regions: ${output.counts.regions}`);
  console.log(`  Provinces: ${output.counts.provinces}`);
  console.log(`  Cities: ${output.counts.cities}`);
  console.log(`  Municipalities: ${output.counts.municipalities}`);
}

main();
