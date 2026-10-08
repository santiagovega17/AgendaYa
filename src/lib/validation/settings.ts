import { z } from "zod";

export const INTERVALOS = [0, 5, 10, 15, 30, 45, 60];
export const LIMITE_FORMATO = "El límite debe ser un número entero mayor a cero";
export const LIMITE_CONFLICTO = "El nuevo límite es inferior a la cantidad de reservas ya existentes para el día";

export const settingsSchema = z.object({
  intervaloMin: z.number(),
  antelacionMinHoras: z
    .number({ error: "Ingresá un número de horas." })
    .int("Usá horas enteras.")
    .min(0, "No puede ser negativa."),
  antelacionMaxDias: z
    .number({ error: "Ingresá un número de días." })
    .int("Usá días enteros.")
    .min(1, "Tiene que ser al menos 1 día."),
  limiteReservasDia: z.number({ error: LIMITE_FORMATO }).int(LIMITE_FORMATO).min(1, LIMITE_FORMATO),
});

export type SettingsFormValues = z.infer<typeof settingsSchema>;
