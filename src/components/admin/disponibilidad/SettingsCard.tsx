"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toFechaStr } from "@/lib/format";
import { maxActiveBookingsPerDay } from "@/lib/booking/bookings";
import type { BookingSettings } from "@/lib/types";
import {
  INTERVALOS,
  LIMITE_CONFLICTO,
  settingsSchema as schema,
  type SettingsFormValues as Values,
} from "@/lib/validation/settings";
import { useAgendaStore } from "@/store/useAgendaStore";

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const fromMin = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

function NumberField({
  name,
  label,
  description,
  min,
  control,
}: {
  name: "antelacionMinHoras" | "antelacionMaxDias" | "limiteReservasDia";
  label: string;
  description: string;
  min: number;
  control: ReturnType<typeof useForm<Values>>["control"];
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="number"
              inputMode="numeric"
              min={min}
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={Number.isNaN(field.value) ? "" : field.value}
              onChange={(e) => field.onChange(e.target.valueAsNumber)}
            />
          </FormControl>
          <FormDescription>{description}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function SettingsCard() {
  const settings = useAgendaStore((s) => s.settings);
  const updateSettings = useAgendaStore((s) => s.updateSettings);
  const bookings = useAgendaStore((s) => s.bookings);
  const eventTypes = useAgendaStore((s) => s.eventTypes);
  const weeklySchedules = useAgendaStore((s) => s.weeklySchedules);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    values: settings,
  });
  const intervalo = useWatch({ control: form.control, name: "intervaloMin" });
  const submitting = form.formState.isSubmitting;

  const sampleEvent = eventTypes.find((e) => e.activo) ?? eventTypes[0];
  const sampleFranja = weeklySchedules.find((s) => s.tipo === "permanent")?.franjas[0] ?? { inicio: "09:00", fin: "12:00" };
  const preview: string[] = [];
  if (sampleEvent) {
    const step = sampleEvent.duracionMin + (intervalo ?? 0);
    for (let t = toMin(sampleFranja.inicio); t + sampleEvent.duracionMin <= toMin(sampleFranja.fin) && preview.length < 6; t += step) {
      preview.push(fromMin(t));
    }
  }

  const onSubmit = async (values: Values) => {
    if (values.limiteReservasDia < maxActiveBookingsPerDay(bookings, toFechaStr(new Date()))) {
      form.setError("limiteReservasDia", { message: LIMITE_CONFLICTO }, { shouldFocus: true });
      return;
    }
    const result = await updateSettings(values satisfies BookingSettings);
    if (result.ok) toast.success("Configuración diaria guardada exitosamente");
    else toast.error(result.error);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración de turnos</CardTitle>
        <CardDescription>Cómo se calculan los horarios que ven tus invitados.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
          <CardContent className="@container space-y-5">
            <FormField
              control={form.control}
              name="intervaloMin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Intervalo entre turnos</FormLabel>
                  <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INTERVALOS.map((v) => (
                        <SelectItem key={v} value={String(v)}>
                          {v === 0 ? "Sin intervalo" : `${v} minutos`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Tiempo libre entre el fin de un turno y el inicio del siguiente.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {sampleEvent && preview.length > 0 && (
              <div className="rounded-lg bg-muted/60 p-3" aria-live="polite">
                <p className="text-sm text-muted-foreground">
                  Vista previa · {sampleEvent.nombre} ({sampleEvent.duracionMin} min) desde las {sampleFranja.inicio}
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {preview.map((t) => (
                    <li key={t} className="rounded-md border bg-card px-2 py-0.5 text-sm font-medium tabular-nums">
                      {t}
                    </li>
                  ))}
                  <li className="px-1 text-sm text-muted-foreground">…</li>
                </ul>
              </div>
            )}

            <div className="grid gap-5 @md:grid-cols-2">
              <NumberField
                control={form.control}
                name="antelacionMinHoras"
                label="Antelación mínima (horas)"
                description="Con cuánta anticipación mínima se puede reservar."
                min={0}
              />
              <NumberField
                control={form.control}
                name="antelacionMaxDias"
                label="Antelación máxima (días)"
                description="Hasta cuántos días hacia adelante se muestran."
                min={1}
              />
            </div>
            <NumberField
              control={form.control}
              name="limiteReservasDia"
              label="Límite de reservas por actividad y día"
              description="Máximo de reservas por tipo de evento en una misma jornada."
              min={1}
            />
          </CardContent>
          <CardFooter className="justify-end border-t">
            <Button type="submit" disabled={submitting || !form.formState.isDirty}>
              {submitting && <Loader2 className="animate-spin" aria-hidden="true" />}
              Guardar configuración
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
