"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { CalendarPlus, ExternalLink, Moon, Plus, Search, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { ADMIN_NAV } from "@/components/admin/AdminNav";
import { useAgendaStore } from "@/store/useAgendaStore";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setTheme } = useTheme();
  const slug = useAgendaStore((s) => s.profile.slug);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const run = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <>
      <Button
        variant="outline"
        className="hidden h-9 w-56 justify-start gap-2 px-3 text-muted-foreground sm:flex"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" aria-hidden="true" />
        <span className="flex-1 text-left">Buscar o ir a…</span>
        <kbd className="rounded border bg-muted px-1.5 font-mono text-[0.7rem]">⌘K</kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="sm:hidden"
        aria-label="Buscar o ir a"
        onClick={() => setOpen(true)}
      >
        <Search className="size-5" aria-hidden="true" />
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Paleta de comandos"
        description="Navegá o ejecutá acciones rápidas"
      >
        <CommandInput placeholder="Escribí una sección o acción…" />
        <CommandList>
          <CommandEmpty>Sin resultados.</CommandEmpty>
          <CommandGroup heading="Ir a">
            {ADMIN_NAV.map(({ href, label, icon: Icon }) => (
              <CommandItem key={href} onSelect={() => run(() => router.push(href))}>
                <Icon aria-hidden="true" />
                {label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Acciones">
            <CommandItem onSelect={() => run(() => router.push("/admin/eventos?nuevo=1"))}>
              <Plus aria-hidden="true" />
              Nuevo tipo de evento
            </CommandItem>
            <CommandItem onSelect={() => run(() => router.push("/admin/disponibilidad?nuevo=1"))}>
              <CalendarPlus aria-hidden="true" />
              Agregar horario laboral
            </CommandItem>
            {slug && (
              <CommandItem onSelect={() => run(() => window.open(`/agenda/${slug}`, "_blank"))}>
                <ExternalLink aria-hidden="true" />
                Abrir mi enlace público
              </CommandItem>
            )}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Tema">
            <CommandItem onSelect={() => run(() => setTheme("light"))}>
              <Sun aria-hidden="true" />
              Modo claro
            </CommandItem>
            <CommandItem onSelect={() => run(() => setTheme("dark"))}>
              <Moon aria-hidden="true" />
              Modo oscuro
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
