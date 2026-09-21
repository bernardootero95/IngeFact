import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import QRCode from "qrcode";
import { NumerosALetras } from "numero-a-letras";
import {
  getDocumentoSoporte,
  getProveedor,
  listPublicReferenceTable,
  obtenerFirmaDigitalDocumentoSoporte,
} from "@ingefact/core-api";
import { useCurrentEmpresa } from "../../../context/useCurrentEmpresa";
import { Button, ArrowLeftIcon } from "@ingefact/ui";

const MONEDA = "COP";

const formatCOP = (value) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);

const ESTADO_LABEL = {
  borrador: "Borrador — aún no enviado a la DIAN",
  aceptado: "Aceptado por la DIAN",
  rechazado: "Rechazado por la DIAN",
  enviado: "Enviado, esperando respuesta de la DIAN",
};

const montoEnLetras = (total) => {
  const texto = NumerosALetras(total, { plural: "PESOS", singular: "PESO", centPlural: "CENTAVOS", centSingular: "CENTAVO" });
  return texto.toUpperCase().replace(" DE ", " ").replace(" 00/100 M.N.", "");
};

const formatFechaHora = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const nombreCatalogo = (catalogo, code) => catalogo.find((item) => item.code === code)?.value || code;

export default function SupportDocumentRepresentationPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { empresa } = useCurrentEmpresa();

  const [documento, setDocumento] = useState(null);
  const [proveedor, setProveedor] = useState(null);
  const [catalogos, setCatalogos] = useState({});
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [firmaDigital, setFirmaDigital] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const documentoData = await getDocumentoSoporte(id);

      const [proveedorData, departamentos, municipios, tiposIdentificacion, formasPago, metodosPago] =
        await Promise.all([
          getProveedor(documentoData.proveedor_id),
          listPublicReferenceTable("departamentos").catch(() => []),
          listPublicReferenceTable("municipios").catch(() => []),
          listPublicReferenceTable("tipos_identificacion").catch(() => []),
          listPublicReferenceTable("formas_pago").catch(() => []),
          listPublicReferenceTable("metodos_pago").catch(() => []),
        ]);

      setDocumento(documentoData);
      setProveedor(proveedorData);
      setCatalogos({ departamentos, municipios, tiposIdentificacion, formasPago, metodosPago });

      if (documentoData.qr_code_content) {
        setQrDataUrl(await QRCode.toDataURL(documentoData.qr_code_content, { margin: 1, width: 180 }));
      }

      if (documentoData.cuds) {
        obtenerFirmaDigitalDocumentoSoporte(id)
          .then((data) => setFirmaDigital(data.firma_digital))
          .catch(() => setFirmaDigital(null));
      }
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  if (loading) {
    return <div className="p-12 text-center text-sm text-neutralCustom-500 animate-pulse">Cargando...</div>;
  }

  if (loadError) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <div className="p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
          {loadError}
        </div>
      </div>
    );
  }

  if (!documento) return null;

  const esBorrador = !documento.cuds;
  // Los documentos nuevos no llevan impuestos; solo los anteriores pueden traerlos.
  const tieneImpuestos = Number(documento.total_impuestos) > 0;
  const departamentoEmpresa = nombreCatalogo(catalogos.departamentos || [], empresa?.departamento);
  const municipioEmpresa = nombreCatalogo(catalogos.municipios || [], empresa?.municipio);
  const ubicacionProveedor = [
    nombreCatalogo(catalogos.departamentos || [], proveedor?.departamento),
    nombreCatalogo(catalogos.municipios || [], proveedor?.municipio),
    "Colombia",
  ].filter(Boolean);
  const celda = "py-1.5 px-2 border border-neutralCustom-300 align-top";

  return (
    <div className="min-h-screen bg-neutralCustom-100 font-sans">
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-neutralCustom-200 px-6 py-3 flex items-center justify-between">
        <Button
          onClick={() => navigate(`/support-documents/${id}`)}
          variant="ghost"
          icon={ArrowLeftIcon}
          title="Volver al detalle"
        >
          Volver
        </Button>
        <Button
          onClick={() => window.print()}
          variant="primary"
          title="Imprimir o guardar como PDF"
        >
          Imprimir
        </Button>
      </div>

      <div className="relative max-w-4xl mx-auto bg-white shadow-sm print:shadow-none my-6 print:my-0 p-8 text-sm text-neutralCustom-800 overflow-hidden">
        {esBorrador && (
          <div
            aria-hidden="true"
            className="pointer-events-none select-none absolute inset-0 flex items-center justify-center z-0"
          >
            <span className="text-[110px] font-extrabold text-fiscal-danger/10 -rotate-45 whitespace-nowrap">
              BORRADOR
            </span>
          </div>
        )}

        <div className="relative z-10">
          {esBorrador && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-300 text-amber-700 text-xs rounded-brand-md print:bg-transparent print:border-amber-500">
              Este documento es un <strong>borrador sin validez fiscal</strong> — todavía no se ha enviado a la DIAN.
              No tiene CUDS, código QR ni firma digital.
            </div>
          )}

          <div className="flex justify-between items-start border-b border-neutralCustom-200 pb-3 mb-3">
            <h1 className="text-base font-bold">
              Documento Soporte en Adquisiciones{" "}
              {documento.numero_completo ? `No. ${documento.numero_completo}` : "(Borrador)"}
              <span className="block text-xs font-normal text-neutralCustom-500 uppercase tracking-wide">
                Representación Gráfica
              </span>
            </h1>
            <div className="text-right text-xs text-neutralCustom-600 space-y-0.5">
              {documento.forma_pago && (
                <p>
                  <span className="font-semibold">Forma de pago:</span>{" "}
                  {nombreCatalogo(catalogos.formasPago || [], documento.forma_pago)}
                </p>
              )}
              {documento.metodo_pago && (
                <p>
                  <span className="font-semibold">Método de pago:</span>{" "}
                  {nombreCatalogo(catalogos.metodosPago || [], documento.metodo_pago)}
                </p>
              )}
              <p>
                <span className="font-semibold">Moneda:</span> {MONEDA}
              </p>
              <p>
                <span className="font-semibold">
                  {documento.fecha_envio ? "Fecha de Emisión:" : "Fecha del Documento:"}
                </span>{" "}
                {documento.fecha_envio ? formatFechaHora(documento.fecha_envio) : documento.fecha}
              </p>
              {documento.fecha_respuesta && (
                <p>
                  <span className="font-semibold">Fecha de Validación:</span> {formatFechaHora(documento.fecha_respuesta)}
                </p>
              )}
              <p>
                <span className="font-semibold">Estado:</span> {ESTADO_LABEL[documento.estado] || documento.estado}
              </p>
            </div>
          </div>

          <div className="flex gap-6 mb-4 pb-4 border-b border-neutralCustom-200">
            <div className="flex-1">
              <p className="text-xs font-semibold text-neutralCustom-500 uppercase mb-1">Adquiriente</p>
              <p className="font-semibold">{empresa?.razon_social}</p>
              <p>
                NIT {empresa?.numero_identificacion}-{empresa?.digito_verificacion}
              </p>
              {empresa?.direccion && <p>{empresa.direccion}</p>}
              {empresa?.telefono && <p>Tel: {empresa.telefono}</p>}
              {empresa?.correo_electronico && <p>{empresa.correo_electronico}</p>}
              <p>{[departamentoEmpresa, municipioEmpresa, "Colombia"].filter(Boolean).join(" · ")}</p>
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-neutralCustom-500 uppercase mb-1">Vendedor</p>
              <p className="font-semibold">{proveedor?.nombre}</p>
              <p>
                {nombreCatalogo(catalogos.tiposIdentificacion || [], proveedor?.tipo_identificacion)}{" "}
                {proveedor?.numero_identificacion}
                {proveedor?.digito_verificacion ? `-${proveedor.digito_verificacion}` : ""}
              </p>
              {proveedor?.direccion && <p>{proveedor.direccion}</p>}
              {proveedor?.telefono && <p>Tel: {proveedor.telefono}</p>}
              {proveedor?.correo_electronico && <p>{proveedor.correo_electronico}</p>}
              <p>{ubicacionProveedor.join(" · ")}</p>
            </div>
            {qrDataUrl && <img src={qrDataUrl} alt="Código QR de verificación DIAN" className="w-28 h-28 shrink-0" />}
          </div>

          <table className="w-full text-left text-xs mb-4 border-collapse border border-neutralCustom-300">
            <thead>
              <tr className="bg-neutralCustom-50 text-neutralCustom-500 uppercase">
                <th scope="col" className={`${celda} font-semibold`}>Cod</th>
                <th scope="col" className={`${celda} font-semibold`}>Descripción</th>
                <th scope="col" className={`${celda} text-right font-semibold`}>Cant.</th>
                <th scope="col" className={`${celda} text-right font-semibold`}>Precio Unit.</th>
                {tieneImpuestos && <th scope="col" className={`${celda} text-right font-semibold`}>Subtotal</th>}
                {tieneImpuestos && <th scope="col" className={`${celda} text-right font-semibold`}>IVA</th>}
                <th scope="col" className={`${celda} text-right font-semibold`}>Total</th>
              </tr>
            </thead>
            <tbody>
              {documento.lineas.map((linea) => (
                <tr key={linea.id}>
                  <td className={celda}>{linea.codigo || "-"}</td>
                  <td className={celda}>{linea.descripcion}</td>
                  <td className={`${celda} text-right`}>{linea.cantidad}</td>
                  <td className={`${celda} text-right`}>{formatCOP(linea.precio_unitario)}</td>
                  {tieneImpuestos && <td className={`${celda} text-right`}>{formatCOP(linea.subtotal_linea)}</td>}
                  {tieneImpuestos && <td className={`${celda} text-right`}>{formatCOP(linea.impuesto_linea)}</td>}
                  <td className={`${celda} text-right font-medium`}>{formatCOP(linea.total_linea)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between items-start gap-6 mb-4">
            <div className="flex-1 bg-neutralCustom-50 border border-neutralCustom-100 rounded-brand-md p-3">
              <p className="text-xs font-semibold text-neutralCustom-500 uppercase mb-1">Son</p>
              <p className="text-xs">{montoEnLetras(documento.total)}</p>
            </div>
            <div className="w-64 bg-brand-50 border border-brand-100 rounded-brand-md p-3 space-y-1">
              <p className="text-xs font-semibold text-neutralCustom-500 uppercase mb-1">Detalle del Documento</p>
              {tieneImpuestos && (
                <>
                  <div className="flex justify-between text-xs">
                    <span>Subtotal</span>
                    <span>{formatCOP(documento.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Impuestos</span>
                    <span>{formatCOP(documento.total_impuestos)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between font-bold text-sm border-t border-brand-200 pt-1">
                <span>Total</span>
                <span>
                  {formatCOP(documento.total)} {MONEDA}
                </span>
              </div>
            </div>
          </div>

          {documento.cuds && (
            <div className="text-xs text-neutralCustom-600 mb-4">
              <p className="font-semibold">CUDS:</p>
              <p className="break-all font-mono">{documento.cuds}</p>
            </div>
          )}

          {firmaDigital && (
            <div className="text-xs text-neutralCustom-500 mb-4 border-t border-neutralCustom-200 pt-3">
              <p className="font-semibold">Firma Digital:</p>
              <p className="break-all font-mono leading-tight">{firmaDigital}</p>
            </div>
          )}

          <div className="text-[10px] text-neutralCustom-500 text-center border-t border-neutralCustom-200 pt-3 space-y-0.5">
            <p>
              {documento.cuds
                ? "Documento generado por IngeFact — XML generado y firmado por el proveedor tecnológico: Alegra."
                : "Documento generado por IngeFact — vista previa de borrador, aún no enviado al proveedor tecnológico."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
