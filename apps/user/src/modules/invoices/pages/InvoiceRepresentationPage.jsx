import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import QRCode from "qrcode";
import { getFactura, getCliente, getResolucionDian } from "@ingefact/core-api";
import { useCurrentEmpresa } from "../../../context/useCurrentEmpresa";

const formatCOP = (value) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);

const ESTADO_LABEL = {
  aceptada: "Aceptada por la DIAN",
  rechazada: "Rechazada por la DIAN",
  enviada: "Enviada, esperando respuesta de la DIAN",
};

export default function InvoiceRepresentationPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { empresa } = useCurrentEmpresa();

  const [factura, setFactura] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [resolucion, setResolucion] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
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

      const [clienteData, resolucionData] = await Promise.all([
        getCliente(facturaData.cliente_id),
        getResolucionDian().catch(() => null),
      ]);

      setFactura(facturaData);
      setCliente(clienteData);
      setResolucion(resolucionData);

      if (facturaData.qr_code_content) {
        const dataUrl = await QRCode.toDataURL(facturaData.qr_code_content, { margin: 1, width: 180 });
        setQrDataUrl(dataUrl);
      }
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

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

      <div className="max-w-3xl mx-auto bg-white shadow-sm print:shadow-none my-6 print:my-0 p-8 text-sm text-neutralCustom-800">
        <div className="text-center border-b border-neutralCustom-200 pb-4 mb-4">
          <h1 className="text-base font-bold uppercase tracking-wide">
            Representación Gráfica de Factura Electrónica de Venta
          </h1>
          <p className="text-lg font-bold text-brand-600 mt-1">{factura.numero_completo}</p>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-4">
          <div>
            <p className="text-xs font-semibold text-neutralCustom-500 uppercase mb-1">Datos del emisor</p>
            <p className="font-semibold">{empresa?.razon_social}</p>
            <p>NIT {empresa?.numero_identificacion}-{empresa?.digito_verificacion}</p>
            {empresa?.direccion && <p>{empresa.direccion}</p>}
            {empresa?.telefono && <p>Tel: {empresa.telefono}</p>}
            {empresa?.correo_electronico && <p>{empresa.correo_electronico}</p>}
          </div>
          <div>
            <p className="text-xs font-semibold text-neutralCustom-500 uppercase mb-1">Datos del adquiriente</p>
            <p className="font-semibold">{cliente?.nombre}</p>
            <p>
              {cliente?.tipo_identificacion} {cliente?.numero_identificacion}
            </p>
            {cliente?.correo_electronico && <p>{cliente.correo_electronico}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-4 pb-4 border-b border-neutralCustom-200">
          <div>
            <p className="text-xs font-semibold text-neutralCustom-500 uppercase mb-1">Factura</p>
            <p>Número: {factura.numero_completo}</p>
            <p>Fecha: {factura.fecha}</p>
            <p>Estado: {ESTADO_LABEL[factura.estado] || factura.estado}</p>
          </div>
          {resolucion && (
            <div>
              <p className="text-xs font-semibold text-neutralCustom-500 uppercase mb-1">Resolución DIAN</p>
              <p>No. {resolucion.numero_resolucion}</p>
              <p>
                Rango autorizado: {resolucion.prefijo}
                {resolucion.rango_minimo} — {resolucion.prefijo}
                {resolucion.rango_maximo}
              </p>
              <p>
                Vigencia: {resolucion.fecha_inicio} a {resolucion.fecha_fin}
              </p>
            </div>
          )}
        </div>

        <table className="w-full text-left text-xs mb-4">
          <thead>
            <tr className="border-b border-neutralCustom-300 text-neutralCustom-500 uppercase">
              <th className="py-1.5 font-semibold">Descripción</th>
              <th className="py-1.5 text-right font-semibold">Cant.</th>
              <th className="py-1.5 text-right font-semibold">Precio Unit.</th>
              <th className="py-1.5 text-right font-semibold">Impuesto</th>
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

        <div className="flex justify-between items-start pb-4 mb-4 border-b border-neutralCustom-200">
          <div className="text-xs">
            <p className="text-neutralCustom-500">Forma de pago: {factura.forma_pago || "-"}</p>
            <p className="text-neutralCustom-500">Método de pago: {factura.metodo_pago || "-"}</p>
          </div>
          <div className="w-56 space-y-1">
            <div className="flex justify-between">
              <span className="text-neutralCustom-500">Subtotal</span>
              <span>{formatCOP(factura.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutralCustom-500">Total impuestos</span>
              <span>{formatCOP(factura.total_impuestos)}</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t border-neutralCustom-200 pt-1">
              <span>Total</span>
              <span>{formatCOP(factura.total)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-6">
          {qrDataUrl && <img src={qrDataUrl} alt="Código QR de verificación DIAN" className="w-32 h-32 shrink-0" />}
          <div className="text-xs text-neutralCustom-600 space-y-1">
            <p>
              <span className="font-semibold">CUFE:</span> <span className="break-all font-mono">{factura.cufe}</span>
            </p>
            <p className="text-neutralCustom-500">
              Este documento es una representación gráfica de una Factura Electrónica de Venta. Consulte el
              documento electrónico y su validez en el portal de la DIAN escaneando el código QR.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
