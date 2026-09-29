import { formatoPesos } from "../format";

export default function ResultadoResumen({ resultado }) {
  return (
    <div className="bg-brand-50 border border-brand-100 rounded-brand-lg p-6 flex flex-col justify-center gap-2">
      <span className="self-start rounded-full bg-white border border-brand-100 px-3 py-1 text-xs font-medium text-brand-700">
        {resultado.tramo}
      </span>
      <p className="text-4xl font-semibold text-neutralCustom-800 tabular-nums" aria-live="polite">
        {formatoPesos(resultado.precio)}
      </p>
      <p className="text-sm text-neutralCustom-600">
        {formatoPesos(resultado.precioPorDocumento)} por documento · neto para ti{" "}
        <strong className="font-semibold text-neutralCustom-800">{formatoPesos(resultado.neto)}</strong> (
        {resultado.margenNetoPct.toFixed(0)} %)
      </p>
    </div>
  );
}
