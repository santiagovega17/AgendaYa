"use client";

import { CalendarPlus, CheckCircle2, Hourglass, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { formatFechaLarga } from "@/lib/format";
import { downloadIcs } from "@/lib/ics";
import type { ConfirmedBooking } from "@/lib/booking/api";
import type { AdminProfile, EventType } from "@/lib/types";

export function ConfirmationStep({
  booking,
  event,
  profile,
  guestName,
  onRestart,
}: {
  booking: ConfirmedBooking;
  event: EventType | null;
  profile: AdminProfile;
  guestName: string;
  onRestart: () => void;
}) {
  const pending = booking.estado === "pendiente";
  const Icon = pending ? Hourglass : CheckCircle2;

  const rows = [
    { key: "activity", label: "Actividad", value: event?.nombre ?? "—" },
    { key: "date", label: "Fecha", value: formatFechaLarga(booking.fecha) },
    { key: "time", label: "Horario", value: `${booking.horaInicio} a ${booking.horaFin} h` },
    { key: "admin", label: "Con", value: profile.nombre },
    { key: "guest-name", label: "A nombre de", value: guestName },
  ];

  return (
    <section aria-labelledby="paso-listo" className="space-y-6" data-cy="booking-success" data-estado={booking.estado}>
      <div className="flex flex-col items-center text-center" role="status">
        <div
          className={cn(
            "flex size-16 items-center justify-center rounded-full",
            pending ? "bg-warning-soft text-warning-soft-foreground" : "bg-success-soft text-success-soft-foreground",
          )}
        >
          <Icon className="size-8" aria-hidden="true" />
        </div>
        <h2 id="paso-listo" className="mt-4 text-2xl font-semibold tracking-tight" data-cy="booking-success-title">
          {pending ? "¡Solicitud enviada!" : "¡Reserva confirmada!"}
        </h2>
        <p className="mt-1 max-w-xs text-muted-foreground">
          {pending
            ? `${profile.nombre} tiene que aprobar tu turno. Te avisaremos cuando lo haga.`
            : "Tu turno quedó agendado. Guardá el número de reserva para cualquier consulta."}
        </p>
      </div>

      <div className="rounded-xl border bg-card shadow-soft">
        <div className="border-b px-4 py-3 text-center">
          <p className="text-sm text-muted-foreground">Número de reserva</p>
          <p className="font-mono text-2xl font-semibold tracking-wider" data-cy="booking-number">
            {booking.numeroReserva}
          </p>
        </div>
        <dl className="divide-y">
          {rows.map((r) => (
            <div key={r.key} className="flex justify-between gap-4 px-4 py-3">
              <dt className="text-muted-foreground">{r.label}</dt>
              <dd className="text-right font-medium" data-cy={`booking-${r.key}`}>
                {r.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="space-y-2">
        <Button
          size="lg"
          className="w-full"
          data-cy="booking-add-calendar"
          onClick={() =>
            downloadIcs({
              uid: booking.numeroReserva,
              titulo: `${event?.nombre ?? "Turno"} con ${profile.nombre}`,
              descripcion: `Reserva ${booking.numeroReserva}${pending ? " (pendiente de aprobación)" : ""}`,
              fecha: booking.fecha,
              horaInicio: booking.horaInicio,
              horaFin: booking.horaFin,
              timezone: profile.timezone,
            })
          }
        >
          <CalendarPlus className="size-5" aria-hidden="true" />
          Agregar a mi calendario
        </Button>
        <Button size="lg" variant="ghost" className="w-full" onClick={onRestart} data-cy="booking-restart">
          <RotateCcw className="size-5" aria-hidden="true" />
          Hacer otra reserva
        </Button>
      </div>
    </section>
  );
}
