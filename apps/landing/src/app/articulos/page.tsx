import type { Metadata } from "next";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { ARTICLES } from "@/data/articles";

export const metadata: Metadata = {
  title: "Artículos sobre facturación electrónica DIAN",
  description:
    "Guías claras sobre la normativa DIAN: cómo habilitarse como facturador electrónico, documento soporte, eventos RADIAN y plazos de la nómina electrónica.",
  alternates: { canonical: "/articulos" },
};

export default function ArticulosPage() {
  return (
    <SiteLayout active="articulos">
      <section className="bg-neutralCustom-50 px-6 py-16 text-center md:px-16">
        <h1 className="mb-3.5 text-[32px] font-extrabold text-neutralCustom-800 md:text-[38px]">
          Artículos sobre documentos electrónicos DIAN
        </h1>
        <p className="mx-auto max-w-[640px] text-base text-neutralCustom-500">
          Lo que necesitas saber sobre facturación electrónica, nómina, documento soporte y RADIAN, explicado en lenguaje
          claro y con la norma de la DIAN a la mano.
        </p>
      </section>

      <section className="px-6 py-14 md:px-16">
        <ul className="mx-auto grid max-w-[1000px] grid-cols-1 gap-5 md:grid-cols-2">
          {ARTICLES.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </ul>
      </section>
    </SiteLayout>
  );
}
