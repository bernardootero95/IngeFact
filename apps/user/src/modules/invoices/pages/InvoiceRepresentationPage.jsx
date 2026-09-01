import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import QRCode from "qrcode";
import { NumerosALetras } from "numero-a-letras";
import {
  getFactura,
  getCliente,
  getResolucionDian,
  listPublicReferenceTable,
  obtenerFirmaDigitalFactura,
} from "@ingefact/core-api";
import { useCurrentEmpresa } from "../../../context/useCurrentEmpresa";

const formatCOP = (value) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);

const ESTADO_LABEL = {
  aceptada: "Aceptada por la DIAN",
  rechazada: "Rechazada por la DIAN",
  enviada: "Enviada, esperando respuesta de la DIAN",
};

const montoEnLetras = (total) => {
  const texto = NumerosALetras(total, { plural: "PESOS", singular: "PESO", centPlural: "CENTAVOS", centSingular: "CENTAVO" });
  return texto.toUpperCase().replace(" DE ", " ").replace(" 00/100 M.N.", "");
};

export default function InvoiceRepresentationPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { empresa } = useCurrentEmpresa();

  const [factura, setFactura] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [resolucion, setResolucion] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [departamentoNombre, setDepartamentoNombre] = useState(null);
  const [municipioNombre, setMunicipioNombre] = useState(null);
  const [firmaDigital, setFirmaDigital] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const facturaData = await getFactura(id);
      if (!facturaData.cufe) {
        navigate(`/invoices/${id}`, { replace: true });
        return;
      }

      const [clienteData, resolucionData, departamentos, municipios] = await Promise.all([
        getCliente(facturaData.cliente_id),
        getResolucionDian().catch(() => null),
        listPublicReferenceTable("departamentos").catch(() => []),
        listPublicReferenceTable("municipios").catch(() => []),
      ]);

      setFactura(facturaData);
      setCliente(clienteData);
      setResolucion(resolucionData);
      setDepartamentoNombre(departamentos.find((d) => d.code === empresa?.departamento)?.value || null);
      setMunicipioNombre(municipios.find((m) => m.code === empresa?.municipio)?.value || null);

      if (facturaData.qr_code_content) {
        const dataUrl = await QRCode.toDataURL(facturaData.qr_code_content, { margin: 1, width: 180 });
        setQrDataUrl(dataUrl);
      }

      obtenerFirmaDigitalFactura(id)
        .then((data) => setFirmaDigital(data.firma_digital))
        .catch(() => setFirmaDigital(null));
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, [id, navigate, empresa]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  if (loading) {
    return <div className="p-12 text-center text-sm text-neutralCustom-500 animate-pulse">Cargando...</div>;
  }

  if (loadError) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
          {loadError}
        </div>
      </div>
    );
  }

  if (!factura) return null;

  return (
    <div className="min-h-screen bg-neutralCustom-100 font-sans">
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-neutralCustom-200 px-6 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate(`/invoices/${id}`)}
          className="px-4 py-2 text-neutralCustom-600 hover:bg-neutralCustom-100 text-sm font-medium rounded-brand-md transition-colors"
        >
          ← Volver a la factura
        </button>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-brand-md transition-colors"
        >
          Imprimir / Guardar como PDF
        </button>
      </div>

      <div className="max-w-4xl mx-auto bg-white shadow-sm print:shadow-none my-6 print:my-0 p-8 text-sm text-neutralCustom-800">
        <div className="flex justify-between items-start border-b border-neutralCustom-200 pb-3 mb-3">
          <h1 className="text-base font-bold">
            Factura Electrónica de Venta No. {factura.numero_completo}
            <span className="block text-xs font-normal text-neutralCustom-500 uppercase tracking-wide">
              Representación Gráfica
            </span>
          </h1>
          <div className="text-right text-xs text-neutralCustom-600 space-y-0.5">
            <p>
              <span className="font-semibold">Forma de Pago:</span> {factura.forma_pago || "-"}
            </p>
            <p>
              <span className="font-semibold">Método de Pago:</span> {factura.metodo_pago || "-"}
            </p>
            <p>
              <span className="font-semibold">Moneda:</span> COP
            </p>
            <p>
              <span className="font-semibold">Total de Líneas:</span> {factura.lineas.length}
            </p>
            <p>
              <span className="font-semibold">Fecha de Emisión:</span> {factura.fecha}
            </p>
            {factura.fecha_respuesta && (
              <p>
                <span className="font-semibold">Fecha de Validación:</span>{" "}
                {new Date(factura.fecha_respuesta).toLocaleString("es-CO")}
              </p>
            )}
            <p>
              <span className="font-semibold">Estado:</span> {ESTADO_LABEL[factura.estado] || factura.estado}
            </p>
          </div>
        </div>

        <div className="flex gap-6 mb-4 pb-4 border-b border-neutralCustom-200">
          <div className="flex-1">
            <p className="text-xs font-semibold text-neutralCustom-500 uppercase mb-1">Emisor</p>
            <p className="font-semibold">{empresa?.razon_social}</p>
            <p>
              NIT {empresa?.numero_identificacion}-{empresa?.digito_verificacion}
            </p>
            {empresa?.direccion && <p>{empresa.direccion}</p>}
            {empresa?.telefono && <p>Tel: {empresa.telefono}</p>}
            {empresa?.correo_electronico && <p>{empresa.correo_electronico}</p>}
            <p>
              {[departamentoNombre, municipioNombre, "Colombia"].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-neutralCustom-500 uppercase mb-1">Adquiriente</p>
            <p className="font-semibold">{cliente?.nombre}</p>
            <p>
              {cliente?.tipo_identificacion} {cliente?.numero_identificacion}
            </p>
            {cliente?.correo_electronico && <p>{cliente.correo_electronico}</p>}
            {cliente?.telefono && <p>Tel: {cliente.telefono}</p>}
            {cliente?.tributo && <p>Responsabilidad Tributaria: {cliente.tributo}</p>}
          </div>
          {qrDataUrl && (
            <img src={qrDataUrl} alt="Código QR de verificación DIAN" className="w-28 h-28 shrink-0" />
          )}
        </div>

        {resolucion && (
          <div className="text-xs text-neutralCustom-600 mb-4">
            <span className="font-semibold">Resolución DIAN:</span> No. {resolucion.numero_resolucion} — Rango
            autorizado {resolucion.prefijo}
            {resolucion.rango_minimo} a {resolucion.prefijo}
            {resolucion.rango_maximo} — Vigencia {resolucion.fecha_inicio} a {resolucion.fecha_fin}
          </div>
        )}

        <table className="w-full text-left text-xs mb-4">
          <thead>
            <tr className="border-b border-neutralCustom-300 text-neutralCustom-500 uppercase">
              <th className="py-1.5 font-semibold">Descripción</th>
              <th className="py-1.5 text-right font-semibold">Cant.</th>
              <th className="py-1.5 text-right font-semibold">Precio Unit.</th>
              <th className="py-1.5 text-right font-semibold">IVA</th>
              <th className="py-1.5 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutralCustom-100">
            {factura.lineas.map((linea) => (
              <tr key={linea.id}>
                <td className="py-1.5">{linea.descripcion}</td>
                <td className="py-1.5 text-right">{linea.cantidad}</td>
                <td className="py-1.5 text-right">{formatCOP(linea.precio_unitario)}</td>
                <td className="py-1.5 text-right">{formatCOP(linea.impuesto_linea)}</td>
                <td className="py-1.5 text-right font-medium">{formatCOP(linea.total_linea)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between items-start gap-6 mb-4">
          <div className="flex-1 bg-neutralCustom-50 border border-neutralCustom-100 rounded-brand-md p-3">
            <p className="text-xs font-semibold text-neutralCustom-500 uppercase mb-1">Son</p>
            <p className="text-xs">{montoEnLetras(factura.total)}</p>
          </div>
          <div className="w-64 bg-brand-50 border border-brand-100 rounded-brand-md p-3 space-y-1">
            <p className="text-xs font-semibold text-neutralCustom-500 uppercase mb-1">Detalle de Venta</p>
            <div className="flex justify-between text-xs">
              <span>Subtotal</span>
              <span>{formatCOP(factura.subtotal)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Monto IVA</span>
              <span>{formatCOP(factura.total_impuestos)}</span>
            </div>
            <div className="flex justify-between font-bold text-sm border-t border-brand-200 pt-1">
              <span>Total a Pagar</span>
              <span>{formatCOP(factura.total)}</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-neutralCustom-600 mb-4">
          <p className="font-semibold">CUFE:</p>
          <p className="break-all font-mono">{factura.cufe}</p>
        </div>

        {firmaDigital && (
          <div className="text-xs text-neutralCustom-500 mb-4 border-t border-neutralCustom-200 pt-3">
            <p className="font-semibold">Firma Digital:</p>
            <p className="break-all font-mono leading-tight">{firmaDigital}</p>
          </div>
        )}

        <div className="text-[10px] text-neutralCustom-400 text-center border-t border-neutralCustom-200 pt-3 space-y-0.5">
          {resolucion && (
            <p>
              Autorizado DIAN para la Facturación Electrónica mediante la resolución {resolucion.numero_resolucion}{" "}
              entre los rangos de facturación del {resolucion.rango_minimo} al {resolucion.rango_maximo} usando el
              prefijo {resolucion.prefijo}, con vigencia entre las fechas {resolucion.fecha_inicio} al{" "}
              {resolucion.fecha_fin}.
            </p>
          )}
          <p>Documento generado por IngeFact — XML generado y firmado por el proveedor tecnológico: Alegra.</p>
        </div>
      </div>
    </div>
  );
}
