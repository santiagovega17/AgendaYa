"use client";

import { createContext, useContext } from "react";
import { es } from "date-fns/locale";
import { format } from "date-fns";
import { Ban } from "lucide-react";
import type { DayButton } from "react-day-picker";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { cn } from "@/lib/utils/cn";
import { toFechaStr } from "@/lib/format";

type DayData = { bookingCounts: Map<string, number>; blocked: Set<string> };

const DayDataContext = createContext<DayData>({ bookingCounts: new Map(), blocked: new Set() });

function IndicatorDayButton(rest: React.ComponentProps<typeof DayButton>) {
  const { bookingCounts, blocked } = useContext(DayDataContext);
  const fecha = toFechaStr(rest.day.date);
  const count = bookingCounts.get(fecha) ?? 0;
  const isBlocked = blocked.has(fecha);
  return (
    <CalendarDayButton {...rest} className={cn("gap-0.5", isBlocked && "text-danger-soft-foreground")}>
      <span className={cn("text-sm !opacity-100", isBlocked && "line-through")}>{rest.day.date.getDate()}</span>
      {isBlocked ? (
        <Ban className="size-3" aria-hidden="true" />
      ) : count > 0 ? (
        <span className="min-w-4 rounded-full bg-success-soft px-1 text-[0.65rem] font-semibold tabular-nums leading-4 text-success-soft-foreground !opacity-100 group-data-[selected=true]/day:bg-primary-foreground/20 group-data-[selected=true]/day:text-primary-foreground">
          {count}
        </span>
      ) : (
        <span className="h-4" aria-hidden="true" />
      )}
    </CalendarDayButton>
  );
}

type Common = DayData & {
  month: Date;
  onMonthChange: (d: Date) => void;
  disabled?: (d: Date) => boolean;
  className?: string;
};

type Props =
  | (Common & { mode: "single"; selected?: Date; onSelect: (d: Date | undefined) => void })
  | (Common & { mode: "multiple"; selected: Date[]; onSelect: (d: Date[] | undefined) => void });

export function AdminMonthCalendar(props: Props) {
  const { month, onMonthChange, bookingCounts, blocked, disabled, className } = props;

  const shared = {
    month,
    onMonthChange,
    disabled,
    showOutsideDays: false,
    modifiers: { bloqueado: (d: Date) => blocked.has(toFechaStr(d)) },
    modifiersClassNames: { bloqueado: "[&>button]:bg-danger-soft" },
    labels: {
      labelDayButton: (date: Date) => {
        const fecha = toFechaStr(date);
        const count = bookingCounts.get(fecha) ?? 0;
        const extra = blocked.has(fecha)
          ? ", bloqueado"
          : count > 0
            ? `, ${count} ${count === 1 ? "reserva" : "reservas"}`
            : "";
        return `${format(date, "EEEE d 'de' MMMM", { locale: es })}${extra}`;
      },
    },
    components: { DayButton: IndicatorDayButton },
    className: cn(
      "w-full bg-transparent p-0 [--cell-size:min(--spacing(11),calc((100vw_-_6rem)/7))] sm:[--cell-size:--spacing(12)]",
      className,
    ),
    classNames: { root: "mx-auto w-full max-w-md" },
  };

  return (
    <DayDataContext.Provider value={{ bookingCounts, blocked }}>
      {props.mode === "single" ? (
        <Calendar {...shared} mode="single" selected={props.selected} onSelect={props.onSelect} />
      ) : (
        <Calendar {...shared} mode="multiple" selected={props.selected} onSelect={props.onSelect} />
      )}
    </DayDataContext.Provider>
  );
}

export function CalendarLegend({ showSelection }: { showSelection?: boolean }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
      <li className="flex items-center gap-1.5">
        <span className="min-w-4 rounded-full bg-success-soft px-1 text-center text-[0.65rem] font-semibold leading-4 text-success-soft-foreground">
          2
        </span>
        Reservas activas
      </li>
      <li className="flex items-center gap-1.5">
        <Ban className="size-3.5 text-danger-soft-foreground" aria-hidden="true" />
        Bloqueado
      </li>
      {showSelection && (
        <li className="flex items-center gap-1.5">
          <span className="size-3.5 rounded bg-primary" aria-hidden="true" />
          Seleccionado
        </li>
      )}
    </ul>
  );
}
