-- =============================================================================
-- AgendaYA - Esquema inicial
-- =============================================================================

create extension if not exists btree_gist with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------

create type public.estado_reserva as enum ('pendiente', 'confirmada', 'completada', 'cancelada');
create type public.tipo_horario as enum ('unica_vez', 'permanente');
create type public.modalidad as enum ('presencial', 'virtual', 'ambas');
create type public.tipo_notificacion as enum (
  'reserva_confirmada',
  'reserva_pendiente',
  'reserva_cancelada',
  'reserva_reagendada',
  'recordatorio',
  'bloqueo_dia'
);
create type public.canal_notificacion as enum ('email', 'interno');
create type public.rango_horario as range (subtype = time);

-- -----------------------------------------------------------------------------
-- M01 - Perfil de administrador
-- -----------------------------------------------------------------------------

create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 100),
  email text not null,
  foto_url text,
  zona_horaria text not null default 'America/Argentina/Buenos_Aires',
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- M02 - Disponibilidad
-- -----------------------------------------------------------------------------

create table public.configuracion_reservas (
  admin_id uuid primary key references public.perfiles (id) on delete cascade,
  intervalo_min integer not null default 10 check (intervalo_min in (0, 5, 10, 15, 30, 45, 60)),
  antelacion_min_horas integer not null default 2 check (antelacion_min_horas >= 0),
  antelacion_max_dias integer not null default 30 check (antelacion_max_dias > 0),
  limite_reservas_dia integer not null default 8 check (limite_reservas_dia > 0),
  updated_at timestamptz not null default now()
);

-- Para 'permanente', fecha_inicio es desde cuándo rige; para 'unica_vez', es el día exacto.
create table public.horarios_semanales (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.perfiles (id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 0 and 6),
  tipo public.tipo_horario not null default 'permanente',
  fecha_inicio date not null default current_date,
  created_at timestamptz not null default now(),
  unique (admin_id, dia_semana, tipo, fecha_inicio),
  check (tipo = 'permanente' or extract(dow from fecha_inicio) = dia_semana)
);

create index horarios_semanales_admin_idx on public.horarios_semanales (admin_id);

create table public.franjas_horarias (
  id uuid primary key default gen_random_uuid(),
  horario_id uuid not null references public.horarios_semanales (id) on delete cascade,
  hora_inicio time not null,
  hora_fin time not null,
  check (hora_fin > hora_inicio),
  exclude using gist (
    horario_id with =,
    public.rango_horario(hora_inicio, hora_fin) with &&
  )
);

create index franjas_horarias_horario_idx on public.franjas_horarias (horario_id);

create table public.dias_bloqueados (
  admin_id uuid not null references public.perfiles (id) on delete cascade,
  fecha date not null,
  motivo text check (char_length(motivo) <= 200),
  created_at timestamptz not null default now(),
  primary key (admin_id, fecha)
);

-- -----------------------------------------------------------------------------
-- M03 - Tipos de evento
-- -----------------------------------------------------------------------------

create table public.tipos_evento (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.perfiles (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 100),
  duracion_min integer not null check (duracion_min between 5 and 480),
  modalidad public.modalidad not null default 'presencial',
  confirmacion_auto boolean not null default true,
  descripcion text not null default '' check (char_length(descripcion) <= 500),
  activo boolean not null default true,
  -- null = usa configuracion_reservas.limite_reservas_dia
  limite_reservas_dia integer check (limite_reservas_dia > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, admin_id)
);

create index tipos_evento_admin_idx on public.tipos_evento (admin_id);

-- -----------------------------------------------------------------------------
-- M04 / M05 - Reservas
-- -----------------------------------------------------------------------------

create sequence public.reservas_numero_seq start 1001;

