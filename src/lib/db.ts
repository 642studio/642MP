import { requireSupabase } from './supabase';
import type {
  FeedItem,
  Client,
  PackageItem,
  MonthlyCampaign,
  ObjectiveGeneral,
  ProductionSession,
  Rider,
  SemesterPlan,
} from '../types/domain';

const ensure = <T>(data: T | null, error: { message: string } | null): T => {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error('No se encontró información.');
  return data;
};

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
};

export const packageApi = {
  async list() {
    const sb = requireSupabase();
    const { data, error } = await sb.from('packages').select('*, package_items(*)').eq('is_active', true).order('name');
    return ensure(data, error) as Array<{
      id: string;
      name: string;
      price: number;
      description: string | null;
      package_items: PackageItem[];
    }>;
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
    return ensure(data, error) as Array<{
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
    return ensure(data, error);
  },
};
