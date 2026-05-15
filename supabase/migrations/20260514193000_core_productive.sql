-- 642MP Productive Core Schema
-- Objective General -> Semester Plan -> Monthly Campaign hierarchy

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create type public.app_role as enum (
  'admin',
  'direccion',
  'community',
  'produccion',
  'fotografia',
  'editor',
  'readonly'
);

create type public.client_status as enum ('prospect', 'active', 'paused', 'finished');
create type public.campaign_status as enum (
  'brief',
  'planning',
  'production',
  'editing',
  'review',
  'client_approval',
  'publishing',
  'closed'
);
create type public.feed_status as enum (
  'idea',
  'planned',
  'script_ready',
  'in_production',
  'shot',
  'editing',
  'internal_review',
  'ready_for_client',
  'sent_to_client',
  'approved',
  'published',
  'changes_requested'
);
create type public.rider_status as enum ('draft', 'ready', 'sent', 'approved');
create type public.session_confirmation_status as enum ('pending', 'confirmed', 'done', 'cancelled');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role public.app_role not null default 'readonly',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_name text,
  industry text,
  city text,
  zone text,
  address text,
  instagram text,
  facebook text,
  tiktok text,
  website text,
  contact_name text,
  contact_phone text,
  contact_email text,
  logo_path text,
  brand_colors text[] not null default '{}',
  status public.client_status not null default 'prospect',
  responsible_user_id uuid references public.profiles(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  price numeric(12,2) not null default 0,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.package_items (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.packages(id) on delete cascade,
  item_type text not null,
  quantity integer not null default 1,
  periodicity text not null check (periodicity in ('monthly', 'weekly', 'one_time')),
  description text,
  requires_production boolean not null default false,
  requires_approval boolean not null default false
);

create table if not exists public.service_contracts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  package_id uuid not null references public.packages(id),
  start_date date not null,
  end_date date,
  monthly_price numeric(12,2) not null default 0,
  payment_status text not null default 'pending',
  status text not null default 'active',
  commercial_responsible_id uuid references public.profiles(id),
  creative_responsible_id uuid references public.profiles(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.objective_generals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  contract_id uuid references public.service_contracts(id),
  title text not null,
  business_goal text not null,
  primary_kpi text not null,
  target_value text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'closed')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint objective_generals_date_check check (start_date <= end_date)
);

create table if not exists public.semester_plans (
  id uuid primary key default gen_random_uuid(),
  objective_general_id uuid not null references public.objective_generals(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  strategic_focus text not null,
  pillars text[] not null default '{}',
  risks text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'closed')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint semester_plans_date_check check (start_date <= end_date)
);

