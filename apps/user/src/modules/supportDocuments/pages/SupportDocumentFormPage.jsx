import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  listProductos,
  listProveedores,
  getProveedor,
  getDocumentoSoporte,
  crearBorradorDocumentoSoporte,
  actualizarBorradorDocumentoSoporte,
  enviarDocumentoSoporte,
  listPublicReferenceTable,
} from "@ingefact/core-api";
import { SearchableSelect, Button, PlusIcon } from "@ingefact/ui";
import Sidebar from "../../../components/Sidebar";
import SeccionLineasDocumentoSoporte from "../components/SeccionLineasDocumentoSoporte";
import SeccionPagoDocumentoSoporte from "../components/SeccionPagoDocumentoSoporte";
import { validateFormaPago, validateMetodoPago } from "../components/SeccionPagoDocumentoSoporte.validation";
import { validateProveedor, validateFecha, validateLineas, calcularTotales } from "./SupportDocumentFormPage.validation";

const today = () => new Date().toISOString().slice(0, 10);

const DRAFT_KEY = "ingefact:support-document-form-draft";

// Mismo patron ya usado en InvoiceFormPage: el progreso en
// curso se guarda en sessionStorage antes de navegar a "+ Nuevo Proveedor"/
// "+ Nuevo Producto" y se restaura al volver.
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

