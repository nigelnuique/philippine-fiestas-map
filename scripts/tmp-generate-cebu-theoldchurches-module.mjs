import fs from "fs";
import { spawnSync } from "child_process";

const out = spawnSync("node", ["scripts/tmp-harvest-theoldchurches-province.mjs", "cebu"], {
  encoding: "utf8",
  maxBuffer: 50 * 1024 * 1024,
});
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
    province: "Cebu",
    month: ${e.month},
    dayStart: ${e.dayStart},
    dateSource: ${JSON.stringify(ds)},
    note: ${JSON.stringify(`TheOldChurches ${e.title} — feast ${e.feast}; ${e.addr}`)},
  },`;
});

const file = `/**
 * Cebu municipalities — barangay feast days from TheOldChurches parish pages (1:1 PSGC).
 */
export const CEBU_THEOLDCHURCHES_ENTRIES = [
${lines.join("\n")}
];
`;

fs.writeFileSync("scripts/lib/lgu-fiesta-schedules/cebu-theoldchurches-text.js", file);
console.log("written", data.entries.length, "entries");
