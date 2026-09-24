import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";
import { BUSINESS } from "@/data/business";

export const metadata: Metadata = {
  title: "Política de tratamiento de datos personales",
  description: "Cómo IngeFact recolecta, usa y protege los datos personales, y cómo ejercer tus derechos como titular (Ley 1581 de 2012).",
  alternates: { canonical: "/privacidad" },
};

export default function PrivacidadPage() {
  return (
    <LegalPage
      title="Política de tratamiento de datos personales"
      intro={
        <p>
          Esta política explica cómo tratamos los datos personales de quienes visitan este sitio, de nuestros clientes y
          de las personas cuyos datos nuestros clientes registran en la plataforma, en cumplimiento de la Ley 1581 de
          2012, el Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015) y demás normas sobre protección de datos
          personales en Colombia.
        </p>
      }
    >
      <LegalSection id="responsable" title="1. Responsable del tratamiento">
        <ul>
          <li>Responsable: {BUSINESS.titular} ({BUSINESS.tipoPersona})</li>
          <li>Nombre comercial: {BUSINESS.nombreComercial}</li>
          <li>NIT: {BUSINESS.nit}</li>
          <li>Domicilio y dirección: {BUSINESS.direccion}, {BUSINESS.ciudad}</li>
          <li>
            Correo para asuntos de datos personales: <a href={`mailto:${BUSINESS.correoDatosPersonales}`}>{BUSINESS.correoDatosPersonales}</a>
          </li>
          <li>Teléfono: {BUSINESS.telefono}</li>
        </ul>
      </LegalSection>

      <LegalSection id="datos" title="2. Qué datos tratamos">
        <p>Según tu relación con nosotros, podemos tratar:</p>
        <ul>
          <li>
            <strong>Visitantes del sitio:</strong> este sitio no tiene formularios ni herramientas de analítica. Nuestro
            proveedor de alojamiento registra datos técnicos de cada solicitud (dirección IP, fecha, navegador) con fines
            de seguridad y funcionamiento.
          </li>
          <li>
            <strong>Personas que nos contactan:</strong> nombre, número de teléfono, correo y el contenido de los
            mensajes que nos envías por WhatsApp o correo.
          </li>
          <li>
            <strong>Clientes y sus usuarios:</strong> datos de la empresa (razón social, NIT, dirección, teléfono, correo)
            y del usuario de la plataforma (nombre, correo y contraseña, que guardamos cifrada de forma irreversible).
          </li>
          <li>
            <strong>Terceros registrados por nuestros clientes:</strong> datos de sus clientes, proveedores y empleados
            necesarios para emitir documentos electrónicos (identificación, nombre, dirección, correo, y en el caso de la
            nómina, salario, datos de pago, cuenta bancaria y novedades como incapacidades o vacaciones).
          </li>
        </ul>
        <p>
          No solicitamos datos sensibles de manera directa. Cuando un cliente registra información de nómina que pueda
          tener esa naturaleza (por ejemplo, una incapacidad), lo hace bajo su responsabilidad y solo para cumplir sus
          obligaciones ante la DIAN. Nuestros servicios no están dirigidos a niñas, niños ni adolescentes.
        </p>
      </LegalSection>

      <LegalSection id="finalidades" title="3. Para qué usamos los datos">
        <ul>
          <li>Responder tus consultas, cotizar y activar los paquetes que compres.</li>
          <li>Crear y administrar la cuenta de tu empresa, autenticar a sus usuarios y dar soporte.</li>
          <li>Generar y transmitir a la DIAN los documentos electrónicos que tu empresa emite, y enviarlos por correo a sus destinatarios cuando así lo indiques.</li>
          <li>Enviarte avisos del servicio: cambio de contraseña, documentos aceptados o rechazados, y consumo de tu paquete.</li>
          <li>Facturar nuestros servicios y cumplir obligaciones legales, contables y tributarias.</li>
          <li>Proteger la seguridad de la plataforma y prevenir fraudes.</li>
        </ul>
        <p>No vendemos ni cedemos datos personales, ni los usamos para publicidad de terceros.</p>
      </LegalSection>

      <LegalSection id="encargado" title="4. Datos que tu empresa registra en la plataforma">
        <p>
          Respecto de los datos de clientes, proveedores y empleados que tu empresa registra en IngeFact, tu empresa es
          la <strong>responsable</strong> del tratamiento e IngeFact actúa como <strong>encargado</strong>: los
          tratamos solo por cuenta de tu empresa y para prestar el servicio. Tu empresa debe contar con la autorización
          de esos titulares o con otra base legal que le permita tratarlos (por ejemplo, la relación laboral o una
          obligación legal). Los{" "}
          <Link href="/terminos#datos-personales">términos y condiciones</Link> regulan esta relación de encargo.
        </p>
      </LegalSection>

      <LegalSection id="transmision" title="5. Con quién compartimos los datos">
        <p>Solo compartimos datos con proveedores que nos ayudan a prestar el servicio y bajo compromisos de confidencialidad y seguridad:</p>
        <ul>
          <li>La DIAN y el proveedor tecnológico habilitado por la DIAN a través del cual se transmiten los documentos electrónicos.</li>
          <li>Proveedores de infraestructura en la nube (servidores, bases de datos, copias de seguridad y alojamiento del sitio).</li>
          <li>Proveedor de envío de correos electrónicos transaccionales.</li>
          <li>WhatsApp (Meta), únicamente cuando decides escribirnos por ese canal, bajo las condiciones de privacidad de ese servicio.</li>
          <li>Autoridades que lo soliciten en ejercicio de sus funciones legales.</li>
        </ul>
        <p>
          Algunos de estos proveedores almacenan o procesan los datos fuera de Colombia (por ejemplo, en la Unión
          Europea y en Estados Unidos). Esas transmisiones internacionales se hacen a países con niveles adecuados de
          protección o bajo contratos que exigen estándares equivalentes a los de la ley colombiana.
        </p>
      </LegalSection>

      <LegalSection id="derechos" title="6. Tus derechos como titular">
        <p>Conforme al artículo 8 de la Ley 1581 de 2012, tienes derecho a:</p>
        <ul>
          <li>Conocer, actualizar y rectificar tus datos personales.</li>
          <li>Solicitar prueba de la autorización otorgada, salvo cuando no sea necesaria según la ley.</li>
          <li>Ser informado sobre el uso que le damos a tus datos.</li>
          <li>Revocar la autorización o pedir la supresión de tus datos cuando no exista un deber legal o contractual de conservarlos.</li>
          <li>Acceder gratuitamente a tus datos.</li>
          <li>Presentar quejas ante la Superintendencia de Industria y Comercio, después de haber agotado el trámite ante nosotros.</li>
        </ul>
      </LegalSection>

      <LegalSection id="procedimiento" title="7. Cómo ejercer tus derechos">
        <p>
          Escríbenos a <a href={`mailto:${BUSINESS.correoDatosPersonales}`}>{BUSINESS.correoDatosPersonales}</a> con tu
          nombre, número de identificación, la descripción de tu solicitud, tu dirección de contacto y los documentos que
          quieras hacer valer.
        </p>
        <ul>
          <li>
            <strong>Consultas:</strong> respondemos en máximo 10 días hábiles. Si no es posible, te informamos el motivo y
            respondemos dentro de los 5 días hábiles siguientes.
          </li>
          <li>
            <strong>Reclamos</strong> (corrección, actualización, supresión o revocatoria): respondemos en máximo 15 días
            hábiles, prorrogables por 8 días hábiles más informándote el motivo. Si el reclamo está incompleto, dentro de los 5
            días siguientes a recibirlo te pediremos completarlo; si pasan 2 meses sin que lo hagas, se entenderá que
            desististe.
          </li>
        </ul>
        <p>
          Si la solicitud se refiere a datos que una empresa cliente registró en IngeFact (por ejemplo, eres empleado o
          cliente de esa empresa), la trasladaremos a esa empresa, que es la responsable, y te informaremos.
        </p>
      </LegalSection>

      <LegalSection id="seguridad" title="8. Seguridad y conservación">
        <p>
          Aplicamos medidas técnicas y administrativas razonables: conexiones cifradas (HTTPS), contraseñas cifradas de
          forma irreversible, separación de la información de cada empresa, acceso restringido a los servidores y copias
          de seguridad periódicas. Ningún sistema es completamente infalible; si ocurre un incidente que afecte tus datos,
          lo informaremos a los afectados y a la Superintendencia de Industria y Comercio según la ley.
        </p>
        <p>
          Conservamos los datos mientras exista la relación con el cliente y, después, durante el tiempo que exijan las
          normas tributarias, contables y comerciales sobre conservación de documentos electrónicos.
        </p>
      </LegalSection>

      <LegalSection id="cambios" title="9. Vigencia y cambios">
        <p>
          Esta política rige desde la fecha de actualización indicada arriba. Si la cambiamos de manera sustancial, lo
          publicaremos en este sitio y avisaremos a nuestros clientes por correo antes de aplicar los cambios.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
