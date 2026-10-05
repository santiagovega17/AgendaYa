"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgendaStore } from "@/store/useAgendaStore";

const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/recuperar"];
const REFRESH_MS = 30_000;

function LoadingShell() {
  return (
    <div className="flex min-h-dvh" aria-busy="true" aria-label="Cargando panel">
      <div className="hidden w-64 shrink-0 border-r bg-card p-5 lg:block">
        <Skeleton className="mb-8 h-8 w-32" />
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
      <div className="flex-1">
        <div className="h-16 border-b" />
        <div className="mx-auto max-w-7xl space-y-6 p-6">
          <Skeleton className="h-9 w-56" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const status = useAgendaStore((s) => s.status);
  const isAuthenticated = useAgendaStore((s) => s.isAuthenticated);
  const init = useAgendaStore((s) => s.init);
  const refresh = useAgendaStore((s) => s.refresh);

  const isPublicPage = PUBLIC_ADMIN_PATHS.includes(pathname);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (status === "ready" && !isPublicPage && !isAuthenticated) {
      router.replace("/admin/login");
    }
  }, [status, isAuthenticated, isPublicPage, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const id = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(id);
  }, [isAuthenticated, refresh]);

  if (isPublicPage) return <>{children}</>;
  if (status !== "ready" || !isAuthenticated) return <LoadingShell />;

  return <AdminShell>{children}</AdminShell>;
}
