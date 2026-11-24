import { useEffect, useState } from "react";
import { getConfiguracionNegocio, guardarConfiguracionNegocio, listEmpresas } from "@ingefact/core-api";
import { Button, FieldError, SearchableSelect, SpinnerLoading, ToastAlert, fieldA11y } from "@ingefact/ui";
import Sidebar from "../../../components/Sidebar";
import Footer from "../../../components/Footer";

const CAMPOS = [
  {
    name: "trm_usd_cop",
    id: "cfg-trm",
    label: "TRM (COP por US$ 1)",
    ayuda: "Convierte el costo del servidor a pesos en el dashboard.",
    step: "1",
    validar: (v) => (v > 0 ? "" : "Debe ser mayor a 0."),
  },
  {
    name: "costo_servidor_usd",
    id: "cfg-servidor",
    label: "Costo mensual del servidor (US$)",
    ayuda: "Lo que pagas al mes por el servidor, en dólares.",
    step: "0.01",
    validar: (v) => (v >= 0 ? "" : "No puede ser negativo."),
  },
  {
    name: "comision_paquetes_pct",
    id: "cfg-comision",
    label: "Comisión sobre paquetes vendidos (%)",
    ayuda: "Porcentaje del valor de los paquetes que se descuenta de la ganancia.",
    step: "0.1",
    validar: (v) => (v >= 0 && v <= 100 ? "" : "Debe estar entre 0 y 100."),
  },
];

const validarCampo = (campo, valor) => {
  if (valor === "" || isNaN(valor)) return "Obligatorio.";
  return campo.validar(Number(valor));
};

const CARD = "bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6 space-y-5";

export default function SettingsPage() {
  const [form, setForm] = useState(null);
  const [empresas, setEmpresas] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: null, type: "success" });

  useEffect(() => {
    Promise.all([getConfiguracionNegocio(), listEmpresas()])
      .then(([config, lista]) => {
        setForm({
          trm_usd_cop: String(config.trm_usd_cop),
          costo_servidor_usd: String(config.costo_servidor_usd),
          comision_paquetes_pct: String(config.comision_paquetes_pct),
          empresa_facturadora_id: config.empresa_facturadora_id || "",
        });
        setEmpresas(
          // El NIT va dentro de `value` porque SearchableSelect busca por value y code.
          (lista || []).map((e) => ({ code: e.id, value: `${e.razon_social} (NIT ${e.numero_identificacion})` })),
        );
      })
      .catch((err) => setToast({ message: err.message, type: "error" }))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (campo) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [campo.name]: value }));
    setErrors((prev) => ({ ...prev, [campo.name]: validarCampo(campo, value) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nuevosErrores = Object.fromEntries(CAMPOS.map((c) => [c.name, validarCampo(c, form[c.name])]));
    setErrors(nuevosErrores);
    if (Object.values(nuevosErrores).some(Boolean)) return;

    setSaving(true);
    try {
      await guardarConfiguracionNegocio({
        trm_usd_cop: Number(form.trm_usd_cop),
        costo_servidor_usd: Number(form.costo_servidor_usd),
        comision_paquetes_pct: Number(form.comision_paquetes_pct),
        ...(form.empresa_facturadora_id && { empresa_facturadora_id: form.empresa_facturadora_id }),
      });
      setToast({ message: "Configuración guardada.", type: "success" });
    } catch (err) {
      setToast({ message: err.message, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="relative flex-1 min-w-0 flex flex-col md:h-screen md:overflow-hidden">
        <header className="min-h-16 py-2 md:py-0 md:h-16 shrink-0 bg-white border-b border-neutralCustom-100 flex items-center px-4 md:px-8">
          <div>
            <h2 className="text-lg font-medium text-neutralCustom-800">Configuración</h2>
            <p className="hidden sm:block text-xs text-neutralCustom-500">Parámetros del negocio y facturación de paquetes.</p>
          </div>
        </header>

        <div className="p-4 md:p-8 flex-1 overflow-y-auto">
          {loading ? (
            <SpinnerLoading fullScreen={false} text="Cargando configuración..." />
          ) : (
            form && (
              <form onSubmit={handleSubmit} noValidate className="max-w-xl space-y-6">
                <section aria-labelledby="cfg-finanzas" className={CARD}>
                  <div>
                    <h3 id="cfg-finanzas" className="text-base font-medium text-neutralCustom-800">
                      Parámetros financieros
                    </h3>
                    <p className="text-xs text-neutralCustom-500 mt-0.5">
                      Se usan para calcular la ganancia o pérdida del mes en el dashboard.
                    </p>
                  </div>

                  {CAMPOS.map((campo) => (
                    <div key={campo.name}>
                      <label htmlFor={campo.id} className="block text-sm font-medium text-neutralCustom-700 mb-1">
                        {campo.label}
                      </label>
                      <input
                        id={campo.id}
                        type="number"
                        min="0"
                        step={campo.step}
                        value={form[campo.name]}
                        onChange={handleChange(campo)}
                        className={`field w-full ${errors[campo.name] ? "border-fiscal-danger field-invalid" : ""}`}
                        {...fieldA11y(campo.id, errors[campo.name])}
                      />
                      <p className="text-xs text-neutralCustom-500 mt-1">{campo.ayuda}</p>
                      {errors[campo.name] && <FieldError fieldId={campo.id}>{errors[campo.name]}</FieldError>}
                    </div>
                  ))}
                </section>

                <section aria-labelledby="cfg-facturacion" className={CARD}>
                  <div>
                    <h3 id="cfg-facturacion" className="text-base font-medium text-neutralCustom-800">
                      Facturación de paquetes
                    </h3>
                    <p className="text-xs text-neutralCustom-500 mt-0.5">
                      Cada paquete vendido se factura automáticamente desde esta empresa, con su resolución DIAN y su
                      cupo de documentos.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="cfg-facturadora" className="block text-sm font-medium text-neutralCustom-700 mb-1">
                      Empresa facturadora
                    </label>
                    <SearchableSelect
                      id="cfg-facturadora"
                      options={empresas}
                      value={form.empresa_facturadora_id}
                      onChange={(value) => setForm((prev) => ({ ...prev, empresa_facturadora_id: value }))}
                      placeholder="Buscar empresa por nombre o NIT..."
                      formatOption={(opt) => opt.value}
                    />
                    {!form.empresa_facturadora_id && (
                      <p className="text-xs text-amber-700 mt-1">
                        Sin empresa facturadora los paquetes vendidos no se facturan.
                      </p>
                    )}
                  </div>
                </section>

                <div className="flex justify-end">
                  <Button type="submit" loading={saving}>
                    Guardar
                  </Button>
                </div>
              </form>
            )
          )}
        </div>

        <Footer />
      </main>

      <ToastAlert
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: null, type: "success" })}
      />
    </div>
  );
}
