import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getFactura,
  obtenerLineasDisponiblesFactura,
  getNotaCredito,
  crearBorradorNotaCredito,
  actualizarBorradorNotaCredito,
  enviarNotaCredito,
  listPublicReferenceTable,
} from "@ingefact/core-api";
import Sidebar from "../../../components/Sidebar";
import SeccionLineasCredito from "../components/SeccionLineasCredito";
import { validateMotivo, validateLineasCredito, calcularTotalesNota } from "./CreditNoteFormPage.validation";

const formatCOP = (value) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);

export default function CreditNoteFormPage() {
  const navigate = useNavigate();
  const { facturaId: facturaIdParam, id } = useParams();
  const isEditing = Boolean(id);

  const [factura, setFactura] = useState(null);
  const [motivoCodigo, setMotivoCodigo] = useState("");
  const [seleccion, setSeleccion] = useState([]);
  const [motivos, setMotivos] = useState([]);
  const [notaId, setNotaId] = useState(id || null);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const motivosData = await listPublicReferenceTable("conceptos_nota_credito");
      setMotivos(motivosData);

      let facturaId = facturaIdParam;
      let cantidadesPorLinea = {};

      if (isEditing) {
        const nota = await getNotaCredito(id);
        if (nota.estado !== "borrador") {
          navigate(`/credit-notes/${id}`, { replace: true });
          return;
        }
        facturaId = nota.factura_id;
        setMotivoCodigo(nota.motivo_codigo);
        cantidadesPorLinea = Object.fromEntries(
          nota.lineas.map((linea) => [linea.factura_linea_id, String(linea.cantidad)]),
        );
      } else {
        setMotivoCodigo(motivosData[0]?.code || "");
      }

      const [facturaData, disponibilidadData] = await Promise.all([
        getFactura(facturaId),
        obtenerLineasDisponiblesFactura(facturaId),
      ]);
      setFactura(facturaData);

      const disponibilidadPorLinea = Object.fromEntries(
        disponibilidadData.map((item) => [item.factura_linea_id, item.cantidad_disponible]),
      );

      setSeleccion(
        facturaData.lineas.map((facturaLinea) => {
          const cantidadPreexistente = cantidadesPorLinea[facturaLinea.id];
          return {
            facturaLinea,
            disponible: disponibilidadPorLinea[facturaLinea.id] ?? 0,
            incluida: Boolean(cantidadPreexistente),
            cantidad: cantidadPreexistente || "",
          };
        }),
      );
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, [facturaIdParam, id, isEditing, navigate]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleToggleLinea = (facturaLineaId, incluida) => {
    setSeleccion((prev) =>
      prev.map((linea) =>
        linea.facturaLinea.id === facturaLineaId
          ? { ...linea, incluida, cantidad: incluida ? String(linea.disponible) : "" }
          : linea,
      ),
    );
    setErrors((prev) => ({ ...prev, lineas: "" }));
  };

  const handleCantidadChange = (facturaLineaId, cantidad) => {
    setSeleccion((prev) =>
      prev.map((linea) => (linea.facturaLinea.id === facturaLineaId ? { ...linea, cantidad } : linea)),
    );
  };

  const validarTodo = () => {
    const nuevosErrores = {
      motivo: validateMotivo(motivoCodigo),
      lineas: validateLineasCredito(seleccion),
    };
    setErrors(nuevosErrores);
    return !Object.values(nuevosErrores).some(Boolean);
  };

  const buildPayload = () => ({
    motivo_codigo: motivoCodigo,
    lineas: seleccion
      .filter((linea) => linea.incluida)
      .map((linea) => ({ factura_linea_id: linea.facturaLinea.id, cantidad: Number(linea.cantidad) })),
  });

  const guardarBorrador = async () => {
    const payload = buildPayload();
    if (notaId) {
      return actualizarBorradorNotaCredito(notaId, payload);
    }
    const creada = await crearBorradorNotaCredito(facturaIdParam, payload);
    setNotaId(creada.id);
    return creada;
  };

  const handleGuardarBorrador = async () => {
    if (!validarTodo()) return;
    setIsSavingDraft(true);
    setSaveError(null);
    try {
      const guardada = await guardarBorrador();
      navigate(`/credit-notes/${guardada.id}`);
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleEnviar = async () => {
    if (!validarTodo()) return;
    setIsSending(true);
    setSaveError(null);
    try {
      const guardada = await guardarBorrador();
      await enviarNotaCredito(guardada.id);
      navigate(`/credit-notes/${guardada.id}`);
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setIsSending(false);
    }
  };

  const totales = calcularTotalesNota(seleccion);
  const guardando = isSavingDraft || isSending;

  return (
    <div className="min-h-screen flex bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between px-8 shrink-0">
          <div>
            <div className="flex items-center gap-2 text-xs text-neutralCustom-500 mb-0.5">
              <button onClick={() => navigate("/invoices")} className="text-brand-600 hover:underline font-medium">
                Facturas
              </button>
              {factura && (
                <>
                  <span>/</span>
                  <button
                    onClick={() => navigate(`/invoices/${factura.id}`)}
                    className="text-brand-600 hover:underline font-medium"
                  >
                    {factura.numero_completo}
                  </button>
                </>
              )}
              <span>/</span>
              <span>{isEditing ? "Editar" : "Nueva"} Nota Crédito</span>
            </div>
            <h2 className="text-lg font-medium text-neutralCustom-800">
              {isEditing ? "Editar Nota Crédito" : "Nueva Nota Crédito"}
            </h2>
          </div>
        </header>

        <div className="p-8 flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            {loading ? (
              <div className="p-12 text-center text-sm text-neutralCustom-500 animate-pulse">Cargando...</div>
            ) : loadError ? (
              <div className="p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
                {loadError}
              </div>
            ) : (
              <>
                <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6">
                  <h3 className="text-base font-semibold text-neutralCustom-800 mb-3">Factura Original</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-neutralCustom-500">Número</p>
                      <p className="font-medium text-neutralCustom-800">{factura.numero_completo}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutralCustom-500">Cliente</p>
                      <p className="font-medium text-neutralCustom-800">{factura.cliente_nombre}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutralCustom-500">Total factura</p>
                      <p className="font-medium text-neutralCustom-800">{formatCOP(factura.total)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6">
                  <h3 className="text-base font-semibold text-neutralCustom-800 mb-1">Motivo</h3>
                  <p className="text-xs text-neutralCustom-500 mb-3">Catálogo DIAN de conceptos de nota crédito</p>
                  <select
                    value={motivoCodigo}
                    onChange={(e) => setMotivoCodigo(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-brand-md text-sm focus:outline-none ${
                      errors.motivo ? "border-fiscal-danger" : "border-neutralCustom-200 focus:border-brand-400"
                    }`}
                  >
                    {motivos.map((opt) => (
                      <option key={opt.code} value={opt.code}>
                        {opt.value}
                      </option>
                    ))}
                  </select>
                  {errors.motivo && <p className="mt-1 text-xs text-fiscal-danger">{errors.motivo}</p>}
                </div>

                <SeccionLineasCredito
                  seleccion={seleccion}
                  error={errors.lineas}
                  onToggleLinea={handleToggleLinea}
                  onCantidadChange={handleCantidadChange}
                />

                <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6">
                  {saveError && (
                    <div className="mb-4 p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
                      {saveError}
                    </div>
                  )}
                  <div className="flex justify-end mb-6">
                    <div className="w-56 space-y-1 text-sm">
                      <div className="flex justify-between text-neutralCustom-600">
                        <span>Subtotal</span>
                        <span>{formatCOP(totales.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-neutralCustom-600">
                        <span>Total impuestos</span>
                        <span>{formatCOP(totales.totalImpuestos)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-neutralCustom-800 text-base border-t border-neutralCustom-100 pt-1.5">
                        <span>Total nota</span>
                        <span>{formatCOP(totales.total)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => navigate(-1)}
                      disabled={guardando}
                      className="px-4 py-2 bg-white border border-neutralCustom-200 hover:bg-neutralCustom-50 text-neutralCustom-800 text-sm font-medium rounded-brand-md transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleGuardarBorrador}
                      disabled={guardando}
                      className="px-4 py-2 bg-white border border-neutralCustom-200 hover:bg-neutralCustom-50 text-neutralCustom-800 text-sm font-medium rounded-brand-md transition-colors disabled:opacity-50"
                    >
                      {isSavingDraft ? "Guardando..." : "Guardar Borrador"}
                    </button>
                    <button
                      type="button"
                      onClick={handleEnviar}
                      disabled={guardando}
                      className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-brand-md transition-colors shadow-sm disabled:opacity-50"
                    >
                      {isSending ? "Enviando..." : "Enviar a DIAN"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
