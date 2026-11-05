import { SITE } from "../config/site";
import seoPages from "../config/seoPages.json";

/** Pure SEO rules (no DOM, no router) so they can be unit-tested. See components/SeoManager.js for the wiring. */

export const OG_IMAGE = `${SITE.publicUrl}${seoPages.site.ogImage}`;
export const INDEX_ROBOTS = "index, follow, max-image-preview:large";
export const NOINDEX_ROBOTS = "noindex, nofollow";

const PUBLIC_PAGES = Object.fromEntries(
  seoPages.pages.map(({ path, title, description }) => [path, { title, description }]),
);

export const LIVESTOCK_DETAIL_PATTERN = /^\/livestock\/[^/]+$/;
const PRIVATE_PREFIXES = ["/admin", "/account", "/cart", "/checkout", "/mobile", "/login", "/signup", "/dashboard"];

const normalizePath = (pathname) => {
  const clean = (pathname || "/").split("?")[0].split("#")[0];
  return clean.length > 1 ? clean.replace(/\/+$/, "") : "/";
};

const isPrivatePath = (path) =>
  PRIVATE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

export const resolveSeo = (pathname) => {
  const path = normalizePath(pathname);

  if (isPrivatePath(path)) {
    const area = path.startsWith("/admin") ? "Admin" : path === "/cart" ? "Your Order" : "Account";
    return {
      path,
      title: `${area} | ${SITE.farmName}`,
      description: `${area} area of the ${SITE.farmName} website.`,
      noindex: true,
    };
  }

  if (PUBLIC_PAGES[path]) {
    return { path, ...PUBLIC_PAGES[path], noindex: false };
  }

  if (LIVESTOCK_DETAIL_PATTERN.test(path)) {
    return {
      path,
      title: `Livestock Details | ${SITE.name}`,
      description: `Details, lineage and inquiry options for this animal from ${SITE.farmName} in Maitland, Missouri.`,
      noindex: false,
    };
  }

  return {
    path,
    title: `Page Not Found | ${SITE.name}`,
    description: `This page could not be found on the ${SITE.farmName} website.`,
    noindex: true,
  };
};

const truncate = (text, max) => {
  const flat = String(text || "").replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
};

export const animalSeo = (animal) => {
  if (!animal || !animal.tag_number) return null;
  const kind = [animal.bloodline, animal.animal_type].filter(Boolean).join(" ") || "Livestock";
  const sale = animal.status && animal.status !== "available" ? ` (${animal.status})` : "";
  return {
    title: `${kind} ${animal.tag_number}${sale} | ${SITE.name}`,
    description: truncate(
      animal.description ||
        `${kind} ${animal.tag_number} from ${SITE.farmName} in Maitland, Missouri. View lineage and inquire directly.`,
      158,
    ),
  };
};

export const breadcrumbJsonLd = (path, title) => {
  if (path === "/") return null;
  const name = title.split("|")[0].trim();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE.publicUrl}/` },
      { "@type": "ListItem", position: 2, name, item: `${SITE.publicUrl}${path}` },
    ],
  };
};

export const animalJsonLd = (animal, url) => {
  if (!animal || !animal.tag_number) return null;
  const available = animal.status === "available";
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: [animal.bloodline, animal.animal_type, animal.tag_number].filter(Boolean).join(" "),
    sku: animal.tag_number,
    description: truncate(animal.description || "", 300) || undefined,
    brand: { "@type": "Brand", name: SITE.name },
    url,
  };
  const price = Number(animal.price);
  if (Number.isFinite(price) && price > 0) {
    data.offers = {
      "@type": "Offer",
      price: price.toFixed(2),
      priceCurrency: "USD",
      availability: available ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      url,
      seller: { "@type": "Organization", name: SITE.farmName },
    };
  }
  return data;
};

