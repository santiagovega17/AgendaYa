"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AuthCard } from "@/components/admin/AuthCard";
import { PasswordInput } from "@/components/common/PasswordInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAgendaStore } from "@/store/useAgendaStore";

type Mode = "login" | "registro" | "recuperar";

const COPY: Record<Mode, { title: string; description: string; submit: string }> = {
  login: { title: "Iniciá sesión", description: "Entrá a tu panel de AgendaYa", submit: "Ingresar" },
  registro: { title: "Creá tu cuenta", description: "Empezá a recibir reservas en minutos", submit: "Crear cuenta" },
  recuperar: {
    title: "Recuperar contraseña",
    description: "Te enviamos un enlace para elegir una nueva",
    submit: "Enviar enlace",
  },
};

const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_EMAIL;
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD;

const emailField = z.string().trim().min(1, "Ingresá tu email.").email("Ingresá un email válido.");
const passwordField = z.string().min(6, "La contraseña debe tener al menos 6 caracteres.");

function schemaFor(mode: Mode) {
  return z.object({
    nombre:
      mode === "registro"
        ? z.string().trim().min(2, "Ingresá tu nombre o el de tu empresa.").max(100, "Máximo 100 caracteres.")
        : z.string().optional(),
    email: emailField,
    password: mode === "recuperar" ? z.string().optional() : passwordField,
  });
}

type FormValues = z.infer<ReturnType<typeof schemaFor>>;

function AuthForm({ mode, onModeChange }: { mode: Mode; onModeChange: (m: Mode) => void }) {
  const router = useRouter();
  const login = useAgendaStore((s) => s.login);
  const signUp = useAgendaStore((s) => s.signUp);
  const requestPasswordReset = useAgendaStore((s) => s.requestPasswordReset);
  const [serverError, setServerError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schemaFor(mode)),
    mode: "onTouched",
    defaultValues: { nombre: "", email: "", password: "" },
  });
  const submitting = form.formState.isSubmitting;

  useEffect(() => {
    if (serverError) errorRef.current?.focus();
  }, [serverError]);

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    const email = values.email.trim();
    if (mode === "login") {
      const result = await login(email, values.password ?? "");
      if (result.ok) router.push("/admin/dashboard");
      else setServerError(result.error);
    } else if (mode === "registro") {
      const result = await signUp((values.nombre ?? "").trim(), email, values.password ?? "");
      if (!result.ok) setServerError(result.error);
      else if (result.needsConfirmation) {
        toast.success("Cuenta creada", { description: "Revisá tu email para confirmarla y después iniciá sesión." });
        onModeChange("login");
      } else router.push("/admin/perfil");
    } else {
      const result = await requestPasswordReset(email);
      if (result.ok) {
        toast.info("Revisá tu correo", {
          description: "Si el email está registrado, vas a recibir un enlace de recuperación.",
        });
        onModeChange("login");
      } else setServerError(result.error);
    }
  };

  const fillDemo = () => {
    if (!DEMO_EMAIL || !DEMO_PASSWORD) return;
    form.setValue("email", DEMO_EMAIL, { shouldValidate: true });
    form.setValue("password", DEMO_PASSWORD, { shouldValidate: true });
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
          {serverError && (
            <div
              ref={errorRef}
              tabIndex={-1}
              role="alert"
              data-cy="login-error"
              className="flex gap-2 rounded-md border border-destructive/30 bg-danger-soft p-3 text-sm text-danger-soft-foreground outline-none"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{serverError}</span>
            </div>
          )}

          {mode === "registro" && (
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre o empresa</FormLabel>
                  <FormControl>
                    <Input autoComplete="organization" maxLength={100} data-cy="signup-nombre" {...field} />
                  </FormControl>
                  <FormMessage data-cy="signup-nombre-error" />
                </FormItem>
              )}
            />
          )}

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
                    placeholder="vos@ejemplo.com"
                    data-cy="login-email"
                    {...field}
                  />
                </FormControl>
                <FormMessage data-cy="login-email-error" />
              </FormItem>
            )}
          />

          {mode !== "recuperar" && (
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Contraseña</FormLabel>
                    {mode === "login" && (
                      <button
                        type="button"
                        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                        data-cy="login-forgot"
                        onClick={() => onModeChange("recuperar")}
                      >
                        ¿La olvidaste?
                      </button>
                    )}
                  </div>
                  <FormControl>
                    <PasswordInput
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      data-cy="login-password"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage data-cy="login-password-error" />
                </FormItem>
              )}
            />
          )}

          <Button type="submit" size="lg" className="w-full" disabled={submitting} data-cy="login-submit">
            {submitting && <Loader2 className="animate-spin" aria-hidden="true" />}
            {submitting ? "Procesando…" : COPY[mode].submit}
          </Button>
        </form>
      </Form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {mode === "login" ? (
          <>
            ¿No tenés cuenta?{" "}
            <button
              type="button"
              className="font-medium text-primary underline-offset-4 hover:underline"
              data-cy="login-go-signup"
              onClick={() => onModeChange("registro")}
            >
              Registrate
            </button>
          </>
        ) : (
          <button
            type="button"
            className="font-medium text-primary underline-offset-4 hover:underline"
            data-cy="login-go-login"
            onClick={() => onModeChange("login")}
          >
            Volver a iniciar sesión
          </button>
        )}
      </p>

      {mode === "login" && DEMO_EMAIL && DEMO_PASSWORD && <DemoCard onFill={fillDemo} />}
    </>
  );
}

function DemoCard({ onFill }: { onFill: () => void }) {
  return (
    <Card className="mt-6 border-dashed bg-muted/50 py-4 shadow-none">
      <CardContent className="flex items-center gap-3 px-4">
        <Sparkles className="size-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Cuenta demo</p>
          <p className="truncate text-sm text-muted-foreground">{DEMO_EMAIL}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onFill} data-cy="login-demo-fill">
          Completar
        </Button>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const status = useAgendaStore((s) => s.status);
  const isAuthenticated = useAgendaStore((s) => s.isAuthenticated);
  const router = useRouter();

  useEffect(() => {
    if (status === "ready" && isAuthenticated) router.replace("/admin/dashboard");
  }, [status, isAuthenticated, router]);

  return (
    <AuthCard title={COPY[mode].title} description={COPY[mode].description}>
      <AuthForm key={mode} mode={mode} onModeChange={setMode} />
    </AuthCard>
  );
}
