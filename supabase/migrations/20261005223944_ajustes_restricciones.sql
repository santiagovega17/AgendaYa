alter table public.franjas_horarias
  drop constraint franjas_horarias_horario_id_rango_horario_excl,
  add constraint franjas_horarias_sin_superposicion exclude using gist (
    horario_id with =,
    tsrange(date '2000-01-01' + hora_inicio, date '2000-01-01' + hora_fin) with &&
  );

drop type public.rango_horario;

-- NO ACTION (en vez de RESTRICT) permite borrar la cuenta del admin: la verificación
-- ocurre al final de la sentencia, cuando el cascade ya eliminó sus reservas.
alter table public.reservas
  drop constraint reservas_tipo_evento_id_admin_id_fkey,
  add constraint reservas_tipo_evento_id_admin_id_fkey
    foreign key (tipo_evento_id, admin_id) references public.tipos_evento (id, admin_id);
