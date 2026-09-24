import type { MetadataRoute } from "next";
import { LEGAL_NAV_ITEMS, NAV_ITEMS } from "@/data/nav";
import { ALL_GUIDES } from "@/data/guides";
import { LEGAL_LAST_UPDATED_ISO } from "@/data/business";
import { SITE_URL } from "@/lib/seo";

// Sin lastModified en las páginas de contenido: una fecha que cambia en cada
// despliegue hace que Google deje de confiar en el lastmod de todo el sitemap.
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = NAV_ITEMS.map((item) => ({
    url: `${SITE_URL}${item.href}`,
    changeFrequency: "monthly",
    priority: item.key === "inicio" ? 1 : 0.7,
  }));

  const guidePages: MetadataRoute.Sitemap = ALL_GUIDES.map((guide) => ({
    url: `${SITE_URL}/instructivos/${guide.slug}`,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  const legalPages: MetadataRoute.Sitemap = LEGAL_NAV_ITEMS.map((item) => ({
    url: `${SITE_URL}${item.href}`,
    lastModified: LEGAL_LAST_UPDATED_ISO,
    changeFrequency: "yearly",
    priority: 0.3,
  }));

  return [...pages, ...guidePages, ...legalPages];
}
