const formatoCop = (valor) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(valor);

const formatoNumero = (valor) => new Intl.NumberFormat("es-CO").format(valor);

const formatoFecha = (iso) =>
  new Date(iso).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Bogota",
  });

function Tarjeta({ titulo, valor, detalle, colorValor = "text-neutralCustom-800" }) {
  return (
    <div className="bg-white p-6 border border-neutralCustom-100 rounded-brand-lg shadow-sm">
      <p className="text-sm font-medium text-neutralCustom-500">{titulo}</p>
      <p className={`text-2xl font-bold mt-2 ${colorValor}`}>{valor}</p>
      {detalle && <p className="text-xs text-neutralCustom-500 mt-1">{detalle}</p>}
    </div>
  );
}

function FilaDesglose({ etiqueta, valor, negativo = false, fuerte = false }) {
  return (
    <div
      className={`flex items-center justify-between py-2 ${
        fuerte ? "border-t border-neutralCustom-100 mt-1 pt-3" : ""
      }`}
    >
      <span className={`text-sm ${fuerte ? "font-semibold text-neutralCustom-800" : "text-neutralCustom-600"}`}>
        {etiqueta}
      </span>
      <span className={`text-sm ${fuerte ? "font-bold" : "font-medium"} text-neutralCustom-800`}>
        {negativo ? "− " : ""}
        {formatoCop(valor)}
      </span>
    </div>
  );
}

export default function FinanzasMes({ finanzas }) {
  const { ventas } = finanzas;
  const enGanancia = finanzas.ganancia >= 0;

  return (
    <section className="space-y-6" aria-label="Finanzas del mes">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Tarjeta
          titulo="Costo de Alegra (mes)"
          valor={formatoCop(finanzas.costo_alegra)}
          detalle={`${formatoNumero(finanzas.documentos_emitidos)} documentos emitidos este mes`}
        />
        <Tarjeta
          titulo="Máximo de documentos del mes"
          valor={formatoNumero(finanzas.documentos_maximos_mes)}
          detalle={`${formatoNumero(finanzas.documentos_disponibles_inicio_mes)} disponibles al 1ro + ${formatoNumero(
            finanzas.documentos_vendidos_mes,
          )} vendidos`}
        />
        <Tarjeta
          titulo={enGanancia ? "Ganancia del mes" : "Pérdida del mes"}
          valor={formatoCop(Math.abs(finanzas.ganancia))}
          colorValor={enGanancia ? "text-green-700" : "text-fiscal-danger"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6">
          <h3 className="text-base font-medium text-neutralCustom-800">Paquetes vendidos este mes</h3>
          <p className="text-xs text-neutralCustom-500 mt-0.5 mb-4">
            {ventas.length} {ventas.length === 1 ? "venta" : "ventas"} en {finanzas.mes}.
          </p>
          {ventas.length === 0 ? (
            <p className="text-sm text-neutralCustom-500">Aún no hay paquetes vendidos este mes.</p>
          ) : (
            <ul className="max-h-60 overflow-y-auto divide-y divide-neutralCustom-100 pr-1" tabIndex={0}>
              {ventas.map((venta) => (
                <li key={venta.id} className="py-3 flex items-center justify-between gap-3 first:pt-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutralCustom-800 truncate">{venta.razon_social}</p>
                    <p className="text-xs text-neutralCustom-500 mt-0.5">
                      {formatoNumero(venta.max_documentos)} documentos · {formatoFecha(venta.fecha_compra)}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-neutralCustom-800 shrink-0">
                    {formatoCop(venta.precio)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm p-6">
          <h3 className="text-base font-medium text-neutralCustom-800">Ganancia o pérdida del mes</h3>
          <p className="text-xs text-neutralCustom-500 mt-0.5 mb-3">
            Servidor: US$ {finanzas.costo_servidor_usd} a TRM {formatoNumero(finanzas.trm_usd_cop)}.
          </p>
          <FilaDesglose etiqueta="Paquetes vendidos" valor={finanzas.ingresos_paquetes} />
          <FilaDesglose etiqueta="Costo de Alegra" valor={finanzas.costo_alegra} negativo />
          <FilaDesglose etiqueta="Costo del servidor" valor={finanzas.costo_servidor_cop} negativo />
          <FilaDesglose
            etiqueta={`Comisión (${finanzas.comision_pct}% de paquetes)`}
            valor={finanzas.comision}
            negativo
          />
          <FilaDesglose etiqueta={enGanancia ? "Ganancia" : "Pérdida"} valor={Math.abs(finanzas.ganancia)} fuerte />
        </div>
      </div>
    </section>
  );
}
