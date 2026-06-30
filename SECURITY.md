# Security

Philippine Fiestas Map is a **static client-side web app** hosted on GitHub Pages. There is no application server, database, or user account system.

## Reporting issues

If you believe you found a security problem (for example, exposed credentials, private keys, or internal files served from the public site), please open a private report via [GitHub Security Advisories](https://github.com/nigelnuique/philippine-fiestas-map/security/advisories/new) or a minimal public issue without posting exploit details.

## What we do not store

- No sign-in or user profiles
- No analytics cookies in the app
- No form submissions to a backend operated by this project

Map data loads from static JSON and GeoJSON files published with the site. Festival records may include source URLs pointing to third-party sites.

## Deployment hygiene

Before publishing:

```bash
npm run check:secrets
npm run check:go-live
npm run deploy:pages
```

`map:sync` copies only a whitelist of public datasets into `dist/` — pipeline caches, raw sources, and harvest logs must not be published.

## Scope

This project does not accept reports about:

- Incorrect fiesta dates or missing barangay records (data quality — use GitHub issues)
- Third-party site availability or content
- Social engineering against upstream data providers

Thank you for helping keep the project safe.
