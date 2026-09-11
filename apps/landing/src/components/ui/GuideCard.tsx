import type { Guide } from "@/data/guides";

export function GuideCard({ icon: Icon, title, description }: Guide) {
  return (
    <div className="flex flex-col gap-3 rounded-brand-lg border border-neutralCustom-100 bg-white p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-brand-md bg-brand-50">
        <Icon className="h-5 w-5 text-brand-600" />
      </div>
      <h3 className="text-[15px] font-bold text-neutralCustom-800">{title}</h3>
      <p className="text-[13px] leading-relaxed text-neutralCustom-500">{description}</p>
      <span className="w-fit rounded-full bg-neutralCustom-100 px-2.5 py-1 text-[11px] font-bold text-neutralCustom-500">
        Guía disponible pronto
      </span>
    </div>
  );
}
