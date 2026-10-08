"use client";

import { useMemo, useState } from "react";
import { CalendarX2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/common/EmptyState";
import { generateSlots, getAvailableDates, markOverlappingSlots } from "@/lib/availability/generateSlots";
import { formatFechaLarga, parseFecha, toFechaStr } from "@/lib/format";
import { cn } from "@/lib/utils/cn";
import type { Booking, BusyRange, Slot } from "@/lib/types";
import { useAgendaStore } from "@/store/useAgendaStore";

function RescheduleForm({ booking, onDone }: { booking: Booking; onDone: () => void }) {
  const eventTypes = useAgendaStore((s) => s.eventTypes);
  const weeklySchedules = useAgendaStore((s) => s.weeklySchedules);
  const blockedDates = useAgendaStore((s) => s.blockedDates);
  const settings = useAgendaStore((s) => s.settings);
  const bookings = useAgendaStore((s) => s.bookings);
  const rescheduleBooking = useAgendaStore((s) => s.rescheduleBooking);

  const [month, setMonth] = useState(() => parseFecha(booking.fecha));
  const [fecha, setFecha] = useState("");
  const [slot, setSlot] = useState<Slot | null>(null);
  const [saving, setSaving] = useState(false);

  const event = eventTypes.find((e) => e.id === booking.eventTypeId);
  const others = useMemo(
    () => bookings.filter((b) => b.id !== booking.id && (b.estado === "pendiente" || b.estado === "confirmada")),
    [bookings, booking.id],
  );
  const busy: BusyRange[] = useMemo(
    () => others.map((b) => ({ fecha: b.fecha, horaInicio: b.horaInicio, horaFin: b.horaFin, propio: false })),
    [others],
  );

  const available = useMemo(() => {
    if (!event) return new Set<string>();
    return new Set(
      getAvailableDates({
        year: month.getFullYear(),
        month: month.getMonth(),
        eventType: event,
        weeklySchedules,
        blockedDates,
        bookings: others,
        settings,
        locks: [],
      }),
    );
  }, [event, month, weeklySchedules, blockedDates, others, settings]);

  const slots = useMemo(() => {
    if (!event || !fecha) return [];
    return markOverlappingSlots(
      generateSlots({ fecha, eventType: event, weeklySchedules, blockedDates, bookings: others, settings, locks: [] }),
      busy,
    ).filter((s) => s.disponible);
  }, [event, fecha, weeklySchedules, blockedDates, others, settings, busy]);

  const submit = async () => {
    if (!slot) return;
    setSaving(true);
    const result = await rescheduleBooking(booking.id, slot.fecha, slot.horaInicio, slot.horaFin);
    setSaving(false);
    if (result.ok) {
      toast.success("Reserva reagendada", { description: "Le avisamos al invitado del cambio." });
      onDone();
    } else toast.error(result.error);
  };

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
        <Calendar
          mode="single"
          month={month}
          onMonthChange={setMonth}
          selected={fecha ? parseFecha(fecha) : undefined}
          onSelect={(d) => {
            setFecha(d ? toFechaStr(d) : "");
            setSlot(null);
          }}
          disabled={(d) => !available.has(toFechaStr(d))}
          showOutsideDays={false}
          className="mx-auto rounded-lg border p-2 [--cell-size:min(--spacing(9),calc((100vw_-_7rem)/7))]"
        />
        <div className="min-w-0">
          {!fecha ? (
            <p className="text-sm text-muted-foreground">Elegí un día habilitado para ver los horarios libres.</p>
          ) : slots.length === 0 ? (
            <EmptyState
              icon={CalendarX2}
              title="Sin horarios libres"
              description="Probá con otro día."
              className="py-6"
            />
          ) : (
            <>
              <p className="mb-2 text-sm font-medium">{formatFechaLarga(fecha)}</p>
              <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto pr-1">
                {slots.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={slot?.id === s.id}
                    onClick={() => setSlot(s)}
                    className={cn(
                      "h-11 rounded-lg border text-sm font-medium tabular-nums transition-colors",
                      slot?.id === s.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-card hover:border-primary hover:bg-accent",
                    )}
                  >
                    {s.horaInicio}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button onClick={submit} disabled={!slot || saving}>
          {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
          {slot ? `Mover al ${formatFechaLarga(slot.fecha).toLowerCase()} ${slot.horaInicio}` : "Elegí un horario"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function RescheduleDialog({
  booking,
  onOpenChange,
}: {
  booking: Booking | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={!!booking} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Reagendar reserva</DialogTitle>
          <DialogDescription>
            {booking &&
              `${booking.invitado.nombre} ${booking.invitado.apellido} · actualmente ${formatFechaLarga(booking.fecha).toLowerCase()} a las ${booking.horaInicio}`}
          </DialogDescription>
        </DialogHeader>
        {booking && <RescheduleForm key={booking.id} booking={booking} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
