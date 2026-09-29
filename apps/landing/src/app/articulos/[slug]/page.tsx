import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PrimaryButton } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/icons";
import { NewTabHint } from "@/components/ui/NewTabHint";
import { JsonLd } from "@/components/seo/JsonLd";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { formatArticleDate } from "@/components/articles/formatArticleDate";
import { ARTICLES, findArticle, type ArticleBlock } from "@/data/articles";
import { ALL_SERVICES } from "@/data/services";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { buildWhatsAppLink } from "@/lib/whatsapp";

export const dynamicParams = false;

export function generateStaticParams() {
  return ARTICLES.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = findArticle(slug);
  if (!article) return {};
  return {
    title: article.metaTitle,
    description: article.description,
    alternates: { canonical: `/articulos/${slug}` },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.description,
      publishedTime: article.published,
      modifiedTime: article.updated,
    },
  };
}

function Block({ block }: { block: ArticleBlock }) {
  if (typeof block === "string") return <p>{block}</p>;
  const List = block.ordered ? "ol" : "ul";
  return (
    <List>
      {block.list.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </List>
  );
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = findArticle(slug);
  if (!article) notFound();

  const service = ALL_SERVICES.find((s) => s.slug === article.serviceSlug);
  const related = ARTICLES.filter((a) => a.slug !== article.slug);

  return (
    <SiteLayout active="articulos">
      <JsonLd data={articleJsonLd(article)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Artículos", path: "/articulos" },
          { name: article.title, path: `/articulos/${article.slug}` },
        ])}
      />

      <section className="bg-neutralCustom-50 px-6 py-14 md:px-16">
        <div className="mx-auto max-w-[760px]">
          <nav aria-label="Ruta de navegación" className="mb-6 text-[13px] text-neutralCustom-500">
            <Link href="/articulos" className="hover:text-brand-600">
              Artículos
            </Link>
          </nav>
          <h1 className="mb-4 text-[30px] font-extrabold leading-tight text-neutralCustom-800 md:text-[38px]">
            {article.title}
          </h1>
          <p className="mb-5 text-[17px] leading-relaxed text-neutralCustom-500">{article.intro}</p>
          <p className="text-xs text-neutralCustom-500">
            Actualizado el <time dateTime={article.updated}>{formatArticleDate(article.updated)}</time>
          </p>
        </div>
      </section>

      <article className="px-6 py-14 md:px-16">
        <div className="mx-auto flex max-w-[760px] flex-col gap-10">
          <nav aria-labelledby="contenido-articulo" className="rounded-brand-md border border-neutralCustom-100 p-5">
            <h2 id="contenido-articulo" className="mb-2 text-sm font-bold text-neutralCustom-800">
              En este artículo
            </h2>
            <ol className="ml-5 list-decimal space-y-1 text-sm">
              {article.sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="text-brand-600 underline-offset-4 hover:underline">
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {article.sections.map((section) => (
            <section key={section.id} aria-labelledby={section.id} className="scroll-mt-24">
              <h2 id={section.id} className="mb-3 text-[22px] font-extrabold text-neutralCustom-800">
                {section.title}
              </h2>
              <div className="flex flex-col gap-3 text-[16px] leading-relaxed text-neutralCustom-800 [&_li]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ul]:list-disc [&_ul]:space-y-1.5">
                {section.blocks.map((block, i) => (
                  <Block key={i} block={block} />
                ))}
              </div>
            </section>
          ))}

          <p className="rounded-brand-md bg-neutralCustom-50 px-4 py-3 text-[13px] text-neutralCustom-500">
            Esta es información general y no reemplaza la asesoría de tu contador. Revisa siempre la norma vigente.
          </p>

          <section aria-labelledby="fuentes">
            <h2 id="fuentes" className="mb-3 text-base font-bold text-neutralCustom-800">
              Fuentes
            </h2>
            <ul className="ml-5 list-disc space-y-1.5 text-sm">
              {article.sources.map((source) => (
                <li key={source.url}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-600 underline underline-offset-4 hover:text-brand-700"
                  >
                    {source.label}
                    <NewTabHint />
                  </a>
                </li>
              ))}
            </ul>
          </section>

          {service && (
            <div className="flex flex-col items-start gap-4 rounded-brand-lg border border-neutralCustom-100 bg-neutralCustom-50 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[15px] font-bold text-neutralCustom-800">{service.name} con IngeFact</p>
                <p className="text-sm text-neutralCustom-500">
                  <Link href={`/${service.slug}`} className="font-semibold text-brand-600 hover:underline">
                    Conoce cómo funciona
                  </Link>{" "}
                  o escríbenos y te ayudamos a empezar.
                </p>
              </div>
              <PrimaryButton
                href={buildWhatsAppLink(`Hola, leí el artículo "${article.title}" y quiero saber más.`)}
                external
                icon={<WhatsAppIcon className="h-4 w-4" />}
              >
                Escríbenos
              </PrimaryButton>
            </div>
          )}
        </div>
      </article>

      <section aria-labelledby="otros-articulos" className="bg-neutralCustom-50 px-6 py-14 md:px-16">
        <div className="mx-auto max-w-[1000px]">
          <h2 id="otros-articulos" className="mb-6 text-center text-[24px] font-extrabold text-neutralCustom-800">
            Otros artículos
          </h2>
          <ul className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {related.map((a) => (
              <ArticleCard key={a.slug} article={a} headingLevel="h3" />
            ))}
          </ul>
        </div>
      </section>
    </SiteLayout>
  );
}
