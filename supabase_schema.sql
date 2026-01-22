
-- Copia y pega esto en el Editor SQL de Supabase para crear las tablas necesarias

-- Tabla: alumnos
create table if not exists public.alumnos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  apellido text not null,
  colegio text,
  grado text,
  foto_url text, -- mapped from fotoUrl
  tutor_nombre text, -- mapped from tutorNombre
  tutor_telefono text, -- mapped from tutorTelefono
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabla: modulos
create table if not exists public.modulos (
  id text primary key, -- IDs are strings like 'm1', 'm2'
  nombre text not null,
  total_clases int not null, -- mapped from totalClases
  horas_por_clase numeric not null, -- mapped from horasPorClase
  costo_base numeric not null, -- mapped from costoBase
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabla: horarios
create table if not exists public.horarios (
  id text primary key,
  modulo_id text references public.modulos(id), -- mapped from moduloId
  hora_inicio text not null, -- mapped from horaInicio
  hora_fin text not null, -- mapped from horaFin
  dias text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabla: inscripciones
create table if not exists public.inscripciones (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid references public.alumnos(id), -- mapped from alumnoId
  modulo_id text, -- mapped from moduloId (can be 'custom' so no FK constraint strictly enforced or handle carefully)
  horario_id text, -- mapped from horarioId
  fecha_inscripcion text not null, -- mapped from fechaInscripcion
  saldo_clases int not null, -- mapped from saldoClases
  costo_acordado numeric not null, -- mapped from costoAcordado
  activo boolean default true,
  estado text not null,
  custom_modulo jsonb, -- mapped from customModulo object
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabla: pagos
create table if not exists public.pagos (
  id uuid primary key default gen_random_uuid(),
  inscripcion_id uuid references public.inscripciones(id), -- mapped from inscripcionId
  monto numeric not null,
  fecha text not null,
  metodo text not null,
  concepto text,
  recibo_num text, -- mapped from reciboNum
  nota text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabla: egresos
create table if not exists public.egresos (
  id uuid primary key default gen_random_uuid(),
  monto numeric not null,
  fecha text not null,
  categoria text not null,
  descripcion text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabla: asistencias
create table if not exists public.asistencias (
  id uuid primary key default gen_random_uuid(),
  inscripcion_id uuid references public.inscripciones(id), -- mapped from inscripcionId
  fecha text not null,
  estado text not null,
  observacion text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabla: config
create table if not exists public.config (
  key text primary key,
  value jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS y Políticas Públicas (Permisivas)
-- IMPORTANTE: Ejecuta este bloque completo para asegurar acceso de lectura y escritura

-- 1. Alumnos
alter table public.alumnos enable row level security;
drop policy if exists "Public Access Alumnos" on public.alumnos;
create policy "Public Access Alumnos" on public.alumnos for all using (true) with check (true);

-- 2. Modulos
alter table public.modulos enable row level security;
drop policy if exists "Public Access Modulos" on public.modulos;
create policy "Public Access Modulos" on public.modulos for all using (true) with check (true);

-- 3. Horarios
alter table public.horarios enable row level security;
drop policy if exists "Public Access Horarios" on public.horarios;
create policy "Public Access Horarios" on public.horarios for all using (true) with check (true);

-- 4. Inscripciones
alter table public.inscripciones enable row level security;
drop policy if exists "Public Access Inscripciones" on public.inscripciones;
create policy "Public Access Inscripciones" on public.inscripciones for all using (true) with check (true);

-- 5. Pagos
alter table public.pagos enable row level security;
drop policy if exists "Public Access Pagos" on public.pagos;
create policy "Public Access Pagos" on public.pagos for all using (true) with check (true);

-- 6. Egresos
alter table public.egresos enable row level security;
drop policy if exists "Public Access Egresos" on public.egresos;
create policy "Public Access Egresos" on public.egresos for all using (true) with check (true);

-- 7. Asistencias
alter table public.asistencias enable row level security;
drop policy if exists "Public Access Asistencias" on public.asistencias;
create policy "Public Access Asistencias" on public.asistencias for all using (true) with check (true);

-- 8. Config
alter table public.config enable row level security;
drop policy if exists "Public Access Config" on public.config;
create policy "Public Access Config" on public.config for all using (true) with check (true);
