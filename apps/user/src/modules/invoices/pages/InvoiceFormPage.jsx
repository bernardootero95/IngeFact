import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  listProductos,
  listClientes,
  listPublicReferenceTable,
  getFactura,
  getCliente,
  crearBorradorFactura,
  actualizarBorradorFactura,
  enviarFactura,
} from "@ingefact/core-api";
import Sidebar from "../../../components/Sidebar";
import SeccionCliente from "../components/SeccionCliente";
import SeccionLineas from "../components/SeccionLineas";
import SeccionResumen from "../components/SeccionResumen";
import {
  validateCliente,
  validateFecha,
  validateLineas,
  validateFormaPago,
  validateMetodoPago,
} from "./InvoiceFormPage.validation";

const today = () => new Date().toISOString().slice(0, 10);

const DRAFT_KEY = "ingefact:invoice-form-draft";

/**
 * El progreso en curso (cliente/lineas/pago) se guarda en sessionStorage
 * justo antes de navegar a "+ Nuevo Cliente"/"+ Nuevo Producto" -- ambos
 * navegan en la misma pestaña (no target="_blank"), así que el componente
 * se desmonta. Al volver, se restaura desde aquí en vez de perder el
 * progreso.
 *
 * React StrictMode duplica el efecto de montaje en dev: monta, corre el
 * efecto, lo "desmonta" (cleanup) y lo vuelve a correr, todo sobre el mismo
 * fiber/hooks -- mismo problema ya resuelto para restoreSession en
 * authStore. La primera pasada consumía el borrador (lo limpiaba) y la
 * segunda, que es la que realmente queda en pantalla, ya no encontraba nada
 * y reseteaba las líneas a vacío. Se resuelve con un useRef (sobrevive
 * entre las dos pasadas de un mismo montaje, a diferencia de un remount de
 * verdad) que hace que solo la primera pasada real aplique el borrador.
 */
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

