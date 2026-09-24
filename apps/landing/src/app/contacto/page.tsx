import type { Metadata } from "next";
import Link from "next/link";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { FaqList } from "@/components/ui/FaqList";
import { WhatsAppIcon } from "@/components/ui/icons";
import { NewTabHint } from "@/components/ui/NewTabHint";
import { WHATSAPP_DISPLAY, buildWhatsAppLink } from "@/lib/whatsapp";
import { BUSINESS } from "@/data/business";
import { CONTACT_FAQ } from "@/data/faq";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Escríbenos por WhatsApp o correo. Te ayudamos a activar IngeFact en tu empresa.",
  alternates: { canonical: "/contacto" },
};

export default function ContactoPage() {
  return (
    <SiteLayout active="contacto">
      <section className="bg-neutralCustom-50 px-6 py-16 text-center md:px-16">
        <h1 className="mb-3.5 text-[32px] font-extrabold text-neutralCustom-800 md:text-[38px]">Hablemos</h1>
        <p className="mx-auto max-w-[520px] text-base text-neutralCustom-500">
          ¿Tienes preguntas sobre IngeFact o quieres una demo para tu empresa? Escríbenos.
        </p>
      </section>

      <section className="px-6 py-16 md:px-16">
        <div className="mx-auto grid max-w-[900px] grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex flex-col items-center gap-3.5 rounded-brand-lg border border-neutralCustom-100 bg-white p-8 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-brand-md bg-brand-50">
              <WhatsAppIcon className="h-[22px] w-[22px] text-brand-600" />
            </div>
            <h2 className="text-[17px] font-bold text-neutralCustom-800">Escríbenos por WhatsApp</h2>
            <p className="text-sm leading-relaxed text-neutralCustom-500">
              Ideal para preguntas rápidas, comprar un paquete o coordinar una demo.
            </p>
            <div className="text-[15px] font-semibold text-neutralCustom-800">{WHATSAPP_DISPLAY}</div>
            <a
              href={buildWhatsAppLink("Hola, tengo una pregunta sobre IngeFact.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center justify-center rounded-brand-md bg-brand-600 px-5 py-3 text-[15px] font-semibold text-white hover:bg-brand-700"
            >
              Abrir WhatsApp
              <NewTabHint />
            </a>
          </div>

          <div className="flex flex-col items-center gap-3.5 rounded-brand-lg border border-neutralCustom-100 bg-white p-8 text-center">
            <h2 className="text-[17px] font-bold text-neutralCustom-800">Peticiones, quejas y reclamos</h2>
            <p className="text-sm leading-relaxed text-neutralCustom-500">
              Para PQR, solicitudes de retracto o reembolso, y consultas sobre tus datos personales, escríbenos al
              correo. Respondemos dentro de los plazos de ley.
            </p>
            <a href={`mailto:${BUSINESS.correo}`} className="text-[15px] font-semibold text-brand-600 underline hover:text-brand-700">
              {BUSINESS.correo}
            </a>
            <p className="text-[13px] text-neutralCustom-500">
              Ver{" "}
              <Link href="/reembolsos" className="underline hover:text-brand-700">
                reembolsos y retracto
              </Link>{" "}
              y{" "}
              <Link href="/privacidad" className="underline hover:text-brand-700">
                tratamiento de datos
              </Link>
              .
            </p>
          </div>
        </div>
        <p className="mt-8 text-center text-[13px] text-neutralCustom-500">Horario de atención: {BUSINESS.horario}</p>
      </section>

      <section aria-labelledby="faq-contacto" className="bg-neutralCustom-50 px-6 py-16 md:px-16">
        <h2 id="faq-contacto" className="mb-6 text-center text-2xl font-extrabold text-neutralCustom-800">
          Preguntas frecuentes
        </h2>
        <FaqList items={CONTACT_FAQ} />
      </section>
    </SiteLayout>
  );
}
