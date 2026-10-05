"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { eachDayOfInterval, endOfMonth, format, startOfMonth } from "date-fns";
import { CalendarSearch, Loader2, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/common/EmptyState";
import { BookingHeader } from "@/components/booking/BookingHeader";
import { StepProgress } from "@/components/booking/StepProgress";
import { EventStep } from "@/components/booking/EventStep";
import { DateTimeStep } from "@/components/booking/DateTimeStep";
import { GuestFormStep, type GuestFormValues } from "@/components/booking/GuestFormStep";
import { ConfirmationStep } from "@/components/booking/ConfirmationStep";
import { StickyActionBar } from "@/components/booking/StickyActionBar";
import { generateSlots, markOverlappingSlots } from "@/lib/availability/generateSlots";
import {
  confirmBooking,
  fetchBusySlots,
  fetchPublicAgenda,
  lockSlot,
  releaseSessionLocks,
  type BusySlots,
  type ConfirmedBooking,
  type PublicAgenda,
} from "@/lib/booking/api";
import { getSessionId, ABANDON_RELEASE_MS } from "@/lib/booking/locks";
import { errorMessage, isSlotUnavailable } from "@/lib/supabase/errors";
import { formatFechaCompacta } from "@/lib/format";
import type { GuestData, Slot } from "@/lib/types";

const REFRESH_MS = 30_000;
const EMPTY_BUSY: BusySlots = { bookings: [], locks: [], ranges: [] };
const EMPTY_GUEST: GuestFormValues = { nombre: "", apellido: "", email: "", telefono: "", nota: "" };
const SLOT_GONE = "Este horario ya no se encuentra disponible. Por favor seleccioná otro turno";

const agendaSignature = (a: PublicAgenda) =>
  JSON.stringify([a.eventTypes, a.weeklySchedules, a.blockedDates, a.settings]);

const todayStr = () => format(new Date(), "yyyy-MM-dd");

type Dialog = { title: string; description: string } | null;

function InfoDialog({ dialog, onClose }: { dialog: Dialog; onClose: () => void }) {
  return (
    <AlertDialog open={!!dialog} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dialog?.title}</AlertDialogTitle>
          <AlertDialogDescription className="text-base">{dialog?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onClose}>Entendido</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando agenda">
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="size-20 rounded-full" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      <Skeleton className="h-12 w-full" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-28 w-full rounded-xl" />
      ))}
    </div>
  );
}

