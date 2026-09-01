import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  listProductos,
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

export default function InvoiceFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [cliente, setCliente] = useState(null);
  const [fecha, setFecha] = useState(today());
  const [lineas, setLineas] = useState([]);
  const [formaPago, setFormaPago] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  const [facturaId, setFacturaId] = useState(id || null);

  const [productos, setProductos] = useState([]);
  const [formasPago, setFormasPago] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);
  const [tiposOrganizacion, setTiposOrganizacion] = useState([]);
  const [regimenes, setRegimenes] = useState([]);
  const [tributos, setTributos] = useState([]);

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
      const [
        productosData,
        formasPagoData,
        metodosPagoData,
        tiposOrganizacionData,
        regimenesData,
        tributosData,
        factura,
      ] = await Promise.all([
        listProductos(),
        listPublicReferenceTable("formas_pago"),
        listPublicReferenceTable("metodos_pago"),
        listPublicReferenceTable("tipos_organizacion"),
        listPublicReferenceTable("responsabilidades_fiscales"),
        listPublicReferenceTable("tributos"),
        isEditing ? getFactura(id) : Promise.resolve(null),
      ]);

      // Codigo "1" = "Instrumento no definido" -- un placeholder del catalogo
      // DIAN, no una forma de pago real. Nunca debe quedar seleccionable.
      const metodosPagoValidos = metodosPagoData.filter((m) => m.code !== "1");

      setProductos(productosData);
      setFormasPago(formasPagoData);
      setMetodosPago(metodosPagoValidos);
      setTiposOrganizacion(tiposOrganizacionData);
      setRegimenes(regimenesData);
      setTributos(tributosData);

      if (factura) {
        if (factura.estado !== "borrador") {
          navigate(`/invoices/${id}`, { replace: true });
          return;
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
        setLineas([{ producto_id: "", cantidad: "1", producto: null }]);
      }
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, [id, isEditing, navigate]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleSelectCliente = (nuevoCliente) => {
    setCliente(nuevoCliente);
    setErrors((prev) => ({ ...prev, cliente: nuevoCliente ? "" : prev.cliente }));
  };

  const handleAddLinea = () => {
    setLineas((prev) => [...prev, { producto_id: "", cantidad: "1", producto: null }]);
  };

  const handleRemoveLinea = (index) => {
    setLineas((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLineaProductoChange = (index, productoId) => {
    const producto = productos.find((p) => p.id === productoId) || null;
    setLineas((prev) => prev.map((linea, i) => (i === index ? { ...linea, producto_id: productoId, producto } : linea)));
  };

  const handleLineaCantidadChange = (index, cantidad) => {
    setLineas((prev) => prev.map((linea, i) => (i === index ? { ...linea, cantidad } : linea)));
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
                <SeccionCliente
                  cliente={cliente}
                  fecha={fecha}
                  error={errors.cliente}
                  tiposOrganizacion={tiposOrganizacion}
                  regimenes={regimenes}
                  tributos={tributos}
                  onSelectCliente={handleSelectCliente}
                  onFechaChange={setFecha}
                />

                <SeccionLineas
                  lineas={lineas}
                  productos={productos}
                  formaPago={formaPago}
                  metodoPago={metodoPago}
                  formasPago={formasPago}
                  metodosPago={metodosPago}
                  errores={errors}
                  onAddLinea={handleAddLinea}
                  onRemoveLinea={handleRemoveLinea}
                  onLineaProductoChange={handleLineaProductoChange}
                  onLineaCantidadChange={handleLineaCantidadChange}
                  onFormaPagoChange={setFormaPago}
                  onMetodoPagoChange={setMetodoPago}
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
