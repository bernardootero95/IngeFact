import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  listDocumentosSoporte,
  obtenerRepresentacionPdfDocumentoSoporte,
  enviarDocumentoSoportePorCorreo,
  eliminarBorradorDocumentoSoporte,
  duplicarDocumentoSoporte,
} from "@ingefact/core-api";
import { ToastAlert, Button, IconButton, TableSkeleton, useTableView, SortableTh, Pagination, ClickableRow } from "@ingefact/ui";
import Sidebar from "../../../components/Sidebar";
import EnviarCorreoPopover from "../../../components/EnviarCorreoPopover";
import FiltrosListado from "../../../components/documentos/FiltrosListado";
import EliminarBorradorAccion from "../../../components/documentos/EliminarBorradorAccion";
import DuplicarAccion from "../../../components/documentos/DuplicarAccion";
import useListadoDocumentos from "../../../hooks/useListadoDocumentos";
import { abrirRepresentacion } from "../../../utils/representacionPdf";

const formatCOP = (value) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);

const ESTADO_BADGE = {
  borrador: "bg-neutralCustom-100 text-neutralCustom-600",
  enviado: "bg-fiscal-info/10 text-fiscal-info",
  aceptado: "bg-brand-50 text-brand-600",
  rechazado: "bg-fiscal-danger/10 text-fiscal-danger",
};

const ESTADO_LABEL = { borrador: "Borrador", enviado: "Enviado", aceptado: "Aceptado", rechazado: "Rechazado" };

const ESTADOS = Object.entries(ESTADO_LABEL).map(([value, label]) => ({ value, label }));