create table public.reservas (
  id uuid primary key default gen_random_uuid(),
  numero_reserva text not null unique default 'AYA-' || nextval('public.reservas_numero_seq'),
  admin_id uuid not null references public.perfiles (id) on delete cascade,
  tipo_evento_id uuid not null,
  fecha date not null,
  hora_inicio time not null,
  hora_fin time not null,
  invitado_nombre text not null check (char_length(invitado_nombre) between 1 and 100),
  invitado_apellido text not null check (char_length(invitado_apellido) between 1 and 100),
  invitado_email text not null check (invitado_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  invitado_telefono text not null check (invitado_telefono ~ '^\+?[0-9 ()-]{6,20}$'),
  invitado_nota text check (char_length(invitado_nota) <= 200),
  estado public.estado_reserva not null default 'pendiente',
  cancelada_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (hora_fin > hora_inicio),
  foreign key (tipo_evento_id, admin_id)
    references public.tipos_evento (id, admin_id) on delete restrict,
  -- Un mismo administrador no puede tener dos reservas activas superpuestas.
  exclude using gist (
    admin_id with =,
    tsrange(fecha + hora_inicio, fecha + hora_fin) with &&
  ) where (estado in ('pendiente', 'confirmada'))
);

create index reservas_admin_fecha_idx on public.reservas (admin_id, fecha);
create index reservas_tipo_evento_idx on public.reservas (tipo_evento_id, admin_id);

-- Bloqueo temporal de un turno mientras el invitado completa el formulario (AYA-M04-RF05).
-- Sin políticas RLS: solo se accede mediante las funciones RPC.
create table public.bloqueos_turno (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null,
  tipo_evento_id uuid not null,
  fecha date not null,
  hora_inicio time not null,
  hora_fin time not null,
  session_id text not null check (char_length(session_id) between 8 and 100),
  expira_at timestamptz not null default now() + interval '15 minutes',
  created_at timestamptz not null default now(),
  check (hora_fin > hora_inicio),
  foreign key (tipo_evento_id, admin_id)
    references public.tipos_evento (id, admin_id) on delete cascade,
  exclude using gist (
    admin_id with =,
    tsrange(fecha + hora_inicio, fecha + hora_fin) with &&
  )
);

create index bloqueos_turno_session_idx on public.bloqueos_turno (session_id);
create index bloqueos_turno_tipo_evento_idx on public.bloqueos_turno (tipo_evento_id, admin_id);

-- -----------------------------------------------------------------------------
-- M06 - Notificaciones
-- -----------------------------------------------------------------------------

-- Funciona también como bandeja de salida: los emails con enviada_at null están pendientes de envío.
create table public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.perfiles (id) on delete cascade,
  reserva_id uuid references public.reservas (id) on delete set null,
  tipo public.tipo_notificacion not null,
  canal public.canal_notificacion not null,
  destinatario text not null,
  asunto text,
  mensaje text not null,
  leida boolean not null default false,
  enviada_at timestamptz,
  created_at timestamptz not null default now()
);

create index notificaciones_admin_idx on public.notificaciones (admin_id, created_at desc);
create index notificaciones_reserva_idx on public.notificaciones (reserva_id);
create index notificaciones_pendientes_idx on public.notificaciones (created_at)
  where canal = 'email' and enviada_at is null;

-- Placeholders: {{nombre}}, {{numero_reserva}}, {{evento}}, {{fecha}}, {{hora}}
create table public.plantillas_notificacion (
  admin_id uuid not null references public.perfiles (id) on delete cascade,
  tipo public.tipo_notificacion not null,
  asunto text not null check (char_length(asunto) between 1 and 150),
  cuerpo text not null check (char_length(cuerpo) between 1 and 2000),
  updated_at timestamptz not null default now(),
  primary key (admin_id, tipo)
);

-- =============================================================================
-- Funciones internas
-- =============================================================================

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger perfiles_updated_at before update on public.perfiles
  for each row execute function private.set_updated_at();
create trigger configuracion_reservas_updated_at before update on public.configuracion_reservas
  for each row execute function private.set_updated_at();
create trigger tipos_evento_updated_at before update on public.tipos_evento
  for each row execute function private.set_updated_at();
create trigger reservas_updated_at before update on public.reservas
  for each row execute function private.set_updated_at();
create trigger plantillas_notificacion_updated_at before update on public.plantillas_notificacion
  for each row execute function private.set_updated_at();

