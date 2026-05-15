import { requireSupabase } from './supabase';
import type {
  AIResearchReport,
  Client,
  ClientAccountSnapshot,
  ConnectionsVerificationResult,
  FeedItem,
  MonthlyCampaign,
  MonthlyGridSuggestion,
  ObjectiveGeneral,
  PackageItem,
  ProductionSession,
  Rider,
  SemesterPlan,
  ServiceContract,
  StrategyPrefillPayload,
} from '../types/domain';

const ensure = <T>(data: T | null, error: { message: string } | null): T => {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error('No se encontró información.');
  return data;
};

const normalizeSettingsError = (message: string) => {
  if (message.includes("public.settings") && message.includes('schema cache')) {
    return 'Falta la tabla `settings` en Supabase. Aplica las migraciones del proyecto y vuelve a intentar.';
  }
  return message;
};

const toString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const toArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];

export const profileApi = {
  async getMine() {
    const sb = requireSupabase();
    const {
      data: { user },
      error: authError,
    } = await sb.auth.getUser();
    if (authError) throw new Error(authError.message);
    if (!user) return null;

    const { data, error } = await sb.from('profiles').select('*').eq('id', user.id).single();
    return ensure(data, error);
  },
};

export const clientApi = {
  async list() {
    const sb = requireSupabase();
    const { data, error } = await sb.from('clients').select('*').order('name');
    return ensure(data, error) as Client[];
  },
  async get(id: string) {
    const sb = requireSupabase();
    const { data, error } = await sb.from('clients').select('*').eq('id', id).single();
    return ensure(data, error) as Client;
  },
  async create(payload: Partial<Client>) {
    const sb = requireSupabase();
    const { data, error } = await sb.from('clients').insert(payload).select('*').single();
    return ensure(data, error) as Client;
  },
  async update(id: string, payload: Partial<Client>) {
    const sb = requireSupabase();
    const { data, error } = await sb.from('clients').update(payload).eq('id', id).select('*').single();
    return ensure(data, error) as Client;
  },
};

export const packageApi = {
  async list(activeOnly = true) {
    const sb = requireSupabase();
    let query = sb.from('packages').select('*, package_items(*)').order('name');
    if (activeOnly) query = query.eq('is_active', true);
    const { data, error } = await query;
    return ensure(data, error) as Array<{
      id: string;
      name: string;
      price: number;
      description: string | null;
      is_active: boolean;
      package_items: PackageItem[];
    }>;
  },
  async create(payload: { name: string; price: number; description?: string }) {
    const sb = requireSupabase();
    const { data, error } = await sb
      .from('packages')
      .insert({ ...payload, is_active: true })
      .select('*')
      .single();
    return ensure(data, error) as {
      id: string;
      name: string;
      price: number;
      description: string | null;
      is_active: boolean;
    };
  },
  async update(id: string, payload: { name?: string; price?: number; description?: string; is_active?: boolean }) {
    const sb = requireSupabase();
    const { data, error } = await sb.from('packages').update(payload).eq('id', id).select('*').single();
    return ensure(data, error);
  },
  async addItem(payload: Partial<PackageItem>) {
    const sb = requireSupabase();
    const { data, error } = await sb.from('package_items').insert(payload).select('*').single();
    return ensure(data, error) as PackageItem;
  },
  async updateItem(id: string, payload: Partial<PackageItem>) {
    const sb = requireSupabase();
    const { data, error } = await sb.from('package_items').update(payload).eq('id', id).select('*').single();
    return ensure(data, error) as PackageItem;
  },
  async deleteItem(id: string) {
    const sb = requireSupabase();
    const { error } = await sb.from('package_items').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
};

export const serviceContractApi = {
  async listByClient(clientId: string) {
    const sb = requireSupabase();
    const { data, error } = await sb
      .from('service_contracts')
      .select('*, packages(name)')
      .eq('client_id', clientId)
      .order('start_date', { ascending: false });
    return ensure(data, error) as Array<ServiceContract & { packages: { name: string } | null }>;
  },
  async getActiveForClient(clientId: string, forDate: string) {
    const sb = requireSupabase();
    const { data, error } = await sb
      .from('service_contracts')
      .select('*, packages(name)')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .lte('start_date', forDate)
      .or(`end_date.is.null,end_date.gte.${forDate}`)
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data as (ServiceContract & { packages: { name: string } | null }) | null;
  },
  async upsertActive(payload: {
    client_id: string;
    package_id: string;
    start_date: string;
    end_date?: string | null;
    monthly_price?: number;
    payment_status?: string;
    notes?: string;
  }) {
    const sb = requireSupabase();

    const { data: existing, error: findError } = await sb
      .from('service_contracts')
      .select('*')
      .eq('client_id', payload.client_id)
      .eq('status', 'active')
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findError) throw new Error(findError.message);

    if (existing) {
      const { data, error } = await sb
        .from('service_contracts')
        .update({
          package_id: payload.package_id,
          start_date: payload.start_date,
          end_date: payload.end_date ?? null,
          monthly_price: payload.monthly_price ?? existing.monthly_price ?? 0,
          payment_status: payload.payment_status ?? existing.payment_status ?? 'pending',
          notes: payload.notes ?? existing.notes ?? null,
        })
        .eq('id', existing.id)
        .select('*')
        .single();
      return ensure(data, error) as ServiceContract;
    }

    const { data, error } = await sb
      .from('service_contracts')
      .insert({
        client_id: payload.client_id,
        package_id: payload.package_id,
        start_date: payload.start_date,
        end_date: payload.end_date ?? null,
        monthly_price: payload.monthly_price ?? 0,
        payment_status: payload.payment_status ?? 'pending',
        status: 'active',
        notes: payload.notes ?? null,
      })
      .select('*')
      .single();

    return ensure(data, error) as ServiceContract;
  },
};

