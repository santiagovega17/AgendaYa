"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { startOfWeek } from "date-fns";
import { CalendarDays, CalendarRange, List, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminMonthCalendar, CalendarLegend } from "@/components/admin/AdminMonthCalendar";
import { BookingDetailSheet, useBookingActions } from "@/components/admin/BookingDetailSheet";
import { BookingList } from "@/components/admin/agenda/BookingList";
import { WeekView } from "@/components/admin/agenda/WeekView";
import { PageHeader } from "@/components/common/PageHeader";
import { formatFechaCompacta, formatFechaLarga, parseFecha, toFechaStr } from "@/lib/format";
import type { BookingStatus } from "@/lib/types";
import { useAgendaStore } from "@/store/useAgendaStore";

type Periodo = "proximas" | "pasadas" | "todas";
const ESTADOS: { value: BookingStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos los estados" },
  { value: "pendiente", label: "Pendientes" },
  { value: "confirmada", label: "Confirmadas" },
  { value: "completada", label: "Completadas" },
  { value: "cancelada", label: "Canceladas" },
];

function AgendaContent() {
  const params = useSearchParams();
  const bookings = useAgendaStore((s) => s.bookings);
  const eventTypes = useAgendaStore((s) => s.eventTypes);
  const blockedDates = useAgendaStore((s) => s.blockedDates);
  const { approve } = useBookingActions();

  const initialEstado = ESTADOS.some((e) => e.value === params.get("estado"))
    ? (params.get("estado") as BookingStatus)
    : "all";

  const [tab, setTab] = useState("lista");
  const [query, setQuery] = useState("");
  const [estado, setEstado] = useState<BookingStatus | "all">(initialEstado);
  const [evento, setEvento] = useState("all");
  const [periodo, setPeriodo] = useState<Periodo>("proximas");
  const [dia, setDia] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [month, setMonth] = useState(() => new Date());
  const [monthDay, setMonthDay] = useState(() => toFechaStr(new Date()));

  const today = toFechaStr(new Date());
  const blocked = useMemo(() => new Set(blockedDates.map((b) => b.fecha)), [blockedDates]);
  const bookingCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of bookings) {
      if (b.estado === "pendiente" || b.estado === "confirmada") m.set(b.fecha, (m.get(b.fecha) ?? 0) + 1);
    }
    return m;
  }, [bookings]);
  const pendientesCount = bookings.filter((b) => b.estado === "pendiente").length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = bookings.filter((b) => {
      if (estado !== "all" && b.estado !== estado) return false;
      if (evento !== "all" && b.eventTypeId !== evento) return false;
      if (dia) {
        if (b.fecha !== dia) return false;
      } else if (periodo === "proximas" && b.fecha < today) return false;
      else if (periodo === "pasadas" && b.fecha >= today) return false;
      if (!q) return true;
      return [b.invitado.nombre, b.invitado.apellido, b.invitado.email, b.numeroReserva]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
    const key = (b: (typeof list)[number]) => `${b.fecha} ${b.horaInicio}`;
    return list.sort((a, b) =>
      periodo === "pasadas" && !dia ? key(b).localeCompare(key(a)) : key(a).localeCompare(key(b))
    );
  }, [bookings, estado, evento, periodo, dia, query, today]);

  const hasFilters = query || estado !== "all" || evento !== "all" || dia;
  const clearFilters = () => {
    setQuery("");
    setEstado("all");
    setEvento("all");
    setDia(null);
  };

  const pickDay = (fecha: string) => {
    setDia(fecha);
    setTab("lista");
  };

  const delMes = bookings
    .filter((b) => b.fecha === monthDay && b.estado !== "cancelada")
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agenda"
        description={
          pendientesCount > 0
            ? `Tenés ${pendientesCount} ${pendientesCount === 1 ? "reserva pendiente" : "reservas pendientes"} de aprobar.`
            : "Todas tus reservas en un solo lugar."
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <TabsList className="w-full sm:w-auto sm:self-start">
          <TabsTrigger value="lista" className="flex-1 sm:flex-none">
            <List aria-hidden="true" />
            Lista
          </TabsTrigger>
          <TabsTrigger value="semana" className="flex-1 sm:flex-none">
            <CalendarRange aria-hidden="true" />
            Semana
          </TabsTrigger>
          <TabsTrigger value="mes" className="flex-1 sm:flex-none">
            <CalendarDays aria-hidden="true" />
            Mes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative lg:max-w-xs lg:flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                type="search"
                placeholder="Buscar por nombre, email o Nº"
                aria-label="Buscar reservas"
                className="pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:flex">
              <Select value={estado} onValueChange={(v) => setEstado(v as BookingStatus | "all")}>
                <SelectTrigger className="w-full lg:w-44" aria-label="Filtrar por estado">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={evento} onValueChange={setEvento}>
                <SelectTrigger
                  className="order-first col-span-2 w-full sm:order-none sm:col-span-1 lg:w-48"
                  aria-label="Filtrar por tipo de evento"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los eventos</SelectItem>
                  {eventTypes.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)} disabled={!!dia}>
                <SelectTrigger className="w-full lg:w-36" aria-label="Período">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="proximas">Próximas</SelectItem>
                  <SelectItem value="pasadas">Pasadas</SelectItem>
                  <SelectItem value="todas">Todas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {(dia || hasFilters) && (
            <div className="flex flex-wrap items-center gap-2">
              {dia && (
                <Badge variant="info" className="gap-1 py-1 pr-1 pl-2.5 text-sm">
                  {formatFechaLarga(dia)}
                  <button
                    type="button"
                    onClick={() => setDia(null)}
                    className="rounded-full p-0.5 hover:bg-black/10"
                    aria-label="Quitar filtro de día"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </Badge>
              )}
              <Button variant="link" size="sm" className="h-auto px-0" onClick={clearFilters}>
                Limpiar filtros
              </Button>
              <span className="ml-auto text-sm text-muted-foreground" aria-live="polite">
                {filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}
              </span>
            </div>
          )}

          <BookingList bookings={filtered} eventTypes={eventTypes} onOpen={setDetailId} onApprove={approve} />
        </TabsContent>

        <TabsContent value="semana">
          <WeekView
            weekStart={weekStart}
            onWeekChange={setWeekStart}
            bookings={bookings}
            eventTypes={eventTypes}
            blocked={blocked}
            onOpen={setDetailId}
            onPickDay={pickDay}
          />
        </TabsContent>

        <TabsContent value="mes">
          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardContent className="space-y-4">
                <AdminMonthCalendar
                  mode="single"
                  month={month}
                  onMonthChange={setMonth}
                  selected={parseFecha(monthDay)}
                  onSelect={(d) => d && setMonthDay(toFechaStr(d))}
                  bookingCounts={bookingCounts}
                  blocked={blocked}
                />
                <CalendarLegend />
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{formatFechaLarga(monthDay)}</CardTitle>
                <CardDescription>
                  {delMes.length} {delMes.length === 1 ? "reserva" : "reservas"}
                  {blocked.has(monthDay) && " · día bloqueado"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <BookingList
                  bookings={delMes}
                  eventTypes={eventTypes}
                  onOpen={setDetailId}
                  onApprove={approve}
                  cardsOnly
                  emptyText={`No hay reservas para el ${formatFechaCompacta(monthDay).toLowerCase()}.`}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <BookingDetailSheet bookingId={detailId} onOpenChange={(o) => !o && setDetailId(null)} />
    </div>
  );
}

export default function AgendaPage() {
  return (
    <Suspense>
      <AgendaContent />
    </Suspense>
  );
}
