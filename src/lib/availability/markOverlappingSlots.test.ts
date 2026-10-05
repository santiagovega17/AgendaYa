import { describe, expect, it } from "vitest";
import type { Slot } from "@/lib/types";
import { markOverlappingSlots } from "./generateSlots";

const slot = (horaInicio: string, horaFin: string, disponible = true): Slot => ({
  id: `2026-06-17_${horaInicio}_evt-1`,
  fecha: "2026-06-17",
  horaInicio,
  horaFin,
  disponible,
});

describe("markOverlappingSlots", () => {
  it("bloquea slots que se superponen con una reserva de otro tipo de evento", () => {
    const result = markOverlappingSlots(
      [slot("09:00", "09:30"), slot("09:40", "10:10"), slot("10:20", "10:50")],
      [{ fecha: "2026-06-17", horaInicio: "09:55", horaFin: "10:40", propio: false }]
    );

    expect(result.map((s) => s.disponible)).toEqual([true, false, false]);
  });

  it("no bloquea slots contiguos (el fin de uno coincide con el inicio del otro)", () => {
    const result = markOverlappingSlots(
      [slot("09:00", "09:30"), slot("09:30", "10:00")],
      [{ fecha: "2026-06-17", horaInicio: "10:00", horaFin: "10:45", propio: false }]
    );

    expect(result.every((s) => s.disponible)).toBe(true);
  });

  it("ignora el bloqueo temporal de la propia sesión y los rangos de otras fechas", () => {
    const result = markOverlappingSlots(
      [slot("09:00", "09:30")],
      [
        { fecha: "2026-06-17", horaInicio: "09:00", horaFin: "09:30", propio: true },
        { fecha: "2026-06-18", horaInicio: "09:00", horaFin: "09:30", propio: false },
      ]
    );

    expect(result[0].disponible).toBe(true);
  });

  it("no modifica slots que ya estaban no disponibles", () => {
    const original = slot("09:00", "09:30", false);
    const [result] = markOverlappingSlots([original], []);

    expect(result).toBe(original);
  });
});
