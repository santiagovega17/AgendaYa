import { format, formatDistanceToNow, isToday, isTomorrow, parse } from "date-fns";
import { es } from "date-fns/locale";
import type { Modality } from "@/lib/types";

export const parseFecha = (fecha: string) => parse(fecha, "yyyy-MM-dd", new Date());

export const toFechaStr = (date: Date) => format(date, "yyyy-MM-dd");

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Lunes 6 de octubre" */
export const formatFechaLarga = (fecha: string) =>
  capitalize(format(parseFecha(fecha), "EEEE d 'de' MMMM", { locale: es }));

/** "Lun 6 oct" */
export const formatFechaCompacta = (fecha: string) =>
  capitalize(format(parseFecha(fecha), "EEE d MMM", { locale: es }).replace(/\./g, ""));

/** "6 oct 2026" */
export const formatFechaCorta = (fecha: string) =>
  format(parseFecha(fecha), "d MMM yyyy", { locale: es }).replace(/\./g, "");

/** "Hoy", "Mañana" o la fecha larga. */
export function formatFechaRelativa(fecha: string) {
  const d = parseFecha(fecha);
  if (isToday(d)) return "Hoy";
  if (isTomorrow(d)) return "Mañana";
  return formatFechaLarga(fecha);
}

export const formatHace = (iso: string) =>
  formatDistanceToNow(new Date(iso), { addSuffix: true, locale: es });

export const formatMes = (date: Date) => capitalize(format(date, "MMMM yyyy", { locale: es }));

export const MODALIDAD_LABEL: Record<Modality, string> = {
  presencial: "Presencial",
  virtual: "Virtual",
  ambas: "Presencial o virtual",
};

export const DIAS_SEMANA = [
  { value: 1, label: "Lunes", corto: "Lun" },
  { value: 2, label: "Martes", corto: "Mar" },
  { value: 3, label: "Miércoles", corto: "Mié" },
  { value: 4, label: "Jueves", corto: "Jue" },
  { value: 5, label: "Viernes", corto: "Vie" },
  { value: 6, label: "Sábado", corto: "Sáb" },
  { value: 0, label: "Domingo", corto: "Dom" },
];

export const diaLabel = (dia: number) => DIAS_SEMANA.find((d) => d.value === dia)?.label ?? "";

export function iniciales(nombre: string) {
  return nombre
    .replace(/^(dr|dra|lic|ing)\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
