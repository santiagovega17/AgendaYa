import { describe, expect, it } from "vitest";
import { errorMessage, isSlotUnavailable } from "@/lib/supabase/errors";

describe("confirmación del horario", () => {
  it("al confirmar, avisa si el horario se ocupó y no trata un error de datos como horario no disponible", () => {
    const ocupado = { message: "TURNO_NO_DISPONIBLE" };
    expect(isSlotUnavailable(ocupado)).toBe(true);
    expect(errorMessage(ocupado)).toBe("Este horario ya fue reservado. Por favor elegí otro.");

    const sinCupo = { message: "LIMITE_DIARIO_ALCANZADO" };
    expect(isSlotUnavailable(sinCupo)).toBe(true);
    expect(errorMessage(sinCupo)).toBe("No quedan cupos para esta actividad en el día.");

    const datosInvalidos = { code: "23514" };
    expect(isSlotUnavailable(datosInvalidos)).toBe(false);
    expect(errorMessage(datosInvalidos)).toBe("Alguno de los datos ingresados no es válido.");
  });
});
