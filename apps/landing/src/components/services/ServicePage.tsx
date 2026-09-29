import type { Metadata } from "next";
import Link from "next/link";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PrimaryButton, SecondaryButton } from "@/components/ui/Button";
import { FaqList } from "@/components/ui/FaqList";
import { WhatsAppIcon } from "@/components/ui/icons";
import { JsonLd } from "@/components/seo/JsonLd";
import { findGuideBySlug } from "@/data/guides";
import { PACKAGE_TERMS } from "@/data/business";
import { PRICING_PACKAGE_VALUES } from "@/data/pricing";
import { ALL_SERVICES, type Service } from "@/data/services";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/seo";
import { buildWhatsAppLink } from "@/lib/whatsapp";

const cop = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
const paqueteMinimo = PRICING_PACKAGE_VALUES[0];

export function serviceMetadata(service: Service): Metadata {
  return {
    title: service.metaTitle,
    description: service.metaDescription,
    alternates: { canonical: `/${service.slug}` },
  };
}

const sectionTitle = "mb-4 text-[24px] font-extrabold text-neutralCustom-800 md:text-[28px]";
const bodyText = "text-[15px] leading-relaxed text-neutralCustom-500";

export function ServicePage({ service }: { service: Service }) {
  const Icon = service.icon;
  const guides = service.guideSlugs.flatMap((slug) => {
    const found = findGuideBySlug(slug);
    return found ? [found.guide] : [];
  });
  const otherServices = ALL_SERVICES.filter((s) => s.slug !== service.slug);

  return (
    <SiteLayout>
      <JsonLd data={breadcrumbJsonLd([{ name: service.name, path: `/${service.slug}` }])} />
      <JsonLd data={faqJsonLd(service.faq)} />

      <section className="bg-neutralCustom-50 px-6 py-16 md:px-16 md:py-20">
        <div className="mx-auto max-w-[760px]">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3.5 py-1.5 text-[13px] font-bold text-brand-600">
            <Icon className="h-4 w-4" />
            {service.eyebrow}
          </span>
          <h1 className="mb-5 text-[34px] font-extrabold leading-[1.15] text-neutralCustom-800 md:text-[44px]">
            {service.h1}
          </h1>
          <p className="mb-8 text-[17px] leading-relaxed text-neutralCustom-500">{service.intro}</p>
          <div className="flex flex-wrap gap-3.5">
            <PrimaryButton
              href={buildWhatsAppLink(`Hola, quiero usar IngeFact para ${service.name.toLowerCase()}.`)}
              external
              icon={<WhatsAppIcon className="h-4 w-4" />}
            >
              Hablar por WhatsApp
            </PrimaryButton>
            <SecondaryButton href="/precios">Ver precios</SecondaryButton>
          </div>
        </div>
      </section>

      <section aria-labelledby="que-es" className="px-6 py-14 md:px-16">
        <div className="mx-auto max-w-[760px]">
          <h2 id="que-es" className={sectionTitle}>
            {service.whatIs.title}
          </h2>
          {service.whatIs.paragraphs.map((p) => (
            <p key={p} className={`mb-4 ${bodyText}`}>
              {p}
            </p>
          ))}

          <h2 id="obligados" className={`mt-10 ${sectionTitle}`}>
            {service.whoMustComply.title}
          </h2>
          <p className={`mb-3 ${bodyText}`}>{service.whoMustComply.intro}</p>
          <ul className={`list-disc space-y-2 pl-6 ${bodyText}`}>
            {service.whoMustComply.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <p className="mt-5 rounded-brand-md bg-neutralCustom-50 px-4 py-3 text-[13px] text-neutralCustom-500">
            Esta es información general. Confirma con tu contador cómo aplica a tu empresa.
          </p>
        </div>
      </section>

      <section aria-labelledby="como-funciona" className="bg-neutralCustom-50 px-6 py-14 md:px-16">
        <div className="mx-auto max-w-[1100px]">
          <h2 id="como-funciona" className={`text-center ${sectionTitle}`}>
            Cómo lo haces en IngeFact
          </h2>
          <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {service.features.map((item) => (
              <li key={item.title} className="rounded-brand-lg border border-neutralCustom-100 bg-white p-5">
                <h3 className="mb-1.5 text-[15px] font-bold text-neutralCustom-800">{item.title}</h3>
                <p className="text-[13px] leading-relaxed text-neutralCustom-500">{item.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="precio" className="px-6 py-14 md:px-16">
        <div className="mx-auto max-w-[760px]">
          <h2 id="precio" className={sectionTitle}>
            ¿Cuánto cuesta?
          </h2>
          <p className={`mb-3 ${bodyText}`}>
            Pagas por paquetes prepagados de documentos, sin mensualidades ni permanencia. El más pequeño trae{" "}
            {paqueteMinimo.documentos} documentos por ${cop.format(paqueteMinimo.precio)} y cada paquete se puede usar
            durante {PACKAGE_TERMS.vigenciaMeses} meses.
          </p>
          <p className={`mb-5 ${bodyText}`}>{service.consumption} El mismo paquete sirve para todos los servicios.</p>
          <Link href="/precios" className="text-[15px] font-semibold text-brand-600 underline-offset-4 hover:underline">
            Ver todos los paquetes <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      {guides.length > 0 && (
        <section aria-labelledby="guias" className="bg-neutralCustom-50 px-6 py-14 md:px-16">
          <div className="mx-auto max-w-[760px]">
            <h2 id="guias" className={sectionTitle}>
              Guías paso a paso
            </h2>
            <ul className="space-y-3">
              {guides.map((guide) => (
                <li key={guide.slug}>
                  <Link
                    href={`/instructivos/${guide.slug}`}
                    className="block rounded-brand-md border border-neutralCustom-100 bg-white px-5 py-4 hover:border-brand-400"
                  >
                    <span className="block text-[15px] font-bold text-neutralCustom-800">{guide.title}</span>
                    <span className="block text-[13px] text-neutralCustom-500">{guide.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section aria-labelledby="preguntas" className="px-6 py-14 md:px-16">
        <h2 id="preguntas" className={`text-center ${sectionTitle}`}>
          Preguntas frecuentes
        </h2>
        <FaqList items={service.faq} />
      </section>

      <section aria-labelledby="otros-servicios" className="bg-neutralCustom-50 px-6 py-14 md:px-16">
        <div className="mx-auto max-w-[1100px] text-center">
          <h2 id="otros-servicios" className={sectionTitle}>
            También en IngeFact
          </h2>
          <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {otherServices.map((other) => (
              <li key={other.slug}>
                <Link
                  href={`/${other.slug}`}
                  className="flex h-full items-center justify-center gap-2 rounded-brand-md border border-neutralCustom-100 bg-white px-5 py-4 text-[15px] font-bold text-neutralCustom-800 hover:border-brand-400"
                >
                  <other.icon className="h-5 w-5 text-brand-600" />
                  {other.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </SiteLayout>
  );
}
