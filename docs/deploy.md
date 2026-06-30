# Deployment

The map app is a static Vite build (`dist/`). Every deploy must clone boundary GeoJSON into `data/raw/` and run `map:sync` (via `npm run build`).

## GitHub Pages (free, no extra accounts)

**Live URL (after setup):** https://nigelnuique.github.io/philippine-fiestas-map/

1. Push this repo to GitHub (public repo).
2. In the repo: **Settings → Pages → Build and deployment → Source** → choose **GitHub Actions**.
3. Push to `master` (or run **Actions → Build and deploy → Run workflow**).

The workflow in `.github/workflows/deploy.yml`:

- Clones `philippines-json-maps` and `psgc2`
- Runs `npm ci && npm run build` with `VITE_BASE_PATH=/philippine-fiestas-map/`
- Smoke-tests the preview build
- Publishes `dist/` to GitHub Pages

Pull requests run **build only** (no deploy).

## Netlify (free tier, custom subdomain)

1. Sign up at [netlify.com](https://www.netlify.com/) and **Add new site → Import an existing project**.
2. Connect `nigelnuique/philippine-fiestas-map`.
3. Netlify reads `netlify.toml` automatically:
   - **Build command:** `bash scripts/clone-sources.sh && npm run build`
   - **Publish directory:** `dist`
4. Deploy. Optional: **Domain settings → Add custom domain** (e.g. `fiestas.yourname.dev`).

No `VITE_BASE_PATH` override needed — Netlify serves from the site root.

## Cloudflare Pages (free, unlimited bandwidth)

Best if you expect heavier traffic or want Cloudflare CDN in front of ~77 MB of GeoJSON.

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages → Create → Pages → Connect to Git**.
2. Select this repository.
3. **Build settings:**
   - **Framework preset:** None
   - **Build command:** `bash scripts/clone-sources.sh && npm run build`
   - **Build output directory:** `dist`
   - **Environment variable:** `NODE_VERSION` = `22`
4. **Save and deploy**. Add a custom domain under **Custom domains** if desired.

## Local production check

```bash
bash scripts/clone-sources.sh
npm ci
npm run build
npm run preview
# another terminal:
npm run check:go-live -- --skip-build
```

## SEO / LLMO (search & AI discoverability)

Production builds emit `robots.txt`, `sitemap.xml`, `llms.txt`, and `llms-full.txt` with your canonical `VITE_SITE_URL`. `index.html` includes Open Graph tags, geo meta, FAQ JSON-LD, and a hidden crawlable summary for no-JS bots.

Set `VITE_SITE_URL` in `.env.production` (GitHub Pages) or your host's environment variables so social previews and AI summaries use the correct domain.

## Build size notes

- `dist/` is ~75–80 MB (mostly GeoJSON + `barangay-fiestas.json`).
- Enable gzip/brotli on your host (Netlify and Cloudflare do this by default).
- First visit loads ~1.2 MB JS (MapLibre) plus boundary JSON on drill-down.