export default function SupportDocumentsListPage() {
  const navigate = useNavigate();
  const listado = useListadoDocumentos(listDocumentosSoporte, {
    searchKeys: ["numero_completo", "proveedor_nombre", "fecha"],
  });
  const [toast, setToast] = useState({ message: null, type: "success" });

  const handleVerRepresentacion = (documento) =>
    abrirRepresentacion({
      tieneDocumentoValido: documento.estado === "aceptado",
      obtenerPdf: () => obtenerRepresentacionPdfDocumentoSoporte(documento.id),
      navigate,
      rutaPreview: `/support-documents/${documento.id}/representacion`,
      onError: (message) => setToast({ message, type: "error" }),
    });

  const handleEliminar = async (documento) => {
    try {
      await eliminarBorradorDocumentoSoporte(documento.id);
      listado.quitar(documento.id);
      setToast({ message: "Borrador de documento soporte eliminado.", type: "success" });
    } catch (error) {
      setToast({ message: error.message, type: "error" });
    }
  };

  const handleDuplicar = async (documento) => {
    try {
      const copia = await duplicarDocumentoSoporte(documento.id);
      navigate(`/support-documents/${copia.id}/edit`);
    } catch (error) {
      setToast({ message: error.message, type: "error" });
    }
  };

  const view = useTableView(listado.filtrados);
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 min-w-0 flex flex-col md:h-screen md:overflow-hidden">
        <header className="min-h-16 py-2 md:py-0 md:h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between gap-3 px-4 md:px-8 shrink-0">
          <div>
            <h2 className="text-lg font-medium text-neutralCustom-800">Documento Soporte</h2>
            <p className="hidden sm:block text-xs text-neutralCustom-500">
              Documento Soporte de Adquisiciones para compras a proveedores no obligados a facturar.
            </p>
          </div>
          <Button
            onClick={() => navigate("/support-documents/new")}
            variant="primary"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo documento
          </Button>
        </header>

        <div className="p-4 md:p-8 flex-1 overflow-y-auto">
          <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm flex flex-col overflow-x-auto">
            <FiltrosListado
              search={listado.search}
              onSearch={listado.setSearch}
              placeholder="Buscar por número, proveedor o fecha..."
              estado={listado.estado}
              onEstado={listado.setEstado}
              estados={ESTADOS}
            />

            {listado.loading ? (
              <TableSkeleton columns={6} label="Cargando..." />
            ) : listado.loadError ? (
              <div className="p-12 text-center">
                <p role="alert" className="text-sm text-fiscal-danger mb-3">No se pudieron cargar: {listado.loadError}</p>
                <Button
                  onClick={listado.recargar}
                  variant="danger"
                >
                  Reintentar
                </Button>
              </div>
            ) : listado.filtrados.length > 0 ? (
              <>
              <table className="w-full text-left text-sm text-neutralCustom-600">
                <thead className="bg-neutralCustom-50 text-neutralCustom-500 text-xs uppercase border-b border-neutralCustom-100">
                  <tr>
                    <SortableTh sortKey="numero_completo" sort={view.sort} onSort={view.toggleSort}>Número</SortableTh>
                    <SortableTh sortKey="proveedor_nombre" sort={view.sort} onSort={view.toggleSort}>Proveedor</SortableTh>
                    <SortableTh sortKey="fecha" sort={view.sort} onSort={view.toggleSort}>Fecha</SortableTh>
                    <SortableTh sortKey="estado" sort={view.sort} onSort={view.toggleSort}>Estado</SortableTh>
                    <SortableTh sortKey="total" sort={view.sort} onSort={view.toggleSort} align="right">Total</SortableTh>
                    <th scope="col" className="px-6 py-3 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutralCustom-100">
                  {view.rows.map((d) => (
                    <ClickableRow key={d.id} to={`/support-documents/${d.id}`}>
                      <td className="px-6 py-4 font-medium text-neutralCustom-800">
                        <ClickableRow.Link to={`/support-documents/${d.id}`}>{d.numero_completo || "Borrador"}</ClickableRow.Link>
                      </td>
                      <td className="px-6 py-4">{d.proveedor_nombre}</td>
                      <td className="px-6 py-4">{d.fecha}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            ESTADO_BADGE[d.estado] || ESTADO_BADGE.borrador
                          }`}
                        >
                          {ESTADO_LABEL[d.estado] || d.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-neutralCustom-800">
                        {formatCOP(d.total)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <IconButton
                            title={d.estado === "aceptado" ? "Ver representación gráfica" : "Vista previa"}
                            onClick={() => handleVerRepresentacion(d)}
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
                          {d.estado === "aceptado" && (
                            <EnviarCorreoPopover
                              onEnviar={(correo) => enviarDocumentoSoportePorCorreo(d.id, correo)}
                              onEnviado={(correo) =>
                                setToast({ message: `Documento soporte enviado a ${correo}.`, type: "success" })
                              }
                            />
                          )}
                          {(d.estado === "borrador" || d.estado === "rechazado") && (
                            <IconButton
                              title={d.estado === "rechazado" ? "Corregir y reenviar" : "Continuar editando"}
                              onClick={() => navigate(`/support-documents/${d.id}/edit`)}
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
                          <DuplicarAccion onDuplicar={() => handleDuplicar(d)} />
                          {(d.estado === "borrador" || d.estado === "rechazado") && (
                            <EliminarBorradorAccion mensaje="¿Eliminar este documento soporte?" onEliminar={() => handleEliminar(d)} />
                          )}
                          <IconButton title="Ver detalle" onClick={() => navigate(`/support-documents/${d.id}`)}>
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
                  {listado.hayFiltros ? "No se encontraron documentos soporte" : "No tienes Documentos Soporte registrados"}
                </h3>
                <p className="text-sm text-neutralCustom-500 mb-6 max-w-sm mx-auto">
                  {listado.hayFiltros
                    ? "Prueba con otra búsqueda o filtro."
                    : "Crea uno para soportar una compra a un proveedor no obligado a facturar electrónicamente."}
                </p>
                {!listado.hayFiltros && (
                  <Button onClick={() => navigate("/support-documents/new")} variant="primary">
                    Nuevo documento
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
