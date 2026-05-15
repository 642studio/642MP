-- 642MP: Clients research, diagnostic, strategy prefill, and package-based monthly grid suggestions

create table if not exists public.client_account_snapshots (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  captured_at date not null default current_date,
  instagram_handle text,
  tiktok_handle text,
  facebook_handle text,
  followers integer,
  avg_views integer,
  engagement_rate numeric(6,3),
  posting_frequency text,
  top_posts_notes text,
  captured_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.ai_research_reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  snapshot_id uuid references public.client_account_snapshots(id) on delete set null,
  scope text not null default 'local_global' check (scope in ('local_global')),
  research_json jsonb not null default '{}'::jsonb,
  diagnostic_json jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'ready', 'approved')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.strategy_prefill_payloads (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  report_id uuid not null references public.ai_research_reports(id) on delete cascade,
  objective_payload_json jsonb not null default '{}'::jsonb,
  semester_payload_json jsonb not null default '{}'::jsonb,
  monthly_campaign_payload_json jsonb not null default '{}'::jsonb,
  status text not null default 'generated' check (status in ('generated', 'reviewed', 'applied')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.monthly_grid_suggestions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.monthly_campaigns(id) on delete cascade,
  source text not null default 'rules_plus_ai' check (source in ('rules_plus_ai')),
  suggestion_json jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_client_account_snapshots_client on public.client_account_snapshots(client_id, captured_at desc);
create index if not exists idx_ai_research_reports_client on public.ai_research_reports(client_id, created_at desc);
create index if not exists idx_strategy_prefill_payloads_client on public.strategy_prefill_payloads(client_id, created_at desc);
create index if not exists idx_monthly_grid_suggestions_campaign on public.monthly_grid_suggestions(campaign_id, created_at desc);

create trigger trg_ai_research_reports_touch
before update on public.ai_research_reports
for each row execute procedure public.touch_updated_at();

create or replace function public.validate_prefill_report_ready()
returns trigger
language plpgsql
as $$
declare
  report_status text;
begin
  select status into report_status
  from public.ai_research_reports
  where id = new.report_id;

  if report_status is null then
    raise exception 'Reporte de investigación no encontrado';
  end if;

  if report_status <> 'ready' and report_status <> 'approved' then
    raise exception 'El reporte debe estar en estado ready/approved para generar prefill';
  end if;

  return new;
end;
$$;

create trigger trg_strategy_prefill_payloads_validate
before insert or update on public.strategy_prefill_payloads
for each row execute procedure public.validate_prefill_report_ready();

create or replace function public.validate_grid_suggestion_campaign_package()
returns trigger
language plpgsql
as $$
declare
  has_campaign_package boolean;
  has_active_contract_package boolean;
begin
  select (package_id is not null)
  into has_campaign_package
  from public.monthly_campaigns
  where id = new.campaign_id;

  select exists (
    select 1
    from public.monthly_campaigns mc
    join public.service_contracts sc on sc.client_id = mc.client_id
    where mc.id = new.campaign_id
      and sc.status = 'active'
      and sc.package_id is not null
      and sc.start_date <= mc.month_date
      and (sc.end_date is null or sc.end_date >= mc.month_date)
  ) into has_active_contract_package;

  if not coalesce(has_campaign_package, false) and not has_active_contract_package then
    raise exception 'La campaña necesita package_id o contrato activo con paquete para sugerir grid.';
  end if;

  return new;
end;
$$;

create trigger trg_monthly_grid_suggestions_validate
before insert on public.monthly_grid_suggestions
for each row execute procedure public.validate_grid_suggestion_campaign_package();

create or replace function public.audit_prefill_and_grid_events()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_events(actor_id, entity_type, entity_id, event_type, payload)
    values (auth.uid(), tg_table_name, new.id, 'created', to_jsonb(new));
    return new;
  end if;

  if tg_op = 'UPDATE' then
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
  end if;

  return new;
end;
$$;

create trigger trg_ai_research_reports_audit
after insert or update on public.ai_research_reports
for each row execute procedure public.audit_prefill_and_grid_events();

create trigger trg_strategy_prefill_payloads_audit
after insert or update on public.strategy_prefill_payloads
for each row execute procedure public.audit_prefill_and_grid_events();

create trigger trg_monthly_grid_suggestions_audit
after insert on public.monthly_grid_suggestions
for each row execute procedure public.audit_prefill_and_grid_events();

alter table public.client_account_snapshots enable row level security;
alter table public.ai_research_reports enable row level security;
alter table public.strategy_prefill_payloads enable row level security;
alter table public.monthly_grid_suggestions enable row level security;

create policy client_account_snapshots_select on public.client_account_snapshots
for select to authenticated
using (public.is_active_user());

create policy client_account_snapshots_write on public.client_account_snapshots
for all to authenticated
using (public.has_any_role(array['admin', 'direccion', 'community']::public.app_role[]))
with check (public.has_any_role(array['admin', 'direccion', 'community']::public.app_role[]));

create policy ai_research_reports_select on public.ai_research_reports
for select to authenticated
using (public.is_active_user());

create policy ai_research_reports_write on public.ai_research_reports
for all to authenticated
using (public.has_any_role(array['admin', 'direccion', 'community']::public.app_role[]))
with check (public.has_any_role(array['admin', 'direccion', 'community']::public.app_role[]));

create policy strategy_prefill_payloads_select on public.strategy_prefill_payloads
for select to authenticated
using (public.is_active_user());

create policy strategy_prefill_payloads_write on public.strategy_prefill_payloads
for all to authenticated
using (public.has_any_role(array['admin', 'direccion', 'community']::public.app_role[]))
with check (public.has_any_role(array['admin', 'direccion', 'community']::public.app_role[]));

create policy monthly_grid_suggestions_select on public.monthly_grid_suggestions
for select to authenticated
using (public.is_active_user());

create policy monthly_grid_suggestions_write on public.monthly_grid_suggestions
for all to authenticated
using (public.has_any_role(array['admin', 'direccion', 'community', 'editor']::public.app_role[]))
with check (public.has_any_role(array['admin', 'direccion', 'community', 'editor']::public.app_role[]));