export default function InvoiceFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isEditing = Boolean(id);

  const [cliente, setCliente] = useState(null);
  const [fecha, setFecha] = useState(today());
  const [lineas, setLineas] = useState([]);
  const [formaPago, setFormaPago] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  const [facturaId, setFacturaId] = useState(id || null);
  const [productoPreseleccionado, setProductoPreseleccionado] = useState(null);
  const [razonRechazo, setRazonRechazo] = useState(null);

  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [formasPago, setFormasPago] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);
  const [tiposOrganizacion, setTiposOrganizacion] = useState([]);
  const [regimenes, setRegimenes] = useState([]);
  const [tributos, setTributos] = useState([]);
  const [tiposIdentificacion, setTiposIdentificacion] = useState([]);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const borradorTemporalAplicado = useRef(false);

  const cargarDatos = useCallback(async () => {
    // Ver comentario de borradorTemporalAplicado arriba: evita que la
    // segunda pasada de StrictMode en dev vuelva a consultar el borrador
    // temporal (ya consumido por la primera) y resetee el formulario.
    if (borradorTemporalAplicado.current) return;
    borradorTemporalAplicado.current = true;

    setLoading(true);
    setLoadError(null);
    try {
      const [
        productosData,
        clientesData,
        formasPagoData,
        metodosPagoData,
        tiposOrganizacionData,
        regimenesData,
        tributosData,
        tiposIdentificacionData,
        factura,
      ] = await Promise.all([
        listProductos(),
        listClientes(),
        listPublicReferenceTable("formas_pago"),
        listPublicReferenceTable("metodos_pago"),
        listPublicReferenceTable("tipos_organizacion"),
        listPublicReferenceTable("responsabilidades_fiscales"),
        listPublicReferenceTable("tributos"),
        listPublicReferenceTable("tipos_identificacion"),
        isEditing ? getFactura(id) : Promise.resolve(null),
      ]);

      // Codigo "1" = "Instrumento no definido" -- un placeholder del catalogo
      // DIAN, no una forma de pago real. Nunca debe quedar seleccionable.
      const metodosPagoValidos = metodosPagoData.filter((m) => m.code !== "1");

      setProductos(productosData);
      setClientes(clientesData);
      setFormasPago(formasPagoData);
      setMetodosPago(metodosPagoValidos);
      setTiposOrganizacion(tiposOrganizacionData);
      setRegimenes(regimenesData);
      setTributos(tributosData);
      setTiposIdentificacion(tiposIdentificacionData);

      const borrador = leerBorradorTemporal();
      const nuevoClienteId = location.state?.newClienteId;
      const nuevoProductoId = location.state?.newProductoId;

      if (borrador) {
        // Se vuelve de crear un cliente/producto a mitad de la factura --
        // esto tiene prioridad sobre lo que haya guardado en el servidor,
        // porque puede incluir cambios que el usuario aun no habia guardado.
        limpiarBorradorTemporal();
        setFecha(borrador.fecha);
        setFormaPago(borrador.formaPago || formasPagoData[0]?.code || "");
        setMetodoPago(borrador.metodoPago || metodosPagoValidos[0]?.code || "");
        setLineas(
          borrador.lineas.map((linea) => ({
            producto_id: linea.producto_id,
            cantidad: linea.cantidad,
            producto: productosData.find((p) => p.id === linea.producto_id) || null,
          })),
        );
        const clienteIdFinal = nuevoClienteId || borrador.clienteId;
        if (clienteIdFinal) {
          setCliente(await getCliente(clienteIdFinal));
        }
      } else if (factura) {
        if (factura.estado !== "borrador" && factura.estado !== "rechazada") {
          navigate(`/invoices/${id}`, { replace: true });
          return;
        }
        if (factura.estado === "rechazada") {
          setRazonRechazo(factura.razon_rechazo);
        }
        const clienteCompleto = await getCliente(factura.cliente_id);
        setCliente(clienteCompleto);
        setFecha(factura.fecha);
        setFormaPago(factura.forma_pago || formasPagoData[0]?.code || "");
        setMetodoPago(
          (factura.metodo_pago !== "1" ? factura.metodo_pago : null) || metodosPagoValidos[0]?.code || "",
        );
        setLineas(
          factura.lineas.map((linea) => ({
            producto_id: linea.producto_id,
            cantidad: String(linea.cantidad),
            producto: {
              id: linea.producto_id,
              codigo: linea.codigo,
              nombre: linea.descripcion,
              precio: linea.precio_unitario,
              tributo: linea.tributo,
              tarifa_impuesto: linea.tarifa_impuesto,
            },
          })),
        );
      } else {
        setFormaPago(formasPagoData[0]?.code || "");
        setMetodoPago(metodosPagoValidos[0]?.code || "");
        setLineas([]);
        if (nuevoClienteId) {
          setCliente(await getCliente(nuevoClienteId));
        }
      }

      if (nuevoProductoId) {
        setProductoPreseleccionado(nuevoProductoId);
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

  const handleSelectCliente = (nuevoCliente) => {
    setCliente(nuevoCliente);
    setErrors((prev) => ({ ...prev, cliente: nuevoCliente ? "" : prev.cliente }));
  };

  const handleAddLinea = (productoId, cantidad) => {
    const producto = productos.find((p) => p.id === productoId) || null;
    setLineas((prev) => [...prev, { producto_id: productoId, cantidad: String(cantidad), producto }]);
    setErrors((prev) => ({ ...prev, lineas: "" }));
  };

  const handleRemoveLinea = (index) => {
    setLineas((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLineaCantidadChange = (index, cantidad) => {
    setLineas((prev) => prev.map((linea, i) => (i === index ? { ...linea, cantidad } : linea)));
  };

  const irACrear = (destino) => {
    guardarBorradorTemporal({
      clienteId: cliente?.id || null,
      fecha,
      lineas: lineas.map((linea) => ({ producto_id: linea.producto_id, cantidad: linea.cantidad })),
      formaPago,
      metodoPago,
    });
    navigate(destino, { state: { returnTo: location.pathname } });
  };

  const validarTodo = () => {
    const nuevosErrores = {
      cliente: validateCliente(cliente?.id),
      fecha: validateFecha(fecha),
      lineas: validateLineas(lineas),
      formaPago: validateFormaPago(formaPago),
      metodoPago: validateMetodoPago(metodoPago),
    };
    setErrors(nuevosErrores);
    return !Object.values(nuevosErrores).some(Boolean);
  };

  const buildPayload = () => ({
    cliente_id: cliente.id,
    fecha,
    lineas: lineas.map((linea) => ({ producto_id: linea.producto_id, cantidad: Number(linea.cantidad) })),
  });

  const guardarBorrador = async () => {
    const payload = buildPayload();
    if (facturaId) {
      return actualizarBorradorFactura(facturaId, payload);
    }
    const creada = await crearBorradorFactura(payload);
    setFacturaId(creada.id);
    return creada;
  };

  const handleGuardarBorrador = async () => {
    if (!validarTodo()) return;
    setIsSavingDraft(true);
    setSaveError(null);
    try {
      const guardada = await guardarBorrador();
      navigate(`/invoices/${guardada.id}`);
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
      await enviarFactura(guardada.id, { forma_pago: formaPago, metodo_pago: metodoPago });
      navigate(`/invoices/${guardada.id}`);
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setIsSending(false);
    }
  };

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
              <span>/</span>
              <span>{isEditing ? "Editar" : "Nueva"}</span>
            </div>
            <h2 className="text-lg font-medium text-neutralCustom-800">
              {isEditing ? "Editar Factura" : "Nueva Factura"}
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
                {razonRechazo && (
                  <div className="p-4 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
                    <p className="font-semibold mb-1">Esta factura fue rechazada por la DIAN</p>
                    <p>{razonRechazo}</p>
                    <p className="mt-1 text-xs">
                      Corrige los datos que hagan falta y vuelve a enviar — se te asignará un número nuevo (el
                      rechazado no se puede reutilizar).
                    </p>
                  </div>
                )}
                <SeccionCliente
                  cliente={cliente}
                  clientes={clientes}
                  fecha={fecha}
                  error={errors.cliente}
                  tiposOrganizacion={tiposOrganizacion}
                  regimenes={regimenes}
                  tributos={tributos}
                  tiposIdentificacion={tiposIdentificacion}
                  onSelectCliente={handleSelectCliente}
                  onFechaChange={setFecha}
                  onCrearCliente={() => irACrear("/customers/new")}
                />

                <SeccionLineas
                  lineas={lineas}
                  productos={productos}
                  productoPreseleccionadoId={productoPreseleccionado}
                  formaPago={formaPago}
                  metodoPago={metodoPago}
                  formasPago={formasPago}
                  metodosPago={metodosPago}
                  errores={errors}
                  onAddLinea={handleAddLinea}
                  onRemoveLinea={handleRemoveLinea}
                  onLineaCantidadChange={handleLineaCantidadChange}
                  onFormaPagoChange={setFormaPago}
                  onMetodoPagoChange={setMetodoPago}
                  onCrearProducto={() => irACrear("/products/new")}
                />

                <SeccionResumen
                  lineas={lineas}
                  saveError={saveError}
                  isSavingDraft={isSavingDraft}
                  isSending={isSending}
                  onCancelar={() => navigate("/invoices")}
                  onGuardarBorrador={handleGuardarBorrador}
                  onEnviar={handleEnviar}
                />
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
