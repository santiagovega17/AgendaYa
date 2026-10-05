"use client";

import { useState } from "react";
import {
  CalendarClock,
  CalendarDays,
  Check,
  CircleCheckBig,
  Clock,
  Hash,
  Mail,
  MessageSquareText,
  Phone,
  Tag,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/common/StatusBadge";
import { RescheduleDialog } from "@/components/admin/RescheduleDialog";
import { formatFechaLarga, formatHace, MODALIDAD_LABEL, toFechaStr } from "@/lib/format";
import type { Booking } from "@/lib/types";
import { useAgendaStore } from "@/store/useAgendaStore";

export function useBookingActions() {
  const approveBooking = useAgendaStore((s) => s.approveBooking);
  const completeBooking = useAgendaStore((s) => s.completeBooking);
  const cancelBooking = useAgendaStore((s) => s.cancelBooking);

  const approve = async (id: string) => {
    const r = await approveBooking(id);
    if (r.ok) toast.success("Reserva aprobada", { description: "Le avisamos al invitado." });
    else toast.error(r.error);
    return r.ok;
  };
  const complete = async (id: string) => {
    const r = await completeBooking(id);
    if (r.ok) toast.success("Reserva marcada como completada");
    else toast.error(r.error);
    return r.ok;
  };
  const cancel = async (id: string) => {
    const r = await cancelBooking(id);
    if (r.ok) toast.info("Reserva cancelada", { description: "Le avisamos al invitado." });
    else toast.error(r.error);
    return r.ok;
  };
  return { approve, complete, cancel };
}

function Row({ icon: Icon, label, children }: { icon: typeof Mail; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <dt className="text-sm text-muted-foreground">{label}</dt>
        <dd className="break-words">{children}</dd>
      </div>
    </div>
  );
}

export function BookingDetailSheet({
  bookingId,
  onOpenChange,
}: {
  bookingId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const booking = useAgendaStore((s) => s.bookings.find((b) => b.id === bookingId) ?? null);
  const event = useAgendaStore((s) => s.eventTypes.find((e) => e.id === booking?.eventTypeId));
  const { approve, complete, cancel } = useBookingActions();
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [rescheduling, setRescheduling] = useState<Booking | null>(null);

  const run = async (fn: () => Promise<boolean>) => {
    setBusy(true);
    await fn();
    setBusy(false);
  };

  const activa = booking?.estado === "pendiente" || booking?.estado === "confirmada";
  const yaOcurrio = booking ? booking.fecha <= toFechaStr(new Date()) : false;

  return (
    <>
      <Sheet open={!!bookingId} onOpenChange={onOpenChange}>
        <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
          {booking && (
            <>
              <SheetHeader className="border-b">
                <div className="flex items-center gap-2">
                  <StatusBadge status={booking.estado} />
                  <span className="text-sm text-muted-foreground">Creada {formatHace(booking.createdAt)}</span>
                </div>
                <SheetTitle className="text-xl">
                  {booking.invitado.nombre} {booking.invitado.apellido}
                </SheetTitle>
                <SheetDescription>{event?.nombre ?? "Evento eliminado"}</SheetDescription>
              </SheetHeader>

              <div className="flex-1 space-y-6 overflow-y-auto p-4">
                <dl className="space-y-4">
                  <Row icon={CalendarDays} label="Fecha">
                    {formatFechaLarga(booking.fecha)}
                  </Row>
                  <Row icon={Clock} label="Horario">
                    <span className="tabular-nums">
                      {booking.horaInicio} a {booking.horaFin}
                    </span>
                  </Row>
                  {event && (
                    <Row icon={Tag} label="Modalidad">
                      {MODALIDAD_LABEL[event.modalidad]} · {event.duracionMin} min
                    </Row>
                  )}
                  <Row icon={Hash} label="Número de reserva">
                    <span className="font-mono">{booking.numeroReserva}</span>
                  </Row>
                </dl>

                <Separator />

                <dl className="space-y-4">
                  <Row icon={Mail} label="Email">
                    <a href={`mailto:${booking.invitado.email}`} className="text-primary underline-offset-4 hover:underline">
                      {booking.invitado.email}
                    </a>
                  </Row>
                  {booking.invitado.telefono && (
                    <Row icon={Phone} label="Teléfono">
                      <a
                        href={`tel:${booking.invitado.telefono.replace(/[^\d+]/g, "")}`}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {booking.invitado.telefono}
                      </a>
                    </Row>
                  )}
                  <Row icon={MessageSquareText} label="Nota del invitado">
                    {booking.invitado.nota ? (
                      <span className="whitespace-pre-line">{booking.invitado.nota}</span>
                    ) : (
                      <span className="text-muted-foreground">Sin nota</span>
                    )}
                  </Row>
                </dl>
              </div>

              {activa && (
                <SheetFooter className="border-t sm:flex-row sm:flex-wrap">
                  {booking.estado === "pendiente" && (
                    <Button className="sm:flex-1" disabled={busy} onClick={() => run(() => approve(booking.id))}>
                      <Check aria-hidden="true" />
                      Aprobar
                    </Button>
                  )}
                  {booking.estado === "confirmada" && yaOcurrio && (
                    <Button className="sm:flex-1" disabled={busy} onClick={() => run(() => complete(booking.id))}>
                      <CircleCheckBig aria-hidden="true" />
                      Marcar completada
                    </Button>
                  )}
                  <Button variant="outline" className="sm:flex-1" disabled={busy} onClick={() => setRescheduling(booking)}>
                    <CalendarClock aria-hidden="true" />
                    Reagendar
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-destructive hover:bg-danger-soft hover:text-destructive sm:flex-1"
                    disabled={busy}
                    onClick={() => setConfirmCancel(true)}
                  >
                    <X aria-hidden="true" />
                    Cancelar reserva
                  </Button>
                </SheetFooter>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar esta reserva?</AlertDialogTitle>
            <AlertDialogDescription>
              Se libera el horario y le enviamos un aviso de cancelación a {booking?.invitado.nombre}. Esta acción no se
              puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => booking && run(() => cancel(booking.id))}
            >
              Cancelar reserva
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RescheduleDialog booking={rescheduling} onOpenChange={(o) => !o && setRescheduling(null)} />
    </>
  );
}