export const objectiveApi = {
  async list() {
    const sb = requireSupabase();
    const { data, error } = await sb.from('objective_generals').select('*').order('created_at', { ascending: false });
    return ensure(data, error) as ObjectiveGeneral[];
  },
  async create(payload: Partial<ObjectiveGeneral>) {
    const sb = requireSupabase();
    const { data, error } = await sb.from('objective_generals').insert(payload).select('*').single();
    return ensure(data, error) as ObjectiveGeneral;
  },
};

export const semesterApi = {
  async list(objectiveId?: string) {
    const sb = requireSupabase();
    let query = sb.from('semester_plans').select('*').order('start_date', { ascending: false });
    if (objectiveId) query = query.eq('objective_general_id', objectiveId);
    const { data, error } = await query;
    return ensure(data, error) as SemesterPlan[];
  },
  async create(payload: Partial<SemesterPlan>) {
    const sb = requireSupabase();
    const { data, error } = await sb.from('semester_plans').insert(payload).select('*').single();
    return ensure(data, error) as SemesterPlan;
  },
};

export const campaignApi = {
  async list() {
    const sb = requireSupabase();
    const { data, error } = await sb
      .from('monthly_campaigns')
      .select('*, objective_generals(title), semester_plans(name), clients(name)')
      .order('month_date', { ascending: false });
    return ensure(data, error) as Array<MonthlyCampaign & {
      objective_generals: { title: string } | null;
      semester_plans: { name: string } | null;
      clients: { name: string } | null;
    }>;
  },
  async get(id: string) {
    const sb = requireSupabase();
    const { data, error } = await sb
      .from('monthly_campaigns')
      .select('*, objective_generals(*), semester_plans(*), clients(*)')
      .eq('id', id)
      .single();
    return ensure(data, error) as MonthlyCampaign & {
      objective_generals: ObjectiveGeneral;
      semester_plans: SemesterPlan;
      clients: { id: string; name: string };
    };
  },
  async create(payload: Partial<MonthlyCampaign>) {
    const sb = requireSupabase();
    const { data, error } = await sb.from('monthly_campaigns').insert(payload).select('*').single();
    return ensure(data, error) as MonthlyCampaign;
  },
  async update(id: string, payload: Partial<MonthlyCampaign>) {
    const sb = requireSupabase();
    const { data, error } = await sb.from('monthly_campaigns').update(payload).eq('id', id).select('*').single();
    return ensure(data, error) as MonthlyCampaign;
  },
};

