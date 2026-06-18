"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Bell,
  Calendar,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Settings,
  Tags,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAgendaStore } from "@/store/useAgendaStore";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/disponibilidad", label: "Disponibilidad", icon: Settings },
  { href: "/admin/eventos", label: "Eventos", icon: Tags },
  { href: "/admin/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/admin/perfil", label: "Perfil", icon: User },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthenticated = useAgendaStore((s) => s.isAuthenticated);
  const logout = useAgendaStore((s) => s.logout);
  const notifications = useAgendaStore((s) => s.notifications);
  const markAllNotificationsRead = useAgendaStore((s) => s.markAllNotificationsRead);
  const unreadCount = notifications.filter((n) => !n.leida).length;

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (!isLoginPage && !isAuthenticated) {
      router.replace("/admin/login");
    }
  }, [isAuthenticated, isLoginPage, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-white/10 bg-white/5 p-4 backdrop-blur-xl lg:flex">
        <div className="mb-8 flex items-center gap-2 px-2">
          <Calendar className="text-indigo-400" size={28} />
          <span className="text-xl font-bold text-white">AgendaYa</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                pathname === href
                  ? "bg-indigo-500/30 text-white"
                  : "text-white/60 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <button
          onClick={() => {
            logout();
            router.push("/admin/login");
          }}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/60 hover:bg-white/10 hover:text-white"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-white/10 bg-white/5 px-6 py-4 backdrop-blur-xl">
          <h1 className="text-lg font-semibold text-white lg:hidden">AgendaYa</h1>
          <div className="ml-auto flex items-center gap-4">
            <div className="relative group">
              <button
                className="relative rounded-xl p-2 text-white/70 hover:bg-white/10 hover:text-white"
                onClick={markAllNotificationsRead}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-xs text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              {notifications.length > 0 && (
                <div className="absolute right-0 top-full z-50 mt-2 hidden w-80 rounded-xl border border-white/20 bg-slate-900/95 p-3 shadow-xl group-hover:block">
                  <p className="mb-2 text-xs font-semibold text-white/60">Notificaciones</p>
                  {notifications.slice(0, 5).map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        "rounded-lg px-2 py-1.5 text-sm",
                        n.leida ? "text-white/50" : "text-white"
                      )}
                    >
                      {n.mensaje}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
