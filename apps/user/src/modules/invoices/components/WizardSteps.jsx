const STEPS = [
  { n: 1, label: "Cliente" },
  { n: 2, label: "Líneas" },
  { n: 3, label: "Revisar" },
  { n: 4, label: "Confirmación" },
];

export default function WizardSteps({ current }) {
  return (
    <div className="flex mb-10 px-6">
      {STEPS.map((step) => {
        const done = step.n < current;
        const active = step.n === current;
        return (
          <div key={step.n} className="flex-1 relative flex flex-col items-center">
            {step.n < STEPS.length && (
              <div
                className={`absolute top-5 left-1/2 w-full h-0.5 ${done ? "bg-brand-400" : "bg-neutralCustom-200"}`}
              />
            )}
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm relative z-10 ${
                done
                  ? "bg-brand-400 text-white"
                  : active
                    ? "bg-brand-600 text-white"
                    : "bg-white border-2 border-neutralCustom-200 text-neutralCustom-400"
              }`}
            >
              {step.n}
            </div>
            <span
              className={`text-xs font-medium mt-2 ${active ? "text-neutralCustom-700" : "text-neutralCustom-500"}`}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