export const feedApi = {
  async list(campaignId: string) {
    const sb = requireSupabase();
    const { data, error } = await sb
      .from('feed_items')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('grid_position', { ascending: true });
    return ensure(data, error) as FeedItem[];
  },
  async create(payload: Partial<FeedItem>) {
    const sb = requireSupabase();
    const { data, error } = await sb.from('feed_items').insert(payload).select('*').single();
    return ensure(data, error) as FeedItem;
  },
  async update(id: string, payload: Partial<FeedItem>) {
    const sb = requireSupabase();
    const { data, error } = await sb.from('feed_items').update(payload).eq('id', id).select('*').single();
    return ensure(data, error) as FeedItem;
  },
  async reorder(campaignId: string, orderedIds: string[]) {
    const sb = requireSupabase();
    const updates = orderedIds.map((id, index) =>
      sb.from('feed_items').update({ grid_position: index + 1 }).eq('campaign_id', campaignId).eq('id', id),
    );
    const results = await Promise.all(updates);
    const failed = results.find((x) => x.error);
    if (failed?.error) throw new Error(failed.error.message);
  },
};

export const productionApi = {
  async list(campaignId: string) {
    const sb = requireSupabase();
    const { data, error } = await sb
      .from('production_sessions')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('date', { ascending: true });
    return ensure(data, error) as ProductionSession[];
  },
  async create(payload: Partial<ProductionSession>) {
    const sb = requireSupabase();
    const { data, error } = await sb.from('production_sessions').insert(payload).select('*').single();
    return ensure(data, error) as ProductionSession;
  },
  async update(id: string, payload: Partial<ProductionSession>) {
    const sb = requireSupabase();
    const { data, error } = await sb.from('production_sessions').update(payload).eq('id', id).select('*').single();
    return ensure(data, error) as ProductionSession;
  },
};

export const riderApi = {
  async list() {
    const sb = requireSupabase();
    const { data, error } = await sb
      .from('riders')
      .select('*, monthly_campaigns(name, clients(name))')
      .order('updated_at', { ascending: false });
    return ensure(data, error) as Array<Rider & {
      monthly_campaigns: { name: string; clients: { name: string } | null } | null;
    }>;
  },
  async get(id: string) {
    const sb = requireSupabase();
    const { data, error } = await sb.from('riders').select('*').eq('id', id).single();
    return ensure(data, error) as Rider;
  },
  async create(payload: Partial<Rider>) {
    const sb = requireSupabase();
    const { data, error } = await sb.from('riders').insert(payload).select('*').single();
    return ensure(data, error) as Rider;
  },
  async update(id: string, payload: Partial<Rider>) {
    const sb = requireSupabase();
    const { data, error } = await sb.from('riders').update(payload).eq('id', id).select('*').single();
    return ensure(data, error) as Rider;
  },
  async generatePdf(riderId: string) {
    const sb = requireSupabase();
    const { data, error } = await sb.functions.invoke('generate-rider-pdf', {
      body: { rider_id: riderId },
    });
    return ensure(data, error) as { pdf_url: string; path: string };
  },
};

export const reportApi = {
  async create(payload: Record<string, unknown>) {
    const sb = requireSupabase();
    const { data, error } = await sb.from('internal_reports').insert(payload).select('*').single();
    return ensure(data, error);
  },
};

export const settingsApi = {
  async list() {
    const sb = requireSupabase();
    const { data, error } = await sb.from('settings').select('*');
    if (error) throw new Error(normalizeSettingsError(error.message));
    if (!data) throw new Error('No se encontró información.');
    return data as Array<{
      id: string;
      key: string;
      value: string;
      encrypted: boolean;
    }>;
  },
  async upsert(key: string, value: string, encrypted = false) {
    const sb = requireSupabase();
    const { data, error } = await sb
      .from('settings')
      .upsert({ key, value, encrypted }, { onConflict: 'key' })
      .select('*')
      .single();
    if (error) throw new Error(normalizeSettingsError(error.message));
    if (!data) throw new Error('No se pudo guardar la configuración.');
    return data;
  },
  async getMap() {
    const settings = await settingsApi.list();
    return new Map(settings.map((item) => [item.key, item.value]));
  },
  async verifyConnections(payload: {
    openai_key: string;
    serper_api_key: string;
    ai_model: string;
  }) {
    const sb = requireSupabase();
    const { data, error } = await sb.functions.invoke('verify-provider-connections', {
      body: payload,
    });
    return ensure(data, error) as ConnectionsVerificationResult;
  },
};

