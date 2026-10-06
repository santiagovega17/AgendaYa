"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Clock, LayoutDashboard, Tags, UserRound } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAgendaStore } from "@/store/useAgendaStore";

export const ADMIN_NAV = [
  { href: "/admin/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/admin/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/admin/disponibilidad", label: "Disponibilidad", icon: Clock },
  { href: "/admin/eventos", label: "Tipos de evento", icon: Tags },
  { href: "/admin/perfil", label: "Perfil", icon: UserRound },
];

export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const pendientes = useAgendaStore((s) => s.bookings.filter((b) => b.estado === "pendiente").length);

  return (
    <nav aria-label="Secciones del panel" className="flex flex-col gap-1">
      {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            data-cy={`nav-${href.split("/").pop()}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-150",
              active
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Icon className="size-[18px]" aria-hidden="true" />
            <span className="flex-1">{label}</span>
            {href === "/admin/agenda" && pendientes > 0 && (
              <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning-soft-foreground">
                {pendientes}
                <span className="sr-only"> pendientes de aprobar</span>
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function BrandMark({ className, href = "/admin/dashboard" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 rounded-md font-semibold", className)}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <CalendarDays className="size-[18px]" aria-hidden="true" />
      </span>
      <span className="text-lg tracking-tight">AgendaYa</span>
    </Link>
  );
}
