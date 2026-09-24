import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";
import { BUSINESS } from "@/data/business";

export const metadata: Metadata = {
  title: "Política de cookies",
  description: "Qué cookies y tecnologías similares usan el sitio de IngeFact y la plataforma.",
  alternates: { canonical: "/cookies" },
};

export default function CookiesPage() {
  return (
    <LegalPage
      title="Política de cookies"
      intro={
        <p>
          Las cookies son pequeños archivos que un sitio guarda en tu navegador. Aquí te contamos cuáles usamos, que son
          muy pocas, y para qué.
        </p>
      }
    >
      <LegalSection id="sitio" title="1. Este sitio (ingefact.com)">
        <p>
          Este sitio <strong>no usa cookies</strong>, ni propias ni de terceros. No tiene herramientas de analítica,
          publicidad, píxeles de seguimiento ni botones de redes sociales que te rastreen. Las fuentes tipográficas se
          sirven desde nuestro propio dominio, sin conectar con servicios externos.
        </p>
        <p>
          Por eso no te mostramos un aviso para aceptar cookies: no hay nada que aceptar. Si en el futuro incorporamos
          herramientas que usen cookies no esenciales, te pediremos tu consentimiento antes de activarlas y
          actualizaremos esta política.
        </p>
      </LegalSection>

      <LegalSection id="plataforma" title="2. La plataforma (app.ingefact.com)">
        <p>
          Cuando inicias sesión, la plataforma guarda en el almacenamiento local de tu navegador un identificador de
          sesión para que no tengas que ingresar tu contraseña en cada página. Es estrictamente necesario para que el
          servicio funcione, se elimina al cerrar sesión y no se usa para publicidad ni para seguirte en otros sitios.
        </p>
      </LegalSection>

      <LegalSection id="terceros" title="3. Enlaces a WhatsApp">
        <p>
          Los botones de WhatsApp te llevan a un servicio de Meta. Al abrirlo, se aplican las políticas de privacidad y de
          cookies de WhatsApp, no las nuestras.
        </p>
      </LegalSection>

      <LegalSection id="gestion" title="4. Cómo controlar las cookies">
        <p>
          Puedes borrar las cookies y el almacenamiento local, o bloquearlos, desde la configuración de tu navegador. Si
          bloqueas el almacenamiento local de la plataforma, no podrás mantener tu sesión iniciada.
        </p>
        <p>
          Para cualquier pregunta, escríbenos a <a href={`mailto:${BUSINESS.correo}`}>{BUSINESS.correo}</a> o consulta
          la <Link href="/privacidad">política de tratamiento de datos personales</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
