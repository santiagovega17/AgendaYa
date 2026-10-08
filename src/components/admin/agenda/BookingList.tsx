"use client";

import { Check, ChevronRight, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatFechaCompacta } from "@/lib/format";
import { cn } from "@/lib/utils/cn";
import type { Booking, EventType } from "@/lib/types";

export function BookingList({
  bookings,
  eventTypes,
  onOpen,
  onApprove,
  emptyText = "No hay reservas que coincidan con los filtros.",
  cardsOnly = false,
}: {
  bookings: Booking[];
  eventTypes: EventType[];
  onOpen: (id: string) => void;
  onApprove: (id: string) => void;
  emptyText?: string;
  cardsOnly?: boolean;
}) {
  const evento = (id: string) => eventTypes.find((e) => e.id === id)?.nombre ?? "—";

  if (bookings.length === 0) {
    return <EmptyState icon={Inbox} title="Sin reservas" description={emptyText} />;
  }

  return (
    <>
      <ul className={cn("space-y-2", !cardsOnly && "md:hidden")}>
        {bookings.map((b) => (
          <li key={b.id} className="rounded-lg border bg-card">
            <button
              type="button"
              onClick={() => onOpen(b.id)}
              className="flex w-full items-center gap-3 p-3 text-left"
              aria-label={`Ver reserva de ${b.invitado.nombre} ${b.invitado.apellido}`}
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">
                    {b.invitado.nombre} {b.invitado.apellido}
                  </span>
                  <StatusBadge status={b.estado} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatFechaCompacta(b.fecha)} · <span className="tabular-nums">{b.horaInicio}</span> ·{" "}
                  {evento(b.eventTypeId)}
                </p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </button>
            {b.estado === "pendiente" && (
              <div className="border-t px-3 py-2">
                <Button size="sm" className="w-full" onClick={() => onApprove(b.id)}>
                  <Check aria-hidden="true" />
                  Aprobar
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {!cardsOnly && (
        <div className="hidden overflow-hidden rounded-lg border md:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>Fecha</TableHead>
                <TableHead>Hora</TableHead>
                <TableHead>Invitado</TableHead>
                <TableHead className="hidden lg:table-cell">Evento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="hidden xl:table-cell">Nº</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((b) => (
                <TableRow key={b.id} className="cursor-pointer" onClick={() => onOpen(b.id)}>
                  <TableCell className="font-medium">{formatFechaCompacta(b.fecha)}</TableCell>
                  <TableCell className="tabular-nums">{b.horaInicio}</TableCell>
                  <TableCell>
                    <span className="block max-w-48 truncate">
                      {b.invitado.nombre} {b.invitado.apellido}
                    </span>
                    <span className="block max-w-48 truncate text-sm text-muted-foreground">{b.invitado.email}</span>
                  </TableCell>
                  <TableCell className="hidden max-w-40 truncate lg:table-cell">{evento(b.eventTypeId)}</TableCell>
                  <TableCell>
                    <StatusBadge status={b.estado} />
                  </TableCell>
                  <TableCell className="hidden font-mono text-sm text-muted-foreground xl:table-cell">
                    {b.numeroReserva}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      {b.estado === "pendiente" && (
                        <Button size="sm" onClick={() => onApprove(b.id)}>
                          <Check aria-hidden="true" />
                          Aprobar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onOpen(b.id)}
                        aria-label={`Ver detalle de ${b.invitado.nombre} ${b.invitado.apellido}`}
                      >
                        Ver
                        <ChevronRight aria-hidden="true" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