create table if not exists public.monthly_campaigns (
  id uuid primary key default gen_random_uuid(),
  objective_general_id uuid not null references public.objective_generals(id) on delete cascade,
  semester_plan_id uuid not null references public.semester_plans(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  contract_id uuid references public.service_contracts(id),
  package_id uuid references public.packages(id),
  month_date date not null,
  name text not null,
  monthly_goal text not null,
  audience text not null,
  tone text not null,
  cta text not null,
  promotion text,
  status public.campaign_status not null default 'brief',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (semester_plan_id, month_date)
);

create table if not exists public.feed_items (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.monthly_campaigns(id) on delete cascade,
  content_type text not null,
  internal_title text not null,
  public_title text not null default '',
  pillar text not null default '',
  objective text not null default '',
  hook text not null default '',
  copy_base text not null default '',
  script text not null default '',
  cta text not null default '',
  shotlist text not null default '',
  format text not null default '',
  grid_position integer not null default 1,
  publish_date date,
  production_date date,
  status public.feed_status not null default 'idea',
  responsible_user_id uuid references public.profiles(id),
  thumbnail_path text,
  reference_links text[] not null default '{}',
  internal_notes text not null default '',
  client_comments text not null default '',
  is_extra boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.production_sessions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.monthly_campaigns(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  date date not null,
  start_time time,
  end_time time,
  location text,
  estimated_duration integer,
  photo_responsible_id uuid references public.profiles(id),
  video_responsible_id uuid references public.profiles(id),
  director_responsible_id uuid references public.profiles(id),
  client_support_person text,
  client_contact text,
  confirmation_status public.session_confirmation_status not null default 'pending',
  rider_status public.rider_status not null default 'draft',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.production_session_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.production_sessions(id) on delete cascade,
  feed_item_id uuid not null references public.feed_items(id) on delete cascade,
  unique (session_id, feed_item_id)
);

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.monthly_campaigns(id) on delete cascade,
  feed_item_id uuid not null references public.feed_items(id) on delete cascade,
  status text not null default 'pending_internal',
  last_comment text,
  due_date date,
  responsible_user_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.riders (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.monthly_campaigns(id) on delete cascade,
  session_id uuid references public.production_sessions(id) on delete set null,
  title text not null,
  content_json jsonb not null default '{}'::jsonb,
  pdf_url text,
  status public.rider_status not null default 'draft',
  sent_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.internal_reports (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.monthly_campaigns(id) on delete cascade,
  content_json jsonb not null default '{}'::jsonb,
  pdf_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value text not null,
  encrypted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  entity_type text not null,
  entity_id uuid,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_clients_status on public.clients(status);
create index if not exists idx_objective_generals_client on public.objective_generals(client_id);
create index if not exists idx_semester_plans_objective on public.semester_plans(objective_general_id);
create index if not exists idx_monthly_campaigns_semester on public.monthly_campaigns(semester_plan_id, month_date);
create index if not exists idx_feed_items_campaign on public.feed_items(campaign_id, grid_position);
create index if not exists idx_production_sessions_campaign on public.production_sessions(campaign_id, date);
create index if not exists idx_riders_campaign on public.riders(campaign_id);
create index if not exists idx_audit_events_entity on public.audit_events(entity_type, entity_id, created_at desc);

alter table public.semester_plans
  add constraint semester_active_no_overlap
  exclude using gist (
    objective_general_id with =,
    daterange(start_date, end_date, '[]') with &&
  ) where (status = 'active');

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.profiles where id = auth.uid() and active = true);
$$;

create or replace function public.has_any_role(roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and active = true
      and role = any(roles)
  );
$$;

create or replace function public.ensure_campaign_month_within_semester()
returns trigger
language plpgsql
as $$
declare
  semester_start date;
  semester_end date;
begin
  select start_date, end_date
  into semester_start, semester_end
  from public.semester_plans
  where id = new.semester_plan_id;

  if semester_start is null then
    raise exception 'Plan semestral no encontrado para campaign %', new.id;
  end if;

  if new.month_date < semester_start or new.month_date > semester_end then
    raise exception 'El month_date % está fuera del rango del plan semestral [% - %]', new.month_date, semester_start, semester_end;
  end if;

  return new;
end;
$$;

create or replace function public.validate_rider_status()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'sent' then
    if coalesce(new.content_json -> 'cover' ->> 'campaign_name', '') = ''
      or coalesce(new.content_json -> 'cover' ->> 'client_name', '') = ''
      or coalesce(new.content_json -> 'session' ->> 'date', '') = ''
      or coalesce(new.content_json -> 'session' ->> 'location', '') = ''
      or coalesce(new.content_json ->> 'objective_summary', '') = '' then
      raise exception 'Rider incompleto: faltan secciones mínimas para enviar.';
    end if;

    if new.sent_at is null then
      new.sent_at = now();
    end if;
  end if;

  if new.status = 'approved' then
    if new.approved_at is null then
      new.approved_at = now();
    end if;
    if new.approved_by is null then
      new.approved_by = auth.uid();
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.audit_status_change()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    insert into public.audit_events(actor_id, entity_type, entity_id, event_type, payload)
    values (
      auth.uid(),
      tg_table_name,
      new.id,
      'status_changed',
      jsonb_build_object('old_status', old.status, 'new_status', new.status)
    );
  end if;
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, name, role, active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    'readonly',
    true
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger trg_profiles_touch
before update on public.profiles
for each row execute procedure public.touch_updated_at();

create trigger trg_clients_touch
before update on public.clients
for each row execute procedure public.touch_updated_at();

create trigger trg_packages_touch
before update on public.packages
for each row execute procedure public.touch_updated_at();

create trigger trg_service_contracts_touch
before update on public.service_contracts
for each row execute procedure public.touch_updated_at();

create trigger trg_objective_generals_touch
before update on public.objective_generals
for each row execute procedure public.touch_updated_at();

create trigger trg_semester_plans_touch
before update on public.semester_plans
for each row execute procedure public.touch_updated_at();

create trigger trg_monthly_campaigns_touch
before update on public.monthly_campaigns
for each row execute procedure public.touch_updated_at();

create trigger trg_feed_items_touch
before update on public.feed_items
for each row execute procedure public.touch_updated_at();

create trigger trg_production_sessions_touch
before update on public.production_sessions
for each row execute procedure public.touch_updated_at();

create trigger trg_approvals_touch
before update on public.approvals
for each row execute procedure public.touch_updated_at();

create trigger trg_riders_touch
before update on public.riders
for each row execute procedure public.touch_updated_at();

create trigger trg_settings_touch
before update on public.settings
for each row execute procedure public.touch_updated_at();

create trigger trg_monthly_campaigns_validate
before insert or update on public.monthly_campaigns
for each row execute procedure public.ensure_campaign_month_within_semester();

create trigger trg_rider_validate
before insert or update on public.riders
for each row execute procedure public.validate_rider_status();

create trigger trg_audit_campaign_status
after update on public.monthly_campaigns
for each row execute procedure public.audit_status_change();

create trigger trg_audit_rider_status
after update on public.riders
for each row execute procedure public.audit_status_change();

create trigger trg_audit_approval_status
after update on public.approvals
for each row execute procedure public.audit_status_change();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.packages enable row level security;
alter table public.package_items enable row level security;
alter table public.service_contracts enable row level security;
alter table public.objective_generals enable row level security;
alter table public.semester_plans enable row level security;
alter table public.monthly_campaigns enable row level security;
alter table public.feed_items enable row level security;
alter table public.production_sessions enable row level security;
alter table public.production_session_items enable row level security;
alter table public.approvals enable row level security;
alter table public.riders enable row level security;
alter table public.internal_reports enable row level security;
alter table public.settings enable row level security;
alter table public.audit_events enable row level security;

-- Profiles policies
create policy profiles_select on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or public.has_any_role(array['admin', 'direccion']::public.app_role[])
);

create policy profiles_update on public.profiles
for update to authenticated
using (
  id = auth.uid()
  or public.has_any_role(array['admin', 'direccion']::public.app_role[])
)
with check (
  id = auth.uid()
  or public.has_any_role(array['admin', 'direccion']::public.app_role[])
);

create policy profiles_insert on public.profiles
for insert to authenticated
with check (
  id = auth.uid()
  or public.has_any_role(array['admin', 'direccion']::public.app_role[])
);

-- Helper policy template applied manually by module
create policy clients_select on public.clients
for select to authenticated
using (public.is_active_user());
create policy clients_write on public.clients
for all to authenticated
using (public.has_any_role(array['admin', 'direccion', 'community']::public.app_role[]))
with check (public.has_any_role(array['admin', 'direccion', 'community']::public.app_role[]));

create policy packages_select on public.packages
for select to authenticated
using (public.is_active_user());
create policy packages_write on public.packages
for all to authenticated
using (public.has_any_role(array['admin', 'direccion']::public.app_role[]))
with check (public.has_any_role(array['admin', 'direccion']::public.app_role[]));

create policy package_items_select on public.package_items
for select to authenticated
using (public.is_active_user());
create policy package_items_write on public.package_items
for all to authenticated
using (public.has_any_role(array['admin', 'direccion']::public.app_role[]))
with check (public.has_any_role(array['admin', 'direccion']::public.app_role[]));

create policy service_contracts_select on public.service_contracts
for select to authenticated
using (public.is_active_user());
create policy service_contracts_write on public.service_contracts
for all to authenticated
using (public.has_any_role(array['admin', 'direccion']::public.app_role[]))
with check (public.has_any_role(array['admin', 'direccion']::public.app_role[]));

create policy objective_generals_select on public.objective_generals
for select to authenticated
using (public.is_active_user());
create policy objective_generals_write on public.objective_generals
for all to authenticated
using (public.has_any_role(array['admin', 'direccion', 'community']::public.app_role[]))
with check (public.has_any_role(array['admin', 'direccion', 'community']::public.app_role[]));

create policy semester_plans_select on public.semester_plans
for select to authenticated
using (public.is_active_user());
create policy semester_plans_write on public.semester_plans
for all to authenticated
using (public.has_any_role(array['admin', 'direccion', 'community']::public.app_role[]))
with check (public.has_any_role(array['admin', 'direccion', 'community']::public.app_role[]));

create policy monthly_campaigns_select on public.monthly_campaigns
for select to authenticated
using (public.is_active_user());
create policy monthly_campaigns_write on public.monthly_campaigns
for all to authenticated
using (public.has_any_role(array['admin', 'direccion', 'community', 'editor']::public.app_role[]))
with check (public.has_any_role(array['admin', 'direccion', 'community', 'editor']::public.app_role[]));

create policy feed_items_select on public.feed_items
for select to authenticated
using (public.is_active_user());
create policy feed_items_write on public.feed_items
for all to authenticated
using (public.has_any_role(array['admin', 'direccion', 'community', 'editor']::public.app_role[]))
with check (public.has_any_role(array['admin', 'direccion', 'community', 'editor']::public.app_role[]));

create policy production_sessions_select on public.production_sessions
for select to authenticated
using (public.is_active_user());
create policy production_sessions_write on public.production_sessions
for all to authenticated
using (public.has_any_role(array['admin', 'direccion', 'produccion', 'fotografia', 'community']::public.app_role[]))
with check (public.has_any_role(array['admin', 'direccion', 'produccion', 'fotografia', 'community']::public.app_role[]));

create policy production_session_items_select on public.production_session_items
for select to authenticated
using (public.is_active_user());
create policy production_session_items_write on public.production_session_items
for all to authenticated
using (public.has_any_role(array['admin', 'direccion', 'produccion', 'fotografia']::public.app_role[]))
with check (public.has_any_role(array['admin', 'direccion', 'produccion', 'fotografia']::public.app_role[]));

create policy approvals_select on public.approvals
for select to authenticated
using (public.is_active_user());
create policy approvals_write on public.approvals
for all to authenticated
using (public.has_any_role(array['admin', 'direccion', 'community', 'editor', 'produccion']::public.app_role[]))
with check (public.has_any_role(array['admin', 'direccion', 'community', 'editor', 'produccion']::public.app_role[]));

create policy riders_select on public.riders
for select to authenticated
using (public.is_active_user());
create policy riders_write on public.riders
for all to authenticated
using (public.has_any_role(array['admin', 'direccion', 'community', 'produccion', 'fotografia']::public.app_role[]))
with check (public.has_any_role(array['admin', 'direccion', 'community', 'produccion', 'fotografia']::public.app_role[]));

create policy internal_reports_select on public.internal_reports
for select to authenticated
using (public.is_active_user());
create policy internal_reports_write on public.internal_reports
for all to authenticated
using (public.has_any_role(array['admin', 'direccion', 'community']::public.app_role[]))
with check (public.has_any_role(array['admin', 'direccion', 'community']::public.app_role[]));

create policy settings_select on public.settings
for select to authenticated
using (public.has_any_role(array['admin', 'direccion']::public.app_role[]));
create policy settings_write on public.settings
for all to authenticated
using (public.has_any_role(array['admin', 'direccion']::public.app_role[]))
with check (public.has_any_role(array['admin', 'direccion']::public.app_role[]));

create policy audit_events_select on public.audit_events
for select to authenticated
using (public.has_any_role(array['admin', 'direccion']::public.app_role[]));

-- Storage bucket for rider PDF output
insert into storage.buckets (id, name, public)
values ('riders-pdf', 'riders-pdf', true)
on conflict (id) do nothing;

create policy riders_pdf_read on storage.objects
for select to authenticated
using (bucket_id = 'riders-pdf');

create policy riders_pdf_write on storage.objects
for insert to authenticated
with check (
  bucket_id = 'riders-pdf'
  and public.has_any_role(array['admin', 'direccion', 'community', 'produccion', 'fotografia']::public.app_role[])
);

create policy riders_pdf_update on storage.objects
for update to authenticated
using (
  bucket_id = 'riders-pdf'
  and public.has_any_role(array['admin', 'direccion', 'community', 'produccion', 'fotografia']::public.app_role[])
);

create policy riders_pdf_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'riders-pdf'
  and public.has_any_role(array['admin', 'direccion']::public.app_role[])
);
