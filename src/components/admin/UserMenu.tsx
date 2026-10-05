"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, LogOut, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { iniciales } from "@/lib/format";
import { useAgendaStore } from "@/store/useAgendaStore";

export function UserMenu() {
  const router = useRouter();
  const profile = useAgendaStore((s) => s.profile);
  const logout = useAgendaStore((s) => s.logout);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 gap-2 px-1.5" aria-label="Menú de usuario">
          <Avatar className="size-8">
            {profile.foto && <AvatarImage src={profile.foto} alt="" />}
            <AvatarFallback className="bg-secondary text-xs font-semibold text-secondary-foreground">
              {iniciales(profile.nombre)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-40 truncate text-sm font-medium md:inline">{profile.nombre}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate font-medium">{profile.nombre}</p>
          <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/admin/perfil">
            <UserRound aria-hidden="true" /> Mi perfil
          </Link>
        </DropdownMenuItem>
        {profile.slug && (
          <DropdownMenuItem asChild>
            <a href={`/agenda/${profile.slug}`} target="_blank" rel="noreferrer">
              <ExternalLink aria-hidden="true" /> Ver mi enlace público
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async () => {
            await logout();
            router.push("/admin/login");
          }}
        >
          <LogOut aria-hidden="true" /> Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
