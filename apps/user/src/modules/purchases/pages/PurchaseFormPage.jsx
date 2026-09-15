import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { listProductos, listProveedores, getProveedor, createCompra } from "@ingefact/core-api";
import { SearchableSelect } from "@ingefact/ui";
import Sidebar from "../../../components/Sidebar";
import SeccionLineasCompra from "../components/SeccionLineasCompra";
import { validateProveedor, validateFecha, validateLineas, calcularTotales } from "./PurchaseFormPage.validation";

const today = () => new Date().toISOString().slice(0, 10);

const DRAFT_KEY = "ingefact:purchase-form-draft";

// Mismo patron ya usado en InvoiceFormPage: el progreso en curso se guarda en
// sessionStorage justo antes de navegar a "+ Nuevo Proveedor"/"+ Nuevo
// Producto" (misma pestana, el componente se desmonta) y se restaura al
// volver. El useRef evita que la segunda pasada de React StrictMode en dev
// vuelva a consumir el borrador ya aplicado por la primera.
function guardarBorradorTemporal(datos) {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(datos));
}

function leerBorradorTemporal() {
  const raw = sessionStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function limpiarBorradorTemporal() {
  sessionStorage.removeItem(DRAFT_KEY);
}

const formatCOP = (value) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);

export default function PurchaseFormPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [proveedor, setProveedor] = useState(null);
  const [fecha, setFecha] = useState(today());
  const [numeroDocumentoProveedor, setNumeroDocumentoProveedor] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [lineas, setLineas] = useState([]);

  const [productos, setProductos] = useState([]);
  const [proveedores, setProveedores] = useState([]);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const borradorTemporalAplicado = useRef(false);

  const cargarDatos = useCallback(async () => {
    if (borradorTemporalAplicado.current) return;
    borradorTemporalAplicado.current = true;

    setLoading(true);
    setLoadError(null);
    try {
      const [productosData, proveedoresData] = await Promise.all([listProductos(), listProveedores()]);
      setProductos(productosData);
      setProveedores(proveedoresData);

      const borrador = leerBorradorTemporal();
      const nuevoProveedorId = location.state?.newProveedorId;
      const nuevoProductoId = location.state?.newProductoId;

      if (borrador) {
        limpiarBorradorTemporal();
        setFecha(borrador.fecha);
        setNumeroDocumentoProveedor(borrador.numeroDocumentoProveedor || "");
        setObservaciones(borrador.observaciones || "");
        setLineas(
          borrador.lineas.map((linea) => {
            const producto = productosData.find((p) => p.id === linea.producto_id) || null;
            return {
              producto_id: linea.producto_id,
              cantidad: linea.cantidad,
              precio_unitario: linea.precio_unitario ?? String(producto?.precio ?? ""),
              producto,
            };
          }),
        );
        const proveedorIdFinal = nuevoProveedorId || borrador.proveedorId;
        if (proveedorIdFinal) {
          setProveedor(await getProveedor(proveedorIdFinal));
        }
      } else if (nuevoProveedorId) {
        setProveedor(await getProveedor(nuevoProveedorId));
      }

      if (nuevoProductoId && !borrador) {
        const producto = productosData.find((p) => p.id === nuevoProductoId);
        if (producto) {
          setLineas((prev) => [
            ...prev,
            { producto_id: producto.id, cantidad: "1", precio_unitario: String(producto.precio), producto },
          ]);
        }
      }
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, [location.state]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const proveedorOptions = proveedores.map((p) => ({ code: p.id, value: `${p.nombre} (${p.numero_identificacion})` }));

  const handleSelectProveedor = (proveedorId) => {
    const seleccionado = proveedores.find((p) => p.id === proveedorId) || null;
    setProveedor(seleccionado);
    setErrors((prev) => ({ ...prev, proveedor: seleccionado ? "" : prev.proveedor }));
  };

  const handleAddLinea = (productoId, cantidad) => {
    const producto = productos.find((p) => p.id === productoId) || null;
    setLineas((prev) => [
      ...prev,
      { producto_id: productoId, cantidad: String(cantidad), precio_unitario: String(producto?.precio ?? ""), producto },
    ]);
    setErrors((prev) => ({ ...prev, lineas: "" }));
  };

  const handleRemoveLinea = (index) => {
    setLineas((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLineaCantidadChange = (index, cantidad) => {
    setLineas((prev) => prev.map((linea, i) => (i === index ? { ...linea, cantidad } : linea)));
  };

  const handleLineaPrecioChange = (index, precioUnitario) => {
    setLineas((prev) => prev.map((linea, i) => (i === index ? { ...linea, precio_unitario: precioUnitario } : linea)));
  };

  const irACrear = (destino) => {
    guardarBorradorTemporal({
      proveedorId: proveedor?.id || null,
      fecha,
      numeroDocumentoProveedor,
      observaciones,
      lineas: lineas.map((linea) => ({
        producto_id: linea.producto_id,
        cantidad: linea.cantidad,
        precio_unitario: linea.precio_unitario,
      })),
    });
    navigate(destino, { state: { returnTo: location.pathname } });
  };

  const validarTodo = () => {
    const nuevosErrores = {
      proveedor: validateProveedor(proveedor?.id),
      fecha: validateFecha(fecha),
      lineas: validateLineas(lineas),
    };
    setErrors(nuevosErrores);
    return !Object.values(nuevosErrores).some(Boolean);
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!validarTodo()) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      const creada = await createCompra({
        proveedor_id: proveedor.id,
        fecha,
        numero_documento_proveedor: numeroDocumentoProveedor.trim() || null,
        observaciones: observaciones.trim() || null,
        lineas: lineas.map((linea) => ({
          producto_id: linea.producto_id,
          cantidad: Number(linea.cantidad),
          precio_unitario: Number(linea.precio_unitario),
        })),
      });
      navigate(`/purchases/${creada.id}`);
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const totales = calcularTotales(lineas);

  return (
    <div className="min-h-screen flex bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between px-8 shrink-0">
          <div>
            <div className="flex items-center gap-2 text-xs text-neutralCustom-500 mb-0.5">
              <button onClick={() => navigate("/purchases")} className="text-brand-600 hover:underline font-medium">
                Compras
              </button>
              <span>/</span>
              <span>Nueva</span>
            </div>
            <h2 className="text-lg font-medium text-neutralCustom-800">Nueva Compra</h2>
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
              <form onSubmit={handleGuardar} className="space-y-6">
                <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6">
                  <h3 className="text-base font-semibold text-neutralCustom-800 mb-4">Proveedor</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label htmlFor="proveedor-select" className="block text-sm font-medium text-neutralCustom-800">
                          Proveedor <span className="text-fiscal-danger">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => irACrear("/suppliers/new")}
                          className="text-xs font-medium text-brand-600 hover:text-brand-400"
                        >
                          + Nuevo Proveedor
                        </button>
                      </div>
                      <SearchableSelect
                        id="proveedor-select"
                        options={proveedorOptions}
                        value={proveedor?.id || ""}
                        onChange={handleSelectProveedor}
                        placeholder="Selecciona un proveedor..."
                        error={!!errors.proveedor}
                        formatOption={(opt) => opt.value}
                      />
                      {errors.proveedor && <p className="mt-1 text-xs text-fiscal-danger">{errors.proveedor}</p>}
                    </div>

                    <div>
                      <label htmlFor="fecha" className="block text-sm font-medium text-neutralCustom-800 mb-1.5">
                        Fecha
                      </label>
                      <input
                        type="date"
                        id="fecha"
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                        className="w-full px-4 py-2.5 border border-neutralCustom-200 rounded-brand-md text-sm focus:outline-none focus:border-brand-400"
                      />
                    </div>

                    <div>
                      <label htmlFor="numero_documento_proveedor" className="block text-sm font-medium text-neutralCustom-800 mb-1.5">
                        Número de factura/recibo del proveedor
                      </label>
                      <input
                        type="text"
                        id="numero_documento_proveedor"
                        value={numeroDocumentoProveedor}
                        onChange={(e) => setNumeroDocumentoProveedor(e.target.value)}
                        placeholder="Opcional"
                        className="w-full px-4 py-2.5 border border-neutralCustom-200 rounded-brand-md text-sm focus:outline-none focus:border-brand-400"
                      />
                    </div>

                    <div>
                      <label htmlFor="observaciones" className="block text-sm font-medium text-neutralCustom-800 mb-1.5">
                        Observaciones
                      </label>
                      <input
                        type="text"
                        id="observaciones"
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        placeholder="Opcional"
                        className="w-full px-4 py-2.5 border border-neutralCustom-200 rounded-brand-md text-sm focus:outline-none focus:border-brand-400"
                      />
                    </div>
                  </div>
                </div>

                <SeccionLineasCompra
                  lineas={lineas}
                  productos={productos}
                  error={errors.lineas}
                  onAddLinea={handleAddLinea}
                  onRemoveLinea={handleRemoveLinea}
                  onLineaCantidadChange={handleLineaCantidadChange}
                  onLineaPrecioChange={handleLineaPrecioChange}
                  onCrearProducto={() => irACrear("/products/new")}
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
                      <div className="flex justify-between font-bold text-neutralCustom-800 text-base border-t border-neutralCustom-100 pt-1">
                        <span>Total</span>
                        <span>{formatCOP(totales.total)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => navigate("/purchases")}
                      disabled={isSaving}
                      className="px-4 py-2 bg-white border border-neutralCustom-200 hover:bg-neutralCustom-50 text-neutralCustom-800 text-sm font-medium rounded-brand-md transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-brand-md transition-colors shadow-sm disabled:opacity-50"
                    >
                      {isSaving ? "Guardando..." : "Registrar Compra"}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
