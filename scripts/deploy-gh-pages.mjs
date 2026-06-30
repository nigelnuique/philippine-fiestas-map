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

const repoDir = path.join(workDir, "repo");
fs.mkdirSync(repoDir);
run("git init", repoDir);
run(`git remote add origin ${REMOTE}`, repoDir);
run(`git checkout --orphan ${BRANCH}`, repoDir);

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
run(`git push --force origin HEAD:${BRANCH}`, repoDir);

console.log("\nPublished to GitHub Pages.");
