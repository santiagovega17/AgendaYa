import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const STEPS = ["Evento", "Fecha", "Datos", "Listo"];

export function StepProgress({ current }: { current: number }) {
  return (
    <nav aria-label="Progreso de la reserva">
      <ol className="grid grid-cols-4 gap-1">
        {STEPS.map((label, i) => {
          const done = i < current || (i === STEPS.length - 1 && current === i);
          const active = i === current;
          return (
            <li
              key={label}
              aria-current={active ? "step" : undefined}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="flex w-full items-center">
                <span
                  className={cn("h-0.5 flex-1 rounded-full", i === 0 ? "invisible" : done || active ? "bg-primary" : "bg-border")}
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors duration-200",
                    done && "bg-primary text-primary-foreground",
                    active && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                    !done && !active && "border-2 border-border bg-card text-muted-foreground"
                  )}
                >
                  {done ? <Check className="size-4" aria-hidden="true" /> : i + 1}
                </span>
                <span
                  className={cn("h-0.5 flex-1 rounded-full", i === STEPS.length - 1 ? "invisible" : done ? "bg-primary" : "bg-border")}
                  aria-hidden="true"
                />
              </div>
              <span className={cn("text-sm", active ? "font-semibold text-foreground" : "text-muted-foreground")}>
                {label}
                {done && <span className="sr-only"> (completado)</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
