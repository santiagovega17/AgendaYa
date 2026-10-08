"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Copy, ExternalLink, Loader2, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PageHeader } from "@/components/common/PageHeader";
import { iniciales } from "@/lib/format";
import { useAgendaStore } from "@/store/useAgendaStore";

const TIMEZONES = [
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires (ART)" },
  { value: "America/Mexico_City", label: "Ciudad de México (CST)" },
  { value: "America/Bogota", label: "Bogotá (COT)" },
  { value: "Europe/Madrid", label: "Madrid (CET)" },
];

const schema = z.object({
  nombre: z.string().trim().min(2, "Ingresá tu nombre o el de tu empresa.").max(100, "Máximo 100 caracteres."),
  email: z.string().trim().email("Ingresá un email válido."),
  foto: z.union([z.literal(""), z.string().trim().url("Ingresá una URL válida (https://…).")]),
  timezone: z.string(),
  slug: z
    .string()
    .trim()
    .min(3, "Usá al menos 3 caracteres.")
    .max(50, "Máximo 50 caracteres.")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Solo minúsculas, números y guiones, sin guiones al inicio ni al final."),
});

type Values = z.infer<typeof schema>;

const slugify = (v: string) =>
  v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-");

export default function PerfilPage() {
  const profile = useAgendaStore((s) => s.profile);
  const updateProfile = useAgendaStore((s) => s.updateProfile);
  const { theme, setTheme } = useTheme();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    values: {
      nombre: profile.nombre,
      email: profile.email,
      foto: profile.foto ?? "",
      timezone: profile.timezone,
      slug: profile.slug,
    },
  });
  const [nombre, foto, slug] = useWatch({ control: form.control, name: ["nombre", "foto", "slug"] });
  const submitting = form.formState.isSubmitting;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = `${origin}/agenda/${profile.slug}`;

  const onSubmit = async (values: Values) => {
    const result = await updateProfile({ ...values, slug: values.slug.trim() });
    if (result.ok) toast.success("Perfil actualizado");
    else if (result.error.includes("enlace")) form.setError("slug", { message: result.error }, { shouldFocus: true });
    else toast.error(result.error);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(publicUrl);
    toast.success("Enlace copiado", { description: publicUrl });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Perfil" description="Así te ven tus invitados en tu enlace público." />

      <Card>
        <CardHeader>
          <CardTitle>Tu enlace público</CardTitle>
          <CardDescription>Compartilo para que te reserven turnos.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <code className="min-w-0 flex-1 truncate rounded-md border bg-muted px-3 py-2.5 text-sm">{publicUrl}</code>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={copyLink}>
              <Copy aria-hidden="true" />
              Copiar
            </Button>
            <Button variant="outline" className="flex-1 sm:flex-none" asChild>
              <a href={`/agenda/${profile.slug}`} target="_blank" rel="noreferrer">
                <ExternalLink aria-hidden="true" />
                Abrir
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Datos del perfil</CardTitle>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
            <CardContent className="space-y-5">
              <div className="flex items-center gap-4">
                <Avatar className="size-16 text-lg">
                  {foto && <AvatarImage src={foto} alt="" />}
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {iniciales(nombre || "?")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{nombre || "Tu nombre"}</p>
                  <p className="text-sm text-muted-foreground">Vista previa de cómo te ven</p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre o empresa</FormLabel>
                      <FormControl>
                        <Input autoComplete="name" maxLength={100} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email de contacto</FormLabel>
                      <FormControl>
                        <Input type="email" autoComplete="email" {...field} />
                      </FormControl>
                      <FormDescription>Se muestra si no tenés eventos activos.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="foto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Foto (URL)</FormLabel>
                    <FormControl>
                      <Input type="url" inputMode="url" placeholder="https://…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zona horaria</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TIMEZONES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
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
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Enlace público</FormLabel>
                      <FormControl>
                        <div className="flex rounded-md shadow-xs">
                          <span className="flex items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground">
                            /agenda/
                          </span>
                          <Input
                            className="rounded-l-none shadow-none"
                            autoCapitalize="none"
                            spellCheck={false}
                            maxLength={50}
                            {...field}
                            onChange={(e) => field.onChange(slugify(e.target.value))}
                          />
                        </div>
                      </FormControl>
                      <FormDescription className="truncate">
                        {origin}/agenda/{slug || "…"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
            <CardFooter className="justify-end gap-2 border-t">
              <Button type="button" variant="ghost" onClick={() => form.reset()} disabled={!form.formState.isDirty}>
                Descartar
              </Button>
              <Button type="submit" disabled={submitting || !form.formState.isDirty}>
                {submitting && <Loader2 className="animate-spin" aria-hidden="true" />}
                Guardar cambios
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Apariencia</CardTitle>
          <CardDescription>Elegí cómo se ve el panel en este dispositivo.</CardDescription>
        </CardHeader>
        <CardContent>
          <ToggleGroup
            type="single"
            variant="outline"
            value={theme}
            onValueChange={(v) => v && setTheme(v)}
            className="grid w-full grid-cols-3 sm:w-auto"
            aria-label="Tema"
          >
            <ToggleGroupItem value="light" className="h-11 gap-2 px-4">
              <Sun aria-hidden="true" />
              Claro
            </ToggleGroupItem>
            <ToggleGroupItem value="dark" className="h-11 gap-2 px-4">
              <Moon aria-hidden="true" />
              Oscuro
            </ToggleGroupItem>
            <ToggleGroupItem value="system" className="h-11 gap-2 px-4">
              <Monitor aria-hidden="true" />
              Sistema
            </ToggleGroupItem>
          </ToggleGroup>
        </CardContent>
      </Card>
    </div>
  );
}
