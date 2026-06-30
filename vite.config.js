import { defineConfig, loadEnv } from "vite";

import react from "@vitejs/plugin-react";

import path from "path";

import { fileURLToPath } from "url";

import { seoFilesPlugin } from "./scripts/vite-seo-plugin.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function siteUrlHtmlPlugin(siteUrl) {
  return {
    name: "site-url-html",
    transformIndexHtml(html) {
      return html.replaceAll("__SITE_URL__", siteUrl);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base = env.VITE_BASE_PATH || process.env.VITE_BASE_PATH || "/";
  const siteUrl = (
    env.VITE_SITE_URL ||
    process.env.VITE_SITE_URL ||
    (base !== "/"
      ? `https://nigelnuique.github.io${base.replace(/\/$/, "")}`
      : "http://localhost:5173")
  ).replace(/\/$/, "");

  return {
    base,
    plugins: [react(), siteUrlHtmlPlugin(siteUrl), seoFilesPlugin(siteUrl)],
    server: {
      fs: {
        allow: [path.resolve(__dirname)],
      },
    },
  };
});
