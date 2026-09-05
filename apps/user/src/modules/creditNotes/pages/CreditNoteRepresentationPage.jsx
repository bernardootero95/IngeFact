import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import QRCode from "qrcode";
import { NumerosALetras } from "numero-a-letras";
import {
  getNotaCredito,
  getCliente,
  listPublicReferenceTable,
  obtenerFirmaDigitalNotaCredito,
} from "@ingefact/core-api";
import { useCurrentEmpresa } from "../../../context/useCurrentEmpresa";

const MONEDA = "COP";

const formatCOP = (value) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);

const ESTADO_LABEL = {
  borrador: "Borrador — aún no enviada a la DIAN",
  aceptada: "Aceptada por la DIAN",
  rechazada: "Rechazada por la DIAN",
  enviada: "Enviada, esperando respuesta de la DIAN",
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

const agruparImpuestos = (lineas, tributos) => {
  const grupos = new Map();
  for (const linea of lineas) {
    if (!linea.tributo || Number(linea.impuesto_linea) <= 0) continue;
    const key = `${linea.tributo}-${linea.tarifa_impuesto}`;
    const nombreTributo = nombreCatalogo(tributos, linea.tributo);
    const existente = grupos.get(key);
    if (existente) {
      existente.monto += Number(linea.impuesto_linea);
    } else {
      grupos.set(key, { label: `${nombreTributo} ${linea.tarifa_impuesto}%`, monto: Number(linea.impuesto_linea) });
    }
  }
  return Array.from(grupos.values());
};

export default function CreditNoteRepresentationPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { empresa } = useCurrentEmpresa();

  const [nota, setNota] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [departamentoNombre, setDepartamentoNombre] = useState(null);
  const [municipioNombre, setMunicipioNombre] = useState(null);
  const [motivoNombre, setMotivoNombre] = useState(null);
  const [impuestos, setImpuestos] = useState([]);
  const [firmaDigital, setFirmaDigital] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const notaData = await getNotaCredito(id);

      const [clienteData, departamentos, municipios, tributos, motivos] = await Promise.all([
        getCliente(notaData.cliente_id),
        listPublicReferenceTable("departamentos").catch(() => []),
        listPublicReferenceTable("municipios").catch(() => []),
        listPublicReferenceTable("tributos").catch(() => []),
        listPublicReferenceTable("conceptos_nota_credito").catch(() => []),
      ]);

      setNota(notaData);
      setCliente(clienteData);
      setDepartamentoNombre(nombreCatalogo(departamentos, empresa?.departamento));
      setMunicipioNombre(nombreCatalogo(municipios, empresa?.municipio));
      setMotivoNombre(nombreCatalogo(motivos, notaData.motivo_codigo));
      setImpuestos(agruparImpuestos(notaData.lineas, tributos));

      if (notaData.qr_code_content) {
        const dataUrl = await QRCode.toDataURL(notaData.qr_code_content, { margin: 1, width: 180 });
        setQrDataUrl(dataUrl);
      }

      if (notaData.cude) {
        obtenerFirmaDigitalNotaCredito(id)
          .then((data) => setFirmaDigital(data.firma_digital))
          .catch(() => setFirmaDigital(null));
      }
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, [id, empresa]);

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

  if (!nota) return null;

  return (
    <div className="min-h-screen bg-neutralCustom-100 font-sans">
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-neutralCustom-200 px-6 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate(`/credit-notes/${id}`)}
          className="px-4 py-2 text-neutralCustom-600 hover:bg-neutralCustom-100 text-sm font-medium rounded-brand-md transition-colors"
        >
          ← Volver a la nota crédito
        </button>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-brand-md transition-colors"
        >
          Imprimir / Guardar como PDF
        </button>
      </div>

      <div className="relative max-w-4xl mx-auto bg-white shadow-sm print:shadow-none my-6 print:my-0 p-8 text-sm text-neutralCustom-800 overflow-hidden">
        {!nota.cude && (
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
        {!nota.cude && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-300 text-amber-700 text-xs rounded-brand-md print:bg-transparent print:border-amber-500">
            Este documento es un <strong>borrador sin validez fiscal</strong> — todavía no se ha enviado a la DIAN.
            No tiene CUDE, código QR ni firma digital.
          </div>
        )}

        <div className="flex justify-between items-start border-b border-neutralCustom-200 pb-3 mb-3">
          <h1 className="text-base font-bold">
            Nota Crédito Electrónica {nota.numero_completo ? `No. ${nota.numero_completo}` : "(Borrador)"}
            <span className="block text-xs font-normal text-neutralCustom-500 uppercase tracking-wide">
              Representación Gráfica
            </span>
          </h1>
          <div className="text-right text-xs text-neutralCustom-600 space-y-0.5">
            <p>
              <span className="font-semibold">Motivo:</span> {motivoNombre || "-"}
            </p>
            <p>
              <span className="font-semibold">Moneda:</span> {MONEDA}
            </p>
            <p>
              <span className="font-semibold">{nota.fecha_envio ? "Fecha de Emisión:" : "Fecha del Documento:"}</span>{" "}
              {nota.fecha_envio ? formatFechaHora(nota.fecha_envio) : nota.fecha}
            </p>
            {nota.fecha_respuesta && (
              <p>
                <span className="font-semibold">Fecha de Validación:</span> {formatFechaHora(nota.fecha_respuesta)}
              </p>
            )}
            <p>
              <span className="font-semibold">Estado:</span> {ESTADO_LABEL[nota.estado] || nota.estado}
            </p>
          </div>
        </div>

        <div className="mb-4 pb-4 border-b border-neutralCustom-200 bg-brand-50 border border-brand-400 rounded-brand-md p-3">
          <p className="text-xs font-semibold text-brand-600 uppercase mb-1">Documento Afectado</p>
          <p className="font-semibold">Factura Electrónica No. {nota.factura_numero_completo}</p>
          {nota.factura_cufe && <p className="text-xs font-mono break-all text-neutralCustom-600">CUFE: {nota.factura_cufe}</p>}
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
            <p>{[departamentoNombre, municipioNombre, "Colombia"].filter(Boolean).join(" · ")}</p>
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
          {qrDataUrl && <img src={qrDataUrl} alt="Código QR de verificación DIAN" className="w-28 h-28 shrink-0" />}
        </div>

        <table className="w-full text-left text-xs mb-4">
          <thead>
            <tr className="border-b border-neutralCustom-300 text-neutralCustom-500 uppercase">
              <th className="py-1.5 font-semibold">Cod</th>
              <th className="py-1.5 font-semibold">Descripción</th>
              <th className="py-1.5 text-right font-semibold">Cant.</th>
              <th className="py-1.5 text-right font-semibold">Precio Unit.</th>
              <th className="py-1.5 text-right font-semibold">Subtotal</th>
              <th className="py-1.5 text-right font-semibold">IVA</th>
              <th className="py-1.5 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutralCustom-100">
            {nota.lineas.map((linea) => (
              <tr key={linea.id}>
                <td className="py-1.5">{linea.codigo || "-"}</td>
                <td className="py-1.5">{linea.descripcion}</td>
                <td className="py-1.5 text-right">{linea.cantidad}</td>
                <td className="py-1.5 text-right">{formatCOP(linea.precio_unitario)}</td>
                <td className="py-1.5 text-right">{formatCOP(linea.subtotal_linea)}</td>
                <td className="py-1.5 text-right">{formatCOP(linea.impuesto_linea)}</td>
                <td className="py-1.5 text-right font-medium">{formatCOP(linea.total_linea)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between items-start gap-6 mb-4">
          <div className="flex-1 bg-neutralCustom-50 border border-neutralCustom-100 rounded-brand-md p-3">
            <p className="text-xs font-semibold text-neutralCustom-500 uppercase mb-1">Son</p>
            <p className="text-xs">{montoEnLetras(nota.total)}</p>
          </div>
          <div className="w-64 bg-brand-50 border border-brand-100 rounded-brand-md p-3 space-y-1">
            <p className="text-xs font-semibold text-neutralCustom-500 uppercase mb-1">Detalle de la Nota</p>
            <div className="flex justify-between text-xs">
              <span>Subtotal</span>
              <span>{formatCOP(nota.subtotal)}</span>
            </div>
            {impuestos.map((impuesto) => (
              <div key={impuesto.label} className="flex justify-between text-xs">
                <span>{impuesto.label}</span>
                <span>{formatCOP(impuesto.monto)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-sm border-t border-brand-200 pt-1">
              <span>Total</span>
              <span>
                {formatCOP(nota.total)} {MONEDA}
              </span>
            </div>
          </div>
        </div>

        {nota.cude && (
          <div className="text-xs text-neutralCustom-600 mb-4">
            <p className="font-semibold">CUDE:</p>
            <p className="break-all font-mono">{nota.cude}</p>
          </div>
        )}

        {firmaDigital && (
          <div className="text-xs text-neutralCustom-500 mb-4 border-t border-neutralCustom-200 pt-3">
            <p className="font-semibold">Firma Digital:</p>
            <p className="break-all font-mono leading-tight">{firmaDigital}</p>
          </div>
        )}

        <div className="text-[10px] text-neutralCustom-400 text-center border-t border-neutralCustom-200 pt-3 space-y-0.5">
          <p>
            {nota.cude
              ? "Documento generado por IngeFact — XML generado y firmado por el proveedor tecnológico: Alegra."
              : "Documento generado por IngeFact — vista previa de borrador, aún no enviado al proveedor tecnológico."}
          </p>
        </div>
        </div>
      </div>
    </div>
  );
}
