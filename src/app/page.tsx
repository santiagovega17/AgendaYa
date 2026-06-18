"use client";

import Link from "next/link";
import { Calendar, ArrowRight, Smartphone, Monitor } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 flex items-center gap-3">
        <Calendar className="text-indigo-400" size={40} />
        <h1 className="text-4xl font-bold text-white">AgendaYa</h1>
      </div>
      <p className="mb-10 max-w-lg text-center text-lg text-white/70">
        Sistema de gestión de agenda y reservas para profesionales independientes.
        Prototipo de demostración sin base de datos.
      </p>

      <div className="grid w-full max-w-2xl gap-6 sm:grid-cols-2">
        <GlassCard className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Monitor className="text-indigo-400" size={24} />
            <h2 className="text-xl font-semibold text-white">Panel Admin</h2>
          </div>
          <p className="text-sm text-white/60">
            Configurá disponibilidad, eventos y gestioná reservas desde el escritorio.
          </p>
          <Link href="/admin/login">
            <GlassButton className="w-full" size="lg">
              Acceder como admin
              <ArrowRight size={18} />
            </GlassButton>
          </Link>
        </GlassCard>

        <GlassCard className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Smartphone className="text-purple-400" size={24} />
            <h2 className="text-xl font-semibold text-white">Reserva pública</h2>
          </div>
          <p className="text-sm text-white/60">
            Flujo mobile del invitado para reservar un turno en 4 pasos.
          </p>
          <Link href="/agenda/dr-garcia">
            <GlassButton className="w-full" variant="secondary" size="lg">
              Probar booking
              <ArrowRight size={18} />
            </GlassButton>
          </Link>
        </GlassCard>
      </div>

      <p className="mt-8 text-sm text-white/40">
        Demo: login con cualquier email y contraseña de 4+ caracteres
      </p>
    </div>
  );
}
