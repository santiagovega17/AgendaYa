"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { endOfWeek, startOfWeek } from "date-fns";
import {
  AlertTriangle,
  Ban,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  Check,
  Copy,
  Hourglass,
  Loader2,
  Lock,
  Unlock,
  X,
} from "lucide-react";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminMonthCalendar, CalendarLegend } from "@/components/admin/AdminMonthCalendar";
import { BookingDetailSheet, useBookingActions } from "@/components/admin/BookingDetailSheet";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { isActive } from "@/lib/booking/bookings";
import { formatFechaCompacta, formatFechaLarga, formatFechaRelativa, toFechaStr } from "@/lib/format";
import type { Booking } from "@/lib/types";
import { useAgendaStore } from "@/store/useAgendaStore";

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  href,
  tone = "default",
}: {
  icon: typeof CalendarDays;
  label: string;
  value: number;
  hint: string;
  href?: string;
  tone?: "default" | "warning";
}) {
  const body = (
    <Card className="h-full gap-3 py-4 transition-shadow duration-200 hover:shadow-soft-lg sm:py-5">
      <CardContent className="flex items-start justify-between gap-3 px-4 sm:px-5">
        <div className="min-w-0">
          <p className="text-sm leading-snug text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums sm:text-3xl">{value}</p>
          <p className="mt-1 hidden truncate text-sm text-muted-foreground sm:block">{hint}</p>
        </div>
        <span
          className={
            tone === "warning" && value > 0
              ? "hidden size-10 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning-soft-foreground sm:flex"
              : "hidden size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground sm:flex"
          }
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </CardContent>
    </Card>
  );
  return href ? (
    <Link href={href} className="rounded-xl">
      {body}
    </Link>
  ) : (
    body
  );
}

function BookingRow({ booking, onOpen }: { booking: Booking; onOpen: () => void }) {
  const evento = useAgendaStore((s) => s.eventTypes.find((e) => e.id === booking.eventTypeId)?.nombre);
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        data-cy="day-booking"
        data-numero={booking.numeroReserva}
        className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-accent"
      >
        <span className="w-12 shrink-0 font-semibold tabular-nums">{booking.horaInicio}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">
            {booking.invitado.nombre} {booking.invitado.apellido}
          </span>
          <span className="block truncate text-sm text-muted-foreground">{evento}</span>
        </span>
        <StatusBadge status={booking.estado} />
      </button>
    </li>
  );
}

