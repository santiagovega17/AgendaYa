import { createClient } from "@supabase/supabase-js";

/** Datos comunes del entorno de test (mismos que los casos de prueba del TP5). */
export const ENTORNO = {
  nombre: "Dra. Laura Pérez",
  slug: "laura-perez",
  evento: "Consulta general",
  duracionMin: 30,
  horario: { dias: [1, 2, 3, 4, 5], inicio: "09:00", fin: "18:00" },
  config: { intervalo_min: 0, antelacion_min_horas: 0, antelacion_max_dias: 30, limite_reservas_dia: 8 },
};

export type ReservaSemilla = {
  fecha: string;
  hora: string;
  nombre: string;
  apellido: string;
  estado?: "pendiente" | "confirmada";
};

export type Escenario = {
  /** false: la agenda queda sin horario laboral (por defecto se carga Lun a Vie de 09:00 a 18:00). */
  conHorario?: boolean;
  reservas?: ReservaSemilla[];
  diasBloqueados?: { fecha: string; motivo?: string }[];
  limiteReservasDia?: number;
  antelacionMinHoras?: number;
};

export type AgendaPreparada = { slug: string; adminId: string; eventoId: string };

const sumarMinutos = (hora: string, min: number) => {
  const [h, m] = hora.split(":").map(Number);
  const total = h * 60 + m + min;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

function check<T>(res: { data: T | null; error: { message: string } | null }, paso: string): T {
  if (res.error) throw new Error(`prepararAgenda (${paso}): ${res.error.message}`);
  return res.data as T;
}

/**
 * Deja la agenda del administrador de test en un estado conocido: borra reservas, horarios y
 * días bloqueados, y vuelve a cargar los datos del escenario. Usa la sesión del propio
 * administrador, así que solo puede tocar sus datos (RLS).
 */
export async function prepararAgenda(escenario: Escenario = {}): Promise<AgendaPreparada> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (!url || !key || !email || !password) {
    throw new Error(
      "Faltan variables en .env.local: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD (ver README)."
    );
  }

  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth, error: authError } = await db.auth.signInWithPassword({ email, password });
  if (authError) throw new Error(`prepararAgenda (login del admin de test): ${authError.message}`);
  const adminId = auth.user.id;

  try {
    check(await db.from("reservas").delete().eq("admin_id", adminId), "borrar reservas");
    check(await db.from("dias_bloqueados").delete().eq("admin_id", adminId), "borrar días bloqueados");
    check(await db.from("horarios_semanales").delete().eq("admin_id", adminId), "borrar horarios");
    check(await db.from("tipos_evento").delete().eq("admin_id", adminId), "borrar tipos de evento");

    check(
      await db.from("perfiles").update({ nombre: ENTORNO.nombre, slug: ENTORNO.slug }).eq("id", adminId),
      "actualizar perfil"
    );
    check(
      await db
        .from("configuracion_reservas")
        .update({
          ...ENTORNO.config,
          limite_reservas_dia: escenario.limiteReservasDia ?? ENTORNO.config.limite_reservas_dia,
          antelacion_min_horas: escenario.antelacionMinHoras ?? ENTORNO.config.antelacion_min_horas,
        })
        .eq("admin_id", adminId),
      "actualizar configuración"
    );

    const evento = check<{ id: string }>(
      await db
        .from("tipos_evento")
        .insert({
          admin_id: adminId,
          nombre: ENTORNO.evento,
          duracion_min: ENTORNO.duracionMin,
          modalidad: "presencial",
          confirmacion_auto: true,
          activo: true,
        })
        .select("id")
        .single(),
      "crear tipo de evento"
    );

    if (escenario.conHorario !== false) {
      const horarios = check<{ id: string }[]>(
        await db
          .from("horarios_semanales")
          .insert(
            ENTORNO.horario.dias.map((dia) => ({
              admin_id: adminId,
              dia_semana: dia,
              tipo: "permanente" as const,
              fecha_inicio: "2026-01-01",
            }))
          )
          .select("id"),
        "crear horarios"
      );
      check(
        await db.from("franjas_horarias").insert(
          horarios.map((h) => ({
            horario_id: h.id,
            hora_inicio: ENTORNO.horario.inicio,
            hora_fin: ENTORNO.horario.fin,
          }))
        ),
        "crear franjas"
      );
    }

    if (escenario.reservas?.length) {
      check(
        await db.from("reservas").insert(
          escenario.reservas.map((r) => ({
            admin_id: adminId,
            tipo_evento_id: evento.id,
            fecha: r.fecha,
            hora_inicio: r.hora,
            hora_fin: sumarMinutos(r.hora, ENTORNO.duracionMin),
            invitado_nombre: r.nombre,
            invitado_apellido: r.apellido,
            invitado_email: `${r.nombre}.${r.apellido}@test.com`.toLowerCase(),
            invitado_telefono: "2615551234",
            estado: r.estado ?? "confirmada",
          }))
        ),
        "crear reservas"
      );
    }

    if (escenario.diasBloqueados?.length) {
      check(
        await db
          .from("dias_bloqueados")
          .insert(escenario.diasBloqueados.map((d) => ({ admin_id: adminId, fecha: d.fecha, motivo: d.motivo ?? null }))),
        "crear días bloqueados"
      );
    }

    return { slug: ENTORNO.slug, adminId, eventoId: evento.id };
  } finally {
    // "global" (el valor por defecto) revocaría también la sesión que cy.session guarda para el navegador.
    await db.auth.signOut({ scope: "local" });
  }
}
