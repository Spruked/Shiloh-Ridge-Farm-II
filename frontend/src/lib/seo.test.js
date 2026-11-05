import seoPages from "../config/seoPages.json";
import { animalJsonLd, animalSeo, resolveSeo } from "./seo";

describe("resolveSeo", () => {
  it("gives every public page its own title and description", () => {
    const titles = new Set();
    const descriptions = new Set();
    seoPages.pages.forEach(({ path }) => {
      const seo = resolveSeo(path);
      expect(seo.noindex).toBe(false);
      expect(seo.title.length).toBeGreaterThan(10);
      expect(seo.title.length).toBeLessThanOrEqual(65);
      expect(seo.description.length).toBeGreaterThanOrEqual(50);
      expect(seo.description.length).toBeLessThanOrEqual(160);
      titles.add(seo.title);
      descriptions.add(seo.description);
    });
    expect(titles.size).toBe(seoPages.pages.length);
    expect(descriptions.size).toBe(seoPages.pages.length);
  });

  it("marks admin, account, cart, checkout and mobile routes noindex", () => {
    ["/admin", "/admin/dashboard", "/admin/livestock", "/account/login", "/account/dashboard", "/cart", "/checkout", "/mobile", "/login"].forEach(
      (path) => expect(resolveSeo(path).noindex).toBe(true),
    );
  });

  it("indexes animal pages and noindexes unknown pages", () => {
    expect(resolveSeo("/livestock/abc-123").noindex).toBe(false);
    expect(resolveSeo("/no-such-page").noindex).toBe(true);
  });

  it("ignores query strings and trailing slashes for the canonical path", () => {
    expect(resolveSeo("/contact?animal=1&type=buy").path).toBe("/contact");
    expect(resolveSeo("/about/").path).toBe("/about");
    expect(resolveSeo("/").path).toBe("/");
  });
});

describe("animal SEO", () => {
  const animal = {
    tag_number: "KHSI-2025-001",
    animal_type: "sheep",
    bloodline: "Pure Katahdin",
    status: "available",
    price: 450,
    description: "Purebred Katahdin ram, excellent conformation.",
  };

  it("builds a specific title and description from the record", () => {
    const seo = animalSeo(animal);
    expect(seo.title).toContain("KHSI-2025-001");
    expect(seo.title).toContain("Shiloh Ridge Katahdins");
    expect(seo.description).toContain("Purebred Katahdin ram");
  });

  it("returns nothing for an unusable record", () => {
    expect(animalSeo(null)).toBeNull();
    expect(animalSeo({})).toBeNull();
    expect(animalJsonLd(null, "x")).toBeNull();
  });

  it("emits Product structured data with price and availability", () => {
    const data = animalJsonLd(animal, "https://shilohridgekatahdins.com/livestock/1");
    expect(data["@type"]).toBe("Product");
    expect(data.sku).toBe("KHSI-2025-001");
    expect(data.offers.price).toBe("450.00");
    expect(data.offers.availability).toBe("https://schema.org/InStock");
    expect(animalJsonLd({ ...animal, status: "sold" }, "u").offers.availability).toBe("https://schema.org/SoldOut");
  });
});
