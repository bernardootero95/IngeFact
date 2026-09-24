import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";
import { BUSINESS, PACKAGE_TERMS, RESPONSABLE } from "@/data/business";
import { DOCUMENTOS_QUE_CONSUMEN } from "@/data/pricing";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: "Condiciones de uso de la plataforma IngeFact y de compra de paquetes de documentos electrónicos.",
  alternates: { canonical: "/terminos" },
};

export default function TerminosPage() {
  return (
    <LegalPage
      title="Términos y condiciones"
      intro={
        <p>
          Estos términos regulan el uso de la plataforma IngeFact y la compra de paquetes de documentos electrónicos.
          Al comprar un paquete o usar la plataforma, aceptas estos términos. Si no estás de acuerdo, no uses el servicio.
        </p>
      }
    >
      <LegalSection id="identificacion" title="1. Quiénes somos">
        <p>
          IngeFact es un servicio de {BUSINESS.titular}, {BUSINESS.tipoPersona} que opera con el nombre comercial{" "}{BUSINESS.nombreComercial}, identificado con NIT {BUSINESS.nit}, con domicilio en{" "}
          {BUSINESS.direccion}, {BUSINESS.ciudad}. Correo: <a href={`mailto:${BUSINESS.correo}`}>{BUSINESS.correo}</a>.
          Teléfono y WhatsApp: {BUSINESS.telefono}.
        </p>
      </LegalSection>

      <LegalSection id="servicio" title="2. El servicio">
        <p>
          IngeFact es un software en línea que permite a empresas y personas obligadas en Colombia elaborar y transmitir a
          la DIAN facturas electrónicas de venta, notas crédito y débito, documentos soporte en adquisiciones a no
          obligados a facturar y comprobantes de nómina electrónica, así como registrar eventos sobre las facturas
          electrónicas que reciben.
        </p>
        <p>
          La transmisión de los documentos a la DIAN se realiza a través de un proveedor tecnológico habilitado por la
          DIAN, cuyo nombre aparece en la representación gráfica de cada documento. IngeFact no es una entidad pública ni
          actúa en nombre de la DIAN.
        </p>
        <p>
          IngeFact no presta asesoría contable, tributaria, laboral ni jurídica. La información que registras (valores,
          impuestos, devengados, deducciones, datos de terceros) y el cumplimiento de tus obligaciones ante la DIAN y
          demás autoridades son tu responsabilidad.
        </p>
      </LegalSection>

      <LegalSection id="cuenta" title="3. Cuenta y acceso">
        <ul>
          <li>Nuestro equipo crea la cuenta de tu empresa y te envía un acceso con contraseña temporal, que debes cambiar en tu primer ingreso.</li>
          <li>Cada empresa tiene un usuario. Eres responsable de mantener tu contraseña en secreto y de toda actividad hecha con tu cuenta.</li>
          <li>Debes avisarnos de inmediato si sospechas un acceso no autorizado.</li>
          <li>Declaras que tienes facultades para actuar en nombre de la empresa registrada.</li>
        </ul>
      </LegalSection>

      <LegalSection id="paquetes" title="4. Paquetes, precios y pago">
        <ul>
          <li>
            El servicio se vende en paquetes prepagados de documentos, a los precios publicados en{" "}
            <Link href="/precios">Precios</Link> al momento de la compra. Los precios son finales, en pesos colombianos.{" "}
            {BUSINESS.regimenIva}.
          </li>
          <li>La compra se coordina por WhatsApp o correo. El paquete se activa una vez confirmamos el pago.</li>
          <li>
            Descuenta un documento del paquete cada uno de los siguientes documentos aceptado por la DIAN:{" "}
            {DOCUMENTOS_QUE_CONSUMEN.join(", ").toLowerCase()}. Los documentos y eventos rechazados por la DIAN no se
            descuentan.
          </li>
          <li>
            Los documentos de un paquete se pueden usar durante {PACKAGE_TERMS.vigenciaMeses} meses contados desde su
            activación. Los que no se usen en ese plazo vencen y no son reembolsables.
          </li>
          <li>
            Al agotarse el paquete no podrás enviar ningún documento a la DIAN (facturas, notas crédito y débito,
            anulaciones, documentos soporte, nómina ni eventos sobre facturas recibidas) hasta comprar otro. Te enviamos
            un aviso por correo cuando uses el 90 % del paquete.
          </li>
          <li>
            Las devoluciones y el derecho de retracto se rigen por la{" "}
            <Link href="/reembolsos">política de reembolsos y retracto</Link>.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="obligaciones" title="5. Tus obligaciones">
        <ul>
          <li>Registrar información veraz, completa y actualizada, tanto de tu empresa como de tus clientes, proveedores y empleados.</li>
          <li>Tramitar ante la DIAN las resoluciones de numeración y habilitaciones que te correspondan, y mantenerlas vigentes.</li>
          <li>Revisar cada documento antes de enviarlo a la DIAN y atender las observaciones o rechazos que esta emita.</li>
          <li>Contar con autorización o una base legal válida para tratar los datos personales de los terceros que registres.</li>
          <li>No usar la plataforma para actividades ilícitas, para emitir documentos que no correspondan a operaciones reales, ni para intentar vulnerar su seguridad.</li>
        </ul>
      </LegalSection>

      <LegalSection id="disponibilidad" title="6. Disponibilidad del servicio">
        <p>
          Hacemos esfuerzos razonables para que la plataforma esté disponible de forma continua, pero no garantizamos que
          funcione sin interrupciones. Puede haber mantenimientos programados, y el servicio depende de sistemas de
          terceros que no controlamos, como la DIAN y el proveedor tecnológico. Si la DIAN no está disponible, los
          documentos podrán enviarse cuando se restablezca su servicio.
        </p>
      </LegalSection>

      <LegalSection id="responsabilidad" title="7. Responsabilidad">
        <p>
          Respondemos por el correcto funcionamiento de la plataforma conforme a estos términos. No respondemos por
          sanciones, intereses o perjuicios derivados de información incorrecta registrada por ti, de documentos que no
          hayas enviado a tiempo, de resoluciones vencidas o de la indisponibilidad de sistemas de terceros.
        </p>
        <p>
          En la medida en que la ley lo permita, nuestra responsabilidad total frente a ti se limita al valor que hayas
          pagado por los paquetes en los 12 meses anteriores al hecho que la origina. Esta limitación no aplica en casos de
          dolo o culpa grave, ni cuando una norma imperativa, como el Estatuto del Consumidor, disponga otra cosa.
        </p>
      </LegalSection>

      <LegalSection id="propiedad" title="8. Propiedad intelectual y tus datos">
        <p>
          El software, la marca IngeFact, los diseños y los contenidos de este sitio pertenecen a {RESPONSABLE}{" "}
          o a sus licenciantes. Te otorgamos un derecho de uso personal, no exclusivo e intransferible mientras tengas un
          paquete vigente.
        </p>
        <p>
          La información que registras y los documentos que emites son tuyos. Puedes descargar el PDF y el XML de cada
          documento desde la plataforma en cualquier momento mientras tu cuenta esté activa.
        </p>
      </LegalSection>

      <LegalSection id="datos-personales" title="9. Datos personales">
        <p>
          Tratamos tus datos según la <Link href="/privacidad">política de tratamiento de datos personales</Link>.
        </p>
        <p>
          Sobre los datos de terceros que registras (clientes, proveedores, empleados), tu empresa es la responsable y
          nosotros actuamos como encargados. Por eso nos comprometemos a: tratarlos solo para prestarte el servicio y
          según tus instrucciones; mantenerlos confidenciales y protegidos con medidas de seguridad razonables; no
          usarlos para fines propios; permitir que los consultes, corrijas o elimines desde la plataforma o a través de
          nuestro soporte; informarte si ocurre un incidente de seguridad que los afecte; y devolverlos o eliminarlos al
          terminar la relación, salvo lo que la ley obligue a conservar. Esta cláusula hace las veces del contrato de
          transmisión de datos previsto en el Decreto 1377 de 2013.
        </p>
      </LegalSection>

      <LegalSection id="terminacion" title="10. Suspensión y terminación">
        <p>
          Puedes dejar de usar el servicio cuando quieras. Podemos suspender o terminar una cuenta si se incumplen estos
          términos, en especial por uso fraudulento o ilícito, avisándote cuando sea posible. Al terminar, puedes pedirnos
          durante los 30 días siguientes una copia de los documentos emitidos; después eliminaremos la información,
          salvo la que debamos conservar por ley.
        </p>
      </LegalSection>

      <LegalSection id="cambios" title="11. Cambios a estos términos">
        <p>
          Podemos actualizar estos términos. Los cambios sustanciales se publicarán en este sitio y se avisarán por correo
          con al menos 15 días de anticipación. Los paquetes ya comprados conservan el precio y la vigencia pactados al
          momento de la compra.
        </p>
      </LegalSection>

      <LegalSection id="ley" title="12. Ley aplicable, PQR y controversias">
        <p>
          Estos términos se rigen por la ley colombiana. Puedes presentar peticiones, quejas y reclamos a{" "}
          <a href={`mailto:${BUSINESS.correo}`}>{BUSINESS.correo}</a>; respondemos en máximo 15 días hábiles. Si eres
          consumidor, puedes acudir a la Superintendencia de Industria y Comercio. Cualquier otra controversia se
          resolverá ante los jueces de la República de Colombia.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
