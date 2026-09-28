import { Link } from "react-router-dom";
import { PasoProveedor, PortalDian } from "./HabilitacionPasos";

/**
 * Tipos de habilitacion en el orden en que se muestran. Los pasos salen de
 * las guias oficiales de habilitacion del proveedor tecnologico.
 */
export const TIPOS_HABILITACION = {
  facturacion: {
    titulo: "Factura electrónica",
    descripcion: "Habilita la emisión de facturas, notas crédito y notas débito.",
    pasos: [
      <>
        Ingresa al <PortalDian /> y regístrate como facturador en <strong>Registro y habilitación</strong> &gt;{" "}
        <strong>Documentos electrónicos</strong>.
      </>,
      <>
        En <strong>Factura electrónica</strong>, <PasoProveedor software="el relacionado con Alegra" />
      </>,
      <>
        Abre el detalle del set de pruebas, copia el <strong>TestSetId</strong> y pégalo aquí.
      </>,
    ],
    despues: (
      <>
        Después solicita tu resolución de facturación electrónica en la DIAN, asocia sus prefijos al proveedor
        tecnológico y regístrala en{" "}
        <Link to="/settings/resolution" className="text-brand-600 underline underline-offset-2">
          Resoluciones DIAN
        </Link>
        .
      </>
    ),
  },
  nomina: {
    titulo: "Nómina electrónica",
    descripcion: "Habilita la emisión de comprobantes de nómina y sus anulaciones.",
    pasos: [
      <>
        Ingresa al <PortalDian />, ve a <strong>Registro y habilitación</strong> &gt;{" "}
        <strong>Documentos electrónicos</strong> &gt; <strong>Nómina electrónica</strong> &gt;{" "}
        <strong>Nómina electrónica y Nómina de ajuste</strong> y selecciona <strong>Emisor</strong>.
      </>,
      <>
        En <strong>Configurar modos de operación</strong>, <PasoProveedor software="Nómina Electrónica" />
      </>,
      <>
        Entra a <strong>Set de pruebas</strong>, copia el <strong>TestSetId</strong> y pégalo aquí.
      </>,
    ],
    despues: null,
  },
};
