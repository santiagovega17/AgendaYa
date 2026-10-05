"use client";

import { addDays, addWeeks, format, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { Ban, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { toFechaStr } from "@/lib/format";
import type { Booking, EventType } from "@/lib/types";

const ESTADO_STYLE: Record<Booking["estado"], string> = {
  pendiente: "border-l-warning bg-warning-soft text-warning-soft-foreground",
  confirmada: "border-l-success bg-success-soft text-success-soft-foreground",
  completada: "border-l-primary bg-info-soft text-info-soft-foreground",
  cancelada: "border-l-muted-foreground bg-muted text-muted-foreground line-through",
};

export function WeekView({
  weekStart,
  onWeekChange,
  bookings,
  eventTypes,
  blocked,
  onOpen,
  onPickDay,
}: {
  weekStart: Date;
  onWeekChange: (d: Date) => void;
  bookings: Booking[];
  eventTypes: EventType[];
  blocked: Set<string>;
  onOpen: (id: string) => void;
  onPickDay: (fecha: string) => void;
}) {
  const today = toFechaStr(new Date());
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const end = days[6];
  const rango =
    weekStart.getMonth() === end.getMonth()
      ? `${format(weekStart, "d")} al ${format(end, "d 'de' MMMM", { locale: es })}`
      : `${format(weekStart, "d MMM", { locale: es })} al ${format(end, "d MMM", { locale: es })}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => onWeekChange(addWeeks(weekStart, -1))} aria-label="Semana anterior">
          <ChevronLeft aria-hidden="true" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => onWeekChange(addWeeks(weekStart, 1))} aria-label="Semana siguiente">
          <ChevronRight aria-hidden="true" />
        </Button>
        <Button variant="ghost" onClick={() => onWeekChange(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
          Hoy
        </Button>
        <h3 className="ml-1 font-semibold" aria-live="polite">
          {rango}
        </h3>
      </div>

      <div className="grid gap-3 lg:grid-cols-7">
        {days.map((d) => {
          const fecha = toFechaStr(d);
          const items = bookings
            .filter((b) => b.fecha === fecha)
            .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
          const isToday = fecha === today;
          const isBlocked = blocked.has(fecha);
          return (
            <section
              key={fecha}
              aria-label={format(d, "EEEE d 'de' MMMM", { locale: es })}
              className={cn(
                "flex min-h-24 flex-col rounded-lg border bg-card lg:min-h-64",
                isToday && "border-primary ring-1 ring-primary"
              )}
            >
              <button
                type="button"
                onClick={() => onPickDay(fecha)}
                className="flex items-center justify-between gap-2 border-b px-3 py-2 text-left hover:bg-accent lg:flex-col lg:items-start lg:gap-0"
                aria-label={`Ver lista de ${format(d, "EEEE d", { locale: es })}`}
              >
                <span className="text-sm capitalize text-muted-foreground">{format(d, "EEE", { locale: es })}</span>
                <span className={cn("text-lg font-semibold tabular-nums", isToday && "text-primary")}>{format(d, "d")}</span>
              </button>
              <div className="flex-1 space-y-1.5 p-2">
                {isBlocked && (
                  <p className="flex items-center gap-1.5 rounded-md bg-danger-soft px-2 py-1 text-sm text-danger-soft-foreground">
                    <Ban className="size-3.5" aria-hidden="true" />
                    Bloqueado
                  </p>
                )}
                {items.length === 0 && !isBlocked && <p className="px-1 text-sm text-muted-foreground">Sin turnos</p>}
                {items.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => onOpen(b.id)}
                    className={cn(
                      "block w-full rounded-md border-l-4 px-2 py-1.5 text-left text-sm transition-opacity hover:opacity-80",
                      ESTADO_STYLE[b.estado]
                    )}
                  >
                    <span className="block font-semibold tabular-nums">{b.horaInicio}</span>
                    <span className="block truncate">
                      {b.invitado.nombre} {b.invitado.apellido}
                    </span>
                    <span className="sr-only">
                      , {eventTypes.find((e) => e.id === b.eventTypeId)?.nombre}, {b.estado}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
