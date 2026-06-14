const sitemaps = await Promise.all(
  ["post-sitemap.xml", "post-sitemap2.xml"].map((path) =>
    fetch(`https://www.theoldchurches.com/${path}`, {
      headers: { "User-Agent": "Mozilla/5.0 philippine-fiestas-map" },
    })
      .then((r) => r.text())
      .catch(() => "")
  )
);
const all = sitemaps.join("");
const counts = {};
for (const m of all.matchAll(/philippines\/([^/]+)\//g)) {
  counts[m[1]] = (counts[m[1]] || 0) + 1;
}
console.log(
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${v}\t${k}`)
    .join("\n")
);
