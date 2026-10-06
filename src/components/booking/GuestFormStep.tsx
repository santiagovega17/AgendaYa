"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CountdownBanner } from "@/components/booking/CountdownBanner";
import { StickyActionBar } from "@/components/booking/StickyActionBar";
import { cn } from "@/lib/utils/cn";
import { formatFechaLarga } from "@/lib/format";
import type { EventType, GuestData, Slot } from "@/lib/types";
import { NOTA_MAX, guestSchema, type GuestFormValues } from "@/lib/validation/guest";

export function GuestFormStep({
  event,
  slot,
  expiresAt,
  defaultValues,
  submitting,
  onExpire,
  onChangeSlot,
  onSubmit,
}: {
  event: EventType;
  slot: Slot;
  expiresAt: string;
  defaultValues: GuestFormValues;
  submitting: boolean;
  onExpire: () => void;
  onChangeSlot: () => void;
  onSubmit: (data: GuestData) => void;
}) {
  const form = useForm<GuestFormValues>({
    resolver: zodResolver(guestSchema),
    defaultValues,
    mode: "onTouched",
  });
  const nota = useWatch({ control: form.control, name: "nota" }) ?? "";
  const canSubmit = form.formState.isValid && !submitting;

  return (
    <section aria-labelledby="paso-datos" className="space-y-4" data-cy="booking-step-guest">
      <CountdownBanner expiresAt={expiresAt} onExpire={onExpire} />

      <div className="rounded-xl border bg-card p-4 shadow-soft" data-cy="guest-slot-summary">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="font-semibold">{event.nombre}</p>
            <p className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="size-4" aria-hidden="true" />
              {formatFechaLarga(slot.fecha)}
            </p>
            <p className="flex items-center gap-2 text-muted-foreground tabular-nums">
              <Clock className="size-4" aria-hidden="true" />
              {slot.horaInicio} a {slot.horaFin} h
            </p>
          </div>
          <Button variant="link" className="h-auto shrink-0 p-0" onClick={onChangeSlot} data-cy="guest-change-slot">
            Cambiar
          </Button>
        </div>
      </div>

      <div>
        <h2 id="paso-datos" className="text-lg font-semibold">
          Tus datos
        </h2>
        <p className="text-muted-foreground">No necesitás crear una cuenta.</p>
      </div>

      <Form {...form}>
        <form
          id="guest-form"
          noValidate
          onSubmit={form.handleSubmit((data) => onSubmit({ ...data, nota: data.nota || undefined }))}
          className="space-y-4"
        >
          <div className="grid gap-4 min-[420px]:grid-cols-2">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input autoComplete="given-name" className="h-12 text-base" data-cy="guest-nombre" {...field} />
                  </FormControl>
                  <FormMessage data-cy="guest-nombre-error" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="apellido"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apellido</FormLabel>
                  <FormControl>
                    <Input autoComplete="family-name" className="h-12 text-base" data-cy="guest-apellido" {...field} />
                  </FormControl>
                  <FormMessage data-cy="guest-apellido-error" />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    className="h-12 text-base"
                    data-cy="guest-email"
                    {...field}
                  />
                </FormControl>
                <FormMessage data-cy="guest-email-error" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="telefono"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    className="h-12 text-base"
                    data-cy="guest-telefono"
                    {...field}
                  />
                </FormControl>
                <FormDescription>Solo números. Podés incluir el código de área.</FormDescription>
                <FormMessage data-cy="guest-telefono-error" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="nota"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Nota <span className="font-normal text-muted-foreground">(opcional)</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    maxLength={NOTA_MAX}
                    rows={3}
                    className="min-h-24 resize-none text-base"
                    data-cy="guest-nota"
                    {...field}
                  />
                </FormControl>
                <div className="flex justify-between gap-2">
                  <FormMessage data-cy="guest-nota-error" />
                  <p
                    aria-live="polite"
                    data-cy="guest-nota-counter"
                    className={cn(
                      "ml-auto text-sm tabular-nums",
                      nota.length >= NOTA_MAX ? "font-semibold text-destructive" : "text-muted-foreground"
                    )}
                  >
                    {nota.length}/{NOTA_MAX}
                  </p>
                </div>
              </FormItem>
            )}
          />
        </form>
      </Form>

      <StickyActionBar>
        <Button
          type="submit"
          form="guest-form"
          size="lg"
          className="w-full"
          disabled={!canSubmit}
          data-cy="confirm-booking"
        >
          {submitting && <Loader2 className="size-5 animate-spin" aria-hidden="true" />}
          {submitting ? "Confirmando..." : "Confirmar reserva"}
        </Button>
        {!form.formState.isValid && !submitting && (
          <p className="mt-2 text-center text-sm text-muted-foreground" data-cy="guest-form-hint">
            Completá tus datos para confirmar.
          </p>
        )}
      </StickyActionBar>
    </section>
  );
}