export const snapshotApi = {
  async listByClient(clientId: string) {
    const sb = requireSupabase();
    const { data, error } = await sb
      .from('client_account_snapshots')
      .select('*')
      .eq('client_id', clientId)
      .order('captured_at', { ascending: false });
    return ensure(data, error) as ClientAccountSnapshot[];
  },
  async create(payload: Partial<ClientAccountSnapshot>) {
    const sb = requireSupabase();
    const { data, error } = await sb.from('client_account_snapshots').insert(payload).select('*').single();
    return ensure(data, error) as ClientAccountSnapshot;
  },
  async update(id: string, payload: Partial<ClientAccountSnapshot>) {
    const sb = requireSupabase();
    const { data, error } = await sb
      .from('client_account_snapshots')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    return ensure(data, error) as ClientAccountSnapshot;
  },
};

export const researchApi = {
  async listByClient(clientId: string) {
    const sb = requireSupabase();
    const { data, error } = await sb
      .from('ai_research_reports')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    return ensure(data, error) as AIResearchReport[];
  },
  async get(id: string) {
    const sb = requireSupabase();
    const { data, error } = await sb.from('ai_research_reports').select('*').eq('id', id).single();
    return ensure(data, error) as AIResearchReport;
  },
  async generateContext(payload: {
    client_id: string;
    snapshot_id: string;
    scope?: 'local_global';
    local_limit?: number;
    global_limit?: number;
  }) {
    const sb = requireSupabase();
    const { data, error } = await sb.functions.invoke('research-client-context', {
      body: {
        scope: 'local_global',
        local_limit: 10,
        global_limit: 10,
        ...payload,
      },
    });
    return ensure(data, error) as { mode: string; report: AIResearchReport; message?: string };
  },
  async generateDiagnostic(payload: {
    client_id: string;
    snapshot_id: string;
    research_report_id: string;
  }) {
    const sb = requireSupabase();
    const { data, error } = await sb.functions.invoke('generate-account-diagnostic', {
      body: payload,
    });
    return ensure(data, error) as { mode: string; report: AIResearchReport; message?: string };
  },
  async updateDiagnostic(id: string, diagnostic_json: Record<string, unknown>) {
    const sb = requireSupabase();
    const { data, error } = await sb
      .from('ai_research_reports')
      .update({ diagnostic_json, status: 'ready' })
      .eq('id', id)
      .select('*')
      .single();
    return ensure(data, error) as AIResearchReport;
  },
  async updateResearch(id: string, research_json: Record<string, unknown>) {
    const sb = requireSupabase();
    const { data, error } = await sb
      .from('ai_research_reports')
      .update({ research_json })
      .eq('id', id)
      .select('*')
      .single();
    return ensure(data, error) as AIResearchReport;
  },
  async setStatus(id: string, status: AIResearchReport['status']) {
    const sb = requireSupabase();
    const { data, error } = await sb.from('ai_research_reports').update({ status }).eq('id', id).select('*').single();
    return ensure(data, error) as AIResearchReport;
  },
};

