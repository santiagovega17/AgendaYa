"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AdminNav, BrandMark } from "@/components/admin/AdminNav";
import { CommandMenu } from "@/components/admin/CommandMenu";
import { NotificationsPopover } from "@/components/admin/NotificationsPopover";
import { UserMenu } from "@/components/admin/UserMenu";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-dvh">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Saltar al contenido
      </a>

      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-card px-3 py-5 lg:flex">
        <BrandMark className="mb-8 px-3" />
        <AdminNav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/75 sm:px-6">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menú">
                <Menu className="size-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 px-3 py-5">
              <SheetHeader className="p-0">
                <SheetTitle asChild>
                  <div>
                    <BrandMark className="px-3" />
                  </div>
                </SheetTitle>
                <SheetDescription className="sr-only">Navegación del panel</SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <AdminNav onNavigate={() => setMenuOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
          <BrandMark className="lg:hidden [&>span:last-child]:hidden min-[420px]:[&>span:last-child]:inline" />

          <div className="ml-auto flex items-center gap-1">
            <CommandMenu />
            <ThemeToggle />
            <NotificationsPopover />
            <UserMenu />
          </div>
        </header>

        <main id="contenido" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
