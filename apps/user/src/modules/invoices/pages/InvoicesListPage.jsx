import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { listFacturas, obtenerRepresentacionPdfFactura, enviarFacturaPorCorreo } from "@ingefact/core-api";
import { ToastAlert, Button, IconButton, TableSkeleton, useTableView, SortableTh, Pagination, ClickableRow } from "@ingefact/ui";
import Sidebar from "../../../components/Sidebar";
import EnviarCorreoPopover from "../../../components/EnviarCorreoPopover";
import { abrirRepresentacion } from "../../../utils/representacionPdf";

const formatCOP = (value) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

const ESTADOS = [
  { value: "", label: "Todos los estados" },
  { value: "borrador", label: "Borrador" },
  { value: "enviada", label: "Enviada" },
  { value: "aceptada", label: "Aceptada" },
  { value: "rechazada", label: "Rechazada" },
  { value: "anulada", label: "Anulada" },
];

const ESTADO_BADGE = {
  borrador: "bg-neutralCustom-100 text-neutralCustom-600",
  enviada: "bg-fiscal-info/10 text-fiscal-info",
  aceptada: "bg-brand-50 text-brand-600",
  rechazada: "bg-fiscal-danger/10 text-fiscal-danger",
  anulada: "bg-fiscal-danger/10 text-fiscal-danger",
};

const ESTADO_LABEL = {
  borrador: "Borrador",
  enviada: "Enviada",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
  anulada: "Anulada",
};

