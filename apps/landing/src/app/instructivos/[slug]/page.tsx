import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { ALL_GUIDES, findGuideBySlug } from "@/data/guides";

export function generateStaticParams() {
  return ALL_GUIDES.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const found = findGuideBySlug(slug);
  if (!found) return {};

  return {
    title: found.guide.title,
    description: found.guide.description,
    alternates: { canonical: `/instructivos/${slug}` },
  };
}

export default async function GuideDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = findGuideBySlug(slug);
  if (!found) notFound();

  const { guide, groupTitle } = found;
  const Icon = guide.icon;

  return (
    <>
      <Header active="instructivos" />

      <section className="bg-neutralCustom-50 px-6 py-14 md:px-16">
        <div className="mx-auto max-w-[720px]">
          <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-[13px] text-neutralCustom-500">
            <Link href="/instructivos" className="hover:text-brand-600">
              Instructivos
            </Link>
            <span>/</span>
            <span>{groupTitle}</span>
          </nav>
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-brand-md bg-brand-50">
            <Icon className="h-6 w-6 text-brand-600" />
          </div>
          <h1 className="mb-3 text-[30px] font-extrabold text-neutralCustom-800 md:text-[34px]">{guide.title}</h1>
          <p className="text-base text-neutralCustom-500">{guide.intro}</p>
        </div>
      </section>

      <section className="px-6 py-14 md:px-16">
        <div className="mx-auto max-w-[720px]">
          <ol className="flex flex-col gap-5">
            {guide.steps.map((step, index) => (
              <li key={step} className="flex gap-4">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-[13px] font-bold text-white">
                  {index + 1}
                </span>
                <p className="pt-0.5 text-[15px] leading-relaxed text-neutralCustom-800">{step}</p>
              </li>
            ))}
          </ol>

          {guide.note && (
            <div className="mt-8 rounded-brand-md border border-brand-50 bg-brand-50 px-5 py-4 text-sm text-brand-600">
              {guide.note}
            </div>
          )}

          <div className="mt-12 flex flex-col items-start gap-3 rounded-brand-lg border border-neutralCustom-100 bg-neutralCustom-50 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[15px] font-bold text-neutralCustom-800">¿Tienes dudas con este paso?</div>
              <p className="text-sm text-neutralCustom-500">Escríbenos por WhatsApp y te ayudamos directamente.</p>
            </div>
            <WhatsAppButton message={`Hola, tengo una duda con la guía "${guide.title}".`} />
          </div>

          <Link href="/instructivos" className="mt-8 inline-block text-[14px] font-semibold text-brand-600 hover:text-brand-400">
            ← Volver a todas las guías
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
