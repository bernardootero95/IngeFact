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
import { useCurrentEmpresa } from "../../../context/useCurrentEmpresa";
import WizardSteps from "../components/WizardSteps";
import StepCliente from "../components/StepCliente";
import StepLineas from "../components/StepLineas";
import StepRevisar from "../components/StepRevisar";
import StepConfirmacion from "../components/StepConfirmacion";
import {
  validateCliente,
  validateFecha,
  validateLineas,
  validateFormaPago,
  validateMetodoPago,
} from "./InvoiceWizardPage.validation";

const today = () => new Date().toISOString().slice(0, 10);

export default function InvoiceWizardPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const { empresa } = useCurrentEmpresa();

  const [step, setStep] = useState(1);
  const [cliente, setCliente] = useState(null);
  const [fecha, setFecha] = useState(today());
  const [lineas, setLineas] = useState([]);
  const [formaPago, setFormaPago] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  const [facturaId, setFacturaId] = useState(id || null);
  const [facturaResultado, setFacturaResultado] = useState(null);

  const [productos, setProductos] = useState([]);
  const [formasPago, setFormasPago] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);

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
      const [productosData, formasPagoData, metodosPagoData, factura] = await Promise.all([
        listProductos(),
        listPublicReferenceTable("formas_pago"),
        listPublicReferenceTable("metodos_pago"),
        isEditing ? getFactura(id) : Promise.resolve(null),
      ]);

      setProductos(productosData);
      setFormasPago(formasPagoData);
      setMetodosPago(metodosPagoData);

      if (factura) {
        if (factura.estado !== "borrador") {
          navigate(`/invoices/${id}`, { replace: true });
          return;
        }
        const clienteCompleto = await getCliente(factura.cliente_id);
        setCliente(clienteCompleto);
        setFecha(factura.fecha);
        setLineas(
          factura.lineas.map((linea) => ({
            producto_id: linea.producto_id,
            cantidad: String(linea.cantidad),
            producto: {
              id: linea.producto_id,
              nombre: linea.descripcion,
              precio: linea.precio_unitario,
              tributo: linea.tributo,
              tarifa_impuesto: linea.tarifa_impuesto,
            },
          })),
        );
      } else {
        setFormaPago(formasPagoData[0]?.code || "");
        setMetodoPago(metodosPagoData[0]?.code || "");
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

  const handleNextFromCliente = () => {
    const clienteError = validateCliente(cliente?.id);
    const fechaError = validateFecha(fecha);
    if (clienteError || fechaError) {
      setErrors((prev) => ({ ...prev, cliente: clienteError, fecha: fechaError }));
      return;
    }
    setStep(2);
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

  const handleNextFromLineas = () => {
    const lineasError = validateLineas(lineas);
    const formaPagoError = validateFormaPago(formaPago);
    const metodoPagoError = validateMetodoPago(metodoPago);
    if (lineasError || formaPagoError || metodoPagoError) {
      setErrors((prev) => ({ ...prev, lineas: lineasError, formaPago: formaPagoError, metodoPago: metodoPagoError }));
      return;
    }
    setStep(3);
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
    setIsSavingDraft(true);
    setSaveError(null);
    try {
      await guardarBorrador();
      navigate("/invoices");
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleEnviar = async () => {
    setIsSending(true);
    setSaveError(null);
    try {
      const guardada = await guardarBorrador();
      const enviada = await enviarFactura(guardada.id, { forma_pago: formaPago, metodo_pago: metodoPago });
      setFacturaResultado(enviada);
      setStep(4);
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleNuevaFactura = () => {
    setStep(1);
    setCliente(null);
    setFecha(today());
    setLineas([{ producto_id: "", cantidad: "1", producto: null }]);
    setFormaPago(formasPago[0]?.code || "");
    setMetodoPago(metodosPago[0]?.code || "");
    setFacturaId(null);
    setFacturaResultado(null);
    setErrors({});
    setSaveError(null);
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
          <div className="max-w-4xl mx-auto">
            {loading ? (
              <div className="p-12 text-center text-sm text-neutralCustom-500 animate-pulse">Cargando...</div>
            ) : loadError ? (
              <div className="p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
                {loadError}
              </div>
            ) : (
              <>
                <WizardSteps current={step} />

                {step === 1 && (
                  <StepCliente
                    cliente={cliente}
                    fecha={fecha}
                    error={errors.cliente}
                    onSelectCliente={handleSelectCliente}
                    onFechaChange={setFecha}
                    onNext={handleNextFromCliente}
                    onCancel={() => navigate("/invoices")}
                  />
                )}

                {step === 2 && (
                  <StepLineas
                    clienteNombre={cliente?.nombre}
                    fecha={fecha}
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
                    onBack={() => setStep(1)}
                    onNext={handleNextFromLineas}
                  />
                )}

                {step === 3 && (
                  <StepRevisar
                    empresaNombre={empresa?.razon_social}
                    empresaNit={empresa?.numero_identificacion}
                    cliente={cliente}
                    fecha={fecha}
                    lineas={lineas}
                    saveError={saveError}
                    isSavingDraft={isSavingDraft}
                    isSending={isSending}
                    onBack={() => setStep(2)}
                    onGuardarBorrador={handleGuardarBorrador}
                    onEnviar={handleEnviar}
                  />
                )}

                {step === 4 && facturaResultado && (
                  <StepConfirmacion
                    factura={facturaResultado}
                    clienteNombre={cliente?.nombre}
                    onNuevaFactura={handleNuevaFactura}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