export const strategyPrefillApi = {
  async listByClient(clientId: string) {
    const sb = requireSupabase();
    const { data, error } = await sb
      .from('strategy_prefill_payloads')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    return ensure(data, error) as StrategyPrefillPayload[];
  },
  async listAll() {
    const sb = requireSupabase();
    const { data, error } = await sb
      .from('strategy_prefill_payloads')
      .select('*, clients(name), ai_research_reports(status)')
      .order('created_at', { ascending: false });
    return ensure(data, error) as Array<
      StrategyPrefillPayload & {
        clients: { name: string } | null;
        ai_research_reports: { status: string } | null;
      }
    >;
  },
  async generate(payload: { client_id: string; report_id: string }) {
    const sb = requireSupabase();
    const { data, error } = await sb.functions.invoke('generate-strategy-prefill', {
      body: payload,
    });
    return ensure(data, error) as { mode: string; prefill: StrategyPrefillPayload; message?: string };
  },
  async get(id: string) {
    const sb = requireSupabase();
    const { data, error } = await sb.from('strategy_prefill_payloads').select('*').eq('id', id).single();
    return ensure(data, error) as StrategyPrefillPayload;
  },
  async apply(prefillId: string) {
    const sb = requireSupabase();
    const prefill = await strategyPrefillApi.get(prefillId);

    const objectivePayload = prefill.objective_payload_json ?? {};
    const semesterPayload = prefill.semester_payload_json ?? {};
    const campaignPayload = prefill.monthly_campaign_payload_json ?? {};

    const { data: objective, error: objectiveError } = await sb
      .from('objective_generals')
      .insert({
        client_id: prefill.client_id,
        title: toString(objectivePayload.title, 'Objetivo General'),
        business_goal: toString(objectivePayload.business_goal, 'Definir objetivo de negocio'),
        primary_kpi: toString(objectivePayload.primary_kpi, 'KPI principal'),
        target_value: toString(objectivePayload.target_value, 'Definir meta'),
        start_date: toString(objectivePayload.start_date, new Date().toISOString().slice(0, 10)),
        end_date: toString(objectivePayload.end_date, new Date().toISOString().slice(0, 10)),
        status: toString(objectivePayload.status, 'draft'),
      })
      .select('*')
      .single();

    if (objectiveError) throw new Error(objectiveError.message);

    const { data: semester, error: semesterError } = await sb
      .from('semester_plans')
      .insert({
        objective_general_id: objective.id,
        name: toString(semesterPayload.name, 'Plan Semestral'),
        start_date: toString(semesterPayload.start_date, objective.start_date),
        end_date: toString(semesterPayload.end_date, objective.end_date),
        strategic_focus: toString(semesterPayload.strategic_focus, 'Definir enfoque'),
        pillars: toArray(semesterPayload.pillars),
        risks: toArray(semesterPayload.risks),
        status: toString(semesterPayload.status, 'draft'),
      })
      .select('*')
      .single();

    if (semesterError) throw new Error(semesterError.message);

    const { data: campaign, error: campaignError } = await sb
      .from('monthly_campaigns')
      .insert({
        objective_general_id: objective.id,
        semester_plan_id: semester.id,
        client_id: prefill.client_id,
        month_date: toString(campaignPayload.month_date, semester.start_date),
        name: toString(campaignPayload.name, 'Campaña mensual'),
        monthly_goal: toString(campaignPayload.monthly_goal, 'Definir objetivo mensual'),
        audience: toString(campaignPayload.audience, 'Definir audiencia'),
        tone: toString(campaignPayload.tone, 'Definir tono'),
        cta: toString(campaignPayload.cta, 'Definir CTA'),
        promotion: toString(campaignPayload.promotion, ''),
        status: toString(campaignPayload.status, 'brief'),
      })
      .select('*')
      .single();

    if (campaignError) throw new Error(campaignError.message);

    const { error: prefillUpdateError } = await sb
      .from('strategy_prefill_payloads')
      .update({ status: 'applied' })
      .eq('id', prefill.id);

    if (prefillUpdateError) throw new Error(prefillUpdateError.message);

    return {
      objective,
      semester,
      campaign,
    };
  },
};

export const gridSuggestionApi = {
  async listByCampaign(campaignId: string) {
    const sb = requireSupabase();
    const { data, error } = await sb
      .from('monthly_grid_suggestions')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });
    return ensure(data, error) as MonthlyGridSuggestion[];
  },
  async generate(campaign_id: string) {
    const sb = requireSupabase();
    const { data, error } = await sb.functions.invoke('generate-package-grid-suggestions', {
      body: { campaign_id },
    });
    return ensure(data, error) as { mode: string; suggestion: MonthlyGridSuggestion; message?: string };
  },
  async apply(campaign_id: string, selected_slots: number[]) {
    const sb = requireSupabase();
    const { data, error } = await sb.functions.invoke('apply-grid-suggestions', {
      body: { campaign_id, selected_slots },
    });
    return ensure(data, error) as {
      inserted: number;
      skipped: number;
      message?: string;
    };
  },
};
