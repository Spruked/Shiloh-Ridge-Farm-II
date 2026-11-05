#!/usr/bin/env node
/**
 * Post-build SEO step (runs automatically after `npm run build`).
 *
 * For every public page this writes build/<route>/index.html: the normal app shell with that
 * page's own <title>, description, canonical URL, robots, Open Graph / Twitter tags and a small
 * block of real crawlable content inside #root (React replaces it as soon as the app loads).
 * Search engines and link-preview bots that do not run JavaScript therefore see unique pages.
 *
 * It also writes:
 *   - private.html        app shell, noindex      (admin / account / cart / checkout / mobile)
 *   - livestock-detail.html  app shell for /livestock/:id (title and canonical are set in the browser)
 *   - 404.html            app shell, noindex, served with a real 404 status
 *   - sitemap.xml         every public page, lastmod = build date
 *   - serve.json          clean URLs, rewrites, cache + security headers for `serve`
 *
 * Page copy comes from src/config/seoPages.json, shared with the in-browser SeoManager.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const buildDir = process.env.BUILD_PATH ? path.resolve(process.env.BUILD_PATH) : path.join(root, "build");
const cfg = require(path.join(root, "src", "config", "seoPages.json"));
const { site, pages } = cfg;

const indexPath = path.join(buildDir, "index.html");
if (!fs.existsSync(indexPath)) {
  console.error("seo-postbuild: build/index.html not found - run the build first.");
  process.exit(1);
}
const shell = fs.readFileSync(indexPath, "utf8");

const esc = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const absolute = (p) => `${site.publicUrl}${p === "/" ? "/" : p}`;
const ogImage = `${site.publicUrl}${site.ogImage}`;

const NAV = [
  ["/livestock", "Available livestock"],
  ["/products", "Farm products"],
  ["/katahdin", "Katahdin sheep information"],
  ["/about", "About Shiloh Ridge Farm"],
  ["/contact", "Contact the farm"],
  ["/blog", "Farm blog"],
];

function headBlock({ title, description, robots, canonical }) {
  const tags = [
    `<meta name="description" content="${esc(description)}">`,
    `<meta name="robots" content="${robots}">`,
  ];
  if (canonical) tags.push(`<link rel="canonical" href="${esc(canonical)}">`);
  tags.push(
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${esc(site.name)}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:image" content="${esc(ogImage)}">`,
    `<meta name="twitter:card" content="summary">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(description)}">`,
    `<meta name="twitter:image" content="${esc(ogImage)}">`,
  );
  if (canonical) tags.splice(3, 0, `<meta property="og:url" content="${esc(canonical)}">`);
  return tags.join("");
}

// Home page only: the hero photo is painted straight from the HTML, before any JavaScript runs.
// React replaces it with the identical hero as soon as the app loads, so nothing visibly changes.
const HERO_STATIC =
  '<div id="seo-hero" aria-hidden="true" style="min-height:calc(100vh - 4rem);background:#1b2a1b url(/hero-1280.webp) center/cover no-repeat;filter:brightness(.56)"></div>';

function staticBody(page) {
  const links = NAV.map(([href, label]) => `<a href="${href}">${esc(label)}</a>`).join(" ");
  return (
    `<main id="seo-static"><h1>${esc(page.h1)}</h1><p>${esc(page.description)}</p>` +
    `<nav aria-label="Primary farm pages">${links}</nav>` +
    `<p>${esc(site.farmName)}, 20705 Quebec Road, Maitland, MO 64466. ${esc(site.phone)}.</p></main>`
  );
}

function render({ title, description, robots, canonical, body, preload }) {
  let html = shell;
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);
  // remove the generic head tags that this page replaces
  html = html.replace(/<meta\s+name="description"[^>]*>/gi, "");
  html = html.replace(/<link\s+rel="canonical"[^>]*>/gi, "");
  html = html.replace(/<meta\s+name="robots"[^>]*>/gi, "");
  html = html.replace(/<\/head>/i, `${headBlock({ title, description, robots, canonical })}</head>`);
  if (body) html = html.replace(/<div id="root"><\/div>/i, `<div id="root">${body}</div>`);
  if (preload) html = html.replace(/<\/head>/i, `${preload}</head>`);
  return html;
}

const write = (relative, content) => {
  const target = path.join(buildDir, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
};

const INDEX_ROBOTS = "index, follow, max-image-preview:large";
const NOINDEX = "noindex, nofollow";

// ---- public pages -------------------------------------------------------------------------
for (const page of pages) {
  const html = render({
    title: page.title,
    description: page.description,
    robots: INDEX_ROBOTS,
    canonical: absolute(page.path),
    body: (page.path === "/" ? HERO_STATIC : "") + staticBody(page),
    // the home page's biggest visual is a CSS background image, which browsers discover late: preload it
    preload:
      page.path === "/"
        ? '<link rel="preload" as="image" href="/hero-1280.webp" type="image/webp" fetchpriority="high">'
        : "",
  });
  write(page.path === "/" ? "index.html" : `${page.path.slice(1)}/index.html`, html);
}

// ---- shells for dynamic / private / missing routes ------------------------------------------
write(
  "private.html",
  render({
    title: `${site.farmName}`,
    description: `Private area of the ${site.farmName} website.`,
    robots: NOINDEX,
  }),
);
write(
  "livestock-detail.html",
  render({
    title: `Livestock Details | ${site.name}`,
    description: `Details, lineage and inquiry options for this animal from ${site.farmName} in Maitland, Missouri.`,
    robots: INDEX_ROBOTS,
  }),
);
write(
  "404.html",
  render({
    title: `Page Not Found | ${site.name}`,
    description: `This page could not be found on the ${site.farmName} website.`,
    robots: NOINDEX,
  }),
);

// ---- sitemap ------------------------------------------------------------------------------
const today = new Date().toISOString().slice(0, 10);
const urls = pages
  .map(
    (page) =>
      `  <url>\n    <loc>${absolute(page.path)}</loc>\n    <lastmod>${today}</lastmod>\n` +
      `    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>`,
  )
  .join("\n");
write(
  "sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
);

// ---- serve.json: routing, caching and security headers -------------------------------------
const PRIVATE = ["/admin", "/admin/**", "/account", "/account/**", "/cart", "/checkout", "/checkout/**", "/mobile", "/login", "/signup", "/dashboard"];
const immutable = "public, max-age=31536000, immutable";
const security = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=()" },
];
const serveConfig = {
  cleanUrls: true,
  trailingSlash: false,
  directoryListing: false,
  rewrites: [
    { source: "/livestock/:id", destination: "/livestock-detail.html" },
    ...PRIVATE.map((source) => ({ source, destination: "/private.html" })),
  ],
  headers: [
    { source: "**", headers: security },
    { source: "/static/**", headers: [{ key: "Cache-Control", value: immutable }] },
    {
      source: "**/*.@(jpg|jpeg|png|webp|WebP|avif|svg|ico|woff|woff2)",
      headers: [{ key: "Cache-Control", value: "public, max-age=2592000" }],
    },
    { source: "**/*.html", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    // headers match the file that is served, so cover the shells as well as the URLs that rewrite to them
    ...[...PRIVATE, "/private.html", "/404.html"].map((source) => ({
      source,
      headers: [{ key: "X-Robots-Tag", value: NOINDEX }],
    })),
  ],
};
write("serve.json", `${JSON.stringify(serveConfig, null, 2)}\n`);

console.log(
  `seo-postbuild: wrote ${pages.length} page files, private/detail/404 shells, sitemap.xml (${today}) and serve.json`,
);
