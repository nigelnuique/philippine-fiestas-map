/**
 * Emit robots.txt, sitemap.xml, llms.txt, and llms-full.txt at build time.
 */
import fs from "fs";
import path from "path";
import {
  llmsFullTxt,
  llmsTxt,
  robotsTxt,
  sitemapXml,
} from "./lib/seo-content.js";

function trimSlash(url) {
  return String(url || "").replace(/\/$/, "");
}

export function seoFilesPlugin(explicitSiteUrl) {
  let siteUrl = trimSlash(explicitSiteUrl || "http://localhost:5173");

  return {
    name: "philippine-fiestas-seo-files",
    closeBundle() {
      const outDir = path.resolve(process.cwd(), "dist");
      const base = siteUrl;

      fs.writeFileSync(path.join(outDir, "robots.txt"), robotsTxt(base));
      fs.writeFileSync(path.join(outDir, "sitemap.xml"), sitemapXml(base));
      fs.writeFileSync(path.join(outDir, "llms.txt"), llmsTxt(base));
      fs.writeFileSync(path.join(outDir, "llms-full.txt"), llmsFullTxt(base));
    },
  };
}
