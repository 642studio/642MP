import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

interface RequestPayload {
  campaign_id: string;
  missing_deliverables: Array<{ type: string; missing: number }>;
  context?: Record<string, unknown>;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = (await req.json()) as RequestPayload;
    if (!body.campaign_id) {
      return new Response(JSON.stringify({ error: 'campaign_id requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      throw new Error('Variables SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY requeridas.');
    }

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const [{ data: campaign, error: campaignError }, { data: settings, error: settingsError }] = await Promise.all([
      supabase
        .from('monthly_campaigns')
        .select(
          `
            *,
            clients(name,industry,city,zone),
            objective_generals(title,business_goal,primary_kpi,target_value),
            semester_plans(name,strategic_focus,pillars)
          `,
        )
        .eq('id', body.campaign_id)
        .single(),
      supabase.from('settings').select('key,value'),
    ]);

    if (campaignError || !campaign) throw new Error(campaignError?.message ?? 'Campaña no encontrada.');
    if (settingsError || !settings) throw new Error(settingsError?.message ?? 'No se pudo leer configuración.');

    const settingsMap = new Map(settings.map((item) => [item.key, item.value]));
    const openaiKey = settingsMap.get('openai_key');
    const model = settingsMap.get('ai_model') ?? 'gpt-5.2-mini';

    if (!openaiKey) {
      return new Response(
        JSON.stringify({
          mode: 'demo',
          message: 'Agrega una API Key para usar funciones IA',
          suggestions: [],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );
    }

    const prompt = `
Genera sugerencias de contenido para 642MediaPlanner.
Responde en JSON válido con el formato:
{
  "suggestions": [
    {
      "type": "Reel|Post|Carrusel|Historia",
      "title": "",
      "pillar": "",
      "hook": "",
      "objective": "",
      "cta": "",
      "description": "",
      "format": "",
      "production_notes": ""
    }
  ]
}

Contexto:
Cliente: ${campaign.clients?.name ?? ''}
Nicho: ${campaign.clients?.industry ?? ''}
Ciudad/Zona: ${campaign.clients?.city ?? ''} / ${campaign.clients?.zone ?? ''}
Objetivo general: ${campaign.objective_generals?.title ?? ''}
Meta negocio: ${campaign.objective_generals?.business_goal ?? ''}
Plan semestral: ${campaign.semester_plans?.name ?? ''}
Enfoque semestral: ${campaign.semester_plans?.strategic_focus ?? ''}
Pilares semestrales: ${(campaign.semester_plans?.pillars ?? []).join(', ')}
Campaña mensual: ${campaign.name}
Objetivo mensual: ${campaign.monthly_goal}
Tono: ${campaign.tone}
CTA: ${campaign.cta}
Promoción: ${campaign.promotion}
Faltantes paquete: ${JSON.stringify(body.missing_deliverables)}

Reglas:
- Respeta cantidades faltantes por tipo.
- No insertar automáticamente; solo sugerencias editables.
- Evita frases genéricas.
- Español operativo de agencia en México.
`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content:
              'Eres estratega y planner de contenidos de una agencia creativa. Devuelves JSON limpio para edición humana.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!openaiResponse.ok) {
      const text = await openaiResponse.text();
      throw new Error(`OpenAI error: ${text}`);
    }

    const completion = await openaiResponse.json();
    const raw = completion.choices?.[0]?.message?.content ?? '{"suggestions":[]}';

    let parsed: { suggestions: unknown[] } = { suggestions: [] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { suggestions: [] };
    }

    return new Response(
      JSON.stringify({
        mode: 'live',
        suggestions: parsed.suggestions ?? [],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'No se pudieron generar sugerencias' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
