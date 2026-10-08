import { ChevronRight, Clock, MapPin, ShieldCheck, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MODALIDAD_LABEL } from "@/lib/format";
import type { EventType } from "@/lib/types";

const ModalityIcon = ({ modalidad }: { modalidad: EventType["modalidad"] }) =>
  modalidad === "virtual" ? (
    <Video className="size-4" aria-hidden="true" />
  ) : (
    <MapPin className="size-4" aria-hidden="true" />
  );

export function EventStep({ events, onSelect }: { events: EventType[]; onSelect: (id: string) => void }) {
  return (
    <section aria-labelledby="paso-evento" className="space-y-3">
      <h2 id="paso-evento" className="text-lg font-semibold">
        ¿Qué tipo de turno necesitás?
      </h2>
      <ul className="space-y-3" data-cy="event-list">
        {events.map((evt) => (
          <li key={evt.id}>
            <button
              type="button"
              onClick={() => onSelect(evt.id)}
              data-cy="event-option"
              data-nombre={evt.nombre}
              className="group flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left shadow-soft transition-[border-color,box-shadow] duration-200 hover:border-primary/50 hover:shadow-soft-lg focus-visible:border-primary"
            >
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold">{evt.nombre}</p>
                {evt.descripcion && <p className="mt-0.5 text-muted-foreground">{evt.descripcion}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="size-4" aria-hidden="true" />
                    {evt.duracionMin} min
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <ModalityIcon modalidad={evt.modalidad} />
                    {MODALIDAD_LABEL[evt.modalidad]}
                  </span>
                  {!evt.confirmacionAuto && (
                    <Badge variant="warning" className="px-2 py-0.5 text-xs">
                      <ShieldCheck aria-hidden="true" />
                      Requiere aprobación
                    </Badge>
                  )}
                </div>
              </div>
              <ChevronRight
                className="size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                aria-hidden="true"
              />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
