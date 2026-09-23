import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  getNomina,
  crearBorradorNomina,
  actualizarBorradorNomina,
  listEmpleados,
  listPublicReferenceTable,
} from "@ingefact/core-api";
import { SearchableSelect, Button, PlusIcon, FormSkeleton } from "@ingefact/ui";
import Sidebar from "../../../components/Sidebar";
import { fechaHoyColombia } from "@ingefact/utils";

const today = fechaHoyColombia;

const HORAS_EXTRA_TIPOS = [
  { code: "1", bloque: "HEDs", item: "HED" },
  { code: "2", bloque: "HENs", item: "HEN" },
  { code: "3", bloque: "HRNs", item: "HRN" },
  { code: "4", bloque: "HEDDFs", item: "HEDDF" },
  { code: "5", bloque: "HRDDFs", item: "HRDDF" },
  { code: "6", bloque: "HENDFs", item: "HENDF" },
  { code: "7", bloque: "HRNDFs", item: "HRND" },
];

const num = (v) => (v === "" || v === null || v === undefined ? 0 : Number(v) || 0);
const formatCOP = (value) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value || 0);

const CODIGO_FORMA_CONTADO = "1";
// Solo con este metodo el schema de la DIAN espera Banco/TipoCuenta/NumeroCuenta.
const CODIGO_METODO_CONSIGNACION_BANCARIA = "42";

