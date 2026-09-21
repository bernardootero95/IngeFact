import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { listProveedores, getProveedor, crearFacturaRecibida } from "@ingefact/core-api";
import { SearchableSelect, Button, PlusIcon, FormSkeleton } from "@ingefact/ui";
import Sidebar from "../../../components/Sidebar";
import { validateProveedor, validateCufe, validateFecha } from "./ReceivedInvoiceFormPage.validation";

const today = () => new Date().toISOString().slice(0, 10);

export default function ReceivedInvoiceFormPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [proveedor, setProveedor] = useState(null);
  const [cufe, setCufe] = useState("");
  const [numeroDocumentoProveedor, setNumeroDocumentoProveedor] = useState("");
  const [fecha, setFecha] = useState(today());
  const [montoTotal, setMontoTotal] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const [proveedores, setProveedores] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const proveedoresData = await listProveedores();
      setProveedores(proveedoresData);
      const nuevoProveedorId = location.state?.newProveedorId;
      if (nuevoProveedorId) {
        setProveedor(await getProveedor(nuevoProveedorId));
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

  const irACrearProveedor = () => {
    navigate("/suppliers/new", { state: { returnTo: location.pathname } });
  };

  const validarTodo = () => {
    const nuevosErrores = {
      proveedor: validateProveedor(proveedor?.id),
      cufe: validateCufe(cufe),
      fecha: validateFecha(fecha),
    };
    setErrors(nuevosErrores);
    return !Object.values(nuevosErrores).some(Boolean);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validarTodo()) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      const creada = await crearFacturaRecibida({
        proveedor_id: proveedor.id,
        cufe: cufe.trim(),
        numero_documento_proveedor: numeroDocumentoProveedor.trim() || null,
        fecha,
        monto_total: montoTotal ? Number(montoTotal) : null,
        observaciones: observaciones.trim() || null,
      });
      navigate(`/received-invoices/${creada.id}`);
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 min-w-0 flex flex-col md:h-screen md:overflow-hidden">
        <header className="min-h-16 py-2 md:py-0 md:h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between gap-3 px-4 md:px-8 shrink-0">
          <div>
            <div className="flex items-center gap-2 text-xs text-neutralCustom-500 mb-0.5">
              <Button
                onClick={() => navigate("/received-invoices")}
                variant="link"
              >
                Facturas recibidas
              </Button>
              <span>/</span>
              <span>Nueva</span>
            </div>
            <h2 className="text-lg font-medium text-neutralCustom-800">Registrar Factura Recibida</h2>
            <p className="hidden sm:block text-xs text-neutralCustom-500">
              El CUFE te lo da tu proveedor (viene en el XML/PDF que te envía).
            </p>
          </div>
        </header>

        <div className="p-4 md:p-8 flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto">
            {loading ? (
              <FormSkeleton label="Cargando..." />
            ) : loadError ? (
              <div className="p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
                {loadError}
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6 space-y-5"
              >
                {saveError && (
                  <div className="p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">
                    {saveError}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="proveedor-select" className="block text-sm font-medium text-neutralCustom-800">
                      Proveedor <span className="text-fiscal-danger">*</span>
                    </label>
                    <Button
                      onClick={irACrearProveedor}
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
                  {errors.proveedor && <p className="mt-1 text-sm text-fiscal-danger">{errors.proveedor}</p>}
                </div>

                <div>
                  <label htmlFor="cufe" className="block text-sm font-medium text-neutralCustom-800 mb-1.5">
                    CUFE <span className="text-fiscal-danger">*</span>
                  </label>
                  <input
                    type="text"
                    id="cufe"
                    value={cufe}
                    onChange={(e) => {
                      setCufe(e.target.value);
                      setErrors((prev) => ({ ...prev, cufe: validateCufe(e.target.value) }));
                    }}
                    placeholder="Código único de facturación electrónica"
                    className={`field w-full font-mono ${
                      errors.cufe ? "border-fiscal-danger field-invalid" : ""
                    }`}
                  />
                  {errors.cufe && <p className="mt-1 text-sm text-fiscal-danger">{errors.cufe}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="fecha" className="block text-sm font-medium text-neutralCustom-800 mb-1.5">
                      Fecha <span className="text-fiscal-danger">*</span>
                    </label>
                    <input
                      type="date"
                      id="fecha"
                      value={fecha}
                      onChange={(e) => {
                        setFecha(e.target.value);
                        setErrors((prev) => ({ ...prev, fecha: validateFecha(e.target.value) }));
                      }}
                      className={`field w-full ${
                        errors.fecha ? "border-fiscal-danger field-invalid" : ""
                      }`}
                    />
                    {errors.fecha && <p className="mt-1 text-sm text-fiscal-danger">{errors.fecha}</p>}
                  </div>

                  <div>
                    <label htmlFor="numero_documento_proveedor" className="block text-sm font-medium text-neutralCustom-800 mb-1.5">
                      Número de factura del proveedor
                    </label>
                    <input
                      type="text"
                      id="numero_documento_proveedor"
                      value={numeroDocumentoProveedor}
                      onChange={(e) => setNumeroDocumentoProveedor(e.target.value)}
                      placeholder="Opcional"
                      className="field w-full"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="monto_total" className="block text-sm font-medium text-neutralCustom-800 mb-1.5">
                    Monto total
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    id="monto_total"
                    value={montoTotal}
                    onChange={(e) => setMontoTotal(e.target.value)}
                    placeholder="Opcional, solo de referencia"
                    className="field w-full"
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
                    className="field w-full"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-neutralCustom-100">
                  <Button
                    variant="ghost"
                    onClick={() => navigate("/received-invoices")}
                    disabled={isSaving}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    title="Registrar factura recibida"
                    loading={isSaving}
                  >
                    Registrar
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
