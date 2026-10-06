import { z } from "zod";

export const FIN_ANTES_DE_INICIO = "El fin debe ser posterior al inicio.";
export const FRANJA_SUPERPUESTA = "Se superpone con otra franja.";

export const scheduleSchema = z.object({
  dias: z.array(z.number()).min(1, "Elegí al menos un día."),
  franjas: z
    .array(z.object({ inicio: z.string().min(1, "Completá la hora."), fin: z.string().min(1, "Completá la hora.") }))
    .min(1)
    .superRefine((franjas, ctx) => {
      franjas.forEach((f, i) => {
        if (f.inicio && f.fin && f.fin <= f.inicio) {
          ctx.addIssue({ code: "custom", path: [i, "fin"], message: FIN_ANTES_DE_INICIO });
        }
      });
      const sorted = franjas.map((f, i) => ({ ...f, i })).sort((a, b) => a.inicio.localeCompare(b.inicio));
      for (let k = 1; k < sorted.length; k++) {
        if (sorted[k].inicio < sorted[k - 1].fin) {
          ctx.addIssue({
            code: "custom",
            path: [sorted[k].i, "inicio"],
            message: FRANJA_SUPERPUESTA,
          });
        }
      }
    }),
});

export type ScheduleFormValues = z.infer<typeof scheduleSchema>;
