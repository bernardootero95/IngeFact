import type { MetadataRoute } from "next";
import { NAV_ITEMS } from "@/data/nav";

const siteUrl = "https://ingefact.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return NAV_ITEMS.map((item) => ({
    url: `${siteUrl}${item.href}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: item.key === "inicio" ? 1 : 0.7,
  }));
}
