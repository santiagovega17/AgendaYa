import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { iniciales } from "@/lib/format";
import type { AdminProfile } from "@/lib/types";

export function BookingHeader({ profile }: { profile: AdminProfile }) {
  return (
    <header className="flex flex-col items-center text-center">
      <Avatar className="size-20 border-4 border-card shadow-soft">
        {profile.foto && <AvatarImage src={profile.foto} alt="" />}
        <AvatarFallback className="bg-secondary text-xl font-semibold text-secondary-foreground">
          {iniciales(profile.nombre)}
        </AvatarFallback>
      </Avatar>
      <h1 className="mt-3 text-xl font-semibold tracking-tight text-balance">{profile.nombre}</h1>
      <p className="text-muted-foreground">Reservá tu turno en pocos pasos</p>
    </header>
  );
}