export default function PayrollFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const [empleados, setEmpleados] = useState([]);
  const [catalogos, setCatalogos] = useState({
    periodos: [],
    formasPago: [],
    metodosPago: [],
    tiposIncapacidad: [],
  });

  const [empleadoId, setEmpleadoId] = useState("");
  const [periodoNomina, setPeriodoNomina] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [fechaPago, setFechaPago] = useState(today());
  const [formaPago, setFormaPago] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  const [banco, setBanco] = useState("");
  const [tipoCuenta, setTipoCuenta] = useState("");
  const [numeroCuenta, setNumeroCuenta] = useState("");
  const [notas, setNotas] = useState("");

  // Devengados
  const [diasTrabajados, setDiasTrabajados] = useState("30");
  const [sueldoTrabajado, setSueldoTrabajado] = useState("");
  const [transporteActivo, setTransporteActivo] = useState(false);
  const [transporteMonto, setTransporteMonto] = useState("");
  const [horasExtraActivo, setHorasExtraActivo] = useState(false);
  const [horasExtra, setHorasExtra] = useState({});
  const [vacacionesActivo, setVacacionesActivo] = useState(false);
  const [vacaciones, setVacaciones] = useState({ fechaInicio: "", fechaFin: "", cantidad: "", pago: "" });
  const [primasActivo, setPrimasActivo] = useState(false);
  const [primas, setPrimas] = useState({ cantidad: "", pago: "" });
  const [cesantiasActivo, setCesantiasActivo] = useState(false);
  const [cesantias, setCesantias] = useState({ pago: "", porcentaje: "", pagoIntereses: "" });
  const [incapacidadActivo, setIncapacidadActivo] = useState(false);
  const [incapacidad, setIncapacidad] = useState({ tipo: "", fechaInicio: "", fechaFin: "", cantidad: "", pago: "" });
  const [otrosDevengados, setOtrosDevengados] = useState({
    dotacion: "",
    apoyoSost: "",
    teletrabajo: "",
    bonifRetiro: "",
    indemnizacion: "",
    reintegro: "",
  });

  // Deducciones
  const [saludPorcentaje, setSaludPorcentaje] = useState("4");
  const [saludDeduccion, setSaludDeduccion] = useState("");
  const [fondoPensionPorcentaje, setFondoPensionPorcentaje] = useState("4");
  const [fondoPensionDeduccion, setFondoPensionDeduccion] = useState("");
  const [retencionFuente, setRetencionFuente] = useState("");
  const [fondoSPActivo, setFondoSPActivo] = useState(false);
  const [fondoSP, setFondoSP] = useState({ porcentaje: "", deduccionSP: "", porcentajeSub: "", deduccionSub: "" });
  const [otrasDeducciones, setOtrasDeducciones] = useState({
    pensionVoluntaria: "",
    afc: "",
    cooperativa: "",
    embargoFiscal: "",
    planComplementarios: "",
    educacion: "",
    deuda: "",
  });

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [empleadosData, periodos, formasPago, metodosPago, tiposIncapacidad, nomina] = await Promise.all([
        listEmpleados(),
        listPublicReferenceTable("periodos_nomina"),
        listPublicReferenceTable("formas_pago"),
        listPublicReferenceTable("metodos_pago"),
        listPublicReferenceTable("tipos_incapacidad"),
        isEditing ? getNomina(id) : Promise.resolve(null),
      ]);

      setEmpleados(empleadosData);
      setCatalogos({
        periodos,
        formasPago,
        metodosPago: metodosPago.filter((m) => m.code !== "1"),
        tiposIncapacidad,
      });

      if (nomina) {
        setEmpleadoId(nomina.empleado_id);
        setPeriodoNomina(nomina.periodo_nomina);
        setFechaInicio(nomina.fecha_liquidacion_inicio);
        setFechaFin(nomina.fecha_liquidacion_fin);
        setFechaPago(nomina.fecha_pago?.[0] || today());
        setFormaPago(nomina.forma_pago);
        setMetodoPago(nomina.metodo_pago);
        setBanco(nomina.banco || "");
        setTipoCuenta(nomina.tipo_cuenta || "");
        setNumeroCuenta(nomina.numero_cuenta || "");
        setNotas(nomina.notas || "");
        cargarDevengadosDeducciones(nomina.devengados, nomina.deducciones);
      } else {
        setPeriodoNomina(periodos[0]?.code || "");
        setFormaPago(formasPago.find((f) => f.code === CODIGO_FORMA_CONTADO)?.code || formasPago[0]?.code || "");
        setMetodoPago(metodosPago.filter((m) => m.code !== "1")[0]?.code || "");
      }
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, [id, isEditing]);

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargarDatos]);

  function cargarDevengadosDeducciones(devengados, deducciones) {
    const basico = devengados?.Basico || {};
    setDiasTrabajados(String(basico.DiasTrabajados ?? "30"));
    setSueldoTrabajado(String(basico.SueldoTrabajado ?? ""));

    const transporte = devengados?.Transporte?.[0];
    if (transporte) {
      setTransporteActivo(true);
      setTransporteMonto(String(transporte.AuxilioTransporte ?? ""));
    }

    const nuevasHoras = {};
    HORAS_EXTRA_TIPOS.forEach(({ code, bloque, item }) => {
      const entrada = devengados?.[bloque]?.[item]?.[0];
      if (entrada) nuevasHoras[code] = { cantidad: String(entrada.Cantidad ?? ""), pago: String(entrada.Pago ?? "") };
    });
    setHorasExtra(nuevasHoras);
    if (Object.keys(nuevasHoras).length > 0) setHorasExtraActivo(true);

    const vac = devengados?.Vacaciones?.VacacionesComunes?.[0];
    if (vac) {
      setVacacionesActivo(true);
      setVacaciones({
        fechaInicio: vac.FechaInicio || "",
        fechaFin: vac.FechaFin || "",
        cantidad: String(vac.Cantidad ?? ""),
        pago: String(vac.Pago ?? ""),
      });
    }

    if (devengados?.Primas) {
      setPrimasActivo(true);
      setPrimas({ cantidad: String(devengados.Primas.Cantidad ?? ""), pago: String(devengados.Primas.Pago ?? "") });
    }

    if (devengados?.Cesantias) {
      setCesantiasActivo(true);
      setCesantias({
        pago: String(devengados.Cesantias.Pago ?? ""),
        porcentaje: String(devengados.Cesantias.Porcentaje ?? ""),
        pagoIntereses: String(devengados.Cesantias.PagoIntereses ?? ""),
      });
    }

    const inc = devengados?.Incapacidades?.[0];
    if (inc) {
      setIncapacidadActivo(true);
      setIncapacidad({
        tipo: String(inc.Tipo ?? ""),
        fechaInicio: inc.FechaInicio || "",
        fechaFin: inc.FechaFin || "",
        cantidad: String(inc.Cantidad ?? ""),
        pago: String(inc.Pago ?? ""),
      });
    }

    setOtrosDevengados({
      dotacion: String(devengados?.Dotacion ?? ""),
      apoyoSost: String(devengados?.ApoyoSost ?? ""),
      teletrabajo: String(devengados?.Teletrabajo ?? ""),
      bonifRetiro: String(devengados?.BonifRetiro ?? ""),
      indemnizacion: String(devengados?.Indemnizacion ?? ""),
      reintegro: String(devengados?.Reintegro ?? ""),
    });

    setSaludPorcentaje(String(deducciones?.Salud?.Porcentaje ?? "4"));
    setSaludDeduccion(String(deducciones?.Salud?.Deduccion ?? ""));
    setFondoPensionPorcentaje(String(deducciones?.FondoPension?.Porcentaje ?? "4"));
    setFondoPensionDeduccion(String(deducciones?.FondoPension?.Deduccion ?? ""));
    setRetencionFuente(String(deducciones?.RetencionFuente ?? ""));

    if (deducciones?.FondoSP) {
      setFondoSPActivo(true);
      setFondoSP({
        porcentaje: String(deducciones.FondoSP.Porcentaje ?? ""),
        deduccionSP: String(deducciones.FondoSP.DeduccionSP ?? ""),
        porcentajeSub: String(deducciones.FondoSP.PorcentajeSub ?? ""),
        deduccionSub: String(deducciones.FondoSP.DeduccionSub ?? ""),
      });
    }

    setOtrasDeducciones({
      pensionVoluntaria: String(deducciones?.PensionVoluntaria ?? ""),
      afc: String(deducciones?.AFC ?? ""),
      cooperativa: String(deducciones?.Cooperativa ?? ""),
      embargoFiscal: String(deducciones?.EmbargoFiscal ?? ""),
      planComplementarios: String(deducciones?.PlanComplementarios ?? ""),
      educacion: String(deducciones?.Educacion ?? ""),
      deuda: String(deducciones?.Deuda ?? ""),
    });
  }

  const handleSelectEmpleado = (nuevoId) => {
    setEmpleadoId(nuevoId);
    const empleado = empleados.find((e) => e.id === nuevoId);
    if (empleado && !isEditing) {
      setSueldoTrabajado(String(empleado.sueldo));
      setSaludDeduccion(String(Math.round((empleado.sueldo * num(saludPorcentaje)) / 100)));
      setFondoPensionDeduccion(String(Math.round((empleado.sueldo * num(fondoPensionPorcentaje)) / 100)));
      if (empleado.banco) setBanco(empleado.banco);
      if (empleado.tipo_cuenta) setTipoCuenta(empleado.tipo_cuenta);
      if (empleado.numero_cuenta) setNumeroCuenta(empleado.numero_cuenta);
    }
  };

  const empleadoOptions = empleados.map((e) => ({
    code: e.id,
    value: `${[e.primer_nombre, e.primer_apellido].filter(Boolean).join(" ")} (${e.numero_documento})`,
  }));

  const { devengados, deducciones, devengadosTotal, deduccionesTotal, comprobanteTotal } = useMemo(() => {
    const dev = { Basico: { DiasTrabajados: num(diasTrabajados), SueldoTrabajado: num(sueldoTrabajado) } };
    let devTotal = num(sueldoTrabajado);

    if (transporteActivo && num(transporteMonto) > 0) {
      dev.Transporte = [{ AuxilioTransporte: num(transporteMonto) }];
      devTotal += num(transporteMonto);
    }

    if (horasExtraActivo) {
      HORAS_EXTRA_TIPOS.forEach(({ code, bloque, item }) => {
        const entrada = horasExtra[code];
        if (entrada && num(entrada.pago) > 0) {
          dev[bloque] = { [item]: [{ Cantidad: num(entrada.cantidad), Porcentaje: code, Pago: num(entrada.pago) }] };
          devTotal += num(entrada.pago);
        }
      });
    }

    if (vacacionesActivo && num(vacaciones.pago) > 0) {
      dev.Vacaciones = {
        VacacionesComunes: [
          {
            FechaInicio: vacaciones.fechaInicio || undefined,
            FechaFin: vacaciones.fechaFin || undefined,
            Cantidad: num(vacaciones.cantidad),
            Pago: num(vacaciones.pago),
          },
        ],
      };
      devTotal += num(vacaciones.pago);
    }

    if (primasActivo && num(primas.pago) > 0) {
      dev.Primas = { Cantidad: num(primas.cantidad), Pago: num(primas.pago) };
      devTotal += num(primas.pago);
    }

    if (cesantiasActivo && num(cesantias.pago) > 0) {
      dev.Cesantias = {
        Pago: num(cesantias.pago),
        Porcentaje: num(cesantias.porcentaje),
        PagoIntereses: num(cesantias.pagoIntereses),
      };
      devTotal += num(cesantias.pago) + num(cesantias.pagoIntereses);
    }

    if (incapacidadActivo && num(incapacidad.pago) > 0) {
      dev.Incapacidades = [
        {
          FechaInicio: incapacidad.fechaInicio || undefined,
          FechaFin: incapacidad.fechaFin || undefined,
          Cantidad: num(incapacidad.cantidad),
          Tipo: num(incapacidad.tipo),
          Pago: num(incapacidad.pago),
        },
      ];
      devTotal += num(incapacidad.pago);
    }

    const otrosMap = {
      dotacion: "Dotacion",
      apoyoSost: "ApoyoSost",
      teletrabajo: "Teletrabajo",
      bonifRetiro: "BonifRetiro",
      indemnizacion: "Indemnizacion",
      reintegro: "Reintegro",
    };
    Object.entries(otrosMap).forEach(([key, campo]) => {
      const monto = num(otrosDevengados[key]);
      if (monto > 0) {
        dev[campo] = monto;
        devTotal += monto;
      }
    });

    const ded = {
      Salud: { Porcentaje: num(saludPorcentaje), Deduccion: num(saludDeduccion) },
      FondoPension: { Porcentaje: num(fondoPensionPorcentaje), Deduccion: num(fondoPensionDeduccion) },
    };
    let dedTotal = num(saludDeduccion) + num(fondoPensionDeduccion);

    if (num(retencionFuente) > 0) {
      ded.RetencionFuente = num(retencionFuente);
      dedTotal += num(retencionFuente);
    }

    if (fondoSPActivo && num(fondoSP.deduccionSP) > 0) {
      ded.FondoSP = {
        Porcentaje: num(fondoSP.porcentaje),
        DeduccionSP: num(fondoSP.deduccionSP),
        PorcentajeSub: num(fondoSP.porcentajeSub),
        DeduccionSub: num(fondoSP.deduccionSub),
      };
      dedTotal += num(fondoSP.deduccionSP) + num(fondoSP.deduccionSub);
    }

    const otrasDedMap = {
      pensionVoluntaria: "PensionVoluntaria",
      afc: "AFC",
      cooperativa: "Cooperativa",
      embargoFiscal: "EmbargoFiscal",
      planComplementarios: "PlanComplementarios",
      educacion: "Educacion",
      deuda: "Deuda",
    };
    Object.entries(otrasDedMap).forEach(([key, campo]) => {
      const monto = num(otrasDeducciones[key]);
      if (monto > 0) {
        ded[campo] = monto;
        dedTotal += monto;
      }
    });

    return {
      devengados: dev,
      deducciones: ded,
      devengadosTotal: devTotal,
      deduccionesTotal: dedTotal,
      comprobanteTotal: devTotal - dedTotal,
    };
  }, [
    diasTrabajados,
    sueldoTrabajado,
    transporteActivo,
    transporteMonto,
    horasExtraActivo,
    horasExtra,
    vacacionesActivo,
    vacaciones,
    primasActivo,
    primas,
    cesantiasActivo,
    cesantias,
    incapacidadActivo,
    incapacidad,
    otrosDevengados,
    saludPorcentaje,
    saludDeduccion,
    fondoPensionPorcentaje,
    fondoPensionDeduccion,
    retencionFuente,
    fondoSPActivo,
    fondoSP,
    otrasDeducciones,
  ]);

  const esConsignacionBancaria = metodoPago === CODIGO_METODO_CONSIGNACION_BANCARIA;

  const puedeGuardar =
    empleadoId &&
    periodoNomina &&
    fechaInicio &&
    fechaFin &&
    fechaPago &&
    formaPago &&
    metodoPago &&
    num(sueldoTrabajado) > 0 &&
    (!esConsignacionBancaria || (banco.trim() && tipoCuenta.trim() && numeroCuenta.trim()));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!puedeGuardar) return;

    const payload = {
      empleado_id: empleadoId,
      periodo_nomina: periodoNomina,
      fecha_liquidacion_inicio: fechaInicio,
      fecha_liquidacion_fin: fechaFin,
      fecha_pago: [fechaPago],
      forma_pago: formaPago,
      metodo_pago: metodoPago,
      banco: esConsignacionBancaria ? banco.trim() || null : null,
      tipo_cuenta: esConsignacionBancaria ? tipoCuenta.trim() || null : null,
      numero_cuenta: esConsignacionBancaria ? numeroCuenta.trim() || null : null,
      devengados,
      deducciones,
      devengados_total: devengadosTotal,
      deducciones_total: deduccionesTotal,
      comprobante_total: comprobanteTotal,
      notas: notas.trim() || null,
    };

    setIsSaving(true);
    setSaveError(null);
    try {
      if (isEditing) {
        await actualizarBorradorNomina(id, payload);
        navigate(`/payroll/${id}`);
      } else {
        const creada = await crearBorradorNomina(payload);
        navigate(`/payroll/${creada.id}`);
      }
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
            <h2 className="text-lg font-medium text-neutralCustom-800">
              {isEditing ? "Editar Comprobante de Nómina" : "Nuevo Comprobante de Nómina"}
            </h2>
            <p className="hidden sm:block text-xs text-neutralCustom-500">Borrador -- se envía a la DIAN desde el detalle.</p>
          </div>
          <Button onClick={() => navigate("/payroll")} variant="ghost">
            Cancelar
          </Button>
        </header>

        <div className="p-4 md:p-8 flex-1 overflow-y-auto">
          <div className="max-w-4xl">
            {loading ? (
              <FormSkeleton label="Cargando..." />
            ) : loadError ? (
              <div className="p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">{loadError}</div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {saveError && (
                  <div className="p-3 bg-red-50 border border-fiscal-danger text-fiscal-danger text-sm rounded-brand-md">{saveError}</div>
                )}

                <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6 space-y-4">
                  <h4 className="text-sm font-semibold text-neutralCustom-800">Empleado y Período</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="empleado-select" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                        Empleado <span className="text-fiscal-danger">*</span>
                      </label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <SearchableSelect
                            id="empleado-select"
                            options={empleadoOptions}
                            value={empleadoId}
                            onChange={handleSelectEmpleado}
                            placeholder="Selecciona un empleado..."
                            formatOption={(opt) => opt.value}
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={() => navigate("/employees/new", { state: { returnTo: location.pathname } })}
                          icon={PlusIcon}
                          title="Nuevo empleado"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="periodo" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                        Período de Nómina <span className="text-fiscal-danger">*</span>
                      </label>
                      <select id="periodo" value={periodoNomina} onChange={(e) => setPeriodoNomina(e.target.value)} className="field w-full">
                        {catalogos.periodos.map((p) => (
                          <option key={p.code} value={p.code}>
                            {p.value}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="fecha-inicio" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                        Inicio de Liquidación <span className="text-fiscal-danger">*</span>
                      </label>
                      <input
                        type="date"
                        id="fecha-inicio"
                        value={fechaInicio}
                        onChange={(e) => setFechaInicio(e.target.value)}
                        className="field w-full"
                      />
                    </div>
                    <div>
                      <label htmlFor="fecha-fin" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                        Fin de Liquidación <span className="text-fiscal-danger">*</span>
                      </label>
                      <input type="date" id="fecha-fin" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="field w-full" />
                    </div>
                    <div>
                      <label htmlFor="fecha-pago" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                        Fecha de Pago <span className="text-fiscal-danger">*</span>
                      </label>
                      <input type="date" id="fecha-pago" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} className="field w-full" />
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6 space-y-4">
                  <h4 className="text-sm font-semibold text-neutralCustom-800">Forma de Pago</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="forma-pago" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                        Forma de Pago <span className="text-fiscal-danger">*</span>
                      </label>
                      <select id="forma-pago" value={formaPago} onChange={(e) => setFormaPago(e.target.value)} className="field w-full">
                        {catalogos.formasPago.map((f) => (
                          <option key={f.code} value={f.code}>
                            {f.value}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="metodo-pago" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                        Método de Pago <span className="text-fiscal-danger">*</span>
                      </label>
                      <select id="metodo-pago" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className="field w-full">
                        {catalogos.metodosPago.map((m) => (
                          <option key={m.code} value={m.code}>
                            {m.value}
                          </option>
                        ))}
                      </select>
                    </div>
                    {esConsignacionBancaria && (
                      <>
                        <div>
                          <label htmlFor="banco" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                            Banco <span className="text-fiscal-danger">*</span>
                          </label>
                          <input type="text" id="banco" value={banco} onChange={(e) => setBanco(e.target.value)} className="field w-full" />
                        </div>
                        <div>
                          <label htmlFor="tipo-cuenta" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                            Tipo de Cuenta <span className="text-fiscal-danger">*</span>
                          </label>
                          <input
                            type="text"
                            id="tipo-cuenta"
                            value={tipoCuenta}
                            onChange={(e) => setTipoCuenta(e.target.value)}
                            className="field w-full"
                            placeholder="Ahorros / Corriente"
                          />
                        </div>
                        <div>
                          <label htmlFor="numero-cuenta" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                            Número de Cuenta <span className="text-fiscal-danger">*</span>
                          </label>
                          <input
                            type="text"
                            id="numero-cuenta"
                            value={numeroCuenta}
                            onChange={(e) => setNumeroCuenta(e.target.value)}
                            className="field w-full"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6 space-y-5">
                  <h4 className="text-sm font-semibold text-neutralCustom-800">Devengados</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="dias-trabajados" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                        Días Trabajados <span className="text-fiscal-danger">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="31"
                        id="dias-trabajados"
                        value={diasTrabajados}
                        onChange={(e) => setDiasTrabajados(e.target.value)}
                        className="field w-full"
                      />
                    </div>
                    <div>
                      <label htmlFor="sueldo-trabajado" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                        Sueldo Básico <span className="text-fiscal-danger">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        id="sueldo-trabajado"
                        value={sueldoTrabajado}
                        onChange={(e) => setSueldoTrabajado(e.target.value)}
                        className="field w-full"
                      />
                    </div>
                  </div>

                  <SeccionToggle titulo="Auxilio de Transporte" activo={transporteActivo} onToggle={setTransporteActivo}>
                    <CampoMonto label="Monto" value={transporteMonto} onChange={setTransporteMonto} />
                  </SeccionToggle>

                  <SeccionToggle titulo="Horas Extra y Recargos" activo={horasExtraActivo} onToggle={setHorasExtraActivo}>
                    <div className="space-y-2">
                      {HORAS_EXTRA_TIPOS.map(({ code }) => (
                        <FilaHoraExtra
                          key={code}
                          codigo={code}
                          etiqueta={HORAS_EXTRA_LABEL[code]}
                          valor={horasExtra[code] || { cantidad: "", pago: "" }}
                          onChange={(valor) => setHorasExtra((prev) => ({ ...prev, [code]: valor }))}
                        />
                      ))}
                    </div>
                  </SeccionToggle>

                  <SeccionToggle titulo="Vacaciones" activo={vacacionesActivo} onToggle={setVacacionesActivo}>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <CampoFecha label="Desde" value={vacaciones.fechaInicio} onChange={(v) => setVacaciones((p) => ({ ...p, fechaInicio: v }))} />
                      <CampoFecha label="Hasta" value={vacaciones.fechaFin} onChange={(v) => setVacaciones((p) => ({ ...p, fechaFin: v }))} />
                      <CampoNumero label="Días" value={vacaciones.cantidad} onChange={(v) => setVacaciones((p) => ({ ...p, cantidad: v }))} />
                      <CampoMonto label="Pago" value={vacaciones.pago} onChange={(v) => setVacaciones((p) => ({ ...p, pago: v }))} />
                    </div>
                  </SeccionToggle>

                  <SeccionToggle titulo="Prima" activo={primasActivo} onToggle={setPrimasActivo}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <CampoNumero label="Días" value={primas.cantidad} onChange={(v) => setPrimas((p) => ({ ...p, cantidad: v }))} />
                      <CampoMonto label="Pago" value={primas.pago} onChange={(v) => setPrimas((p) => ({ ...p, pago: v }))} />
                    </div>
                  </SeccionToggle>

                  <SeccionToggle titulo="Cesantías" activo={cesantiasActivo} onToggle={setCesantiasActivo}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <CampoMonto label="Pago" value={cesantias.pago} onChange={(v) => setCesantias((p) => ({ ...p, pago: v }))} />
                      <CampoNumero label="Porcentaje" value={cesantias.porcentaje} onChange={(v) => setCesantias((p) => ({ ...p, porcentaje: v }))} />
                      <CampoMonto
                        label="Intereses a Cesantías"
                        value={cesantias.pagoIntereses}
                        onChange={(v) => setCesantias((p) => ({ ...p, pagoIntereses: v }))}
                      />
                    </div>
                  </SeccionToggle>

                  <SeccionToggle titulo="Incapacidad" activo={incapacidadActivo} onToggle={setIncapacidadActivo}>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-neutralCustom-500 mb-1">Tipo</label>
                        <select
                          value={incapacidad.tipo}
                          onChange={(e) => setIncapacidad((p) => ({ ...p, tipo: e.target.value }))}
                          className="field w-full"
                        >
                          <option value="">Seleccione...</option>
                          {catalogos.tiposIncapacidad.map((t) => (
                            <option key={t.code} value={t.code}>
                              {t.value}
                            </option>
                          ))}
                        </select>
                      </div>
                      <CampoFecha label="Desde" value={incapacidad.fechaInicio} onChange={(v) => setIncapacidad((p) => ({ ...p, fechaInicio: v }))} />
                      <CampoFecha label="Hasta" value={incapacidad.fechaFin} onChange={(v) => setIncapacidad((p) => ({ ...p, fechaFin: v }))} />
                      <CampoNumero label="Días" value={incapacidad.cantidad} onChange={(v) => setIncapacidad((p) => ({ ...p, cantidad: v }))} />
                      <CampoMonto label="Pago" value={incapacidad.pago} onChange={(v) => setIncapacidad((p) => ({ ...p, pago: v }))} />
                    </div>
                  </SeccionToggle>

                  <div className="border-t border-neutralCustom-100 pt-4">
                    <p className="text-sm font-medium text-neutralCustom-700 mb-2">Otros Devengados</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <CampoMonto label="Dotación" value={otrosDevengados.dotacion} onChange={(v) => setOtrosDevengados((p) => ({ ...p, dotacion: v }))} />
                      <CampoMonto label="Apoyo de Sostenimiento" value={otrosDevengados.apoyoSost} onChange={(v) => setOtrosDevengados((p) => ({ ...p, apoyoSost: v }))} />
                      <CampoMonto label="Teletrabajo" value={otrosDevengados.teletrabajo} onChange={(v) => setOtrosDevengados((p) => ({ ...p, teletrabajo: v }))} />
                      <CampoMonto label="Bonificación de Retiro" value={otrosDevengados.bonifRetiro} onChange={(v) => setOtrosDevengados((p) => ({ ...p, bonifRetiro: v }))} />
                      <CampoMonto label="Indemnización" value={otrosDevengados.indemnizacion} onChange={(v) => setOtrosDevengados((p) => ({ ...p, indemnizacion: v }))} />
                      <CampoMonto label="Reintegro" value={otrosDevengados.reintegro} onChange={(v) => setOtrosDevengados((p) => ({ ...p, reintegro: v }))} />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-neutralCustom-100">
                    <p className="text-sm font-semibold text-neutralCustom-800">Total Devengados: {formatCOP(devengadosTotal)}</p>
                  </div>
                </div>

                <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6 space-y-5">
                  <h4 className="text-sm font-semibold text-neutralCustom-800">Deducciones</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid grid-cols-2 gap-3">
                      <CampoNumero label="Salud %" value={saludPorcentaje} onChange={setSaludPorcentaje} />
                      <CampoMonto label="Salud - Deducción" value={saludDeduccion} onChange={setSaludDeduccion} required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <CampoNumero label="Pensión %" value={fondoPensionPorcentaje} onChange={setFondoPensionPorcentaje} />
                      <CampoMonto label="Pensión - Deducción" value={fondoPensionDeduccion} onChange={setFondoPensionDeduccion} required />
                    </div>
                  </div>

                  <CampoMonto label="Retención en la Fuente" value={retencionFuente} onChange={setRetencionFuente} />

                  <SeccionToggle titulo="Fondo de Solidaridad Pensional" activo={fondoSPActivo} onToggle={setFondoSPActivo}>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <CampoNumero label="Porcentaje" value={fondoSP.porcentaje} onChange={(v) => setFondoSP((p) => ({ ...p, porcentaje: v }))} />
                      <CampoMonto label="Deducción" value={fondoSP.deduccionSP} onChange={(v) => setFondoSP((p) => ({ ...p, deduccionSP: v }))} />
                      <CampoNumero label="% Subsistencia" value={fondoSP.porcentajeSub} onChange={(v) => setFondoSP((p) => ({ ...p, porcentajeSub: v }))} />
                      <CampoMonto label="Deducción Subsist." value={fondoSP.deduccionSub} onChange={(v) => setFondoSP((p) => ({ ...p, deduccionSub: v }))} />
                    </div>
                  </SeccionToggle>

                  <div className="border-t border-neutralCustom-100 pt-4">
                    <p className="text-sm font-medium text-neutralCustom-700 mb-2">Otras Deducciones</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <CampoMonto label="Pensión Voluntaria" value={otrasDeducciones.pensionVoluntaria} onChange={(v) => setOtrasDeducciones((p) => ({ ...p, pensionVoluntaria: v }))} />
                      <CampoMonto label="AFC" value={otrasDeducciones.afc} onChange={(v) => setOtrasDeducciones((p) => ({ ...p, afc: v }))} />
                      <CampoMonto label="Cooperativa" value={otrasDeducciones.cooperativa} onChange={(v) => setOtrasDeducciones((p) => ({ ...p, cooperativa: v }))} />
                      <CampoMonto label="Embargo Fiscal" value={otrasDeducciones.embargoFiscal} onChange={(v) => setOtrasDeducciones((p) => ({ ...p, embargoFiscal: v }))} />
                      <CampoMonto label="Plan Complementario Salud" value={otrasDeducciones.planComplementarios} onChange={(v) => setOtrasDeducciones((p) => ({ ...p, planComplementarios: v }))} />
                      <CampoMonto label="Educación" value={otrasDeducciones.educacion} onChange={(v) => setOtrasDeducciones((p) => ({ ...p, educacion: v }))} />
                      <CampoMonto label="Deuda" value={otrasDeducciones.deuda} onChange={(v) => setOtrasDeducciones((p) => ({ ...p, deuda: v }))} />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-neutralCustom-100">
                    <p className="text-sm font-semibold text-neutralCustom-800">Total Deducciones: {formatCOP(deduccionesTotal)}</p>
                  </div>
                </div>

                <div className="bg-neutralCustom-50 border border-neutralCustom-100 rounded-brand-lg p-6 space-y-4">
                  <div>
                    <label htmlFor="notas" className="block text-sm font-medium text-neutralCustom-600 mb-1">
                      Notas
                    </label>
                    <textarea id="notas" value={notas} onChange={(e) => setNotas(e.target.value)} className="field w-full" rows={2} />
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-neutralCustom-200">
                    <p className="text-base font-bold text-neutralCustom-800">Neto a Pagar</p>
                    <p className="text-xl font-bold text-brand-600">{formatCOP(comprobanteTotal)}</p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pb-8">
                  <Button onClick={() => navigate("/payroll")} variant="ghost">
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSaving || !puedeGuardar} variant="primary" loading={isSaving}>
                    Guardar Borrador
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

const HORAS_EXTRA_LABEL = {
  1: "Hora Extra Diurna",
  2: "Hora Extra Nocturna",
  3: "Hora Recargo Nocturno",
  4: "Hora Extra Diurna Dom./Fest.",
  5: "Hora Recargo Diurno Dom./Fest.",
  6: "Hora Extra Nocturna Dom./Fest.",
  7: "Hora Recargo Nocturno Dom./Fest.",
};

function SeccionToggle({ titulo, activo, onToggle, children }) {
  return (
    <div className="border-t border-neutralCustom-100 pt-4">
      <label className="flex items-center gap-2 text-sm font-medium text-neutralCustom-700 mb-2">
        <input type="checkbox" checked={activo} onChange={(e) => onToggle(e.target.checked)} className="h-4 w-4 rounded border-neutralCustom-300" />
        {titulo}
      </label>
      {activo && <div className="pl-6">{children}</div>}
    </div>
  );
}

function CampoMonto({ label, value, onChange, required }) {
  return (
    <div>
      <label className="block text-xs font-medium text-neutralCustom-500 mb-1">
        {label} {required && <span className="text-fiscal-danger">*</span>}
      </label>
      <input type="number" min="0" value={value} onChange={(e) => onChange(e.target.value)} className="field w-full" placeholder="0" />
    </div>
  );
}

function CampoNumero({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-neutralCustom-500 mb-1">{label}</label>
      <input type="number" min="0" value={value} onChange={(e) => onChange(e.target.value)} className="field w-full" />
    </div>
  );
}

function CampoFecha({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-neutralCustom-500 mb-1">{label}</label>
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className="field w-full" />
    </div>
  );
}

function FilaHoraExtra({ codigo, etiqueta, valor, onChange }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_160px] gap-3 items-end">
      <p className="text-sm text-neutralCustom-600">{etiqueta}</p>
      <CampoNumero label="Cantidad" value={valor.cantidad} onChange={(v) => onChange({ ...valor, cantidad: v })} />
      <CampoMonto label="Pago" value={valor.pago} onChange={(v) => onChange({ ...valor, pago: v })} />
    </div>
  );
}
