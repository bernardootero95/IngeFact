// Texto ambar-700 sobre fondo claro: fiscal.warning es solo para fondos (ver tailwind.preset.js).
const ESTILOS = {
  vigente: { clase: "bg-brand-50 text-brand-700", label: "Vigente" },
  por_vencer: { clase: "bg-amber-50 text-amber-700", label: "Por vencer" },
  vencido: { clase: "bg-fiscal-danger/10 text-fiscal-danger", label: "Vencido" },
  agotado: { clase: "bg-fiscal-danger/10 text-fiscal-danger", label: "Cupo agotado" },
  sin_plan: { clase: "bg-neutralCustom-100 text-neutralCustom-600", label: "Sin plan" },
};

export default function PlanBadge({ estado }) {
  const { clase, label } = ESTILOS[estado] || ESTILOS.sin_plan;
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${clase}`}>
      {label}
    </span>
  );
}
