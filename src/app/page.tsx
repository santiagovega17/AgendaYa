"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BellRing,
  CalendarCheck,
  CalendarDays,
  Clock,
  LayoutDashboard,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const FEATURES = [
  { icon: Clock, title: "Tu horario, tus reglas", text: "Franjas, intervalos, antelación y días bloqueados." },
  { icon: Smartphone, title: "Reserva en 4 pasos", text: "Tus clientes eligen turno desde el celular, sin registrarse." },
  { icon: BellRing, title: "Avisos automáticos", text: "Confirmaciones, cancelaciones y cambios notificados al instante." },
];

export default function HomePage() {
  const router = useRouter();
  const [slug, setSlug] = useState("");

  const goToAgenda = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = slug.trim().toLowerCase().split("/").filter(Boolean).pop();
    if (clean) router.push(`/agenda/${clean}`);
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <span className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <CalendarDays className="size-[18px]" aria-hidden="true" />
          </span>
          <span className="text-lg tracking-tight">AgendaYa</span>
        </span>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button variant="ghost" asChild>
            <Link href="/admin/login">Ingresar</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 sm:px-6">
        <section className="py-12 text-center sm:py-20">
          <p className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm text-muted-foreground">
            <CalendarCheck className="size-4 text-success" aria-hidden="true" />
            Agenda y reservas para profesionales
          </p>
          <h1 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Que tus clientes reserven solos, sin idas y vueltas
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-pretty text-muted-foreground">
            Publicá tu disponibilidad, compartí un enlace y recibí turnos confirmados en tu panel.
          </p>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-soft-lg">
            <CardHeader>
              <span className="mb-2 flex size-11 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <LayoutDashboard className="size-5" aria-hidden="true" />
              </span>
              <CardTitle className="text-xl">Soy profesional</CardTitle>
              <CardDescription className="text-base">
                Configurá tu horario, tus tipos de turno y gestioná las reservas desde el panel.
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button size="lg" className="w-full" asChild>
                <Link href="/admin/login">
                  Ir al panel
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-soft-lg">
            <CardHeader>
              <span className="mb-2 flex size-11 items-center justify-center rounded-lg bg-success-soft text-success-soft-foreground">
                <Smartphone className="size-5" aria-hidden="true" />
              </span>
              <CardTitle className="text-xl">Quiero reservar</CardTitle>
              <CardDescription className="text-base">
                Ingresá el enlace o el nombre de usuario del profesional.
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <form onSubmit={goToAgenda} className="space-y-3">
                <Label htmlFor="slug" className="sr-only">
                  Enlace del profesional
                </Label>
                <div className="flex rounded-md shadow-xs">
                  <span className="hidden items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground min-[400px]:flex">
                    /agenda/
                  </span>
                  <Input
                    id="slug"
                    placeholder="ej.: dr-garcia"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="min-[400px]:rounded-l-none"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                  />
                </div>
                <Button type="submit" size="lg" variant="outline" className="w-full" disabled={!slug.trim()}>
                  Ver turnos disponibles
                  <ArrowRight aria-hidden="true" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <section aria-label="Características" className="mt-16 grid gap-8 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="space-y-2">
              <f.icon className="size-6 text-primary" aria-hidden="true" />
              <h2 className="font-semibold">{f.title}</h2>
              <p className="text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        AgendaYa · Proyecto de Ingeniería y Calidad de Software
      </footer>
    </div>
  );
}
