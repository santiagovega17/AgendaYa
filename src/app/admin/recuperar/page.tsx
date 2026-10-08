"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link2Off, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthCard } from "@/components/admin/AuthCard";
import { EmptyState } from "@/components/common/EmptyState";
import { PasswordInput } from "@/components/common/PasswordInput";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { getSupabase } from "@/lib/supabase/client";
import { useAgendaStore } from "@/store/useAgendaStore";

const schema = z
  .object({
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
    confirm: z.string().min(1, "Repetí la contraseña."),
  })
  .refine((v) => v.password === v.confirm, { message: "Las contraseñas no coinciden.", path: ["confirm"] });

type Values = z.infer<typeof schema>;

export default function RecuperarPage() {
  const [state, setState] = useState<"checking" | "ready" | "invalid">("checking");
  const loadAll = useAgendaStore((s) => s.loadAll);
  const router = useRouter();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: { password: "", confirm: "" },
  });
  const submitting = form.formState.isSubmitting;

  useEffect(() => {
    // El cliente de Supabase procesa el token del enlace del email al inicializarse.
    getSupabase()
      .auth.getSession()
      .then(({ data }) => setState(data.session ? "ready" : "invalid"));
  }, []);

  const onSubmit = async ({ password }: Values) => {
    const { error } = await getSupabase().auth.updateUser({ password });
    if (error) {
      form.setError("password", {
        message:
          error.code === "weak_password" || error.code === "same_password"
            ? "Elegí una contraseña distinta de la anterior, de al menos 6 caracteres."
            : "No se pudo actualizar la contraseña. Pedí un nuevo enlace.",
      });
      return;
    }
    await loadAll();
    useAgendaStore.setState({ isAuthenticated: true, status: "ready" });
    toast.success("Contraseña actualizada");
    router.push("/admin/dashboard");
  };

  return (
    <AuthCard title="Nueva contraseña" description="Elegí una contraseña para tu cuenta">
      {state === "checking" && (
        <div className="space-y-4" aria-busy="true" aria-label="Verificando enlace">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {state === "invalid" && (
        <EmptyState
          icon={Link2Off}
          title="El enlace no es válido"
          description="Puede que ya se haya usado o que haya expirado. Pedí uno nuevo desde el inicio de sesión."
          action={<Button onClick={() => router.push("/admin/login")}>Volver a iniciar sesión</Button>}
          className="border-0 p-0"
        />
      )}

      {state === "ready" && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nueva contraseña</FormLabel>
                  <FormControl>
                    <PasswordInput autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Repetir contraseña</FormLabel>
                  <FormControl>
                    <PasswordInput autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" aria-hidden="true" />}
              {submitting ? "Guardando…" : "Guardar contraseña"}
            </Button>
          </form>
        </Form>
      )}
    </AuthCard>
  );
}
