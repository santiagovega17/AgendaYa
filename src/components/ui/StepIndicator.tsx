import { cn } from "@/lib/utils/cn";

const steps = ["Evento", "Fecha", "Datos", "Listo"];

export function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      {steps.map((step, i) => (
        <div key={step} className="flex flex-1 flex-col items-center gap-1">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors",
              i < current
                ? "bg-indigo-500 text-white"
                : i === current
                  ? "bg-indigo-500/30 text-indigo-200 ring-2 ring-indigo-400"
                  : "bg-white/10 text-white/40"
            )}
          >
            {i + 1}
          </div>
          <span
            className={cn(
              "text-xs",
              i <= current ? "text-white/80" : "text-white/40"
            )}
          >
            {step}
          </span>
        </div>
      ))}
    </div>
  );
}