export default function DashboardPage() {
  const profile = useAgendaStore((s) => s.profile);
  const bookings = useAgendaStore((s) => s.bookings);
  const blockedDates = useAgendaStore((s) => s.blockedDates);
  const blockDates = useAgendaStore((s) => s.blockDates);
  const confirmBlockDates = useAgendaStore((s) => s.confirmBlockDates);
  const unblockDate = useAgendaStore((s) => s.unblockDate);
  const { approve } = useBookingActions();

  const today = toFechaStr(new Date());
  const [month, setMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(today);
  const [detailId, setDetailId] = useState<string | null>(null);

  const [blockMode, setBlockMode] = useState(false);
  const [toBlock, setToBlock] = useState<Date[]>([]);
  const [motivo, setMotivo] = useState("");
  const [askBlock, setAskBlock] = useState(false);
  const [conflicts, setConflicts] = useState<{ fecha: string; bookings: Booking[] }[]>([]);
  const [working, setWorking] = useState(false);

  const active = useMemo(() => bookings.filter(isActive), [bookings]);
  const bookingCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of active) m.set(b.fecha, (m.get(b.fecha) ?? 0) + 1);
    return m;
  }, [active]);
  const blocked = useMemo(() => new Set(blockedDates.map((b) => b.fecha)), [blockedDates]);

  const weekStart = toFechaStr(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekEnd = toFechaStr(endOfWeek(new Date(), { weekStartsOn: 1 }));
  const hoy = active.filter((b) => b.fecha === today);
  const semana = active.filter((b) => b.fecha >= weekStart && b.fecha <= weekEnd);
  const pendientes = active.filter((b) => b.estado === "pendiente" && b.fecha >= today);
  const proximosBloqueos = blockedDates.filter((b) => b.fecha >= today);
  const delDia = bookings.filter((b) => b.fecha === selectedDay && b.estado !== "cancelada");
  const firstName =
    profile.nombre
      .split(/\s+/)
      .find((w) => w && !/^(dr|dra|lic|ing|prof|sr|sra|srta)\.?$/i.test(w)) || "de nuevo";

  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/agenda/${profile.slug}` : "";
  const copyLink = async () => {
    await navigator.clipboard.writeText(publicUrl);
    toast.success("Enlace copiado", { description: publicUrl });
  };

  const exitBlockMode = () => {
    setBlockMode(false);
    setToBlock([]);
    setMotivo("");
  };

  const fechasABloquear = toBlock.map(toFechaStr).sort();

  const doBlock = async () => {
    setWorking(true);
    const result = await blockDates(fechasABloquear, motivo.trim() || undefined);
    setWorking(false);
    setAskBlock(false);
    result.errors.forEach((e) => toast.error(e));
    if (result.blocked.length > 0) {
      setToBlock((prev) => prev.filter((d) => !result.blocked.includes(toFechaStr(d))));
      toast.success(
        result.blocked.length === 1 ? "Día bloqueado" : `${result.blocked.length} días bloqueados`,
        { description: "Ya no aparecen en tu enlace público." }
      );
    }
    if (result.needsConfirm.length > 0) setConflicts(result.needsConfirm);
    else if (result.errors.length === 0) exitBlockMode();
  };

  const doConfirmConflicts = async () => {
    setWorking(true);
    const result = await confirmBlockDates(
      conflicts.map((c) => c.fecha),
      motivo.trim() || undefined
    );
    setWorking(false);
    const total = conflicts.reduce((n, c) => n + c.bookings.length, 0);
    if (result.ok) {
      toast.info("Días bloqueados", {
        description: `Se cancelaron ${total} ${total === 1 ? "reserva" : "reservas"} y avisamos a cada invitado.`,
      });
      setConflicts([]);
      exitBlockMode();
    } else toast.error(result.error);
  };

  const doUnblock = async (fecha: string) => {
    const r = await unblockDate(fecha);
    if (r.ok) toast.success(`${formatFechaCompacta(fecha)} desbloqueado`);
    else toast.error(r.error);
  };

  const conflictTotal = conflicts.reduce((n, c) => n + c.bookings.length, 0);

  return (
    <div className="space-y-6" data-cy="dashboard-page">
      <PageHeader
        title={`Hola, ${firstName}`}
        description={`${formatFechaLarga(today)} · ${
          hoy.length === 0 ? "No tenés turnos hoy" : `Tenés ${hoy.length} ${hoy.length === 1 ? "turno" : "turnos"} hoy`
        }`}
        actions={
          <>
            <Button variant="outline" onClick={copyLink} disabled={!profile.slug} data-cy="copy-public-link">
              <Copy aria-hidden="true" />
              Copiar enlace
            </Button>
            <Button asChild>
              <Link href="/admin/agenda" data-cy="go-agenda">
                <CalendarDays aria-hidden="true" />
                Ver agenda
              </Link>
            </Button>
          </>
        }
      />

      <section aria-label="Resumen" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard icon={CalendarCheck} label="Turnos de hoy" value={hoy.length} hint={hoy[0] ? `Próximo: ${hoy[0].horaInicio}` : "Día libre"} />
        <StatCard icon={CalendarRange} label="Esta semana" value={semana.length} hint="Confirmados y pendientes" />
        <StatCard
          icon={Hourglass}
          label="Pendientes de aprobar"
          value={pendientes.length}
          hint={pendientes.length > 0 ? "Revisalos en la agenda" : "Nada por revisar"}
          href="/admin/agenda?estado=pendiente"
          tone="warning"
        />
        <StatCard icon={Ban} label="Días bloqueados" value={proximosBloqueos.length} hint="A partir de hoy" />
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle data-cy="calendar-title">{blockMode ? "Elegí los días a bloquear" : "Calendario"}</CardTitle>
            <CardDescription>
              {blockMode
                ? "Tocá uno o varios días. Los días bloqueados no muestran turnos en tu enlace público."
                : "Tocá un día para ver sus turnos."}
            </CardDescription>
            <CardAction>
              {blockMode ? (
                <Button variant="ghost" onClick={exitBlockMode} data-cy="block-days-exit">
                  <X aria-hidden="true" />
                  Salir
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setBlockMode(true)} data-cy="block-days-start">
                  <Lock aria-hidden="true" />
                  Bloquear días
                </Button>
              )}
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-4">
            {blockMode ? (
              <AdminMonthCalendar
                mode="multiple"
                month={month}
                onMonthChange={setMonth}
                selected={toBlock}
                onSelect={(d) => setToBlock(d ?? [])}
                bookingCounts={bookingCounts}
                blocked={blocked}
                disabled={(d) => toFechaStr(d) < today || blocked.has(toFechaStr(d))}
              />
            ) : (
              <AdminMonthCalendar
                mode="single"
                month={month}
                onMonthChange={setMonth}
                selected={new Date(`${selectedDay}T00:00:00`)}
                onSelect={(d) => d && setSelectedDay(toFechaStr(d))}
                bookingCounts={bookingCounts}
                blocked={blocked}
              />
            )}
            <CalendarLegend showSelection={blockMode} />

            {blockMode && (
              <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
                <div className="space-y-2">
                  <Label htmlFor="motivo-bloqueo">Motivo (opcional)</Label>
                  <Input
                    id="motivo-bloqueo"
                    placeholder="Ej.: vacaciones, feriado, capacitación"
                    maxLength={200}
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    data-cy="block-reason"
                  />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground" aria-live="polite" data-cy="block-selected-count">
                    {toBlock.length === 0
                      ? "Ningún día seleccionado"
                      : `${toBlock.length} ${toBlock.length === 1 ? "día seleccionado" : "días seleccionados"}`}
                  </p>
                  <Button disabled={toBlock.length === 0} onClick={() => setAskBlock(true)} data-cy="block-days-submit">
                    <Lock aria-hidden="true" />
                    Bloquear {toBlock.length > 0 ? toBlock.length : ""} {toBlock.length === 1 ? "día" : "días"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle data-cy="day-title">{formatFechaRelativa(selectedDay)}</CardTitle>
              <CardDescription data-cy="day-summary">
                {blocked.has(selectedDay)
                  ? "Día bloqueado"
                  : `${delDia.length} ${delDia.length === 1 ? "turno" : "turnos"}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {delDia.length === 0 ? (
                <EmptyState
                  icon={blocked.has(selectedDay) ? Ban : CalendarDays}
                  title={blocked.has(selectedDay) ? "Este día está bloqueado" : "Sin turnos"}
                  description={
                    blocked.has(selectedDay)
                      ? blockedDates.find((b) => b.fecha === selectedDay)?.motivo
                      : "Cuando alguien reserve, lo vas a ver acá."
                  }
                  className="py-8"
                />
              ) : (
                <ul className="-mx-2 divide-y">
                  {delDia.map((b) => (
                    <BookingRow key={b.id} booking={b} onOpen={() => setDetailId(b.id)} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {pendientes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hourglass className="size-4 text-warning-soft-foreground" aria-hidden="true" />
                  Pendientes de aprobar
                </CardTitle>
                <CardDescription>Estas reservas esperan tu confirmación.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {pendientes.slice(0, 4).map((b) => (
                    <li key={b.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setDetailId(b.id)}>
                        <span className="block truncate font-medium">
                          {b.invitado.nombre} {b.invitado.apellido}
                        </span>
                        <span className="block text-sm text-muted-foreground">
                          {formatFechaCompacta(b.fecha)} · {b.horaInicio}
                        </span>
                      </button>
                      <Button size="sm" onClick={() => approve(b.id)} data-cy="approve-booking">
                        <Check aria-hidden="true" />
                        Aprobar
                      </Button>
                    </li>
                  ))}
                </ul>
                {pendientes.length > 4 && (
                  <Button variant="link" asChild className="mt-2 px-0">
                    <Link href="/admin/agenda?estado=pendiente">Ver las {pendientes.length} pendientes</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Días bloqueados</CardTitle>
              <CardDescription>Próximos días sin turnos disponibles.</CardDescription>
            </CardHeader>
            <CardContent>
              {proximosBloqueos.length === 0 ? (
                <p className="text-sm text-muted-foreground" data-cy="blocked-days-empty">
                  No bloqueaste ningún día.
                </p>
              ) : (
                <ul className="space-y-2">
                  {proximosBloqueos.map((b) => (
                    <li key={b.fecha} className="flex items-center gap-3" data-cy="blocked-day" data-fecha={b.fecha}>
                      <Ban className="size-4 shrink-0 text-danger-soft-foreground" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{formatFechaCompacta(b.fecha)}</span>
                        {b.motivo && <span className="block truncate text-sm text-muted-foreground">{b.motivo}</span>}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => doUnblock(b.fecha)}
                        aria-label={`Desbloquear ${formatFechaLarga(b.fecha)}`}
                        data-cy="unblock-day"
                      >
                        <Unlock aria-hidden="true" />
                        Desbloquear
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={askBlock} onOpenChange={setAskBlock}>
        <AlertDialogContent data-cy="block-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Bloquear {toBlock.length} {toBlock.length === 1 ? "día" : "días"}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Tus invitados no van a poder reservar en:</p>
                <ul className="flex flex-wrap gap-1.5">
                  {fechasABloquear.map((f) => (
                    <li key={f} className="rounded-md bg-muted px-2 py-0.5 text-sm text-foreground">
                      {formatFechaCompacta(f)}
                    </li>
                  ))}
                </ul>
                {motivo.trim() && <p>Motivo: {motivo.trim()}</p>}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working} data-cy="block-confirm-cancel">
              Volver
            </AlertDialogCancel>
            <Button onClick={doBlock} disabled={working} data-cy="block-confirm">
              {working && <Loader2 className="animate-spin" aria-hidden="true" />}
              Bloquear
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={conflicts.length > 0} onOpenChange={(o) => !o && setConflicts([])}>
        <AlertDialogContent data-cy="block-conflict-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" aria-hidden="true" />
              Hay reservas en {conflicts.length === 1 ? "ese día" : "esos días"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Si continuás, se cancelan {conflictTotal} {conflictTotal === 1 ? "reserva" : "reservas"} y se envía un aviso
              de cancelación a cada invitado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-64 space-y-3 overflow-y-auto">
            {conflicts.map((c) => (
              <div key={c.fecha}>
                <p className="text-sm font-semibold">{formatFechaLarga(c.fecha)}</p>
                <ul className="mt-1 space-y-1">
                  {c.bookings.map((b) => (
                    <li
                      key={b.id}
                      className="flex justify-between gap-2 text-sm"
                      data-cy="block-conflict-booking"
                      data-numero={b.numeroReserva}
                    >
                      <span className="truncate">
                        {b.horaInicio} · {b.invitado.nombre} {b.invitado.apellido}
                      </span>
                      <span className="shrink-0 font-mono text-muted-foreground">{b.numeroReserva}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working} data-cy="block-conflict-cancel">
              No bloquear
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={working}
              data-cy="block-conflict-confirm"
              onClick={(e) => {
                e.preventDefault();
                doConfirmConflicts();
              }}
            >
              {working && <Loader2 className="animate-spin" aria-hidden="true" />}
              Bloquear y cancelar reservas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BookingDetailSheet bookingId={detailId} onOpenChange={(o) => !o && setDetailId(null)} />
    </div>
  );
}
