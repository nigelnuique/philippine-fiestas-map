/**
 * Publish dist/ to the gh-pages branch (Windows-safe for large GeoJSON trees).
 *
 * Usage: npm run deploy:pages
 */
import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const REMOTE = "https://github.com/nigelnuique/philippine-fiestas-map.git";
const BRANCH = "gh-pages";

function run(cmd, cwd) {
  execSync(cmd, { cwd, stdio: "inherit", shell: true });
}

if (!fs.existsSync(DIST)) {
  console.error("dist/ not found — run npm run build first");
  process.exit(1);
}

const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "fiestas-gh-pages-"));
console.log(`Deploy workspace: ${workDir}`);

try {
  run(`git clone --depth 1 --branch ${BRANCH} ${REMOTE} repo`, workDir);
} catch {
  fs.mkdirSync(path.join(workDir, "repo"));
  run("git init", path.join(workDir, "repo"));
  run(`git remote add origin ${REMOTE}`, path.join(workDir, "repo"));
  run(`git checkout --orphan ${BRANCH}`, path.join(workDir, "repo"));
}

const repoDir = path.join(workDir, "repo");

for (const entry of fs.readdirSync(repoDir)) {
  if (entry === ".git") continue;
  fs.rmSync(path.join(repoDir, entry), { recursive: true, force: true });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const from = path.join(src, name);
    const to = path.join(dest, name);
    if (fs.statSync(from).isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

copyDir(DIST, repoDir);
fs.writeFileSync(path.join(repoDir, ".nojekyll"), "");

run("git add -A", repoDir);
run('git commit -m "Deploy Philippine Fiestas Map"', repoDir);
run(`git push origin HEAD:${BRANCH}`, repoDir);

console.log("\nPublished to GitHub Pages.");
