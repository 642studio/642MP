import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

interface Payload {
  client_id: string;
  snapshot_id: string;
  research_report_id: string;
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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = (await req.json()) as Payload;
    if (!body.client_id || !body.snapshot_id || !body.research_report_id) {
      return new Response(JSON.stringify({ error: 'client_id, snapshot_id y research_report_id son requeridos' }), {
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

    const [{ data: client, error: clientError }, { data: snapshot, error: snapshotError }, { data: report, error: reportError }, { data: settings, error: settingsError }] = await Promise.all([
      supabase.from('clients').select('*').eq('id', body.client_id).single(),
      supabase.from('client_account_snapshots').select('*').eq('id', body.snapshot_id).single(),
      supabase.from('ai_research_reports').select('*').eq('id', body.research_report_id).single(),
      supabase.from('settings').select('key,value'),
    ]);

    if (clientError || !client) throw new Error(clientError?.message ?? 'Cliente no encontrado');
    if (snapshotError || !snapshot) throw new Error(snapshotError?.message ?? 'Snapshot no encontrado');
    if (reportError || !report) throw new Error(reportError?.message ?? 'Reporte de investigación no encontrado');
    if (settingsError || !settings) throw new Error(settingsError?.message ?? 'No se pudieron leer settings');

    const map = new Map(settings.map((item) => [item.key, item.value]));
    const openaiKey = map.get('openai_key');
    const aiModel = map.get('ai_model') ?? 'gpt-5.2-mini';

    const fallbackDiagnostic = {
      executive_summary: 'Diagnóstico en modo demo. Configura OpenAI para un análisis más profundo.',
      account_health: {
        strengths: ['Base de datos del cliente registrada', 'Métricas iniciales capturadas'],
        weaknesses: ['Falta análisis IA completo'],
      },
      swot: {
        strengths: ['Marca activa'],
        weaknesses: ['Estrategia mensual no consolidada'],
        opportunities: ['Potenciar contenidos por pilares'],
        threats: ['Competencia con mayor frecuencia de publicación'],
      },
      opportunities: ['Definir calendarización con paquete contratado', 'Aumentar consistencia editorial'],
      risks: ['Variación de engagement por falta de narrativa unificada'],
      priority_actions: [
        'Alinear objetivo semestral',
        'Definir plan mensual por tipo de entregable',
        'Implementar loop de aprobación y optimización',
      ],
    };

    let diagnostic = fallbackDiagnostic as Record<string, unknown>;

    if (openaiKey) {
      const prompt = `
Genera un diagnóstico actual de cuenta de redes sociales para agencia:
Cliente: ${client.name}
Nicho: ${client.industry ?? ''}
Ubicación: ${client.city ?? ''} ${client.zone ?? ''}
Métricas: followers=${snapshot.followers ?? 'NA'}, avg_views=${snapshot.avg_views ?? 'NA'}, engagement=${snapshot.engagement_rate ?? 'NA'}, frecuencia=${snapshot.posting_frequency ?? 'NA'}
Top posts: ${snapshot.top_posts_notes ?? ''}
Investigación previa JSON: ${JSON.stringify(report.research_json)}

Responde solo JSON con estructura:
{
  "executive_summary":"",
  "account_health":{"strengths":[""],"weaknesses":[""]},
  "swot":{"strengths":[""],"weaknesses":[""],"opportunities":[""],"threats":[""]},
  "opportunities":[""],
  "risks":[""],
  "priority_actions":[""],
  "what_is_working_now":[""],
  "what_to_stop_doing":[""]
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
          temperature: 0.35,
          messages: [
            {
              role: 'system',
              content: 'Eres consultor senior de social media y performance orgánico para marcas.',
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
      diagnostic = parseJsonFromLLM(raw, fallbackDiagnostic);
    }

    const { data: updated, error: updateError } = await supabase
      .from('ai_research_reports')
      .update({
        diagnostic_json: diagnostic,
        status: 'ready',
      })
      .eq('id', report.id)
      .select('*')
      .single();

    if (updateError || !updated) throw new Error(updateError?.message ?? 'No se pudo guardar diagnóstico');

    return new Response(JSON.stringify({ mode: openaiKey ? 'live' : 'demo', report: updated }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'No se pudo generar diagnóstico' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