export default function SupportDocumentFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isEditing = Boolean(id);

  const [proveedor, setProveedor] = useState(null);
  const [fecha, setFecha] = useState(today());
  const [lineas, setLineas] = useState([]);
  const [documentoId, setDocumentoId] = useState(id || null);
  const [razonRechazo, setRazonRechazo] = useState(null);
  const [formaPago, setFormaPago] = useState("");
  const [metodoPago, setMetodoPago] = useState("");

  const [productos, setProductos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [formasPago, setFormasPago] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const borradorTemporalAplicado = useRef(false);

  const cargarDatos = useCallback(async () => {
    if (borradorTemporalAplicado.current) return;
    borradorTemporalAplicado.current = true;

    setLoading(true);
    setLoadError(null);
    try {
      const [productosData, proveedoresData, formasPagoData, metodosPagoData, documento] = await Promise.all([
        listProductos(),
        listProveedores(),
        listPublicReferenceTable("formas_pago"),
        listPublicReferenceTable("metodos_pago"),
        isEditing ? getDocumentoSoporte(id) : Promise.resolve(null),
      ]);
      // Codigo "1" = "Instrumento no definido" -- un placeholder del catalogo
      // DIAN, no un metodo de pago real (mismo criterio que InvoiceFormPage).
      const metodosPagoValidos = metodosPagoData.filter((m) => m.code !== "1");
      setProductos(productosData);
      setProveedores(proveedoresData);
      setFormasPago(formasPagoData);
      setMetodosPago(metodosPagoValidos);
      setFormaPago(formasPagoData[0]?.code || "");
      setMetodoPago(metodosPagoValidos[0]?.code || "");

      const borrador = leerBorradorTemporal();
      const nuevoProveedorId = location.state?.newProveedorId;
      const nuevoProductoId = location.state?.newProductoId;

      if (borrador) {
        limpiarBorradorTemporal();
        setFecha(borrador.fecha);
        setFormaPago(borrador.formaPago || formasPagoData[0]?.code || "");
        setMetodoPago(borrador.metodoPago || metodosPagoValidos[0]?.code || "");
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
      } else if (documento) {
        if (documento.estado !== "borrador" && documento.estado !== "rechazado") {
          navigate(`/support-documents/${id}`, { replace: true });
          return;
        }
        if (documento.estado === "rechazado") {
          setRazonRechazo(documento.razon_rechazo);
        }
        setProveedor(await getProveedor(documento.proveedor_id));
        setFecha(documento.fecha);
        setFormaPago(documento.forma_pago || formasPagoData[0]?.code || "");
        setMetodoPago(
          (documento.metodo_pago !== "1" ? documento.metodo_pago : null) || metodosPagoValidos[0]?.code || "",
        );
        setLineas(
          documento.lineas.map((linea) => ({
            producto_id: linea.producto_id,
            cantidad: String(linea.cantidad),
            precio_unitario: String(linea.precio_unitario),
            producto: {
              id: linea.producto_id,
              codigo: linea.codigo,
              nombre: linea.descripcion,
              precio: linea.precio_unitario,
            },
          })),
        );
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
  }, [id, isEditing, navigate, location.state]);

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
      lineas: lineas.map((linea) => ({
        producto_id: linea.producto_id,
        cantidad: linea.cantidad,
        precio_unitario: linea.precio_unitario,
      })),
      formaPago,
      metodoPago,
    });
    navigate(destino, { state: { returnTo: location.pathname } });
  };

  const validarTodo = () => {
    const nuevosErrores = {
      proveedor: validateProveedor(proveedor?.id),
      fecha: validateFecha(fecha),
      lineas: validateLineas(lineas),
      formaPago: validateFormaPago(formaPago),
      metodoPago: validateMetodoPago(metodoPago),
    };
    setErrors(nuevosErrores);
    return !Object.values(nuevosErrores).some(Boolean);
  };

  const buildPayload = () => ({
    proveedor_id: proveedor.id,
    fecha,
    lineas: lineas.map((linea) => ({
      producto_id: linea.producto_id,
      cantidad: Number(linea.cantidad),
      precio_unitario: Number(linea.precio_unitario),
    })),
  });

  const guardarBorrador = async () => {
    const payload = buildPayload();
    if (documentoId) {
      return actualizarBorradorDocumentoSoporte(documentoId, payload);
    }
    const creado = await crearBorradorDocumentoSoporte(payload);
    // Si el envio falla despues de guardar, un reintento debe actualizar este
    // mismo borrador en vez de crear otro.
    setDocumentoId(creado.id);
    return creado;
  };

  const handleGuardarBorrador = async () => {
    if (!validarTodo()) return;
    setIsSavingDraft(true);
    setSaveError(null);
    try {
      const guardado = await guardarBorrador();
      navigate(`/support-documents/${guardado.id}`);
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
      const guardado = await guardarBorrador();
      await enviarDocumentoSoporte(guardado.id, { forma_pago: formaPago, metodo_pago: metodoPago });
      navigate(`/support-documents/${guardado.id}`);
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setIsSending(false);
    }
  };

  const isBusy = isSavingDraft || isSending;

  const totales = calcularTotales(lineas);

  return (
    <div className="min-h-screen flex bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between px-8 shrink-0">
          <div>
            <div className="flex items-center gap-2 text-xs text-neutralCustom-500 mb-0.5">
              <Button
                onClick={() => navigate("/support-documents")}
                variant="link"
              >
                Documento soporte
              </Button>
              <span>/</span>
              <span>{isEditing ? "Editar" : "Nuevo"}</span>
            </div>
            <h2 className="text-lg font-medium text-neutralCustom-800">
              {isEditing ? "Editar Documento Soporte" : "Nuevo Documento Soporte"}
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
              <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
                {razonRechazo && (
                  <div className="p-4 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
                    <p className="font-semibold mb-1">Este documento fue rechazado por la DIAN</p>
                    <p>{razonRechazo}</p>
                    <p className="mt-1 text-xs">
                      Corrige los datos que hagan falta y vuelve a enviar — se te asignará un número nuevo.
                    </p>
                  </div>
                )}

                <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6">
                  <h3 className="text-base font-semibold text-neutralCustom-800 mb-4">Proveedor</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label htmlFor="proveedor-select" className="block text-sm font-medium text-neutralCustom-800">
                          Proveedor <span className="text-fiscal-danger">*</span>
                        </label>
                        <Button
                          onClick={() => irACrear("/suppliers/new")}
                          variant="link"
                          icon={PlusIcon}
                          className="text-xs"
                        >
                          Nuevo proveedor
                        </Button>
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
                        className="field w-full"
                      />
                    </div>
                  </div>
                </div>

                <SeccionLineasDocumentoSoporte
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
                  <h3 className="text-base font-semibold text-neutralCustom-800 mb-4">Pago</h3>
                  <SeccionPagoDocumentoSoporte
                    formaPago={formaPago}
                    metodoPago={metodoPago}
                    formasPago={formasPago}
                    metodosPago={metodosPago}
                    errors={errors}
                    onFormaPagoChange={(value) => {
                      setFormaPago(value);
                      setErrors((prev) => ({ ...prev, formaPago: validateFormaPago(value) }));
                    }}
                    onMetodoPagoChange={(value) => {
                      setMetodoPago(value);
                      setErrors((prev) => ({ ...prev, metodoPago: validateMetodoPago(value) }));
                    }}
                  />
                </div>

                <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6">
                  {saveError && (
                    <div className="mb-4 p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
                      {saveError}
                    </div>
                  )}

                  <div className="flex justify-end mb-6">
                    <div className="w-56 space-y-1 text-sm">
                      <div className="flex justify-between font-bold text-neutralCustom-800 text-base border-t border-neutralCustom-100 pt-1">
                        <span>Total</span>
                        <span>{formatCOP(totales.total)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <Button
                      variant="ghost"
                      onClick={() => navigate("/support-documents")}
                      disabled={isBusy}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleGuardarBorrador}
                      disabled={isBusy}
                      loading={isSavingDraft}
                    >
                      Guardar borrador
                    </Button>
                    <Button
                      onClick={handleEnviar}
                      disabled={isBusy}
                      variant="primary"
                      loading={isSending}
                    >
                      Enviar a DIAN
                    </Button>
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
