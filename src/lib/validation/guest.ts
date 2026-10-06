import { z } from "zod";

export const NOTA_MAX = 200;

export const guestSchema = z.object({
  nombre: z.string().trim().min(1, "Ingresá tu nombre"),
  apellido: z.string().trim().min(1, "Ingresá tu apellido"),
  email: z.string().trim().email("Ingresá un email válido, por ejemplo nombre@correo.com"),
  telefono: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{6,20}$/, "Ingresá un teléfono válido (solo números)"),
  nota: z.string().max(NOTA_MAX, `La nota admite hasta ${NOTA_MAX} caracteres`).optional(),
});

export type GuestFormValues = z.infer<typeof guestSchema>;
