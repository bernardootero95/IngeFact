import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";
import { BUSINESS, PACKAGE_TERMS } from "@/data/business";

export const metadata: Metadata = {
  title: "Política de reembolsos y retracto",
  description: "Cuándo puedes retractarte de la compra de un paquete de documentos de IngeFact y cómo pedir un reembolso.",
  alternates: { canonical: "/reembolsos" },
};

export default function ReembolsosPage() {
  return (
    <LegalPage
      title="Política de reembolsos y retracto"
      intro={
        <p>
          Esta política explica cuándo puedes deshacer la compra de un paquete de documentos y cómo pedir la devolución
          de tu dinero, conforme al Estatuto del Consumidor (Ley 1480 de 2011).
        </p>
      }
    >
      <LegalSection id="retracto" title="1. Derecho de retracto">
        <p>
          Puedes retractarte de la compra de un paquete dentro de los {PACKAGE_TERMS.diasRetracto} días hábiles
          siguientes a la compra, siempre que <strong>no hayas emitido ningún documento</strong> con ese paquete. Si ya
          emitiste al menos uno, se entiende que la prestación del servicio comenzó con tu acuerdo y, según el artículo 47
          de la Ley 1480, el retracto ya no aplica.
        </p>
        <p>
          Si ejerces el retracto, te devolvemos el valor total pagado, sin descuentos ni retenciones, dentro de los 30
          días calendario siguientes a tu solicitud.
        </p>
      </LegalSection>

      <LegalSection id="no-reembolsable" title="2. Qué no es reembolsable">
        <ul>
          <li>Los documentos ya emitidos y aceptados por la DIAN.</li>
          <li>Los documentos que vencieron por no usarse dentro de los {PACKAGE_TERMS.vigenciaMeses} meses de vigencia del paquete.</li>
          <li>Los paquetes en los que ya se emitió algún documento, pasado el plazo de retracto.</li>
        </ul>
        <p>Los documentos y eventos rechazados por la DIAN nunca se descuentan de tu paquete, así que no requieren reembolso.</p>
      </LegalSection>

      <LegalSection id="garantia" title="3. Fallas del servicio">
        <p>
          Si por una falla atribuible a IngeFact un documento se descontó de tu paquete sin haber sido emitido
          correctamente, o no pudiste usar el servicio, escríbenos: te repondremos los documentos afectados o, si no es
          posible, te devolveremos su valor proporcional.
        </p>
      </LegalSection>

      <LegalSection id="reversion" title="4. Reversión del pago">
        <p>
          Si pagaste con tarjeta de crédito, débito u otro instrumento de pago electrónico, puedes pedir la reversión del
          pago en los casos del artículo 51 de la Ley 1480 (fraude, operación no solicitada, o servicio no prestado o que
          no corresponde a lo comprado). Debes presentar la queja ante nosotros y avisar al emisor del instrumento de pago
          dentro de los 5 días hábiles siguientes a la fecha en que tuviste noticia de la situación.
        </p>
      </LegalSection>

      <LegalSection id="solicitud" title="5. Cómo hacer la solicitud">
        <ol>
          <li>
            Escríbenos a <a href={`mailto:${BUSINESS.correo}`}>{BUSINESS.correo}</a> con el nombre y NIT de tu empresa,
            el paquete comprado, la fecha de pago y el motivo de la solicitud.
          </li>
          <li>Te confirmamos la recepción y verificamos el uso del paquete.</li>
          <li>Respondemos en máximo 15 días hábiles.</li>
          <li>Si procede, hacemos la devolución por el mismo medio de pago o por transferencia a una cuenta a nombre de la empresa compradora.</li>
        </ol>
        <p>
          Si no estás conforme con la respuesta, puedes acudir a la Superintendencia de Industria y Comercio. Consulta
          también los <Link href="/terminos#paquetes">términos y condiciones de los paquetes</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
