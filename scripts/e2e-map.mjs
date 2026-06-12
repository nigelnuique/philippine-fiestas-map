import { chromium } from "playwright";

const url = process.env.MAP_URL ?? "http://localhost:5177/";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const logs = [];
const net = [];
page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));
page.on("response", (r) => {
  if (r.url().includes("municities-provdist")) {
    net.push(`${r.status()} ${r.url()}`);
  }
});

await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
await page.waitForSelector(".map-container", { timeout: 15000 });
await page.waitForTimeout(5000);

const mapBox = await page.locator(".map-container").boundingBox();
if (!mapBox) throw new Error("no map container");

// Cebu area approximate
async function clickLngLat(page, mapBox, lng, lat, label) {
  const pt = await page.evaluate(
    ({ lng, lat }) => {
      const m = window.__fiestaMap;
      const p = m.project([lng, lat]);
      const rect = m.getContainer().getBoundingClientRect();
      return { x: rect.left + p.x, y: rect.top + p.y };
    },
    { lng, lat }
  );
  await page.mouse.click(pt.x, pt.y);
  await page.waitForTimeout(3000);
  const hint = await page.locator(".map-hint").textContent();
  const active = await page
    .locator(".map-legend-active")
    .textContent()
    .catch(() => null);
  const zoom = await page.evaluate(() => window.__fiestaMap?.getZoom?.());
  const hl = await page.evaluate(() => {
    const m = window.__fiestaMap;
    return m?.getFilter?.("highlight-fill");
  });
  const muniVis = await page.evaluate(() => {
    const m = window.__fiestaMap;
    return m?.getLayoutProperty?.("muni-line", "visibility");
  });
  const muniFeatures = await page.evaluate(() => {
    const m = window.__fiestaMap;
    const data = m?.getSource?.("municipalities")?._data;
    return data?.features?.length ?? -1;
  });
  console.log(`--- ${label} ---`);
  console.log("hint:", hint);
  console.log("legend:", active);
  console.log("zoom:", zoom);
  console.log("highlight filter:", JSON.stringify(hl));
  console.log("muni-line visibility:", muniVis);
  console.log("muni source features:", muniFeatures);
}

const clicks = [
  { lng: 123.9, lat: 10.35, label: "1-country-to-region" },
  { lng: 123.9, lat: 10.35, label: "2-region-to-province" },
  { lng: 123.88, lat: 10.32, label: "3-province-to-muni" },
];

let startZoom = await page.evaluate(() => window.__fiestaMap?.getZoom?.());
console.log("start zoom:", startZoom);

for (const c of clicks) {
  await clickLngLat(page, mapBox, c.lng, c.lat, c.label);
}

if (net.length) {
  console.log("--- muni fetches ---");
  net.forEach((l) => console.log(l));
}
if (logs.length) {
  console.log("--- console ---");
  logs.forEach((l) => console.log(l));
}

await browser.close();