create function private.plantillas_por_defecto()
returns table (tipo public.tipo_notificacion, asunto text, cuerpo text)
language sql
immutable
set search_path = ''
as $$
  values
    ('reserva_confirmada'::public.tipo_notificacion,
     'Reserva {{numero_reserva}} confirmada',
     'Hola {{nombre}}, tu reserva de {{evento}} para el {{fecha}} a las {{hora}} está confirmada.'),
    ('reserva_pendiente',
     'Reserva {{numero_reserva}} recibida',
     'Hola {{nombre}}, recibimos tu solicitud de {{evento}} para el {{fecha}} a las {{hora}}. Te avisaremos cuando sea aprobada.'),
    ('reserva_cancelada',
     'Reserva {{numero_reserva}} cancelada',
     'Hola {{nombre}}, tu reserva de {{evento}} del {{fecha}} a las {{hora}} fue cancelada.'),
    ('reserva_reagendada',
     'Reserva {{numero_reserva}} reagendada',
     'Hola {{nombre}}, tu reserva de {{evento}} fue reprogramada para el {{fecha}} a las {{hora}}.'),
    ('recordatorio',
     'Recordatorio: {{evento}} mañana',
     'Hola {{nombre}}, te recordamos tu reserva de {{evento}} el {{fecha}} a las {{hora}}.'),
    ('bloqueo_dia',
     'Reserva {{numero_reserva}} cancelada por bloqueo de agenda',
     'Hola {{nombre}}, tu reserva del {{fecha}} a las {{hora}} fue cancelada porque el profesional bloqueó su agenda ese día.')
$$;

-- Crea perfil, configuración y plantillas al registrarse un administrador.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_base text;
begin
  v_base := trim(both '-' from regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9]+', '-', 'g'));
  if char_length(v_base) < 3 then
    v_base := 'agenda';
  end if;

  insert into public.perfiles (id, nombre, email, slug)
  values (
    new.id,
    left(coalesce(nullif(new.raw_user_meta_data ->> 'nombre', ''), split_part(new.email, '@', 1)), 100),
    new.email,
    left(v_base, 43) || '-' || substr(md5(random()::text), 1, 6)
  );

  insert into public.configuracion_reservas (admin_id) values (new.id);

  insert into public.plantillas_notificacion (admin_id, tipo, asunto, cuerpo)
  select new.id, d.tipo, d.asunto, d.cuerpo from private.plantillas_por_defecto() d;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create function private.renderizar_plantilla(p_texto text, p_reserva public.reservas, p_evento text)
returns text
language sql
stable
set search_path = ''
as $$
  select replace(replace(replace(replace(replace(p_texto,
    '{{nombre}}', p_reserva.invitado_nombre),
    '{{numero_reserva}}', p_reserva.numero_reserva),
    '{{evento}}', coalesce(p_evento, '')),
    '{{fecha}}', to_char(p_reserva.fecha, 'DD/MM/YYYY')),
    '{{hora}}', to_char(p_reserva.hora_inicio, 'HH24:MI'));
$$;

create function private.notificar_invitado(p_reserva public.reservas, p_tipo public.tipo_notificacion)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_evento text;
  v_asunto text;
  v_cuerpo text;
begin
  select te.nombre into v_evento from public.tipos_evento te where te.id = p_reserva.tipo_evento_id;

  select coalesce(pl.asunto, d.asunto), coalesce(pl.cuerpo, d.cuerpo)
    into v_asunto, v_cuerpo
  from private.plantillas_por_defecto() d
  left join public.plantillas_notificacion pl
    on pl.admin_id = p_reserva.admin_id and pl.tipo = d.tipo
  where d.tipo = p_tipo;

  insert into public.notificaciones (admin_id, reserva_id, tipo, canal, destinatario, asunto, mensaje)
  values (
    p_reserva.admin_id,
    p_reserva.id,
    p_tipo,
    'email',
    p_reserva.invitado_email,
    private.renderizar_plantilla(v_asunto, p_reserva, v_evento),
    private.renderizar_plantilla(v_cuerpo, p_reserva, v_evento)
  );
end;
$$;

