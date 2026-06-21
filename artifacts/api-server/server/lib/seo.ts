/**
 * SEO + branding injector. Reads editable rows from system_setting and
 * substitutes them into the served index.html. Cached for 60s so the per-
 * request overhead is one in-memory lookup + a regex pass.
 *
 * Drives:
 *   - <title> and OG title
 *   - <meta name="description">, og:description, twitter:description
 *   - <meta name="keywords">
 *   - <meta name="robots">
 *   - canonical URL + og:url + twitter:url
 *   - <meta name="twitter:site">
 *   - og:image + twitter:image
 *   - <link rel="icon"> + <link rel="apple-touch-icon">
 *   - Google Search Console verification (when seo_google_site_verification is set)
 */

import { db } from "../db/client";
import { systemSetting } from "../db/schema";

type SeoMap = Record<string, string>;

let cache: { value: SeoMap; expiresAt: number } | null = null;
const TTL_MS = 60_000;

export async function getSeoSettings(): Promise<SeoMap> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.value;
  const rows = await db.select().from(systemSetting);
  const map: SeoMap = {};
  for (const r of rows) {
    if (r.category === "seo" || r.category === "branding") {
      map[r.key] = r.value ?? "";
    }
  }
  cache = { value: map, expiresAt: now + TTL_MS };
  return map;
}

/** Invalidate so the next request rebuilds — call after PATCH /admin/settings. */
export function invalidateSeoCache() {
  cache = null;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Substitute SEO meta tags in the served HTML. */
export function injectSeo(html: string, seo: SeoMap): string {
  const title = seo.seo_site_title;
  const desc = seo.seo_site_description;
  const keywords = seo.seo_site_keywords;
  const ogImage = seo.seo_og_image;
  const twitter = seo.seo_twitter_handle;
  const canonical = seo.seo_canonical_domain;
  const favicon = seo.seo_favicon_url;
  const appleIcon = seo.seo_apple_touch_icon_url;
  const robots = seo.seo_robots_policy;
  const gscVerify = seo.seo_google_site_verification;
  const brandName = seo.brand_name;

  let out = html;

  if (title) {
    out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);
    out = replaceMeta(out, "property", "og:title", title);
    out = replaceMeta(out, "name", "twitter:title", title);
  }
  if (desc) {
    out = replaceMeta(out, "name", "description", desc);
    out = replaceMeta(out, "property", "og:description", desc);
    out = replaceMeta(out, "name", "twitter:description", desc);
  }
  if (keywords) out = replaceMeta(out, "name", "keywords", keywords);
  if (robots) out = replaceMeta(out, "name", "robots", robots);
  if (ogImage) {
    out = replaceMeta(out, "property", "og:image", ogImage);
    out = replaceMeta(out, "name", "twitter:image", ogImage);
  }
  if (twitter) {
    out = replaceMeta(out, "name", "twitter:site", twitter);
    out = replaceMeta(out, "name", "twitter:creator", twitter);
  }
  if (canonical) {
    out = out.replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
      `<link rel="canonical" href="${esc(canonical)}/" />`
    );
    out = replaceMeta(out, "property", "og:url", `${canonical}/`);
  }
  if (favicon) {
    out = out.replace(
      /<link\s+rel="icon"[^>]*>/i,
      `<link rel="icon" href="${esc(favicon)}" sizes="any" />`
    );
  }
  if (appleIcon) {
    out = out.replace(
      /<link\s+rel="apple-touch-icon"[^>]*>/i,
      `<link rel="apple-touch-icon" href="${esc(appleIcon)}" />`
    );
  }
  if (brandName) {
    out = replaceMeta(out, "property", "og:site_name", brandName);
    out = replaceMeta(out, "name", "application-name", brandName);
    out = replaceMeta(out, "name", "apple-mobile-web-app-title", brandName);
  }

  // Google Search Console verification: only inject if a value is set.
  if (gscVerify && !out.includes('name="google-site-verification"')) {
    out = out.replace(
      "</head>",
      `  <meta name="google-site-verification" content="${esc(gscVerify)}" />\n  </head>`
    );
  }

  return out;
}

function replaceMeta(html: string, attr: "name" | "property", key: string, value: string): string {
  // Match the existing meta tag and replace just the content. Robust to single/double
  // quotes, extra whitespace, optional self-closing slash. If no match, append before </head>.
  const re = new RegExp(
    `<meta\\s+${attr}="${escapeRe(key)}"\\s+content="[^"]*"\\s*\\/?>`,
    "i"
  );
  if (re.test(html)) {
    return html.replace(re, `<meta ${attr}="${key}" content="${esc(value)}" />`);
  }
  // Insert before </head> if it didn't exist (no-op until index.html is regen'd).
  return html.replace("</head>", `  <meta ${attr}="${key}" content="${esc(value)}" />\n  </head>`);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ─────────── /sitemap.xml + /robots.txt ─────────── */

const STATIC_ROUTES = ["/", "/auth", "/privacy", "/terms"];

export function buildSitemapXml(seo: SeoMap): string {
  const domain = (seo.seo_canonical_domain ?? "").replace(/\/+$/, "");
  if (!domain) return "";
  const today = new Date().toISOString().slice(0, 10);
  const urls = STATIC_ROUTES.map((route) => {
    const priority = route === "/" ? "1.0" : "0.5";
    const changefreq = route === "/" ? "weekly" : "monthly";
    return `  <url>
    <loc>${domain}${route}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

export function buildRobotsTxt(seo: SeoMap): string {
  const policy = seo.seo_robots_policy ?? "index, follow";
  const domain = (seo.seo_canonical_domain ?? "").replace(/\/+$/, "");
  const isBlocked = /noindex|nofollow/i.test(policy);
  const lines: string[] = [];
  lines.push("User-agent: *");
  if (isBlocked) {
    lines.push("Disallow: /");
  } else {
    lines.push("Allow: /");
    lines.push("Disallow: /api/");
    lines.push("Disallow: /admin");
    lines.push("Disallow: /app/");
  }
  if (domain) {
    lines.push("");
    lines.push(`Sitemap: ${domain}/sitemap.xml`);
  }
  return lines.join("\n") + "\n";
}
