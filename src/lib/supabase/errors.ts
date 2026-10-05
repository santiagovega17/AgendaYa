interface DbError {
  code?: string;
  message?: string;
}

const MENSAJES_RPC: Record<string, string> = {
  TURNO_NO_DISPONIBLE: "Este horario ya fue reservado. Por favor elegí otro.",
  FUERA_DE_HORARIO: "Este horario ya no se encuentra disponible. Por favor seleccioná otro turno",
  FUERA_DE_ANTELACION: "Este horario ya no se encuentra disponible. Por favor seleccioná otro turno",
  DIA_BLOQUEADO: "Este horario ya no se encuentra disponible. Por favor seleccioná otro turno",
  LIMITE_DIARIO_ALCANZADO: "No quedan cupos para esta actividad en el día.",
  EVENTO_NO_DISPONIBLE: "Este tipo de evento ya no está disponible.",
};

export const ERROR_GENERICO = "Error al procesar la solicitud. Por favor, intente nuevamente.";

export function isSlotUnavailable(error: DbError | null): boolean {
  return !!error?.message && error.message in MENSAJES_RPC;
}

export function errorMessage(error: DbError | null, fallback = ERROR_GENERICO): string {
  if (!error) return fallback;
  if (error.message && MENSAJES_RPC[error.message]) return MENSAJES_RPC[error.message];
  switch (error.code) {
    case "23P01":
      return "El horario se superpone con otra reserva.";
    case "23514":
      return "Alguno de los datos ingresados no es válido.";
    default:
      return fallback;
  }
}
