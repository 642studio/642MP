import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

interface Payload {
  client_id: string;
  report_id: string;
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

const normalizeModel = (value?: string | null) => {
  const model = (value ?? '').trim();
  if (!model || model === 'gpt-5.2-mini') return 'gpt-5-mini';
  return model;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = (await req.json()) as Payload;
    if (!body.client_id || !body.report_id) {
      return new Response(JSON.stringify({ error: 'client_id y report_id son requeridos' }), {
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

    const [{ data: client, error: clientError }, { data: report, error: reportError }, { data: settings, error: settingsError }] = await Promise.all([
      supabase.from('clients').select('*').eq('id', body.client_id).single(),
      supabase.from('ai_research_reports').select('*').eq('id', body.report_id).single(),
      supabase.from('settings').select('key,value'),
    ]);

    if (clientError || !client) throw new Error(clientError?.message ?? 'Cliente no encontrado');
    if (reportError || !report) throw new Error(reportError?.message ?? 'Reporte no encontrado');
    if (report.status !== 'ready' && report.status !== 'approved') {
      throw new Error('El reporte debe estar ready/approved para generar prefill');
    }
    if (settingsError || !settings) throw new Error(settingsError?.message ?? 'No se pudieron leer settings');

    const map = new Map(settings.map((item) => [item.key, item.value]));
    const openaiKey = map.get('openai_key');
    const aiModel = normalizeModel(map.get('ai_model'));

    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;
    const semesterStart = month <= 6 ? `${year}-01-01` : `${year}-07-01`;
    const semesterEnd = month <= 6 ? `${year}-06-30` : `${year}-12-31`;
    const monthDate = `${year}-${String(month).padStart(2, '0')}-01`;

    const fallback = {
      objective_payload: {
        title: `Objetivo general ${client.name}`,
        business_goal: `Consolidar crecimiento de ${client.name} en ${client.industry ?? 'su nicho'}.`,
        primary_kpi: 'Leads calificados',
        target_value: 'Definir meta mensual con equipo',
        start_date: semesterStart,
        end_date: semesterEnd,
        status: 'draft',
      },
      semester_payload: {
        name: `Plan semestral ${month <= 6 ? 'Ene-Jun' : 'Jul-Dic'} ${year}`,
        start_date: semesterStart,
        end_date: semesterEnd,
        strategic_focus: 'Alinear contenido con objetivos de negocio y diferenciadores competitivos.',
        pillars: ['Educativo', 'Conversión', 'Autoridad de marca'],
        risks: ['Inconsistencia de publicación', 'Saturación promocional'],
        status: 'draft',
      },
      monthly_campaign_payload: {
        month_date: monthDate,
        name: `Campaña ${new Intl.DateTimeFormat('es-MX', { month: 'long' }).format(now)} ${year}`,
        monthly_goal: 'Incrementar interacción y calidad de leads con contenidos de alto valor.',
        audience: 'Audiencia objetivo definida por cliente y diagnóstico',
        tone: 'Cercano, experto y accionable',
        cta: 'Solicita información / agenda asesoría',
        promotion: '',
        status: 'brief',
      },
    };

    let payload = fallback;

    if (openaiKey) {
      const prompt = `
Usando este diagnóstico JSON: ${JSON.stringify(report.diagnostic_json)}
Y esta investigación JSON: ${JSON.stringify(report.research_json)}
Genera un prefill de estrategia para 642MP del cliente ${client.name}.

Responde SOLO JSON con estructura:
{
  "objective_payload": {
    "title":"",
    "business_goal":"",
    "primary_kpi":"",
    "target_value":"",
    "start_date":"YYYY-MM-DD",
    "end_date":"YYYY-MM-DD",
    "status":"draft"
  },
  "semester_payload": {
    "name":"",
    "start_date":"YYYY-MM-DD",
    "end_date":"YYYY-MM-DD",
    "strategic_focus":"",
    "pillars":[""],
    "risks":[""],
    "status":"draft"
  },
  "monthly_campaign_payload": {
    "month_date":"YYYY-MM-DD",
    "name":"",
    "monthly_goal":"",
    "audience":"",
    "tone":"",
    "cta":"",
    "promotion":"",
    "status":"brief"
  }
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
          temperature: 0.4,
          messages: [
            {
              role: 'system',
              content:
                'Eres planner estratégico de agencia. Debes proponer estructura accionable y compatible con el flujo mensual.',
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
      payload = parseJsonFromLLM(raw, fallback);
    }

    const { data: prefill, error: prefillError } = await supabase
      .from('strategy_prefill_payloads')
      .insert({
        client_id: body.client_id,
        report_id: body.report_id,
        objective_payload_json: payload.objective_payload,
        semester_payload_json: payload.semester_payload,
        monthly_campaign_payload_json: payload.monthly_campaign_payload,
        status: 'generated',
      })
      .select('*')
      .single();

    if (prefillError || !prefill) throw new Error(prefillError?.message ?? 'No se pudo guardar prefill');

    return new Response(JSON.stringify({ mode: openaiKey ? 'live' : 'demo', prefill }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'No se pudo generar prefill' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
