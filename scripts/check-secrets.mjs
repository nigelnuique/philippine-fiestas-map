/**
 * Scan tracked files and dist/ for accidental secrets or private keys.
 *
 * Usage: npm run check:secrets
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const TRACKED_DENY_EXT = /\.(pem|key|p12|pfx|crt|cer|keystore|env)$/i;
const TRACKED_DENY_NAME = /^(id_rsa|id_ed25519|credentials\.json|secrets\.json)$/i;

const CONTENT_PATTERNS = [
  { name: "PEM private key", re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "GitHub token", re: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/ },
  { name: "GitHub fine-grained PAT", re: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
  { name: "AWS access key", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "OpenAI-style key", re: /\bsk-[A-Za-z0-9]{20,}\b/ },
];

const PUBLIC_DENY_SUFFIXES = [
  "/raw-festivals.json",
  "/barangay-fiestas-raw.json",
  "-cache.json",
  "/harvest-logs/",
  "/official-barangay-fiesta-",
];

function listTrackedFiles() {
  const out = execSync("git ls-files -z", { cwd: ROOT });
  return out.toString("utf8").split("\0").filter(Boolean);
}

function scanFile(absPath, relPath) {
  const findings = [];
  const base = path.basename(relPath);

  if (TRACKED_DENY_EXT.test(relPath) && !relPath.endsWith(".env.example") && relPath !== ".env.production") {
    findings.push("blocked filename pattern");
  }
  if (TRACKED_DENY_NAME.test(base)) {
    findings.push("blocked credential filename");
  }

  if (!fs.existsSync(absPath) || fs.statSync(absPath).size > 2_000_000) return findings;

  let text;
  try {
    text = fs.readFileSync(absPath, "utf8");
  } catch {
    return findings;
  }

  if (text.includes("\0")) return findings;

  for (const { name, re } of CONTENT_PATTERNS) {
    if (re.test(text)) findings.push(name);
  }

  return findings;
}

function walkFiles(dir, prefix = "") {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(abs, rel));
    else files.push({ rel: rel.replace(/\\/g, "/"), abs });
  }
  return files;
}

let failed = false;

console.log("Secret / credential scan\n");

for (const rel of listTrackedFiles()) {
  const abs = path.join(ROOT, rel);
  const hits = scanFile(abs, rel);
  if (hits.length) {
    failed = true;
    console.error(`✗ ${rel}: ${hits.join(", ")}`);
  }
}

if (!failed) console.log("✓ No secrets in tracked git files");

const distData = path.join(ROOT, "dist", "data", "processed");
const publicLeaks = walkFiles(distData).filter(({ rel }) =>
  PUBLIC_DENY_SUFFIXES.some((suffix) => rel.includes(suffix.replace(/^\//, "")))
);

if (publicLeaks.length) {
  failed = true;
  console.error("\n✗ Internal pipeline files exposed in dist/data/processed:");
  for (const { rel } of publicLeaks) console.error(`  - ${rel}`);
} else if (fs.existsSync(distData)) {
  console.log("✓ dist/data/processed contains only public datasets");
}

const distRootFiles = ["dist/.env", "dist/.env.production"];
for (const rel of distRootFiles) {
  if (fs.existsSync(path.join(ROOT, rel))) {
    failed = true;
    console.error(`✗ ${rel} must not be published`);
  }
}

if (failed) process.exit(1);
console.log("\nSecurity checks passed.");