export function BookingFlow({ slug }: { slug: string }) {
  const [loadState, setLoadState] = useState<"loading" | "ready" | "not_found" | "error">("loading");
  const [agenda, setAgenda] = useState<PublicAgenda | null>(null);
  const [busy, setBusy] = useState<BusySlots>(EMPTY_BUSY);
  const [now, setNow] = useState(() => new Date());

  const [step, setStep] = useState(0);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState("");
  const [pendingSlotId, setPendingSlotId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [locking, setLocking] = useState(false);
  const [lockExpiresAt, setLockExpiresAt] = useState<string | null>(null);
  const [guest, setGuest] = useState<GuestFormValues>(EMPTY_GUEST);
  const [confirmedBooking, setConfirmedBooking] = useState<ConfirmedBooking | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);

  const [sessionId] = useState(getSessionId);
  const lastSignature = useRef("");
  const abandonTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const adminId = agenda?.profile.id;
  const selectedEvent = agenda?.eventTypes.find((e) => e.id === selectedEventId) ?? null;
  const currentStep = step === 3 ? 3 : selectedEvent ? step : 0;

  const today = format(now, "yyyy-MM-dd");
  const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
  const busyFrom = monthStart < today ? today : monthStart;
  const busyTo = format(endOfMonth(currentMonth), "yyyy-MM-dd");

  useEffect(() => {
    let cancelled = false;
    fetchPublicAgenda(slug, todayStr())
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setLoadState("not_found");
          return;
        }
        lastSignature.current = agendaSignature(data);
        setAgenda(data);
        setLoadState("ready");
        if (data.eventTypes.length === 0) {
          setDialog({
            title: "Sin eventos disponibles",
            description: `${data.profile.nombre} no tiene eventos, contáctese con él por ${data.profile.email} o el método de su preferencia para avisar.`,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const loadBusy = useCallback(async () => {
    if (!adminId || busyTo < busyFrom) return;
    try {
      setBusy(await fetchBusySlots(adminId, busyFrom, busyTo, sessionId));
    } catch {
      // Se mantiene la última disponibilidad conocida hasta el próximo refresco.
    }
  }, [adminId, busyFrom, busyTo, sessionId]);

  // Se precarga mientras el invitado elige el tipo de evento (AYA-M04-RNF01).
  useEffect(() => {
    if (!adminId || busyTo < busyFrom) return;
    let cancelled = false;
    fetchBusySlots(adminId, busyFrom, busyTo, sessionId)
      .then((data) => {
        if (!cancelled) setBusy(data);
      })
      .catch(() => {
        // Se mantiene la última disponibilidad conocida hasta el próximo refresco.
      });
    return () => {
      cancelled = true;
    };
  }, [adminId, busyFrom, busyTo, sessionId]);

  const refresh = useCallback(async () => {
    setNow(new Date());
    await loadBusy();
    try {
      const fresh = await fetchPublicAgenda(slug, todayStr());
      if (!fresh) return;
      const signature = agendaSignature(fresh);
      if (signature !== lastSignature.current) {
        lastSignature.current = signature;
        setAgenda(fresh);
        setDialog({
          title: "Horarios actualizados",
          description: "El administrador cambió sus horarios. La disponibilidad se actualizó automáticamente.",
        });
      }
    } catch {
      // Se reintenta en el próximo ciclo.
    }
  }, [loadBusy, slug]);

  useEffect(() => {
    if (currentStep !== 1) return;
    const id = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(id);
  }, [currentStep, refresh]);

  useEffect(() => {
    const release = () => releaseSessionLocks(sessionId);
    const handleVisibility = () => {
      if (document.hidden) {
        abandonTimer.current = setTimeout(release, ABANDON_RELEASE_MS);
      } else if (abandonTimer.current) {
        clearTimeout(abandonTimer.current);
      }
    };

    window.addEventListener("pagehide", release);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("pagehide", release);
      document.removeEventListener("visibilitychange", handleVisibility);
      release();
    };
  }, [sessionId]);

  const computeSlots = useCallback(
    (fecha: string): Slot[] => {
      if (!agenda || !selectedEvent) return [];
      const slots = generateSlots({
        fecha,
        eventType: selectedEvent,
        weeklySchedules: agenda.weeklySchedules,
        blockedDates: agenda.blockedDates,
        bookings: busy.bookings,
        settings: agenda.settings,
        locks: busy.locks,
        sessionId,
        now,
      });
      return markOverlappingSlots(slots, busy.ranges);
    },
    [agenda, selectedEvent, busy, now, sessionId]
  );

  const availableDates = useMemo(() => {
    if (!selectedEvent) return [];
    return eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
      .map((d) => format(d, "yyyy-MM-dd"))
      .filter((fecha) =>
        computeSlots(fecha).some((s) => s.disponible || s.lockedBySession === sessionId)
      );
  }, [computeSlots, currentMonth, selectedEvent, sessionId]);

  const slots = useMemo(
    () => (selectedDate ? computeSlots(selectedDate) : []),
    [computeSlots, selectedDate]
  );

  const pendingSlot = slots.find((s) => s.id === pendingSlotId) ?? null;
  // AYA-M04-RF06: el horario elegido dejó de estar disponible durante la navegación.
  const pendingGone = currentStep === 1 && !!pendingSlotId && !pendingSlot?.disponible;

  if (loadState === "loading") return <LoadingSkeleton />;

  if (loadState === "not_found" || loadState === "error" || !agenda) {
    const isError = loadState === "error";
    return (
      <EmptyState
        className="mt-12 bg-card"
        icon={isError ? WifiOff : CalendarSearch}
        title={isError ? "No pudimos cargar la agenda" : "Agenda no encontrada"}
        description={isError ? "Revisá tu conexión e intentá nuevamente." : "El enlace que ingresaste no existe. Pedile al profesional que te lo vuelva a enviar."}
        action={isError ? <Button onClick={() => window.location.reload()}>Reintentar</Button> : undefined}
      />
    );
  }

  const { profile } = agenda;

  const selectEvent = (id: string) => {
    setSelectedEventId(id);
    setStep(1);
    setSelectedDate("");
    setPendingSlotId(null);
    setSelectedSlot(null);
  };

  const selectDate = (fecha: string) => {
    setSelectedDate(fecha);
    setPendingSlotId(null);
  };

  const confirmSelection = async () => {
    if (!pendingSlot?.disponible || !selectedEvent || locking) return;
    setLocking(true);
    const result = await lockSlot({
      eventTypeId: selectedEvent.id,
      fecha: pendingSlot.fecha,
      horaInicio: pendingSlot.horaInicio,
      sessionId,
    });
    setLocking(false);

    if (result.error) {
      if (isSlotUnavailable(result.error)) {
        setPendingSlotId(null);
        setDialog({ title: "Horario no disponible", description: errorMessage(result.error) });
        refresh();
      } else {
        toast.error(errorMessage(result.error));
      }
      return;
    }

    setLockExpiresAt(result.expiresAt);
    setSelectedSlot(pendingSlot);
    setStep(2);
    window.scrollTo({ top: 0 });
  };

  const backToSlots = () => {
    releaseSessionLocks(sessionId);
    setStep(1);
    setSelectedSlot(null);
    setLockExpiresAt(null);
    loadBusy();
  };

  const handleLockExpired = () => {
    backToSlots();
    setPendingSlotId(null);
    setDialog({
      title: "Se terminó el tiempo",
      description: "Pasaron los 15 minutos y liberamos el horario para otras personas. Elegí un turno de nuevo para continuar.",
    });
  };

  const submitGuest = async (data: GuestData) => {
    if (!selectedEvent || !selectedSlot) return;
    setGuest({ ...data, nota: data.nota ?? "" });
    setSubmitting(true);
    const result = await confirmBooking({
      eventTypeId: selectedEvent.id,
      fecha: selectedSlot.fecha,
      horaInicio: selectedSlot.horaInicio,
      sessionId,
      invitado: data,
    });
    setSubmitting(false);

    if (result.error) {
      if (isSlotUnavailable(result.error)) {
        setDialog({ title: "Horario no disponible", description: errorMessage(result.error) });
        setStep(1);
        setSelectedSlot(null);
        setPendingSlotId(null);
        setLockExpiresAt(null);
        refresh();
      } else {
        toast.error(errorMessage(result.error, "Error al procesar la reserva. Por favor, intente nuevamente."));
      }
      return;
    }

    setConfirmedBooking(result.booking);
    setStep(3);
    window.scrollTo({ top: 0 });
  };

  const restart = () => {
    setConfirmedBooking(null);
    setSelectedEventId(null);
    setSelectedDate("");
    setPendingSlotId(null);
    setSelectedSlot(null);
    setLockExpiresAt(null);
    setGuest(EMPTY_GUEST);
    setStep(0);
    loadBusy();
  };

  return (
    <div className="space-y-6">
      <BookingHeader profile={profile} />
      <StepProgress current={currentStep} />

      {currentStep === 0 &&
        (agenda.eventTypes.length > 0 ? (
          <EventStep events={agenda.eventTypes} onSelect={selectEvent} />
        ) : (
          <EmptyState
            icon={CalendarSearch}
            title="Todavía no hay turnos para reservar"
            description={`Escribile a ${profile.nombre} a ${profile.email} para coordinar.`}
          />
        ))}

      {currentStep === 1 && selectedEvent && (
        <>
          <DateTimeStep
            event={selectedEvent}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            availableDates={availableDates}
            selectedDate={selectedDate}
            onSelectDate={selectDate}
            slots={slots}
            pendingSlotId={pendingSlotId}
            onPickSlot={(slot) => setPendingSlotId(slot.id)}
            onBack={() => setStep(0)}
          />
          <StickyActionBar>
            <Button size="lg" className="w-full" disabled={!pendingSlot?.disponible || locking} onClick={confirmSelection}>
              {locking && <Loader2 className="size-5 animate-spin" aria-hidden="true" />}
              {pendingSlot?.disponible
                ? `Confirmar selección · ${formatFechaCompacta(pendingSlot.fecha)} ${pendingSlot.horaInicio}`
                : "Elegí un horario"}
            </Button>
          </StickyActionBar>
        </>
      )}

      {currentStep === 2 && selectedEvent && selectedSlot && lockExpiresAt && (
        <GuestFormStep
          event={selectedEvent}
          slot={selectedSlot}
          expiresAt={lockExpiresAt}
          defaultValues={guest}
          submitting={submitting}
          onExpire={handleLockExpired}
          onChangeSlot={backToSlots}
          onSubmit={submitGuest}
        />
      )}

      {currentStep === 3 && confirmedBooking && (
        <ConfirmationStep
          booking={confirmedBooking}
          event={selectedEvent}
          profile={profile}
          guestName={`${guest.nombre} ${guest.apellido}`}
          onRestart={restart}
        />
      )}

      <InfoDialog dialog={dialog} onClose={() => setDialog(null)} />
      <InfoDialog
        dialog={pendingGone ? { title: "Horario no disponible", description: SLOT_GONE } : null}
        onClose={() => setPendingSlotId(null)}
      />
    </div>
  );
}
