import fs from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const [, , inputPath] = process.argv;
if (!inputPath) {
  console.error('Uso: npm run import:legacy -- /ruta/legacy-state.json');
  process.exit(1);
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY para importar.');
  process.exit(1);
}

const monthMap: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

const monthDate = (monthLabel: string, year: number) => {
  const m = monthMap[(monthLabel || '').toLowerCase()] ?? 1;
  return `${year}-${String(m).padStart(2, '0')}-01`;
};

const semesterRange = (monthDateValue: string) => {
  const d = new Date(monthDateValue);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  if (month <= 6) return { start: `${year}-01-01`, end: `${year}-06-30`, label: `Semestre Ene-Jun ${year}` };
  return { start: `${year}-07-01`, end: `${year}-12-31`, label: `Semestre Jul-Dic ${year}` };
};

const safe = (value: unknown) => (typeof value === 'string' ? value : '');

const run = async () => {
  const raw = await fs.readFile(inputPath, 'utf-8');
  const legacy = JSON.parse(raw);

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const clientMap = new Map<string, string>();
  const packageMap = new Map<string, string>();
  const objectiveMap = new Map<string, string>();
  const semesterMap = new Map<string, string>();

  for (const client of legacy.clients ?? []) {
    const { data, error } = await supabase
      .from('clients')
      .insert({
        name: safe(client.name),
        industry: safe(client.niche),
        city: safe(client.city),
        instagram: safe(client.ig),
        website: safe(client.web),
        contact_name: safe(client.contact),
        status: client.status === 'finalized' ? 'finished' : client.status,
      })
      .select('id')
      .single();
    if (error) throw error;
    clientMap.set(client.id, data.id);
  }

  for (const pkg of legacy.packages ?? []) {
    const { data, error } = await supabase
      .from('packages')
      .insert({
        name: safe(pkg.name),
        price: Number(String(pkg.price ?? '').replace(/[^\d.]/g, '')) || 0,
        description: safe(pkg.tag),
      })
      .select('id')
      .single();
    if (error) throw error;
    packageMap.set(pkg.name, data.id);

    for (const item of pkg.deliverables ?? []) {
      const { error: itemError } = await supabase.from('package_items').insert({
        package_id: data.id,
        item_type: safe(item.type),
        quantity: Number(item.qty ?? 1),
        periodicity: (safe(item.period) || 'Mensual').toLowerCase().includes('seman')
          ? 'weekly'
          : (safe(item.period) || '').toLowerCase().includes('uni')
            ? 'one_time'
            : 'monthly',
      });
      if (itemError) throw itemError;
    }
  }

  for (const campaign of legacy.campaigns ?? []) {
    const clientId = clientMap.get(campaign.clientId);
    if (!clientId) continue;

    let objectiveId: string | null = objectiveMap.get(clientId) ?? null;
    if (!objectiveId) {
      const { data, error } = await supabase
        .from('objective_generals')
        .insert({
          client_id: clientId,
          title: `Objetivo General ${safe(campaign.clientName)}`,
          business_goal: safe(campaign.objective) || 'Objetivo migrado desde versión legacy',
          primary_kpi: 'Leads / Alcance',
          target_value: 'Definir en junta',
          start_date: `${campaign.year ?? 2026}-01-01`,
          end_date: `${campaign.year ?? 2026}-12-31`,
          status: 'active',
        })
        .select('id')
        .single();
      if (error) throw error;
      objectiveId = data.id;
      objectiveMap.set(clientId, data.id);
    }

    if (!objectiveId) continue;

    const month = monthDate(campaign.month ?? '', Number(campaign.year ?? 2026));
    const semester = semesterRange(month);
    const semKey = `${objectiveId}:${semester.start}`;

    let semesterId: string | null = semesterMap.get(semKey) ?? null;
    if (!semesterId) {
      const { data, error } = await supabase
        .from('semester_plans')
        .insert({
          objective_general_id: objectiveId,
          name: semester.label,
          start_date: semester.start,
          end_date: semester.end,
          strategic_focus: safe(campaign.objective) || 'Migración legacy',
          pillars: Array.isArray(campaign.contentPillars) ? campaign.contentPillars : [],
          risks: [],
          status: 'active',
        })
        .select('id')
        .single();
      if (error) throw error;
      semesterId = data.id;
      semesterMap.set(semKey, data.id);
    }

    if (!semesterId) continue;

    const { data: newCampaign, error: campaignError } = await supabase
      .from('monthly_campaigns')
      .insert({
        objective_general_id: objectiveId,
        semester_plan_id: semesterId,
        client_id: clientId,
        package_id: campaign.package ? packageMap.get(campaign.package) ?? null : null,
        month_date: month,
        name: safe(campaign.name),
        monthly_goal: safe(campaign.objective) || 'Objetivo migrado',
        audience: safe(campaign.audience),
        tone: safe(campaign.tone),
        cta: safe(campaign.mainCta),
        promotion: safe(campaign.activePromotion),
        status: campaign.status || 'planning',
      })
      .select('id')
      .single();

    if (campaignError) throw campaignError;

    for (const [index, item] of (legacy.feedItems?.[campaign.id] ?? []).entries()) {
      const { error: feedError } = await supabase.from('feed_items').insert({
        campaign_id: newCampaign.id,
        content_type: safe(item.type),
        internal_title: safe(item.title),
        public_title: safe(item.title),
        pillar: safe(item.pilar),
        objective: safe(item.copy),
        hook: safe(item.hook),
        cta: safe(item.cta),
        script: safe(item.script),
        internal_notes: safe(item.internalNotes),
        client_comments: safe(item.clientComments),
        status: item.state || 'idea',
        is_extra: Boolean(item.isExtra),
        grid_position: index + 1,
      });
      if (feedError) throw feedError;
    }
  }

  console.log('Importación legacy completada.');
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
