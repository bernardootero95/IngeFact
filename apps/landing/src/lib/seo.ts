import { BUSINESS, RESPONSABLE } from "@/data/business";
import type { FaqEntry } from "@/data/faq";
import { PRICING_PACKAGE_VALUES } from "@/data/pricing";

/**
 * Dominio canónico del sitio: el mismo de canonical, sitemap, robots y
 * JSON-LD. En Vercel debe ser el dominio principal (el otro redirige a
 * este); si no, Google ve un canonical que apunta a una redirección.
 */
export const SITE_URL = BUSINESS.sitio;

const ORGANIZATION_ID = `${SITE_URL}/#organizacion`;

/** Datos estructurados (schema.org) comunes a todo el sitio. */
export function siteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORGANIZATION_ID,
        name: BUSINESS.marca,
        legalName: RESPONSABLE,
        url: SITE_URL,
        logo: `${SITE_URL}/logo-mark.png`,
        email: BUSINESS.correo,
        telephone: BUSINESS.telefono,
        address: {
          "@type": "PostalAddress",
          streetAddress: BUSINESS.direccion,
          addressLocality: "Ciénaga",
          addressRegion: "Magdalena",
          addressCountry: "CO",
        },
        areaServed: { "@type": "Country", name: "Colombia" },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#sitio`,
        name: BUSINESS.marca,
        url: SITE_URL,
        inLanguage: "es-CO",
        publisher: { "@id": ORGANIZATION_ID },
      },
    ],
  };
}

/** El producto con el rango real de precios de los paquetes. */
export function softwareJsonLd() {
  const precios = PRICING_PACKAGE_VALUES.map((p) => p.precio);
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: BUSINESS.marca,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: SITE_URL,
    description:
      "Plataforma web para emitir factura electrónica, notas crédito y débito, nómina electrónica y documento soporte ante la DIAN, y registrar los eventos RADIAN de las facturas recibidas.",
    inLanguage: "es-CO",
    publisher: { "@id": ORGANIZATION_ID },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "COP",
      lowPrice: Math.min(...precios),
      highPrice: Math.max(...precios),
      offerCount: precios.length,
      url: `${SITE_URL}/precios`,
    },
  };
}

export function faqJsonLd(items: FaqEntry[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}
