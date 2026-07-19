export const SITE = {
  name: "Shiloh Ridge Katahdins",
  farmName: "Shiloh Ridge Farm",
  tagline: "Integrity is the Backbone, Honesty the Muscle",
  publicUrl: "https://shilohridgekatahdins.com",
  apiUrl: "https://api.shilohridgekatahdins.com",
  phone: "(660) 254-6226",
  phoneHref: "tel:+16602546226",
  email: "dominichanway@gmail.com",
  emailHref: "mailto:dominichanway@gmail.com",
  address: {
    name: "Dominic Hanway",
    street: "20705 Quebec Road",
    city: "Maitland",
    state: "Missouri",
    postalCode: "64466",
  },
  logoPath: "/ShilohRidgeFarmicon256.png",
};

export const PUBLIC_ROUTES = [
  { path: "/", pageContext: "general" },
  { path: "/livestock", pageContext: "livestock" },
  { path: "/livestock/:id", pageContext: "livestock" },
  { path: "/about", pageContext: "general" },
  { path: "/blog", pageContext: "general" },
  { path: "/katahdin", pageContext: "livestock" },
  { path: "/auctions", pageContext: "livestock" },
  { path: "/contact", pageContext: "contact" },
  { path: "/products", pageContext: "products", showButch: false },
  { path: "/cart", pageContext: "products" },
  { path: "/checkout", pageContext: "products" },
  { path: "/account/login", pageContext: "account" },
  { path: "/account/register", pageContext: "account" },
  { path: "/account/dashboard", pageContext: "account" },
  { path: "/mobile", pageContext: "mobile", hideShep: true },
];

export const ADMIN_ROUTES = [
  "/admin/dashboard",
  "/admin/analytics",
  "/admin/butch",
  "/admin/about",
  "/admin/accounting",
  "/admin/blog",
  "/admin/contacts",
  "/admin/inventory",
  "/admin/livestock",
  "/admin/nft",
  "/admin/orders",
  "/admin/products",
  "/admin/review-queue",
  "/admin/sales",
  "/admin/settings",
];

export const resolveAssistantContext = (pathname) => {
  if (pathname.startsWith("/admin")) {
    return { pageContext: "admin", showButch: false, hideShep: false };
  }

  const exactMatch = PUBLIC_ROUTES.find((route) => route.path === pathname);
  if (exactMatch) {
    return {
      pageContext: exactMatch.pageContext || "general",
      showButch: Boolean(exactMatch.showButch),
      hideShep: Boolean(exactMatch.hideShep),
    };
  }

  const patternMatch = PUBLIC_ROUTES.find((route) => route.path.endsWith("/:id") && pathname.startsWith(route.path.replace("/:id", "")));
  if (patternMatch) {
    return {
      pageContext: patternMatch.pageContext || "general",
      showButch: Boolean(patternMatch.showButch),
      hideShep: Boolean(patternMatch.hideShep),
    };
  }

  return { pageContext: "general", showButch: false, hideShep: false };
};
