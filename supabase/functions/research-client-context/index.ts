import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

interface Payload {
  client_id: string;
  snapshot_id: string;
  scope?: 'local_global';
  local_limit?: number;
  global_limit?: number;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

const serperSearch = async (apiKey: string, query: string, num: number) => {
  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify({ q: query, num }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Serper error: ${text}`);
  }

  const data = await response.json();
  const items = Array.isArray(data.organic) ? data.organic : [];
  return items.slice(0, num).map((item: Record<string, unknown>) => ({
    title: String(item.title ?? ''),
    snippet: String(item.snippet ?? ''),
    link: String(item.link ?? ''),
  }));
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = (await req.json()) as Payload;
    if (!body.client_id || !body.snapshot_id) {
      return new Response(JSON.stringify({ error: 'client_id y snapshot_id son requeridos' }), {
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

    const [{ data: client, error: clientError }, { data: snapshot, error: snapshotError }, { data: settings, error: settingsError }] = await Promise.all([
      supabase.from('clients').select('*').eq('id', body.client_id).single(),
      supabase.from('client_account_snapshots').select('*').eq('id', body.snapshot_id).single(),
      supabase.from('settings').select('key,value'),
    ]);

    if (clientError || !client) throw new Error(clientError?.message ?? 'Cliente no encontrado');
    if (snapshotError || !snapshot) throw new Error(snapshotError?.message ?? 'Snapshot no encontrado');
    if (settingsError || !settings) throw new Error(settingsError?.message ?? 'No se pudieron leer settings');

    const map = new Map(settings.map((item) => [item.key, item.value]));
    const openaiKey = map.get('openai_key');
    const aiModel = map.get('ai_model') ?? 'gpt-5.2-mini';
    const serperKey = map.get('serper_api_key');

    const localLimit = body.local_limit ?? 10;
    const globalLimit = body.global_limit ?? 10;

    if (!openaiKey || !serperKey) {
      const { data: report, error: reportError } = await supabase
        .from('ai_research_reports')
        .insert({
          client_id: body.client_id,
          snapshot_id: body.snapshot_id,
          scope: body.scope ?? 'local_global',
          research_json: {
            mode: 'demo',
            summary: 'Configura openai_key y serper_api_key en Settings para investigación web automática.',
            niche: client.industry,
            location: `${client.city ?? ''} ${client.zone ?? ''}`.trim(),
            local_competitors: [],
            global_competitors: [],
            what_works: [],
          },
          status: 'draft',
        })
        .select('*')
        .single();

      if (reportError || !report) throw new Error(reportError?.message ?? 'No se pudo crear reporte demo');

      return new Response(JSON.stringify({ mode: 'demo', message: 'Agrega API keys para investigación real.', report }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const localQuery = `${client.name} ${client.industry ?? ''} competidores ${client.city ?? ''} ${client.zone ?? ''}`;
    const globalQuery = `${client.industry ?? ''} top global competitors social media strategy`;

    const [localCompetitors, globalCompetitors] = await Promise.all([
      serperSearch(serperKey, localQuery, localLimit),
      serperSearch(serperKey, globalQuery, globalLimit),
    ]);

    const prompt = `
Analiza este cliente para agencia de contenido:
Cliente: ${client.name}
Nicho: ${client.industry ?? ''}
Ubicación: ${client.city ?? ''} ${client.zone ?? ''}
Redes: Instagram ${snapshot.instagram_handle ?? client.instagram ?? ''}, TikTok ${snapshot.tiktok_handle ?? client.tiktok ?? ''}, Facebook ${snapshot.facebook_handle ?? client.facebook ?? ''}
Métricas: followers=${snapshot.followers ?? 'NA'}, avg_views=${snapshot.avg_views ?? 'NA'}, engagement=${snapshot.engagement_rate ?? 'NA'}, frecuencia=${snapshot.posting_frequency ?? 'NA'}

Competidores locales:
${JSON.stringify(localCompetitors)}

Competidores globales:
${JSON.stringify(globalCompetitors)}

Devuelve JSON con estructura:
{
  "market_summary": "",
  "local_competitors": [{"name":"","why_relevant":"","link":""}],
  "global_competitors": [{"name":"","why_relevant":"","link":""}],
  "strategies_that_work": [""],
  "content_angles": [""],
  "recommendations": [""],
  "risk_watchouts": [""]
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
        temperature: 0.45,
        messages: [
          {
            role: 'system',
            content:
              'Eres estratega de social media para agencias creativas en México. Responde JSON válido y concreto.',
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

    const research = parseJsonFromLLM<Record<string, unknown>>(raw, {
      market_summary: '',
      local_competitors: localCompetitors,
      global_competitors: globalCompetitors,
      strategies_that_work: [],
      content_angles: [],
      recommendations: [],
      risk_watchouts: [],
    });

    if (!research.local_competitors) research.local_competitors = localCompetitors;
    if (!research.global_competitors) research.global_competitors = globalCompetitors;

    const { data: report, error: reportError } = await supabase
      .from('ai_research_reports')
      .insert({
        client_id: body.client_id,
        snapshot_id: body.snapshot_id,
        scope: body.scope ?? 'local_global',
        research_json: research,
        status: 'draft',
      })
      .select('*')
      .single();

    if (reportError || !report) throw new Error(reportError?.message ?? 'No se pudo guardar investigación');

    return new Response(JSON.stringify({ mode: 'live', report }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'No se pudo investigar cliente' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