export default function InvoicesListPage() {
  const navigate = useNavigate();
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("");
  const [toast, setToast] = useState({ message: null, type: "success" });
  const debounceRef = useRef(null);

  const handleVerRepresentacion = (factura) =>
    abrirRepresentacion({
      tieneDocumentoValido: Boolean(factura.cufe),
      obtenerPdf: () => obtenerRepresentacionPdfFactura(factura.id),
      navigate,
      rutaPreview: `/invoices/${factura.id}/representacion`,
      onError: (message) => setToast({ message, type: "error" }),
    });

  const fetchFacturas = useCallback(async (estadoFiltro) => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await listFacturas({ estado: estadoFiltro || undefined });
      setFacturas(data);
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFacturas(estado);
  }, [fetchFacturas, estado]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchFacturas(estado), 300);
  };

  const facturasFiltradas = search.trim()
    ? facturas.filter((f) => f.cliente_nombre.toLowerCase().includes(search.trim().toLowerCase()))
    : facturas;


  const view = useTableView(facturasFiltradas);
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 min-w-0 flex flex-col md:h-screen md:overflow-hidden">
        <header className="min-h-16 py-2 md:py-0 md:h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between gap-3 px-4 md:px-8 shrink-0">
          <div>
            <h2 className="text-lg font-medium text-neutralCustom-800">Facturas</h2>
            <p className="hidden sm:block text-xs text-neutralCustom-500">Emite y consulta tus facturas electrónicas.</p>
          </div>
          <Button
            onClick={() => navigate("/invoices/new")}
            variant="primary"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva factura
          </Button>
        </header>

        <div className="p-4 md:p-8 flex-1 overflow-y-auto">
          <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm flex flex-col overflow-x-auto">
            <div className="p-4 border-b border-neutralCustom-100 bg-neutralCustom-50/50 flex justify-between items-center gap-3">
              <div className="relative w-64">
                <input
                  type="text"
                  value={search}
                  onChange={handleSearchChange}
                  aria-label="Buscar facturas por cliente"
                  placeholder="Buscar por cliente..."
                  className="field w-full pl-9 pr-4"
                />
                <svg
                  className="w-4 h-4 absolute left-3 top-2.5 text-neutralCustom-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <select
                value={estado}
                aria-label="Filtrar por estado"
                onChange={(e) => setEstado(e.target.value)}
                className="field"
              >
                {ESTADOS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <TableSkeleton columns={6} label="Cargando facturas..." />
            ) : loadError ? (
              <div className="p-12 text-center">
                <p role="alert" className="text-sm text-fiscal-danger mb-3">No se pudieron cargar las facturas: {loadError}</p>
                <Button
                  onClick={() => fetchFacturas(estado)}
                  variant="danger"
                >
                  Reintentar
                </Button>
              </div>
            ) : facturasFiltradas.length > 0 ? (
              <>
              <table className="w-full text-left text-sm text-neutralCustom-600">
                <thead className="bg-neutralCustom-50 text-neutralCustom-500 text-xs uppercase border-b border-neutralCustom-100">
                  <tr>
                    <SortableTh sortKey="numero_completo" sort={view.sort} onSort={view.toggleSort}>Número</SortableTh>
                    <SortableTh sortKey="cliente_nombre" sort={view.sort} onSort={view.toggleSort}>Cliente</SortableTh>
                    <SortableTh sortKey="fecha" sort={view.sort} onSort={view.toggleSort}>Fecha</SortableTh>
                    <SortableTh sortKey="estado" sort={view.sort} onSort={view.toggleSort}>Estado</SortableTh>
                    <SortableTh sortKey="total" sort={view.sort} onSort={view.toggleSort} align="right">Total</SortableTh>
                    <th scope="col" className="px-6 py-3 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutralCustom-100">
                  {view.rows.map((f) => (
                    <ClickableRow key={f.id} to={`/invoices/${f.id}`}>
                      <td className="px-6 py-4 font-medium text-neutralCustom-800">
                        <ClickableRow.Link to={`/invoices/${f.id}`}>{f.numero_completo || "Sin enviar"}</ClickableRow.Link>
                      </td>
                      <td className="px-6 py-4">{f.cliente_nombre}</td>
                      <td className="px-6 py-4">{f.fecha}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            ESTADO_BADGE[f.estado] || ESTADO_BADGE.borrador
                          }`}
                        >
                          {ESTADO_LABEL[f.estado] || f.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-neutralCustom-800">
                        {formatCOP(f.total)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <IconButton
                            title={f.cufe ? "Ver representación gráfica" : "Vista previa (borrador)"}
                            onClick={() => handleVerRepresentacion(f)}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.75}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                          </IconButton>
                          {f.estado === "aceptada" && (
                            <EnviarCorreoPopover
                              onEnviar={(correo) => enviarFacturaPorCorreo(f.id, correo)}
                              onEnviado={(correo) =>
                                setToast({ message: `Factura enviada a ${correo}.`, type: "success" })
                              }
                            />
                          )}
                          {(f.estado === "borrador" || f.estado === "rechazada") && (
                            <IconButton
                              title={f.estado === "rechazada" ? "Corregir y reenviar" : "Continuar editando"}
                              onClick={() => navigate(`/invoices/${f.id}/edit`)}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.75}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </IconButton>
                          )}
                          <IconButton title="Ver detalle" onClick={() => navigate(`/invoices/${f.id}`)}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.75}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.75}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          </IconButton>
                        </div>
                      </td>
                    </ClickableRow>
                  ))}
                </tbody>
              </table>
              <Pagination {...view.pagination} />
            </>
            ) : (
              <div className="p-16 text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-brand-50 mb-4">
                  <svg className="w-8 h-8 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-neutralCustom-800 mb-1">
                  {search || estado ? "No se encontraron facturas" : "No tienes facturas registradas"}
                </h3>
                <p className="text-sm text-neutralCustom-500 mb-6 max-w-sm mx-auto">
                  {search || estado
                    ? "Prueba con otro filtro."
                    : "Crea tu primera factura para empezar a facturar electrónicamente."}
                </p>
                {!search && !estado && (
                  <Button
                    onClick={() => navigate("/invoices/new")}
                    variant="primary"
                  >
                    Nueva factura
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      <ToastAlert message={toast.message} type={toast.type} onClose={() => setToast({ message: null, type: "success" })} />
    </div>
  );
}
