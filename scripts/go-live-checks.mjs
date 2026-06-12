/**
 * Pre-deploy checklist: assets, production build, and smoke test.
 *
 * Usage:
 *   npm run check:go-live
 *   PREVIEW_URL=http://127.0.0.1:4173/ npm run check:go-live -- --skip-build
 */
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const args = new Set(process.argv.slice(2));
const skipBuild = args.has("--skip-build");
const previewUrl = process.env.PREVIEW_URL ?? "http://127.0.0.1:4173/";

const results = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

function warn(name, detail = "") {
  results.push({ name, ok: true, warn: true, detail });
  console.warn(`⚠ ${name}${detail ? ` — ${detail}` : ""}`);
}

function run(cmd, cmdArgs, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, cmdArgs, {
      cwd: ROOT,
      stdio: "inherit",
      shell: true,
      ...opts,
    });
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

function fileOk(rel, { minBytes = 1 } = {}) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) return { ok: false, detail: "missing" };
  const size = fs.statSync(p).size;
  if (size < minBytes) return { ok: false, detail: `too small (${size} B)` };
  return { ok: true, detail: `${(size / 1024).toFixed(0)} KB` };
}

async function checkStaticAssets() {
  const required = [
    "public/data/processed/boundaries/manifest.json",
    "public/data/processed/festivals/festivals.json",
    "public/data/processed/festivals/barangay-fiestas.json",
    "public/geojson/country/lowres/country.0.001.json",
    "public/favicon.svg",
  ];
  let ok = true;
  for (const f of required) {
    const r = fileOk(f, { minBytes: 100 });
    if (r.ok) pass(`asset ${path.basename(f)}`, r.detail);
    else {
      fail(`asset ${f}`, r.detail);
      ok = false;
    }
  }
  if (!fs.existsSync(path.join(ROOT, "data/raw/philippines-json-maps"))) {
    warn(
      "data/raw/philippines-json-maps",
      "not cloned — CI/deploy must run map:sync before build"
    );
  }
  return ok;
}

async function checkBuild() {
  if (skipBuild) {
    warn("production build", "skipped (--skip-build)");
    return fs.existsSync(path.join(ROOT, "dist/index.html"));
  }
  try {
    await run("npm", ["run", "build"]);
    pass("production build");
    return true;
  } catch (err) {
    fail("production build", err.message);
    return false;
  }
}

async function checkDistOutput() {
  let ok = true;
  for (const f of ["dist/index.html", "dist/favicon.svg", "dist/geojson/country/lowres/country.0.001.json"]) {
    const r = fileOk(f);
    if (r.ok) pass(`dist ${f}`, r.detail);
    else {
      fail(`dist ${f}`, r.detail);
      ok = false;
    }
  }

  const assetsDir = path.join(ROOT, "dist/assets");
  if (fs.existsSync(assetsDir)) {
    const js = fs.readdirSync(assetsDir).find((f) => f.endsWith(".js"));
    if (js) {
      const kb = fs.statSync(path.join(assetsDir, js)).size / 1024;
      if (kb > 800) {
        warn("JS bundle size", `${kb.toFixed(0)} KB — consider code-splitting MapLibre`);
      } else {
        pass("JS bundle size", `${kb.toFixed(0)} KB`);
      }
    }
  }
  return ok;
}

async function checkPreviewSmoke(url) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  try {
    const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    if (!res?.ok()) {
      fail("preview HTTP", `${url} → ${res?.status()}`);
      return false;
    }
    pass("preview HTTP", `${res.status()} ${url}`);

    await page.waitForSelector(".map-container canvas", { timeout: 20000 });
    pass("map canvas renders");

    await page.waitForSelector("h1", { timeout: 5000 });
    const h1 = await page.locator("h1").innerText();
    if (!/philippine fiestas/i.test(h1)) {
      fail("sidebar title", h1);
    } else {
      pass("sidebar title", h1);
    }

    const manifestRes = await page.evaluate(async () => {
      const r = await fetch("/data/processed/boundaries/manifest.json");
      return { ok: r.ok, type: r.headers.get("content-type") };
    });
    if (manifestRes.ok) pass("manifest.json fetch");
    else fail("manifest.json fetch", JSON.stringify(manifestRes));

    const geoRes = await page.evaluate(async () => {
      const r = await fetch("/geojson/country/lowres/country.0.001.json");
      return r.ok;
    });
    if (geoRes) pass("country GeoJSON fetch");
    else fail("country GeoJSON fetch");

    const desc = await page.locator('meta[name="description"]').getAttribute("content");
    if (desc?.length > 20) pass("meta description");
    else fail("meta description", "missing or too short");

    const icon = await page.locator('link[rel="icon"]').count();
    if (icon > 0) pass("favicon link");
    else fail("favicon link");

    if (errors.length) {
      warn("browser console errors", errors.slice(0, 3).join(" | "));
    } else {
      pass("no browser console errors");
    }

    return errors.length === 0;
  } catch (err) {
    fail("preview smoke test", err.message);
    return false;
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log("Philippine Fiestas Map — go-live checks\n");

  const assetsOk = await checkStaticAssets();
  const buildOk = await checkBuild();
  const distOk = buildOk ? await checkDistOutput() : false;

  let smokeOk = false;
  if (buildOk) {
    console.log(`\nSmoke test: ${previewUrl}`);
    console.log("(Start preview with: npm run preview)\n");
    smokeOk = await checkPreviewSmoke(previewUrl);
  }

  const failed = results.filter((r) => !r.ok);
  const warned = results.filter((r) => r.warn);

  console.log("\n--- Summary ---");
  console.log(`Passed: ${results.filter((r) => r.ok && !r.warn).length}`);
  console.log(`Warnings: ${warned.length}`);
  console.log(`Failed: ${failed.length}`);

  if (failed.length) {
    console.log("\nFailed checks:");
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
    process.exit(1);
  }

  if (!assetsOk || !smokeOk) {
    process.exit(1);
  }

  console.log("\nGo-live checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
