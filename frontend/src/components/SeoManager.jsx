import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ORIGIN = "https://shilohridgekatahdins.com";
const DEFAULT_SEO = {
  title: "Shiloh Ridge Katahdins | Katahdin Sheep & Farm Livestock",
  description: "Explore Katahdin sheep, live hogs, select cattle, and farm products from Shiloh Ridge Farm, a family livestock farm in Maitland, Missouri.",
};

const PAGE_SEO = {
  "/": DEFAULT_SEO,
  "/livestock": {
    title: "Katahdin Sheep & Livestock for Sale in Missouri | Shiloh Ridge",
    description: "View available Katahdin sheep, breeding stock, live hogs, and select cattle from Shiloh Ridge Farm in Maitland, Missouri, with direct farm inquiries.",
  },
  "/products": {
    title: "Farm Products, Lamb & Pork | Shiloh Ridge Farm Missouri",
    description: "Shop farm-direct livestock and seasonal products from Shiloh Ridge Farm, including Katahdin lamb and custom pork ordering options in northwest Missouri.",
  },
  "/katahdin": {
    title: "Katahdin Sheep Breed Guide | Shiloh Ridge Farm",
    description: "Learn about Katahdin hair sheep, parasite resistance, maternal traits, low-maintenance coats, breeding goals, and flock selection at Shiloh Ridge Farm.",
  },
  "/about": {
    title: "About Shiloh Ridge Farm | Maitland, Missouri Livestock Farm",
    description: "Meet Shiloh Ridge Farm in Maitland, Missouri, and learn about our family values, honest livestock practices, Katahdin flock, and farm stewardship.",
  },
  "/contact": {
    title: "Contact Shiloh Ridge Farm | Livestock Inquiries in Missouri",
    description: "Contact Shiloh Ridge Farm in Maitland, Missouri about Katahdin sheep, live hogs, select cattle, farm products, availability, and pickup arrangements.",
  },
  "/blog": {
    title: "Katahdin Sheep & Farm Notes | Shiloh Ridge Farm Blog",
    description: "Read practical notes from Shiloh Ridge Farm about Katahdin sheep, livestock care, breeding, pasture management, seasonal farm work, and availability.",
  },
  "/auctions": {
    title: "Livestock Auctions & Farm Availability | Shiloh Ridge Farm",
    description: "Review livestock auction information, seasonal availability, and direct-sale opportunities for Katahdin sheep and other livestock from Shiloh Ridge Farm.",
  },
  "/privacy": {
    title: "Privacy Policy | Shiloh Ridge Farm",
    description: "Read how Shiloh Ridge Farm handles customer, account, order, contact, and website information submitted through shilohridgekatahdins.com.",
  },
  "/terms": {
    title: "Website & Sale Terms | Shiloh Ridge Farm",
    description: "Review Shiloh Ridge Farm website terms and important conditions for livestock availability, farm product orders, payments, pickup, and farm records.",
  },
};

function setMeta(attribute, key, content) {
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

export default function SeoManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const normalizedPath = pathname !== "/" ? pathname.replace(/\/$/, "") : "/";
    const livestockDetail = normalizedPath.startsWith("/livestock/");
    const seo = PAGE_SEO[normalizedPath] || (livestockDetail ? {
      title: "Livestock Record | Shiloh Ridge Farm",
      description: "Review this Shiloh Ridge Farm livestock record, including available animal details, farm documentation, and options to contact the farm directly.",
    } : DEFAULT_SEO);
    const privateRoute = normalizedPath.startsWith("/admin")
      || normalizedPath.startsWith("/account")
      || normalizedPath.startsWith("/checkout")
      || normalizedPath === "/cart"
      || normalizedPath === "/mobile";
    const knownPublicRoute = Boolean(PAGE_SEO[normalizedPath] || livestockDetail);
    const robots = privateRoute || !knownPublicRoute ? "noindex, nofollow" : "index, follow, max-image-preview:large";
    const canonical = `${ORIGIN}${knownPublicRoute ? normalizedPath : "/"}`;

    document.title = seo.title;
    setMeta("name", "description", seo.description);
    setMeta("name", "robots", robots);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:site_name", "Shiloh Ridge Farm");
    setMeta("property", "og:title", seo.title);
    setMeta("property", "og:description", seo.description);
    setMeta("property", "og:url", canonical);
    setMeta("property", "og:image", `${ORIGIN}/Sheep+Grazing+Sunset.webp`);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", seo.title);
    setMeta("name", "twitter:description", seo.description);

    let canonicalLink = document.head.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute("href", canonical);
  }, [pathname]);

  return null;
}
