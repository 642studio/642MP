import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

interface Payload {
  campaign_id: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const normalizeType = (value: string) => {
  const lower = value.toLowerCase();
  if (lower.includes('reel')) return 'Reel';
  if (lower.includes('post')) return 'Post';
  if (lower.includes('carr')) return 'Carrusel';
  if (lower.includes('hist')) return 'Historia';
  return value;
};

const parseJsonFromLLM = <T,>(text: string, fallback: T): T => {
  try {
    return JSON.parse(text) as T;
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1)) as T;
      } catch {
        return fallback;
      }
    }
    return fallback;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = (await req.json()) as Payload;
    if (!body.campaign_id) {
      return new Response(JSON.stringify({ error: 'campaign_id es requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorios');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const [{ data: campaign, error: campaignError }, { data: settings, error: settingsError }] = await Promise.all([
      supabase
        .from('monthly_campaigns')
        .select('*, clients(name,industry,city,zone), objective_generals(title), semester_plans(name)')
        .eq('id', body.campaign_id)
        .single(),
      supabase.from('settings').select('key,value'),
    ]);

    if (campaignError || !campaign) throw new Error(campaignError?.message ?? 'Campaña no encontrada');
    if (settingsError || !settings) throw new Error(settingsError?.message ?? 'No se pudieron leer settings');

    const settingsMap = new Map(settings.map((item) => [item.key, item.value]));
    const openaiKey = settingsMap.get('openai_key');
    const aiModel = settingsMap.get('ai_model') ?? 'gpt-5.2-mini';

    let packageId: string | null = campaign.package_id ?? null;

    if (!packageId) {
      const { data: activeContract, error: contractError } = await supabase
        .from('service_contracts')
        .select('*')
        .eq('client_id', campaign.client_id)
        .eq('status', 'active')
        .lte('start_date', campaign.month_date)
        .or(`end_date.is.null,end_date.gte.${campaign.month_date}`)
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (contractError) throw new Error(contractError.message);
      packageId = activeContract?.package_id ?? null;
    }

    if (!packageId) {
      return new Response(JSON.stringify({ error: 'No hay paquete activo para esta campaña.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const [{ data: packageItems, error: packageError }, { data: feedItems, error: feedError }] = await Promise.all([
      supabase.from('package_items').select('*').eq('package_id', packageId),
      supabase.from('feed_items').select('*').eq('campaign_id', campaign.id),
    ]);

    if (packageError || !packageItems) throw new Error(packageError?.message ?? 'No se pudieron leer package_items');
    if (feedError || !feedItems) throw new Error(feedError?.message ?? 'No se pudieron leer feed_items');

    const plannedMap = new Map<string, number>();
    feedItems.forEach((item) => {
      const key = normalizeType(String(item.content_type ?? ''));
      plannedMap.set(key, (plannedMap.get(key) ?? 0) + 1);
    });

    const missingSlots = packageItems.flatMap((item) => {
      const contentType = normalizeType(String(item.item_type ?? ''));
      const target = Number(item.quantity ?? 0);
      const current = plannedMap.get(contentType) ?? 0;
      const missing = Math.max(target - current, 0);
      return Array.from({ length: missing }).map((_, index) => ({
        slot_index: index,
        type: contentType,
      }));
    });

    if (missingSlots.length === 0) {
      const { data: suggestion, error: suggestionError } = await supabase
        .from('monthly_grid_suggestions')
        .insert({
          campaign_id: campaign.id,
          source: 'rules_plus_ai',
          suggestion_json: {
            package_id: packageId,
            message: 'Paquete cubierto. No hay faltantes por tipo.',
            slots: [],
          },
        })
        .select('*')
        .single();

      if (suggestionError || !suggestion) throw new Error(suggestionError?.message ?? 'No se pudo guardar sugerencia vacía');
      return new Response(JSON.stringify({ mode: 'rules', suggestion, message: 'No hay faltantes' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fallbackSlots = missingSlots.map((slot, index) => ({
      id: index,
      type: slot.type,
      pillar: 'Educativo',
      objective: `Cubrir cuota de ${slot.type} del paquete`,
      theme: `${slot.type} sobre tema clave del mes`,
      hook: `Gancho para ${slot.type}`,
      cta: campaign.cta || 'Conoce más',
    }));

    let slots = fallbackSlots;

    if (openaiKey) {
      const prompt = `
Genera slots de contenido para campaña mensual de agencia.
Cliente: ${campaign.clients?.name ?? ''}
Nicho: ${campaign.clients?.industry ?? ''}
Objetivo general: ${campaign.objective_generals?.title ?? ''}
Plan semestral: ${campaign.semester_plans?.name ?? ''}
Campaña mensual: ${campaign.name}
Objetivo mensual: ${campaign.monthly_goal}
Tono: ${campaign.tone}
CTA: ${campaign.cta}

Faltantes por tipo:
${JSON.stringify(missingSlots)}

Devuelve SOLO JSON con:
{
  "slots": [
    {
      "id": 0,
      "type": "Reel|Post|Carrusel|Historia",
      "pillar": "",
      "objective": "",
      "theme": "",
      "hook": "",
      "cta": ""
    }
  ]
}
`;

      const openaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: aiModel,
          temperature: 0.65,
          messages: [
            {
              role: 'system',
              content:
                'Eres estratega de contenidos. Debes respetar cantidades faltantes por tipo de entregable y ser concreto.',
            },
            { role: 'user', content: prompt },
          ],
        }),
      });

      if (!openaiResp.ok) {
        const text = await openaiResp.text();
        throw new Error(`OpenAI error: ${text}`);
      }

      const completion = await openaiResp.json();
      const raw = completion.choices?.[0]?.message?.content ?? '{}';
      const parsed = parseJsonFromLLM<{ slots?: Array<Record<string, unknown>> }>(raw, { slots: fallbackSlots });

      if (Array.isArray(parsed.slots) && parsed.slots.length > 0) {
        slots = parsed.slots.map((item, index) => ({
          id: Number(item.id ?? index),
          type: normalizeType(String(item.type ?? fallbackSlots[index % fallbackSlots.length]?.type ?? 'Post')),
          pillar: String(item.pillar ?? 'Educativo'),
          objective: String(item.objective ?? `Cubrir cuota de ${String(item.type ?? 'contenido')}`),
          theme: String(item.theme ?? 'Tema sugerido por IA'),
          hook: String(item.hook ?? 'Gancho sugerido por IA'),
          cta: String(item.cta ?? campaign.cta ?? 'Conoce más'),
        }));
      }
    }

    const suggestionPayload = {
      package_id: packageId,
      source: 'rules_plus_ai',
      missing_slots: missingSlots,
      slots,
    };

    const { data: suggestion, error: suggestionError } = await supabase
      .from('monthly_grid_suggestions')
      .insert({
        campaign_id: campaign.id,
        source: 'rules_plus_ai',
        suggestion_json: suggestionPayload,
      })
      .select('*')
      .single();

    if (suggestionError || !suggestion) throw new Error(suggestionError?.message ?? 'No se pudo guardar grid sugerido');

    return new Response(JSON.stringify({ mode: openaiKey ? 'live' : 'rules', suggestion }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'No se pudo generar grid sugerido' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
