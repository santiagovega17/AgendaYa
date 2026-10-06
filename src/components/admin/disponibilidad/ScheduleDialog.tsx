"use client";

import { useState } from "react";
import { addDays } from "date-fns";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarClock, CalendarDays, Loader2, Plus, Repeat, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DIAS_SEMANA, formatFechaCompacta, formatFechaLarga, toFechaStr } from "@/lib/format";
import { cn } from "@/lib/utils/cn";
import type { ScheduleType, TimeRange } from "@/lib/types";
import { scheduleSchema as schema, type ScheduleFormValues as Values } from "@/lib/validation/schedule";

export type ScheduleDraft = { dias: number[]; franjas: TimeRange[]; tipo?: ScheduleType; fechaInicio?: string };

/** Próxima fecha (desde hoy inclusive) que cae en ese día de la semana. */
export function nextDateFor(dia: number, from = new Date()) {
  const diff = (dia - from.getDay() + 7) % 7;
  return toFechaStr(addDays(from, diff));
}

function ApplyStep({
  values,
  initialTipo,
  initialFecha,
  saving,
  onBack,
  onConfirm,
}: {
  values: Values;
  initialTipo: ScheduleType;
  initialFecha: string;
  saving: boolean;
  onBack: () => void;
  onConfirm: (tipo: ScheduleType, fechaInicio: string) => void;
}) {
  const [tipo, setTipo] = useState<ScheduleType>(initialTipo);
  const [fecha, setFecha] = useState(initialFecha);
  const today = toFechaStr(new Date());
  const unicaFechas = [...values.dias].map((d) => nextDateFor(d)).sort();

  const opciones: { value: ScheduleType; icon: typeof Repeat; title: string; desc: string }[] = [
    {
      value: "once",
      icon: CalendarClock,
      title: "Única vez",
      desc: `Solo esta semana: ${unicaFechas.map((f) => formatFechaCompacta(f)).join(", ")}.`,
    },
    {
      value: "permanent",
      icon: Repeat,
      title: "Permanente",
      desc: "Se repite todas las semanas a partir de la fecha que elijas.",
    },
  ];

  return (
    <>
      <DialogHeader>
        <DialogTitle>¿Cómo querés aplicar este horario?</DialogTitle>
        <DialogDescription>Elegí si es un cambio puntual o tu horario habitual.</DialogDescription>
      </DialogHeader>
      <div role="radiogroup" aria-label="Tipo de horario" className="grid gap-3">
        {opciones.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={tipo === o.value}
            onClick={() => setTipo(o.value)}
            className={cn(
              "flex gap-3 rounded-lg border p-4 text-left transition-colors",
              tipo === o.value ? "border-primary bg-accent ring-1 ring-primary" : "hover:bg-accent/60"
            )}
          >
            <o.icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <span>
              <span className="block font-medium">{o.title}</span>
              <span className="block text-sm text-muted-foreground">{o.desc}</span>
            </span>
          </button>
        ))}
      </div>
      {tipo === "permanent" && (
        <div className="space-y-2">
          <Label htmlFor="fecha-inicio">Fecha inicial</Label>
          <Input id="fecha-inicio" type="date" min={today} value={fecha} onChange={(e) => setFecha(e.target.value)} />
          {fecha && <p className="text-sm text-muted-foreground">Vigente desde el {formatFechaLarga(fecha).toLowerCase()}.</p>}
        </div>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={onBack} disabled={saving}>
          Volver
        </Button>
        <Button onClick={() => onConfirm(tipo, fecha)} disabled={saving || (tipo === "permanent" && !fecha)}>
          {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
          Guardar horario
        </Button>
      </DialogFooter>
    </>
  );
}

function ScheduleForm({
  draft,
  isEdit,
  onCancel,
  onSave,
}: {
  draft: ScheduleDraft;
  isEdit: boolean;
  onCancel: () => void;
  onSave: (values: Values, tipo: ScheduleType, fechaInicio: string) => Promise<boolean>;
}) {
  const [step, setStep] = useState<"form" | "apply">("form");
  const [saving, setSaving] = useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: { dias: draft.dias, franjas: draft.franjas },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "franjas" });

  if (step === "apply") {
    return (
      <ApplyStep
        values={form.getValues()}
        initialTipo={draft.tipo ?? "permanent"}
        initialFecha={draft.fechaInicio ?? toFechaStr(new Date())}
        saving={saving}
        onBack={() => setStep("form")}
        onConfirm={async (tipo, fecha) => {
          setSaving(true);
          const ok = await onSave(form.getValues(), tipo, fecha);
          setSaving(false);
          if (!ok) setStep("form");
        }}
      />
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(() => setStep("apply"))} noValidate className="space-y-5">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar horario" : "Agregar horario laboral"}</DialogTitle>
          <DialogDescription>Los días con el mismo horario se agrupan en una franja.</DialogDescription>
        </DialogHeader>

        <FormField
          control={form.control}
          name="dias"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Días</FormLabel>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto px-0"
                  onClick={() => form.setValue("dias", [1, 2, 3, 4, 5], { shouldValidate: true })}
                >
                  Lunes a viernes
                </Button>
              </div>
              <FormControl>
                <ToggleGroup
                  type="multiple"
                  variant="outline"
                  spacing={1}
                  value={field.value.map(String)}
                  onValueChange={(v) => field.onChange(v.map(Number))}
                  className="grid w-full grid-cols-7"
                >
                  {DIAS_SEMANA.map((d) => (
                    <ToggleGroupItem
                      key={d.value}
                      value={String(d.value)}
                      aria-label={d.label}
                      className="h-11 px-0 data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                    >
                      {d.corto}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Franjas horarias</legend>
          {fields.map((f, i) => (
            <div key={f.id} className="flex items-start gap-2">
              <FormField
                control={form.control}
                name={`franjas.${i}.inicio`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="sr-only">Inicio de la franja {i + 1}</FormLabel>
                    <FormControl>
                      <Input type="time" step={300} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <span className="mt-2.5 text-muted-foreground" aria-hidden="true">
                a
              </span>
              <FormField
                control={form.control}
                name={`franjas.${i}.fin`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="sr-only">Fin de la franja {i + 1}</FormLabel>
                    <FormControl>
                      <Input type="time" step={300} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(i)}
                disabled={fields.length === 1}
                aria-label={`Quitar franja ${i + 1}`}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const last = form.getValues("franjas").at(-1);
              append({ inicio: last?.fin ?? "14:00", fin: "18:00" });
            }}
          >
            <Plus aria-hidden="true" />
            Agregar franja
          </Button>
        </fieldset>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">
            <CalendarDays aria-hidden="true" />
            Continuar
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

export function ScheduleDialog({
  draft,
  isEdit,
  onOpenChange,
  onSave,
}: {
  draft: ScheduleDraft | null;
  isEdit: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: { dias: number[]; franjas: TimeRange[] }, tipo: ScheduleType, fechaInicio: string) => Promise<boolean>;
}) {
  return (
    <Dialog open={!!draft} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {draft && (
          <ScheduleForm
            draft={draft}
            isEdit={isEdit}
            onCancel={() => onOpenChange(false)}
            onSave={onSave}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
