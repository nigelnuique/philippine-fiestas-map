/**
 * Generate a curated TheOldChurches module from harvest output.
 *
 * Usage:
 *   node scripts/tmp-generate-theoldchurches-module.mjs capiz Capiz CAPIZ_THEOLDCHURCHES_ENTRIES capiz-theoldchurches-text.js
 */
import fs from "fs";
import { spawnSync } from "child_process";

const [provinceSlug, provinceName, exportName, outFile] = process.argv.slice(2);
if (!provinceSlug || !provinceName || !exportName || !outFile) {
  console.error(
    "Usage: node scripts/tmp-generate-theoldchurches-module.mjs <slug> <Province Name> <EXPORT_CONST> <out-file.js>"
  );
  process.exit(1);
}

const out = spawnSync("node", ["scripts/tmp-harvest-theoldchurches-province.mjs", provinceSlug], {
  encoding: "utf8",
  maxBuffer: 50 * 1024 * 1024,
});
if (out.status !== 0) {
  console.error(out.stderr || out.stdout);
  process.exit(out.status ?? 1);
}

const data = JSON.parse(out.stdout);

function slug(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

const lines = data.entries.map((e) => {
  const ds = "theoldchurches-" + slug(`${e.barangay}-${e.municipality}`);
  return `  {
    barangay: ${JSON.stringify(e.barangay)},
    municipality: ${JSON.stringify(e.municipality)},
    province: ${JSON.stringify(provinceName)},
    month: ${e.month},
    dayStart: ${e.dayStart},
    dateSource: ${JSON.stringify(ds)},
    note: ${JSON.stringify(`TheOldChurches ${e.title} — feast ${e.feast}; ${e.addr}`)},
  },`;
});

const file = `/**
 * ${provinceName} municipalities — barangay feast days from TheOldChurches parish pages (1:1 PSGC).
 */
export const ${exportName} = [
${lines.join("\n")}
];
`;

const target = `scripts/lib/lgu-fiesta-schedules/${outFile}`;
fs.writeFileSync(target, file);
console.log(JSON.stringify({ province: provinceName, written: data.entries.length, target }, null, 2));
