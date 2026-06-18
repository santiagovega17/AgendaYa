"use client";

import { useState } from "react";
import { Copy, RotateCcw } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { useAgendaStore } from "@/store/useAgendaStore";
import { useToast } from "@/components/ui/Toast";

const TIMEZONES = [
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires (ART)" },
  { value: "America/Mexico_City", label: "Ciudad de México (CST)" },
  { value: "America/Bogota", label: "Bogotá (COT)" },
  { value: "Europe/Madrid", label: "Madrid (CET)" },
];

export default function PerfilPage() {
  const profile = useAgendaStore((s) => s.profile);
  const updateProfile = useAgendaStore((s) => s.updateProfile);
  const resetToSeed = useAgendaStore((s) => s.resetToSeed);
  const { toast } = useToast();

  const [form, setForm] = useState({
    nombre: profile.nombre,
    email: profile.email,
    foto: profile.foto ?? "",
    timezone: profile.timezone,
    slug: profile.slug,
  });

  const publicUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/agenda/${form.slug}`;

  const handleSave = () => {
    updateProfile(form);
    toast("Perfil actualizado correctamente.", "success");
  };

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast("Enlace copiado al portapapeles.", "success");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Perfil</h1>

      <GlassCard className="space-y-4">
        <GlassInput
          label="Nombre"
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
        />
        <GlassInput
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <GlassInput
          label="Foto (URL)"
          value={form.foto}
          onChange={(e) => setForm({ ...form, foto: e.target.value })}
        />
        <GlassSelect
          label="Zona horaria"
          value={form.timezone}
          onChange={(e) => setForm({ ...form, timezone: e.target.value })}
          options={TIMEZONES}
        />
        <GlassInput
          label="Slug del enlace público"
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s/g, "-") })}
        />

        <div className="rounded-xl border border-white/15 bg-white/5 p-4">
          <p className="mb-2 text-sm text-white/60">Enlace público</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate text-sm text-indigo-300">{publicUrl}</code>
            <GlassButton variant="secondary" size="sm" onClick={copyLink}>
              <Copy size={16} />
            </GlassButton>
          </div>
        </div>

        <GlassButton onClick={handleSave}>Guardar cambios</GlassButton>
      </GlassCard>

      <GlassCard>
        <h2 className="mb-2 font-semibold text-white">Datos de demostración</h2>
        <p className="mb-4 text-sm text-white/60">
          Restaurá los datos iniciales del prototipo para empezar de nuevo.
        </p>
        <GlassButton
          variant="danger"
          onClick={() => {
            resetToSeed();
            toast("Datos restaurados al estado inicial.", "info");
          }}
        >
          <RotateCcw size={16} />
          Restaurar datos demo
        </GlassButton>
      </GlassCard>
    </div>
  );
}
