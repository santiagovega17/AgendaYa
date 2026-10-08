"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CalendarClock, Clock, MoreVertical, Pencil, Plus, Repeat, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScheduleDialog, nextDateFor, type ScheduleDraft } from "@/components/admin/disponibilidad/ScheduleDialog";
import { SettingsCard } from "@/components/admin/disponibilidad/SettingsCard";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { DIAS_SEMANA, formatFechaCompacta, toFechaStr } from "@/lib/format";
import type { ScheduleType, TimeRange, WeeklySchedule } from "@/lib/types";
import { useAgendaStore } from "@/store/useAgendaStore";

const RF02_MENSAJE = "No se pudieron eliminar horarios laborales con reservas preexistentes";

type Group = {
  key: string;
  schedules: WeeklySchedule[];
  dias: number[];
  franjas: TimeRange[];
  tipo: ScheduleType;
  fechaInicio?: string;
};

const franjasStr = (f: TimeRange[]) => f.map((r) => `${r.inicio}–${r.fin}`).join(" · ");
const ordenDia = (d: number) => (d === 0 ? 7 : d);

/** "Lun a Vie", "Lun, Mié y Vie". */
function diasLabel(dias: number[]) {
  const sorted = [...dias].sort((a, b) => ordenDia(a) - ordenDia(b));
  const corto = (d: number) => DIAS_SEMANA.find((x) => x.value === d)?.corto ?? "";
  const consecutivos = sorted.every((d, i) => i === 0 || ordenDia(d) === ordenDia(sorted[i - 1]) + 1);
  if (sorted.length >= 3 && consecutivos) return `${corto(sorted[0])} a ${corto(sorted.at(-1)!)}`;
  if (sorted.length === 1) return DIAS_SEMANA.find((x) => x.value === sorted[0])?.label ?? "";
  return `${sorted.slice(0, -1).map(corto).join(", ")} y ${corto(sorted.at(-1)!)}`;
}

