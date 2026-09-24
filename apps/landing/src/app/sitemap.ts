import type { MetadataRoute } from "next";
import { LEGAL_NAV_ITEMS, NAV_ITEMS } from "@/data/nav";
import { ALL_GUIDES } from "@/data/guides";

const siteUrl = "https://ingefact.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = NAV_ITEMS.map((item) => ({
    url: `${siteUrl}${item.href}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: item.key === "inicio" ? 1 : 0.7,
  }));

  const guidePages: MetadataRoute.Sitemap = ALL_GUIDES.map((guide) => ({
    url: `${siteUrl}/instructivos/${guide.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  const legalPages: MetadataRoute.Sitemap = LEGAL_NAV_ITEMS.map((item) => ({
    url: `${siteUrl}${item.href}`,
    lastModified: new Date(),
    changeFrequency: "yearly",
    priority: 0.3,
  }));

  return [...pages, ...guidePages, ...legalPages];
}
