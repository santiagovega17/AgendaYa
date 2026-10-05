"use client";

import { CalendarX2, ChevronLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { EmptyState } from "@/components/common/EmptyState";
import { cn } from "@/lib/utils/cn";
import { formatFechaLarga, parseFecha, toFechaStr } from "@/lib/format";
import type { EventType, Slot } from "@/lib/types";

function SlotGroup({
  title,
  slots,
  pendingSlotId,
  onPick,
}: {
  title: string;
  slots: Slot[];
  pendingSlotId: string | null;
  onPick: (slot: Slot) => void;
}) {
  if (slots.length === 0) return null;
  return (
    <div>
      <h4 className="mb-2 text-sm font-medium text-muted-foreground">{title}</h4>
      <div className="grid grid-cols-3 gap-2">
        {slots.map((slot) => {
          const selected = slot.id === pendingSlotId;
          const motivo = slot.vencido ? "ya pasó" : "no disponible";
          return (
            <button
              key={slot.id}
              type="button"
              disabled={!slot.disponible}
              aria-pressed={selected}
              aria-label={slot.disponible ? `${slot.horaInicio}` : `${slot.horaInicio}, ${motivo}`}
              onClick={() => onPick(slot)}
              className={cn(
                "flex h-12 items-center justify-center rounded-lg border text-base font-medium tabular-nums transition-colors duration-150",
                slot.disponible && !selected && "bg-card hover:border-primary hover:bg-accent",
                selected && "border-primary bg-primary text-primary-foreground",
                !slot.disponible && "cursor-not-allowed border-dashed bg-muted text-muted-foreground line-through"
              )}
            >
              {slot.horaInicio}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DateTimeStep({
  event,
  month,
  onMonthChange,
  availableDates,
  selectedDate,
  onSelectDate,
  slots,
  pendingSlotId,
  onPickSlot,
  onBack,
}: {
  event: EventType;
  month: Date;
  onMonthChange: (d: Date) => void;
  availableDates: string[];
  selectedDate: string;
  onSelectDate: (fecha: string) => void;
  slots: Slot[];
  pendingSlotId: string | null;
  onPickSlot: (slot: Slot) => void;
  onBack: () => void;
}) {
  const available = new Set(availableDates);
  const manana = slots.filter((s) => s.horaInicio < "12:00");
  const tarde = slots.filter((s) => s.horaInicio >= "12:00");
  const hayDisponibles = slots.some((s) => s.disponible);

  return (
    <section aria-labelledby="paso-fecha" className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Volver a elegir el tipo de turno">
          <ChevronLeft className="size-5" aria-hidden="true" />
        </Button>
        <div className="min-w-0">
          <h2 id="paso-fecha" className="text-lg font-semibold">
            Elegí día y horario
          </h2>
          <p className="truncate text-sm text-muted-foreground">
            {event.nombre} · {event.duracionMin} min
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-2 shadow-soft">
        <Calendar
          mode="single"
          month={month}
          onMonthChange={onMonthChange}
          selected={selectedDate ? parseFecha(selectedDate) : undefined}
          onSelect={(d) => d && onSelectDate(toFechaStr(d))}
          disabled={(d) => !available.has(toFechaStr(d))}
          modifiers={{ disponible: (d) => available.has(toFechaStr(d)) }}
          modifiersClassNames={{
            disponible:
              "[&>button]:font-semibold [&>button]:text-foreground [&>button]:after:absolute [&>button]:after:bottom-1 [&>button]:after:size-1 [&>button]:after:rounded-full [&>button]:after:bg-success [&>button[data-selected-single=true]]:after:bg-primary-foreground",
          }}
          showOutsideDays={false}
          className="w-full bg-transparent p-1 [--cell-size:--spacing(9)] min-[360px]:[--cell-size:--spacing(10)] sm:[--cell-size:--spacing(11)]"
          classNames={{ root: "w-full" }}
        />
        <p className="flex items-center gap-2 px-2 pb-1 text-sm text-muted-foreground">
          <span className="size-2 rounded-full bg-success" aria-hidden="true" />
          Días con horarios disponibles
        </p>
      </div>

      {selectedDate && (
        <div className="space-y-4" aria-live="polite">
          <h3 className="flex items-center gap-2 font-semibold">
            <Clock className="size-4 text-muted-foreground" aria-hidden="true" />
            {formatFechaLarga(selectedDate)}
          </h3>
          {hayDisponibles ? (
            <>
              <SlotGroup title="Mañana" slots={manana} pendingSlotId={pendingSlotId} onPick={onPickSlot} />
              <SlotGroup title="Tarde" slots={tarde} pendingSlotId={pendingSlotId} onPick={onPickSlot} />
            </>
          ) : (
            <EmptyState
              icon={CalendarX2}
              title="No quedan horarios este día"
              description="Probá con otro día marcado en el calendario."
            />
          )}
        </div>
      )}
    </section>
  );
}
