import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FaqList } from "@/components/ui/FaqList";
import { MailIcon, WhatsAppIcon } from "@/components/ui/icons";
import { WHATSAPP_DISPLAY, buildWhatsAppLink } from "@/lib/whatsapp";
import { CONTACT_FAQ } from "@/data/faq";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Escríbenos por WhatsApp o correo. Te ayudamos a activar IngeFact en tu empresa.",
  alternates: { canonical: "/contacto" },
};

// TODO: confirmar correo de contacto real y horario de atención antes de publicar.
const CONTACT_EMAIL = "[contacto@ingefact.com]";
const BUSINESS_HOURS = "[lunes a viernes, 8:00 a.m. – 6:00 p.m.]";

export default function ContactoPage() {
  return (
    <>
      <Header active="contacto" />

      <section className="bg-neutralCustom-50 px-6 py-16 text-center md:px-16">
        <h1 className="mb-3.5 text-[32px] font-extrabold text-neutralCustom-800 md:text-[38px]">Hablemos</h1>
        <p className="mx-auto max-w-[520px] text-base text-neutralCustom-500">
          ¿Tienes preguntas sobre IngeFact o quieres una demo para tu empresa? Escríbenos, te respondemos rápido.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-6 px-6 py-16 md:grid-cols-2 md:px-16">
        <div className="flex flex-col gap-3.5 rounded-brand-lg border border-neutralCustom-100 bg-white p-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-brand-md bg-brand-50">
            <WhatsAppIcon className="h-[22px] w-[22px] text-brand-600" />
          </div>
          <h2 className="text-[17px] font-bold text-neutralCustom-800">Escríbenos por WhatsApp</h2>
          <p className="text-sm leading-relaxed text-neutralCustom-500">
            Respuesta directa en horario laboral. Ideal para preguntas rápidas o coordinar una demo.
          </p>
          <div className="text-[15px] font-semibold text-neutralCustom-800">{WHATSAPP_DISPLAY}</div>
          <a
            href={buildWhatsAppLink("Hola, tengo una pregunta sobre IngeFact.")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center justify-center rounded-brand-md bg-brand-600 px-5.5 py-3 text-[15px] font-semibold text-white hover:bg-brand-400"
          >
            Abrir WhatsApp
          </a>
        </div>

        <div className="flex flex-col gap-3.5 rounded-brand-lg border border-neutralCustom-100 bg-white p-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-brand-md bg-brand-50">
            <MailIcon className="h-[22px] w-[22px] text-brand-600" />
          </div>
          <h2 className="text-[17px] font-bold text-neutralCustom-800">Envíanos un correo</h2>
          <p className="text-sm leading-relaxed text-neutralCustom-500">
            Para consultas comerciales, soporte o alianzas. Te respondemos en menos de 24 horas hábiles.
          </p>
          <div className="text-[15px] font-semibold text-neutralCustom-800">{CONTACT_EMAIL}</div>
          <a
            href="#"
            className="inline-flex w-fit items-center justify-center rounded-brand-md border border-neutralCustom-100 bg-white px-5.5 py-3 text-[15px] font-semibold text-neutralCustom-800 hover:border-brand-400 hover:text-brand-600"
          >
            Escribir correo
          </a>
        </div>
      </section>

      <div className="px-6 pb-16 text-center md:px-16">
        <span className="text-[13px] text-neutralCustom-500">Horario de atención: {BUSINESS_HOURS}</span>
      </div>

      <section className="bg-neutralCustom-50 px-6 py-16 md:px-16">
        <h2 className="mb-6 text-center text-2xl font-extrabold text-neutralCustom-800">Preguntas frecuentes</h2>
        <FaqList items={CONTACT_FAQ} />
      </section>

      <Footer />
    </>
  );
}
