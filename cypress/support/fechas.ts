import { addDays, format, isWeekend } from "date-fns";

export const fechaStr = (d: Date) => format(d, "yyyy-MM-dd");

/**
 * Primer día hábil (lunes a viernes) a partir de hoy + `desde` días. Los tests usan fechas
 * relativas para seguir funcionando cuando pasen las fechas fijas de los casos del TP5.
 * La antelación máxima del entorno es 30 días: usar valores de `desde` menores a 25.
 */
export function diaHabil(desde = 7, hoy = new Date()) {
  let d = addDays(hoy, desde);
  while (isWeekend(d)) d = addDays(d, 1);
  return fechaStr(d);
}