create function private.notificar_admin(p_reserva public.reservas, p_tipo public.tipo_notificacion, p_mensaje text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notificaciones (admin_id, reserva_id, tipo, canal, destinatario, mensaje)
  select p_reserva.admin_id, p_reserva.id, p_tipo, 'interno', p.email, p_mensaje
  from public.perfiles p
  where p.id = p_reserva.admin_id;
end;
$$;

create function private.antes_de_actualizar_reserva()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.estado = 'cancelada' and old.estado <> 'cancelada' then
    new.cancelada_at := now();
  end if;
  return new;
end;
$$;

create trigger reservas_antes_de_actualizar before update on public.reservas
  for each row execute function private.antes_de_actualizar_reserva();

-- Toda alta, cancelación, aprobación o reagendado notifica a las partes correspondientes.
create function private.notificar_cambio_reserva()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tipo public.tipo_notificacion;
  v_cuando text := to_char(new.fecha, 'DD/MM/YYYY') || ' ' || to_char(new.hora_inicio, 'HH24:MI');
  v_invitado text := new.invitado_nombre || ' ' || new.invitado_apellido;
begin
  if tg_op = 'INSERT' then
    v_tipo := case when new.estado = 'confirmada'
      then 'reserva_confirmada'::public.tipo_notificacion
      else 'reserva_pendiente'::public.tipo_notificacion end;
    perform private.notificar_invitado(new, v_tipo);
    perform private.notificar_admin(new, v_tipo,
      format('Nueva reserva %s de %s para el %s.', new.numero_reserva, v_invitado, v_cuando));

  elsif new.estado = 'cancelada' and old.estado <> 'cancelada' then
    v_tipo := case when exists (
        select 1 from public.dias_bloqueados d where d.admin_id = new.admin_id and d.fecha = new.fecha
      )
      then 'bloqueo_dia'::public.tipo_notificacion
      else 'reserva_cancelada'::public.tipo_notificacion end;
    perform private.notificar_invitado(new, v_tipo);
    perform private.notificar_admin(new, v_tipo,
      format('Reserva %s de %s (%s) cancelada.', new.numero_reserva, v_invitado, v_cuando));

  elsif new.estado = 'confirmada' and old.estado = 'pendiente' then
    perform private.notificar_invitado(new, 'reserva_confirmada');

  elsif new.estado in ('pendiente', 'confirmada')
    and (new.fecha, new.hora_inicio) is distinct from (old.fecha, old.hora_inicio) then
    perform private.notificar_invitado(new, 'reserva_reagendada');
  end if;

  return null;
end;
$$;

create trigger reservas_notificar
  after insert or update on public.reservas
  for each row execute function private.notificar_cambio_reserva();

-- Valida que un turno respete disponibilidad, bloqueos, antelación y límite diario.
create function private.validar_turno(
  p_tipo_evento_id uuid,
  p_fecha date,
  p_hora_inicio time,
  out o_admin_id uuid,
  out o_hora_fin time,
  out o_confirmacion_auto boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_te public.tipos_evento;
  v_cfg public.configuracion_reservas;
  v_tz text;
  v_hora_fin time;
  v_paso integer;
  v_limite integer;
  v_ocupadas integer;
begin
  select * into v_te from public.tipos_evento te where te.id = p_tipo_evento_id and te.activo;
  if not found then
    raise exception 'EVENTO_NO_DISPONIBLE' using hint = 'El tipo de evento no existe o no está activo.';
  end if;

  select * into v_cfg from public.configuracion_reservas c where c.admin_id = v_te.admin_id;
  select p.zona_horaria into v_tz from public.perfiles p where p.id = v_te.admin_id;

  v_hora_fin := p_hora_inicio + make_interval(mins => v_te.duracion_min);
  if v_hora_fin <= p_hora_inicio then
    raise exception 'FUERA_DE_HORARIO' using hint = 'El turno excede el día.';
  end if;

  if (p_fecha + p_hora_inicio) at time zone v_tz
       < now() + make_interval(hours => v_cfg.antelacion_min_horas)
     or p_fecha > ((now() at time zone v_tz) + make_interval(days => v_cfg.antelacion_max_dias))::date then
    raise exception 'FUERA_DE_ANTELACION' using hint = 'El horario está fuera del rango de antelación permitido.';
  end if;

  if exists (select 1 from public.dias_bloqueados d where d.admin_id = v_te.admin_id and d.fecha = p_fecha) then
    raise exception 'DIA_BLOQUEADO' using hint = 'El día está bloqueado.';
  end if;

  v_paso := v_te.duracion_min + v_cfg.intervalo_min;
  if not exists (
    select 1
    from public.horarios_semanales h
    join public.franjas_horarias f on f.horario_id = h.id
    where h.admin_id = v_te.admin_id
      and h.dia_semana = extract(dow from p_fecha)
      and ((h.tipo = 'permanente' and h.fecha_inicio <= p_fecha)
           or (h.tipo = 'unica_vez' and h.fecha_inicio = p_fecha))
      and p_hora_inicio >= f.hora_inicio
      and v_hora_fin <= f.hora_fin
      and (extract(epoch from (p_hora_inicio - f.hora_inicio))::integer / 60) % v_paso = 0
  ) then
    raise exception 'FUERA_DE_HORARIO' using hint = 'El horario no corresponde a un turno disponible.';
  end if;

  v_limite := coalesce(v_te.limite_reservas_dia, v_cfg.limite_reservas_dia);
  select count(*) into v_ocupadas
  from public.reservas r
  where r.tipo_evento_id = v_te.id and r.fecha = p_fecha and r.estado in ('pendiente', 'confirmada');
  if v_ocupadas >= v_limite then
    raise exception 'LIMITE_DIARIO_ALCANZADO' using hint = 'No quedan cupos para esta actividad en el día.';
  end if;

  o_admin_id := v_te.admin_id;
  o_hora_fin := v_hora_fin;
  o_confirmacion_auto := v_te.confirmacion_auto;
end;
$$;

-- =============================================================================
-- RPC del flujo público (Usuario Invitado, sin cuenta)
-- =============================================================================

-- Horarios ocupados (reservas activas y bloqueos vigentes) sin datos personales.
create function private.turnos_ocupados(p_admin_id uuid, p_desde date, p_hasta date, p_session_id text default null)
returns table (
  tipo_evento_id uuid,
  fecha date,
  hora_inicio time,
  hora_fin time,
  origen text,
  expira_at timestamptz,
  es_propio boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.tipo_evento_id, r.fecha, r.hora_inicio, r.hora_fin, 'reserva', null::timestamptz, false
  from public.reservas r
  where r.admin_id = p_admin_id
    and r.fecha between p_desde and p_hasta
    and r.estado in ('pendiente', 'confirmada')
    and p_hasta - p_desde <= 62
  union all
  select b.tipo_evento_id, b.fecha, b.hora_inicio, b.hora_fin, 'bloqueo', b.expira_at,
         b.session_id = coalesce(p_session_id, '')
  from public.bloqueos_turno b
  where b.admin_id = p_admin_id
    and b.fecha between p_desde and p_hasta
    and b.expira_at > now()
    and p_hasta - p_desde <= 62;
$$;

-- Bloquea un turno por 15 minutos para la sesión; libera cualquier otro bloqueo de esa sesión.
create function private.bloquear_turno(
  p_tipo_evento_id uuid,
  p_fecha date,
  p_hora_inicio time,
  p_session_id text
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v record;
  v_expira timestamptz;
begin
  select * into v from private.validar_turno(p_tipo_evento_id, p_fecha, p_hora_inicio);

  delete from public.bloqueos_turno b
  where b.session_id = p_session_id
     or (b.admin_id = v.o_admin_id and b.expira_at <= now());

  if exists (
    select 1 from public.reservas r
    where r.admin_id = v.o_admin_id
      and r.estado in ('pendiente', 'confirmada')
      and tsrange(r.fecha + r.hora_inicio, r.fecha + r.hora_fin)
          && tsrange(p_fecha + p_hora_inicio, p_fecha + v.o_hora_fin)
  ) then
    raise exception 'TURNO_NO_DISPONIBLE' using hint = 'Este horario ya fue reservado. Por favor elegí otro.';
  end if;

  begin
    insert into public.bloqueos_turno (admin_id, tipo_evento_id, fecha, hora_inicio, hora_fin, session_id)
    values (v.o_admin_id, p_tipo_evento_id, p_fecha, p_hora_inicio, v.o_hora_fin, p_session_id)
    returning expira_at into v_expira;
  exception when exclusion_violation then
    raise exception 'TURNO_NO_DISPONIBLE' using hint = 'Otra persona está reservando este horario.';
  end;

  return v_expira;
end;
$$;

create function private.liberar_turnos(p_session_id text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.bloqueos_turno where session_id = p_session_id;
$$;

create function private.confirmar_reserva(
  p_tipo_evento_id uuid,
  p_fecha date,
  p_hora_inicio time,
  p_session_id text,
  p_nombre text,
  p_apellido text,
  p_email text,
  p_telefono text,
  p_nota text default null
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v record;
  r public.reservas;
begin
  -- Serializa las reservas concurrentes del mismo tipo de evento (límite diario).
  perform 1 from public.tipos_evento te where te.id = p_tipo_evento_id for update;

  select * into v from private.validar_turno(p_tipo_evento_id, p_fecha, p_hora_inicio);

  if exists (
    select 1 from public.bloqueos_turno b
    where b.admin_id = v.o_admin_id
      and b.expira_at > now()
      and b.session_id <> coalesce(p_session_id, '')
      and tsrange(b.fecha + b.hora_inicio, b.fecha + b.hora_fin)
          && tsrange(p_fecha + p_hora_inicio, p_fecha + v.o_hora_fin)
  ) then
    raise exception 'TURNO_NO_DISPONIBLE' using hint = 'Otra persona está reservando este horario.';
  end if;

  begin
    insert into public.reservas (
      admin_id, tipo_evento_id, fecha, hora_inicio, hora_fin,
      invitado_nombre, invitado_apellido, invitado_email, invitado_telefono, invitado_nota, estado
    )
    values (
      v.o_admin_id, p_tipo_evento_id, p_fecha, p_hora_inicio, v.o_hora_fin,
      trim(p_nombre), trim(p_apellido), lower(trim(p_email)), trim(p_telefono), nullif(trim(p_nota), ''),
      case when v.o_confirmacion_auto then 'confirmada' else 'pendiente' end::public.estado_reserva
    )
    returning * into r;
  exception when exclusion_violation then
    raise exception 'TURNO_NO_DISPONIBLE' using hint = 'Este horario ya fue reservado. Por favor elegí otro.';
  end;

  delete from public.bloqueos_turno b where b.session_id = p_session_id;

  return json_build_object(
    'id', r.id,
    'numero_reserva', r.numero_reserva,
    'tipo_evento_id', r.tipo_evento_id,
    'fecha', r.fecha,
    'hora_inicio', to_char(r.hora_inicio, 'HH24:MI'),
    'hora_fin', to_char(r.hora_fin, 'HH24:MI'),
    'estado', r.estado
  );
end;
$$;

-- Envoltorios expuestos vía API (las implementaciones security definer quedan en "private").
create function public.turnos_ocupados(p_admin_id uuid, p_desde date, p_hasta date, p_session_id text default null)
returns table (
  tipo_evento_id uuid,
  fecha date,
  hora_inicio time,
  hora_fin time,
  origen text,
  expira_at timestamptz,
  es_propio boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.turnos_ocupados(p_admin_id, p_desde, p_hasta, p_session_id);
$$;

create function public.bloquear_turno(p_tipo_evento_id uuid, p_fecha date, p_hora_inicio time, p_session_id text)
returns timestamptz
language sql
security invoker
set search_path = ''
as $$
  select private.bloquear_turno(p_tipo_evento_id, p_fecha, p_hora_inicio, p_session_id);
$$;

create function public.liberar_turnos(p_session_id text)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.liberar_turnos(p_session_id);
$$;

create function public.confirmar_reserva(
  p_tipo_evento_id uuid,
  p_fecha date,
  p_hora_inicio time,
  p_session_id text,
  p_nombre text,
  p_apellido text,
  p_email text,
  p_telefono text,
  p_nota text default null
)
returns json
language sql
security invoker
set search_path = ''
as $$
  select private.confirmar_reserva(
    p_tipo_evento_id, p_fecha, p_hora_inicio, p_session_id,
    p_nombre, p_apellido, p_email, p_telefono, p_nota
  );
$$;

-- =============================================================================
-- RPC del administrador
-- =============================================================================

-- Bloquea un día (AYA-M02-RF03). Si hay reservas activas y no se confirma la
-- cancelación masiva, devuelve las afectadas sin bloquear.
create function public.bloquear_dia(p_fecha date, p_motivo text default null, p_cancelar_reservas boolean default false)
returns json
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_cantidad integer;
  v_afectadas json;
begin
  if v_uid is null then
    raise exception 'NO_AUTENTICADO';
  end if;

  select count(*),
         coalesce(json_agg(json_build_object(
           'id', r.id,
           'numero_reserva', r.numero_reserva,
           'hora_inicio', to_char(r.hora_inicio, 'HH24:MI'),
           'invitado', r.invitado_nombre || ' ' || r.invitado_apellido
         ) order by r.hora_inicio), '[]'::json)
    into v_cantidad, v_afectadas
  from public.reservas r
  where r.admin_id = v_uid and r.fecha = p_fecha and r.estado in ('pendiente', 'confirmada');

  if v_cantidad > 0 and not p_cancelar_reservas then
    return json_build_object('accion', 'requiere_confirmacion', 'reservas', v_afectadas);
  end if;

  insert into public.dias_bloqueados (admin_id, fecha, motivo)
  values (v_uid, p_fecha, p_motivo)
  on conflict (admin_id, fecha) do update set motivo = excluded.motivo;

  update public.reservas
  set estado = 'cancelada'
  where admin_id = v_uid and fecha = p_fecha and estado in ('pendiente', 'confirmada');

  return json_build_object('accion', 'bloqueado', 'reservas', v_afectadas);
end;
$$;

-- =============================================================================
-- Tareas programadas
-- =============================================================================

create function private.generar_recordatorios()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.reservas;
begin
  for r in
    select res.*
    from public.reservas res
    join public.perfiles p on p.id = res.admin_id
    where res.estado = 'confirmada'
      and (res.fecha + res.hora_inicio) at time zone p.zona_horaria
          between now() and now() + interval '24 hours'
      and not exists (
        select 1 from public.notificaciones n
        where n.reserva_id = res.id and n.tipo = 'recordatorio'
      )
  loop
    perform private.notificar_invitado(r, 'recordatorio');
  end loop;
end;
$$;

select cron.schedule(
  'agendaya-limpiar-bloqueos',
  '* * * * *',
  $$delete from public.bloqueos_turno where expira_at <= now()$$
);

select cron.schedule(
  'agendaya-recordatorios',
  '0 * * * *',
  $$select private.generar_recordatorios()$$
);

-- =============================================================================
-- Permisos sobre funciones
-- =============================================================================

revoke all on all functions in schema private from public, anon, authenticated;

grant execute on function private.turnos_ocupados(uuid, date, date, text) to anon, authenticated;
grant execute on function private.bloquear_turno(uuid, date, time, text) to anon, authenticated;
grant execute on function private.liberar_turnos(text) to anon, authenticated;
grant execute on function private.confirmar_reserva(uuid, date, time, text, text, text, text, text, text) to anon, authenticated;

revoke all on function public.bloquear_dia(date, text, boolean) from public, anon;
grant execute on function public.bloquear_dia(date, text, boolean) to authenticated;

-- =============================================================================
-- Row Level Security
-- =============================================================================

alter table public.perfiles enable row level security;
alter table public.configuracion_reservas enable row level security;
alter table public.horarios_semanales enable row level security;
alter table public.franjas_horarias enable row level security;
alter table public.dias_bloqueados enable row level security;
alter table public.tipos_evento enable row level security;
alter table public.reservas enable row level security;
alter table public.bloqueos_turno enable row level security;
alter table public.notificaciones enable row level security;
alter table public.plantillas_notificacion enable row level security;

revoke all on public.bloqueos_turno from anon, authenticated;
revoke insert, update, delete on public.notificaciones from anon, authenticated;
grant update (leida) on public.notificaciones to authenticated;

-- Perfiles: datos públicos del enlace de agenda; cada admin edita el suyo.
create policy "perfiles: lectura pública" on public.perfiles
  for select to anon, authenticated using (true);
create policy "perfiles: el admin edita el suyo" on public.perfiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Configuración: necesaria para calcular turnos en el enlace público.
create policy "configuracion: lectura pública" on public.configuracion_reservas
  for select to anon, authenticated using (true);
create policy "configuracion: el admin edita la suya" on public.configuracion_reservas
  for update to authenticated
  using (admin_id = (select auth.uid()))
  with check (admin_id = (select auth.uid()));

-- Horarios semanales.
create policy "horarios: lectura pública" on public.horarios_semanales
  for select to anon, authenticated using (true);
create policy "horarios: alta propia" on public.horarios_semanales
  for insert to authenticated with check (admin_id = (select auth.uid()));
create policy "horarios: edición propia" on public.horarios_semanales
  for update to authenticated
  using (admin_id = (select auth.uid()))
  with check (admin_id = (select auth.uid()));
create policy "horarios: baja propia" on public.horarios_semanales
  for delete to authenticated using (admin_id = (select auth.uid()));

-- Franjas horarias (heredan dueño del horario).
create policy "franjas: lectura pública" on public.franjas_horarias
  for select to anon, authenticated using (true);
create policy "franjas: alta propia" on public.franjas_horarias
  for insert to authenticated with check (
    exists (select 1 from public.horarios_semanales h
            where h.id = horario_id and h.admin_id = (select auth.uid()))
  );
create policy "franjas: edición propia" on public.franjas_horarias
  for update to authenticated
  using (exists (select 1 from public.horarios_semanales h
                 where h.id = horario_id and h.admin_id = (select auth.uid())))
  with check (exists (select 1 from public.horarios_semanales h
                      where h.id = horario_id and h.admin_id = (select auth.uid())));
create policy "franjas: baja propia" on public.franjas_horarias
  for delete to authenticated using (
    exists (select 1 from public.horarios_semanales h
            where h.id = horario_id and h.admin_id = (select auth.uid()))
  );

-- Días bloqueados.
create policy "dias bloqueados: lectura pública" on public.dias_bloqueados
  for select to anon, authenticated using (true);
create policy "dias bloqueados: alta propia" on public.dias_bloqueados
  for insert to authenticated with check (admin_id = (select auth.uid()));
create policy "dias bloqueados: edición propia" on public.dias_bloqueados
  for update to authenticated
  using (admin_id = (select auth.uid()))
  with check (admin_id = (select auth.uid()));
create policy "dias bloqueados: baja propia" on public.dias_bloqueados
  for delete to authenticated using (admin_id = (select auth.uid()));

-- Tipos de evento: el público ve solo los activos; el admin ve todos los suyos.
create policy "tipos evento: lectura" on public.tipos_evento
  for select to anon, authenticated
  using (activo or admin_id = (select auth.uid()));
create policy "tipos evento: alta propia" on public.tipos_evento
  for insert to authenticated with check (admin_id = (select auth.uid()));
create policy "tipos evento: edición propia" on public.tipos_evento
  for update to authenticated
  using (admin_id = (select auth.uid()))
  with check (admin_id = (select auth.uid()));
create policy "tipos evento: baja propia" on public.tipos_evento
  for delete to authenticated using (admin_id = (select auth.uid()));

-- Reservas: datos personales del invitado, solo visibles para su admin.
-- Los invitados reservan mediante public.confirmar_reserva.
create policy "reservas: lectura propia" on public.reservas
  for select to authenticated using (admin_id = (select auth.uid()));
create policy "reservas: alta propia" on public.reservas
  for insert to authenticated with check (admin_id = (select auth.uid()));
create policy "reservas: edición propia" on public.reservas
  for update to authenticated
  using (admin_id = (select auth.uid()))
  with check (admin_id = (select auth.uid()));
create policy "reservas: baja propia" on public.reservas
  for delete to authenticated using (admin_id = (select auth.uid()));

-- Notificaciones: las genera la base; el admin las lee y marca como leídas.
create policy "notificaciones: lectura propia" on public.notificaciones
  for select to authenticated using (admin_id = (select auth.uid()));
create policy "notificaciones: marcar leída" on public.notificaciones
  for update to authenticated
  using (admin_id = (select auth.uid()))
  with check (admin_id = (select auth.uid()));

-- Plantillas de notificación.
create policy "plantillas: lectura propia" on public.plantillas_notificacion
  for select to authenticated using (admin_id = (select auth.uid()));
create policy "plantillas: edición propia" on public.plantillas_notificacion
  for update to authenticated
  using (admin_id = (select auth.uid()))
  with check (admin_id = (select auth.uid()));
