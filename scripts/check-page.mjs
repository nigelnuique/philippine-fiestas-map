import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:5173/";
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});

await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForSelector(".map-container canvas", { timeout: 20000 });

const text = await page.locator("body").innerText();
const hasTitle = await page.locator("h1").count();
const hasMap = await page.locator(".map-container").count();
const canvas = await page.locator(".map-container canvas").count();

console.log(JSON.stringify({ url, hasTitle, hasMap, canvas, textPreview: text.slice(0, 200), errors }, null, 2));
await browser.close();
