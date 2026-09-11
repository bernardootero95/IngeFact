import type { FaqEntry } from "@/data/faq";

export function FaqList({ items }: { items: FaqEntry[] }) {
  return (
    <div className="mx-auto max-w-[760px]">
      {items.map((item, index) => (
        <div
          key={item.question}
          className={`py-5 ${index !== items.length - 1 ? "border-b border-neutralCustom-100" : ""}`}
        >
          <h3 className="mb-2 text-[15px] font-bold text-neutralCustom-800">{item.question}</h3>
          <p className="text-sm leading-relaxed text-neutralCustom-500">{item.answer}</p>
        </div>
      ))}
    </div>
  );
}
