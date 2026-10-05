"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Clock, MapPin, MoreVertical, Pencil, Plus, Tags, Trash2 } from "lucide-react";
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
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { EventTypeSheet } from "@/components/admin/EventTypeSheet";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { MODALIDAD_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils/cn";
import type { EventType } from "@/lib/types";
import { useAgendaStore } from "@/store/useAgendaStore";

function EventosContent() {
  const params = useSearchParams();
  const router = useRouter();
  const eventTypes = useAgendaStore((s) => s.eventTypes);
  const toggleEventType = useAgendaStore((s) => s.toggleEventType);
  const deleteEventType = useAgendaStore((s) => s.deleteEventType);

  const wantsNew = params.get("nuevo") === "1";
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<EventType | null>(null);
  const [deleting, setDeleting] = useState<EventType | null>(null);

  const openCreate = () => {
    setEditing(null);
    setSheetOpen(true);
  };
  const openEdit = (evt: EventType) => {
    setEditing(evt);
    setSheetOpen(true);
  };
  const onSheetChange = (open: boolean) => {
    setSheetOpen(open);
    if (!open && wantsNew) router.replace("/admin/eventos");
  };

  const handleToggle = async (evt: EventType) => {
    const r = await toggleEventType(evt.id);
    if (!r.ok) toast.error(r.error);
    else toast.success(evt.activo ? `"${evt.nombre}" desactivado` : `"${evt.nombre}" activado`, {
      description: evt.activo ? "Ya no se puede reservar." : "Ya se puede reservar desde tu enlace.",
    });
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const r = await deleteEventType(deleting.id);
    if (r.ok) toast.success("Evento eliminado");
    else toast.error(r.error);
    setDeleting(null);
  };

  const activos = eventTypes.filter((e) => e.activo).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tipos de evento"
        description={
          eventTypes.length === 0
            ? "Lo que tus invitados pueden reservar."
            : `${activos} de ${eventTypes.length} ${eventTypes.length === 1 ? "activo" : "activos"} en tu enlace público.`
        }
        actions={
          eventTypes.length > 0 && (
            <Button onClick={openCreate}>
              <Plus aria-hidden="true" />
              Nuevo evento
            </Button>
          )
        }
      />

      {eventTypes.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="Todavía no creaste tipos de evento"
          description="Creá al menos uno, por ejemplo una consulta de 30 minutos, para que tus invitados puedan reservar."
          action={
            <Button onClick={openCreate}>
              <Plus aria-hidden="true" />
              Crear mi primer evento
            </Button>
          }
          className="py-16"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {eventTypes.map((evt) => {
            const switchId = `activo-${evt.id}`;
            return (
              <Card key={evt.id} className={cn("transition-opacity", !evt.activo && "opacity-75")}>
                <CardHeader>
                  <CardTitle className="text-lg">{evt.nombre}</CardTitle>
                  <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3.5" aria-hidden="true" />
                      {evt.duracionMin} min
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5" aria-hidden="true" />
                      {MODALIDAD_LABEL[evt.modalidad]}
                    </span>
                  </CardDescription>
                  <CardAction>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`Acciones de ${evt.nombre}`}>
                          <MoreVertical aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => openEdit(evt)}>
                          <Pencil aria-hidden="true" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(evt)}>
                          <Trash2 aria-hidden="true" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardAction>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  {!evt.confirmacionAuto && <Badge variant="warning">Requiere aprobación</Badge>}
                  <p className="line-clamp-3 text-sm text-muted-foreground">
                    {evt.descripcion || "Sin descripción."}
                  </p>
                </CardContent>
                <CardFooter className="justify-between border-t">
                  <Label htmlFor={switchId} className="cursor-pointer font-normal">
                    {evt.activo ? "Visible para reservar" : "Oculto"}
                  </Label>
                  <Switch id={switchId} checked={evt.activo} onCheckedChange={() => handleToggle(evt)} />
                </CardFooter>
              </Card>
            );
          })}

          <button
            type="button"
            onClick={openCreate}
            className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Plus className="size-6" aria-hidden="true" />
            <span className="font-medium">Nuevo tipo de evento</span>
          </button>
        </div>
      )}

      <EventTypeSheet
        open={sheetOpen || wantsNew}
        editing={wantsNew ? null : editing}
        onOpenChange={onSheetChange}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar &quot;{deleting?.nombre}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Si tiene reservas registradas no se puede eliminar; en ese caso desactivalo para que no se pueda reservar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function EventosPage() {
  return (
    <Suspense>
      <EventosContent />
    </Suspense>
  );
}
