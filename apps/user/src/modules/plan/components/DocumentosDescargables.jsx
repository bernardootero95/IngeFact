import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listDocumentosSoporte,
  listFacturas,
  listNomina,
  listNotasCredito,
  listNotasDebito,
  obtenerRepresentacionPdfDocumentoSoporte,
  obtenerRepresentacionPdfFactura,
  obtenerRepresentacionPdfNomina,
  obtenerRepresentacionPdfNotaCredito,
  obtenerRepresentacionPdfNotaDebito,
  obtenerUrlXmlDocumentoSoporte,
  obtenerUrlXmlFactura,
  obtenerUrlXmlNomina,
  obtenerUrlXmlNotaCredito,
  obtenerUrlXmlNotaDebito,
} from "@ingefact/core-api";
import { Button, Pagination, SortableTh, TableSkeleton, filterItems, useTableView } from "@ingefact/ui";
import { formatoFecha, tieneArchivosDian } from "../planEstado";

const formatCOP = (valor) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(valor ?? 0);

/** Cada tipo de documento: de donde sale la lista y como se bajan sus archivos. */
const TIPOS = [
  {
    id: "facturas",
    label: "Facturas",
    listar: () => listFacturas(),
    tercero: (d) => d.cliente_nombre,
    pdf: obtenerRepresentacionPdfFactura,
    xml: obtenerUrlXmlFactura,
  },
  {
    id: "notas-credito",
    label: "Notas crédito",
    listar: () => listNotasCredito(),
    tercero: (d) => d.cliente_nombre,
    pdf: obtenerRepresentacionPdfNotaCredito,
    xml: obtenerUrlXmlNotaCredito,
  },
  {
    id: "notas-debito",
    label: "Notas débito",
    listar: () => listNotasDebito(),
    tercero: (d) => d.cliente_nombre,
    pdf: obtenerRepresentacionPdfNotaDebito,
    xml: obtenerUrlXmlNotaDebito,
  },
  {
    id: "documentos-soporte",
    label: "Documentos soporte",
    listar: () => listDocumentosSoporte(),
    tercero: (d) => d.proveedor_nombre,
    pdf: obtenerRepresentacionPdfDocumentoSoporte,
    xml: obtenerUrlXmlDocumentoSoporte,
  },
  {
    id: "nomina",
    label: "Nómina",
    listar: () => listNomina(),
    tercero: (d) => d.empleado_nombre,
    fecha: (d) => d.fecha_liquidacion_fin,
    total: (d) => d.comprobante_total,
    pdf: obtenerRepresentacionPdfNomina,
    xml: obtenerUrlXmlNomina,
  },
];

function aFila(tipo, documento) {
  return {
    id: documento.id,
    numero: documento.numero_completo || "Sin número",
    fecha: tipo.fecha ? tipo.fecha(documento) : documento.fecha,
    tercero: tipo.tercero(documento) || "",
    total: tipo.total ? tipo.total(documento) : documento.total,
    conArchivos: tieneArchivosDian(documento),
  };
}

async function abrirPdf(obtener, id) {
  const blob = await obtener(id);
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

async function abrirXml(obtener, id) {
  const { url } = await obtener(id);
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * PDF y XML de los documentos emitidos ante la DIAN, por tipo. Es lo que el
 * cliente con plan vencido puede seguir bajando (obligacion de conservar sus
 * documentos electronicos). Solo lista los que tienen codigo DIAN: los
 * borradores no tienen archivos reales.
 */
export default function DocumentosDescargables({ onError }) {
  const [tipoId, setTipoId] = useState(TIPOS[0].id);
  const [filas, setFilas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [descargando, setDescargando] = useState(null);
  const tipo = TIPOS.find((t) => t.id === tipoId);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const lista = await tipo.listar();
      setFilas((lista || []).map((d) => aFila(tipo, d)).filter((f) => f.conArchivos));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tipo]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const visibles = useMemo(() => filterItems(filas, ["numero", "tercero"], busqueda), [filas, busqueda]);
  const view = useTableView(visibles, { initialSort: { key: "fecha", dir: "desc" } });

  const descargar = async (accion, fila) => {
    setDescargando(`${accion}:${fila.id}`);
    try {
      if (accion === "pdf") await abrirPdf(tipo.pdf, fila.id);
      else await abrirXml(tipo.xml, fila.id);
    } catch (err) {
      onError?.(err.message);
    } finally {
      setDescargando(null);
    }
  };

  return (
    <div>
      <div role="tablist" aria-label="Tipo de documento" className="flex gap-1 overflow-x-auto overflow-y-hidden shadow-[inset_0_-1px_0_theme(colors.neutralCustom.100)]">
        {TIPOS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === tipoId}
            onClick={() => {
              setTipoId(t.id);
              setBusqueda("");
            }}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
              t.id === tipoId
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-neutralCustom-500 hover:text-neutralCustom-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="py-4">
        <label htmlFor="buscar-documento" className="sr-only">
          Buscar documento
        </label>
        <input
          id="buscar-documento"
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por número o nombre..."
          className="field w-full sm:max-w-xs"
        />
      </div>

      {loading ? (
        <TableSkeleton columns={5} label="Cargando documentos..." />
      ) : error ? (
        <div role="alert" className="flex items-center justify-between gap-4 rounded-brand-md bg-red-50 p-4 text-sm text-fiscal-danger">
          <span>No se pudieron cargar los documentos: {error}</span>
          <Button variant="danger" size="sm" onClick={cargar}>
            Reintentar
          </Button>
        </div>
      ) : filas.length === 0 ? (
        <p className="py-8 text-center text-sm text-neutralCustom-500">No tienes {tipo.label.toLowerCase()} emitidas ante la DIAN.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-brand-md border border-neutralCustom-100">
            <table className="w-full text-left text-sm text-neutralCustom-600">
              <thead className="border-b border-neutralCustom-100 bg-neutralCustom-50 text-xs uppercase text-neutralCustom-500">
                <tr>
                  <SortableTh sortKey="numero" sort={view.sort} onSort={view.toggleSort}>Número</SortableTh>
                  <SortableTh sortKey="fecha" sort={view.sort} onSort={view.toggleSort}>Fecha</SortableTh>
                  <SortableTh sortKey="tercero" sort={view.sort} onSort={view.toggleSort}>Tercero</SortableTh>
                  <SortableTh sortKey="total" sort={view.sort} onSort={view.toggleSort} align="right">Total</SortableTh>
                  <th scope="col" className="px-6 py-3 text-right font-semibold">
                    Descargar
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutralCustom-100">
                {view.rows.map((fila) => (
                  <tr key={fila.id}>
                    <td className="whitespace-nowrap px-6 py-3 font-medium text-neutralCustom-800">{fila.numero}</td>
                    <td className="whitespace-nowrap px-6 py-3 tabular-nums">{formatoFecha(fila.fecha)}</td>
                    <td className="min-w-[180px] px-6 py-3">{fila.tercero}</td>
                    <td className="whitespace-nowrap px-6 py-3 text-right tabular-nums">{formatCOP(fila.total)}</td>
                    <td className="whitespace-nowrap px-6 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={descargando === `pdf:${fila.id}`}
                          onClick={() => descargar("pdf", fila)}
                          aria-label={`Descargar PDF de ${fila.numero}`}
                        >
                          PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={descargando === `xml:${fila.id}`}
                          onClick={() => descargar("xml", fila)}
                          aria-label={`Descargar XML de ${fila.numero}`}
                        >
                          XML
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination {...view.pagination} />
        </>
      )}
    </div>
  );
}
