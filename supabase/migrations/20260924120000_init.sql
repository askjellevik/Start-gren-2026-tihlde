-- =====================================================================
-- Bærekraftskalkulator – grunnskjema
--
-- Sikkerhetsmodell:
--   * Alle (også anonyme) kan LESE kategorier, utslippsmetoder og innstillinger.
--   * Kun brukere i public.admins kan ENDRE dem. Det håndheves her med RLS,
--     ikke i frontend – "Admin?"-knappen er bare en snarvei.
--   * Selvregistrering er slått av (supabase/config.toml + dashboard), admins
--     inviteres manuelt. Se README for oppsett.
--   * Alle endringer logges i public.audit_log via trigger.
--   * Ingen persondata om kalkulatorbrukere lagres – utregning skjer i nettleseren.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Hjelpefunksjoner
-- ---------------------------------------------------------------------

-- Validerer svaralternativene: [{ "label": "1 gang", "value": 1 }, ...]
create or replace function public.valid_choices(c jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(c) = 'array'
    and jsonb_array_length(c) between 1 and 12
    and not exists (
      select 1
      from jsonb_array_elements(c) as e
      where coalesce(jsonb_typeof(e -> 'label'), '') <> 'string'
         or coalesce(jsonb_typeof(e -> 'value'), '') <> 'number'
         or length(e ->> 'label') not between 1 and 80
         or (e ->> 'value')::numeric < 0
         or (e ->> 'value')::numeric > 1000000
    );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Tabeller
-- ---------------------------------------------------------------------

create table public.categories (
  id          text primary key default gen_random_uuid()::text
              check (id ~ '^[a-z0-9-]{1,64}$' or id ~ '^[0-9a-f-]{36}$'),
  name        text not null check (length(name) between 1 and 80),
  description text check (length(description) <= 300),
  color       text not null default '#728f3f' check (color ~ '^#[0-9a-fA-F]{6}$'),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.emission_methods (
  id               text primary key default gen_random_uuid()::text
                   check (id ~ '^[a-z0-9-]{1,64}$' or id ~ '^[0-9a-f-]{36}$'),
  -- Sletter man en kategori, forsvinner metodene (og verdiene) med den.
  category_id      text not null references public.categories (id) on delete cascade,
  name             text not null check (length(name) between 1 and 80),
  question         text not null check (length(question) between 1 and 200),
  period           text not null check (period in ('week', 'month', 'year')),
  unit_label       text not null check (length(unit_label) between 1 and 30),
  kg_co2e_per_unit numeric not null check (kg_co2e_per_unit >= 0 and kg_co2e_per_unit <= 100000),
  choices          jsonb not null check (public.valid_choices(choices)),
  tip              text check (length(tip) <= 300),
  source_name      text check (length(source_name) <= 300),
  source_url       text check (source_url is null or (source_url ~ '^https://\S+$' and length(source_url) <= 500)),
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index emission_methods_category_id_idx on public.emission_methods (category_id);

-- Én rad (id = true) med globale innstillinger.
create table public.settings (
  id                           boolean primary key default true check (id),
  national_average_kg          numeric not null check (national_average_kg > 0 and national_average_kg <= 1000000),
  national_average_source      text check (length(national_average_source) <= 300),
  national_average_source_url  text check (national_average_source_url is null or (national_average_source_url ~ '^https://\S+$' and length(national_average_source_url) <= 500)),
  baseline_kg                  numeric not null default 0 check (baseline_kg >= 0 and baseline_kg <= 1000000),
  baseline_label               text not null default 'Felles utslipp' check (length(baseline_label) between 1 and 120),
  target_kg                    numeric check (target_kg is null or (target_kg >= 0 and target_kg <= 1000000)),
  target_label                 text check (length(target_label) <= 120),
  updated_at                   timestamptz not null default now()
);

-- Forhåndsdefinerte admins. Legges inn manuelt med SQL (se README).
create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id          bigint generated always as identity primary key,
  table_name  text not null,
  row_id      text,
  action      text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data    jsonb,
  new_data    jsonb,
  changed_by  uuid default auth.uid(),
  changed_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Admin-sjekk
-- ---------------------------------------------------------------------

-- security definer så policyene kan slå opp i admins uten at admins-tabellen
-- må være lesbar for alle.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------
-- Triggere
-- ---------------------------------------------------------------------

create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger emission_methods_updated_at before update on public.emission_methods
  for each row execute function public.set_updated_at();
create trigger settings_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_log (table_name, row_id, action, old_data, new_data)
  values (
    tg_table_name,
    coalesce(to_jsonb(new) ->> 'id', to_jsonb(old) ->> 'id'),
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create trigger categories_audit after insert or update or delete on public.categories
  for each row execute function public.write_audit_log();
create trigger emission_methods_audit after insert or update or delete on public.emission_methods
  for each row execute function public.write_audit_log();
create trigger settings_audit after insert or update or delete on public.settings
  for each row execute function public.write_audit_log();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------

alter table public.categories       enable row level security;
alter table public.emission_methods enable row level security;
alter table public.settings         enable row level security;
alter table public.admins           enable row level security;
alter table public.audit_log        enable row level security;

-- Offentlig lesing av kalkulatordata
create policy "Alle kan lese kategorier" on public.categories
  for select to anon, authenticated using (true);
create policy "Alle kan lese utslippsmetoder" on public.emission_methods
  for select to anon, authenticated using (true);
create policy "Alle kan lese innstillinger" on public.settings
  for select to anon, authenticated using (true);

-- Kun admins kan skrive
create policy "Admins kan legge til kategorier" on public.categories
  for insert to authenticated with check ((select public.is_admin()));
create policy "Admins kan endre kategorier" on public.categories
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins kan slette kategorier" on public.categories
  for delete to authenticated using ((select public.is_admin()));

create policy "Admins kan legge til utslippsmetoder" on public.emission_methods
  for insert to authenticated with check ((select public.is_admin()));
create policy "Admins kan endre utslippsmetoder" on public.emission_methods
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins kan slette utslippsmetoder" on public.emission_methods
  for delete to authenticated using ((select public.is_admin()));

-- Innstillinger: kun oppdatering (raden opprettes av seed).
create policy "Admins kan endre innstillinger" on public.settings
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- En innlogget bruker kan se om hen selv er admin. Ingen skrivetilgang via API.
create policy "Brukere ser egen adminstatus" on public.admins
  for select to authenticated using (user_id = (select auth.uid()));

-- Revisjonslogg: kun lesbar for admins, skrives kun av triggeren.
create policy "Admins kan lese revisjonslogg" on public.audit_log
  for select to authenticated using ((select public.is_admin()));

-- Anonyme brukere trenger bare lesetilgang.
revoke insert, update, delete, truncate on public.categories, public.emission_methods,
  public.settings, public.admins, public.audit_log from anon;
revoke insert, update, delete, truncate on public.admins, public.audit_log from authenticated;
-- TRUNCATE går utenom RLS, så ingen API-rolle skal ha den.
revoke truncate on public.categories, public.emission_methods, public.settings from authenticated;