function DisponibilidadContent() {
  const params = useSearchParams();
  const router = useRouter();
  const weeklySchedules = useAgendaStore((s) => s.weeklySchedules);
  const setWeeklySchedule = useAgendaStore((s) => s.setWeeklySchedule);
  const updateWeeklySchedule = useAgendaStore((s) => s.updateWeeklySchedule);
  const removeWeeklySchedule = useAgendaStore((s) => s.removeWeeklySchedule);

  const wantsNew = params.get("nuevo") === "1";
  const [draft, setDraft] = useState<ScheduleDraft | null>(null);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [deleting, setDeleting] = useState<Group | null>(null);
  const [rf02, setRf02] = useState(false);

  const today = toFechaStr(new Date());
  const NEW_DRAFT: ScheduleDraft = { dias: [1, 2, 3, 4, 5], franjas: [{ inicio: "09:00", fin: "13:00" }] };
  const activeDraft = draft ?? (wantsNew ? NEW_DRAFT : null);

  const groups = useMemo(() => {
    const map = new Map<string, Group>();
    for (const s of weeklySchedules) {
      if (s.tipo === "once" && s.fechaInicio && s.fechaInicio < today) continue;
      const franjas = [...s.franjas].sort((a, b) => a.inicio.localeCompare(b.inicio));
      const key = `${s.tipo}|${s.tipo === "permanent" ? (s.fechaInicio ?? "") : "once"}|${franjasStr(franjas)}`;
      const g = map.get(key);
      if (g) {
        g.schedules.push(s);
        g.dias.push(s.diaSemana);
      } else {
        map.set(key, { key, schedules: [s], dias: [s.diaSemana], franjas, tipo: s.tipo, fechaInicio: s.fechaInicio });
      }
    }
    return [...map.values()];
  }, [weeklySchedules, today]);

  const permanentes = groups.filter((g) => g.tipo === "permanent");
  const unicas = groups.filter((g) => g.tipo === "once");

  const semana = DIAS_SEMANA.map((d) => {
    const franjas = weeklySchedules
      .filter((s) => s.tipo === "permanent" && s.diaSemana === d.value && (!s.fechaInicio || s.fechaInicio <= today))
      .flatMap((s) => s.franjas)
      .sort((a, b) => a.inicio.localeCompare(b.inicio));
    return { ...d, franjas };
  });

  const closeDialog = () => {
    setDraft(null);
    setEditingGroup(null);
    if (wantsNew) router.replace("/admin/disponibilidad");
  };

  const fechaPara = (dia: number, tipo: ScheduleType, fechaInicio: string) =>
    tipo === "once" ? nextDateFor(dia) : fechaInicio;

  const handleSave = async (
    values: { dias: number[]; franjas: TimeRange[] },
    tipo: ScheduleType,
    fechaInicio: string,
  ) => {
    const franjas = [...values.franjas].sort((a, b) => a.inicio.localeCompare(b.inicio));
    const errores: string[] = [];
    const previos = editingGroup?.schedules ?? [];

    for (const dia of values.dias) {
      const fecha = fechaPara(dia, tipo, fechaInicio);
      const previo = previos.find((s) => s.diaSemana === dia);
      const r = previo
        ? await updateWeeklySchedule(previo.id, dia, franjas, tipo, fecha)
        : await setWeeklySchedule(dia, franjas, tipo, fecha);
      if (!r.ok) errores.push(r.error);
    }
    for (const s of previos.filter((p) => !values.dias.includes(p.diaSemana))) {
      const r = await removeWeeklySchedule(s.id);
      if (!r.ok) errores.push(r.error);
    }

    const conReservas = errores.some((e) => e.startsWith(RF02_MENSAJE));
    const otros = errores.filter((e) => !e.startsWith(RF02_MENSAJE));
    otros.forEach((e) => toast.error(e));
    if (conReservas) setRf02(true);
    if (otros.length > 0) return false;

    toast.success(editingGroup ? "Horario actualizado" : "Horario guardado", {
      description:
        tipo === "permanent"
          ? `Se repite todas las semanas desde el ${formatFechaCompacta(fechaInicio).toLowerCase()}.`
          : "Aplica solo a esta semana.",
    });
    closeDialog();
    return true;
  };

  const handleDelete = async () => {
    if (!deleting) return;
    let bloqueados = 0;
    for (const s of deleting.schedules) {
      const r = await removeWeeklySchedule(s.id);
      if (!r.ok) {
        if (r.error.startsWith(RF02_MENSAJE)) bloqueados++;
        else toast.error(r.error);
      }
    }
    if (bloqueados > 0) setRf02(true);
    else toast.success("Horario eliminado");
    setDeleting(null);
  };

  const openEdit = (g: Group) => {
    setEditingGroup(g);
    setDraft({
      dias: g.dias,
      franjas: g.franjas,
      tipo: g.tipo,
      fechaInicio: g.tipo === "permanent" ? g.fechaInicio : undefined,
    });
  };

  const itemProps = { today, onEdit: openEdit, onDelete: setDeleting };

  return (
    <div className="space-y-6" data-cy="disponibilidad-page">
      <PageHeader
        title="Disponibilidad"
        description="Definí cuándo atendés y cómo se arman los turnos."
        actions={
          <Button onClick={() => setDraft(NEW_DRAFT)} data-cy="add-schedule">
            <Plus aria-hidden="true" />
            Agregar horario
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Tu semana</CardTitle>
              <CardDescription>Así se ve tu horario habitual a partir de hoy.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {semana.map((d) => (
                  <li key={d.value} className="flex items-center gap-3 py-2.5" data-cy="week-day" data-dia={d.value}>
                    <span className="w-24 shrink-0 font-medium">{d.label}</span>
                    {d.franjas.length > 0 ? (
                      <span className="flex flex-wrap gap-1.5">
                        {d.franjas.map((f, i) => (
                          <span
                            key={i}
                            data-cy="week-day-range"
                            className="rounded-md bg-success-soft px-2 py-0.5 text-sm font-medium tabular-nums text-success-soft-foreground"
                          >
                            {f.inicio}–{f.fin}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground" data-cy="week-day-off">
                        No laborable
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Franjas horarias</CardTitle>
              <CardDescription>Los días con el mismo horario aparecen agrupados.</CardDescription>
              <CardAction>
                <Button variant="outline" size="sm" onClick={() => setDraft(NEW_DRAFT)} data-cy="add-schedule-card">
                  <Plus aria-hidden="true" />
                  Agregar
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-6">
              {groups.length === 0 ? (
                <EmptyState
                  icon={Clock}
                  title="Todavía no cargaste tu horario"
                  description="Sin horario laboral tus invitados no ven turnos disponibles."
                  action={
                    <Button onClick={() => setDraft(NEW_DRAFT)} data-cy="add-schedule-empty">
                      <Plus aria-hidden="true" />
                      Cargar horario
                    </Button>
                  }
                />
              ) : (
                <>
                  {permanentes.length > 0 && (
                    <ul className="space-y-3">
                      {permanentes.map((g) => (
                        <GroupItem key={g.key} g={g} {...itemProps} />
                      ))}
                    </ul>
                  )}
                  {unicas.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-muted-foreground">Cambios de única vez</h3>
                      <ul className="space-y-3">
                        {unicas.map((g) => (
                          <GroupItem key={g.key} g={g} {...itemProps} />
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <SettingsCard />
        </div>
      </div>

      <ScheduleDialog
        draft={activeDraft}
        isEdit={!!editingGroup}
        onOpenChange={(o) => !o && closeDialog()}
        onSave={handleSave}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este horario?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting &&
                `${deleting.tipo === "permanent" ? diasLabel(deleting.dias) : "Única vez"} · ${franjasStr(deleting.franjas)}. `}
              Los horarios con reservas no se pueden eliminar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-cy="schedule-delete-cancel">Volver</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete} data-cy="schedule-delete-confirm">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={rf02} onOpenChange={setRf02}>
        <AlertDialogContent data-cy="schedule-rf02-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-warning-soft-foreground" aria-hidden="true" />
              Algunos horarios no se eliminaron
            </AlertDialogTitle>
            <AlertDialogDescription>{RF02_MENSAJE}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction data-cy="schedule-rf02-close">Entendido</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function GroupItem({
  g,
  today,
  onEdit,
  onDelete,
}: {
  g: Group;
  today: string;
  onEdit: (g: Group) => void;
  onDelete: (g: Group) => void;
}) {
  return (
    <li className="flex items-start gap-3 rounded-lg border p-4" data-cy="schedule-group" data-tipo={g.tipo}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
        {g.tipo === "permanent" ? (
          <Repeat className="size-4" aria-hidden="true" />
        ) : (
          <CalendarClock className="size-4" aria-hidden="true" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium" data-cy="schedule-group-days">
          {g.tipo === "permanent"
            ? diasLabel(g.dias)
            : g.schedules.map((s) => (s.fechaInicio ? formatFechaCompacta(s.fechaInicio) : "")).join(", ")}
        </p>
        <p className="text-sm tabular-nums text-muted-foreground" data-cy="schedule-group-ranges">
          {franjasStr(g.franjas)}
        </p>
        <div className="mt-2" data-cy="schedule-group-status">
          {g.tipo === "permanent" ? (
            g.fechaInicio && g.fechaInicio > today ? (
              <Badge variant="info">Desde {formatFechaCompacta(g.fechaInicio)}</Badge>
            ) : (
              <Badge variant="success">Vigente</Badge>
            )
          ) : (
            <Badge variant="warning">Única vez</Badge>
          )}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Acciones del horario" data-cy="schedule-actions">
            <MoreVertical aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => onEdit(g)} data-cy="schedule-edit">
            <Pencil aria-hidden="true" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => onDelete(g)} data-cy="schedule-delete">
            <Trash2 aria-hidden="true" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

export default function DisponibilidadPage() {
  return (
    <Suspense>
      <DisponibilidadContent />
    </Suspense>
  );
}
