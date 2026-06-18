"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";
import { useAgendaStore } from "@/store/useAgendaStore";
import { useToast } from "@/components/ui/Toast";

export default function LoginPage() {
  const [email, setEmail] = useState("juan.garcia@agendaya.com");
  const [password, setPassword] = useState("demo1234");
  const login = useAgendaStore((s) => s.login);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(email, password)) {
      router.push("/admin/dashboard");
    } else {
      toast("Credenciales inválidas. Usá una contraseña de al menos 4 caracteres.", "error");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <GlassCard className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Calendar className="text-indigo-400" size={36} />
          <h1 className="text-2xl font-bold text-white">AgendaYa</h1>
          <p className="text-sm text-white/60">Iniciá sesión en tu panel</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <GlassInput
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <GlassInput
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <GlassButton type="submit" className="w-full" size="lg">
            Ingresar
          </GlassButton>
          <button
            type="button"
            className="text-center text-sm text-white/50 hover:text-white/80"
            onClick={() => toast("En producción se enviaría un email de recuperación.", "info")}
          >
            ¿Olvidaste tu contraseña?
          </button>
        </form>
      </GlassCard>
    </div>
  );
}
