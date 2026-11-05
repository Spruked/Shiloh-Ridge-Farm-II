import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SITE } from "../config/site";
import { getApiBaseUrl } from "../lib/backend";
import {
  INDEX_ROBOTS,
  LIVESTOCK_DETAIL_PATTERN,
  NOINDEX_ROBOTS,
  OG_IMAGE,
  animalJsonLd,
  animalSeo,
  breadcrumbJsonLd,
  resolveSeo,
} from "../lib/seo";

/**
 * Per-route SEO for the single-page app: applies the rules in lib/seo.js to the document head
 * (title, description, robots, canonical, Open Graph / Twitter tags, JSON-LD). Animal pages fetch
 * the animal's record for a specific title and Product structured data.
 *
 * The static head in public/index.html and the per-page files written by scripts/seo-postbuild.js
 * are the fallback for crawlers that do not run scripts.
 */

const upsertMeta = (attribute, key, content) => {
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
};

const upsertCanonical = (href) => {
  let element = document.head.querySelector('link[rel="canonical"]');
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
};

const JSON_LD_ID = "seo-jsonld-page";

const setPageJsonLd = (data) => {
  let element = document.getElementById(JSON_LD_ID);
  if (!data) {
    if (element) element.remove();
    return;
  }
  if (!element) {
    element = document.createElement("script");
    element.id = JSON_LD_ID;
    element.type = "application/ld+json";
    document.head.appendChild(element);
  }
  element.textContent = JSON.stringify(data);
};

const applySeo = ({ path, title, description, noindex }) => {
  const url = `${SITE.publicUrl}${path === "/" ? "/" : path}`;
  document.title = title;
  upsertMeta("name", "description", description);
  upsertMeta("name", "robots", noindex ? NOINDEX_ROBOTS : INDEX_ROBOTS);
  upsertCanonical(url);
  upsertMeta("property", "og:type", "website");
  upsertMeta("property", "og:site_name", SITE.name);
  upsertMeta("property", "og:title", title);
  upsertMeta("property", "og:description", description);
  upsertMeta("property", "og:url", url);
  upsertMeta("property", "og:image", OG_IMAGE);
  upsertMeta("name", "twitter:card", "summary");
  upsertMeta("name", "twitter:title", title);
  upsertMeta("name", "twitter:description", description);
  upsertMeta("name", "twitter:image", OG_IMAGE);
  setPageJsonLd(noindex ? null : breadcrumbJsonLd(path, title));
};

export default function SeoManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const seo = resolveSeo(pathname);
    applySeo(seo);

    if (!LIVESTOCK_DETAIL_PATTERN.test(seo.path)) return undefined;

    const controller = new AbortController();
    const id = seo.path.split("/")[2];
    fetch(`${getApiBaseUrl()}/livestock/${encodeURIComponent(id)}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((animal) => {
        const specific = animalSeo(animal);
        if (specific && !controller.signal.aborted) {
          applySeo({ ...seo, ...specific });
          setPageJsonLd(animalJsonLd(animal, `${SITE.publicUrl}${seo.path}`));
        }
      })
      .catch(() => {
        /* keep the generic livestock title */
      });
    return () => controller.abort();
  }, [pathname]);

  return null;
}
