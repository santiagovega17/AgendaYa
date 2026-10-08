"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { MODALIDAD_LABEL } from "@/lib/format";
import type { EventType, Modality } from "@/lib/types";
import { useAgendaStore } from "@/store/useAgendaStore";

const schema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio.").max(100, "Máximo 100 caracteres."),
  duracionMin: z
    .number({ error: "Ingresá la duración en minutos." })
    .int("Usá minutos enteros.")
    .min(5, "La duración mínima es de 5 minutos.")
    .max(480, "La duración máxima es de 480 minutos (8 horas)."),
  modalidad: z.enum(["presencial", "virtual", "ambas"]),
  confirmacionAuto: z.boolean(),
  descripcion: z.string().max(500, "Máximo 500 caracteres."),
});

type Values = z.infer<typeof schema>;

const DURACIONES = [15, 30, 45, 60, 90, 120];

function EventTypeForm({ editing, onDone }: { editing: EventType | null; onDone: () => void }) {
  const eventTypes = useAgendaStore((s) => s.eventTypes);
  const addEventType = useAgendaStore((s) => s.addEventType);
  const updateEventType = useAgendaStore((s) => s.updateEventType);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: editing
      ? {
          nombre: editing.nombre,
          duracionMin: editing.duracionMin,
          modalidad: editing.modalidad,
          confirmacionAuto: editing.confirmacionAuto,
          descripcion: editing.descripcion,
        }
      : { nombre: "", duracionMin: 30, modalidad: "presencial", confirmacionAuto: true, descripcion: "" },
  });
  const descripcion = useWatch({ control: form.control, name: "descripcion" });
  const submitting = form.formState.isSubmitting;

  const onSubmit = async (values: Values) => {
    const nombre = values.nombre.trim();
    const duplicate = eventTypes.some(
      (e) => e.nombre.trim().toLowerCase() === nombre.toLowerCase() && e.id !== editing?.id,
    );
    if (duplicate) {
      form.setError("nombre", { message: "Ya existe un evento con ese nombre." }, { shouldFocus: true });
      return;
    }
    const data = { ...values, nombre, descripcion: values.descripcion.trim() };
    const result = editing
      ? await updateEventType(editing.id, { ...data, activo: editing.activo })
      : await addEventType({ ...data, activo: true });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(editing ? "Evento actualizado" : "Evento creado", {
      description: editing ? undefined : "Ya aparece en tu enlace público.",
    });
    onDone();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input placeholder="Ej.: Consulta inicial" maxLength={100} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="duracionMin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duración (minutos)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={5}
                    max={480}
                    step={5}
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={Number.isNaN(field.value) ? "" : field.value}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                </FormControl>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Duraciones frecuentes">
                  {DURACIONES.map((d) => (
                    <Button
                      key={d}
                      type="button"
                      size="xs"
                      variant={field.value === d ? "default" : "outline"}
                      onClick={() => form.setValue("duracionMin", d, { shouldValidate: true, shouldDirty: true })}
                    >
                      {d < 60 ? `${d} min` : `${d / 60} h`}
                    </Button>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="modalidad"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Modalidad</FormLabel>
                <Select value={field.value} onValueChange={(v) => field.onChange(v as Modality)}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(Object.keys(MODALIDAD_LABEL) as Modality[]).map((m) => (
                      <SelectItem key={m} value={m}>
                        {MODALIDAD_LABEL[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmacionAuto"
            render={({ field }) => (
              <FormItem className="flex items-start justify-between gap-4 rounded-lg border p-4">
                <div className="space-y-1">
                  <FormLabel>Confirmar automáticamente</FormLabel>
                  <FormDescription>
                    {field.value
                      ? "Las reservas quedan confirmadas al instante."
                      : "Vas a tener que aprobar cada reserva desde la agenda."}
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="descripcion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Textarea rows={4} maxLength={500} placeholder="Qué incluye, qué traer, etc." {...field} />
                </FormControl>
                <div className="flex justify-between gap-2">
                  <FormMessage />
                  <span className="ml-auto text-sm text-muted-foreground tabular-nums">{descripcion.length}/500</span>
                </div>
              </FormItem>
            )}
          />
        </div>

        <SheetFooter className="border-t sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onDone}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="animate-spin" aria-hidden="true" />}
            {editing ? "Guardar cambios" : "Crear evento"}
          </Button>
        </SheetFooter>
      </form>
    </Form>
  );
}

export function EventTypeSheet({
  open,
  editing,
  onOpenChange,
}: {
  open: boolean;
  editing: EventType | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>{editing ? "Editar evento" : "Nuevo tipo de evento"}</SheetTitle>
          <SheetDescription>
            {editing ? "Los cambios aplican a las reservas nuevas." : "Definí qué pueden reservar tus invitados."}
          </SheetDescription>
        </SheetHeader>
        {open && <EventTypeForm key={editing?.id ?? "nuevo"} editing={editing} onDone={() => onOpenChange(false)} />}
      </SheetContent>
    </Sheet>
  );
}
