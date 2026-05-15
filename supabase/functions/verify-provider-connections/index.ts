import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

interface Payload {
  openai_key: string;
  serper_api_key: string;
  ai_model?: string;
}

interface ProviderStatus {
  ok: boolean;
  message: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const safeMessage = (value: unknown, fallback: string) => {
  if (typeof value !== 'string') return fallback;
  return value.slice(0, 220);
};

const normalizeModel = (value?: string | null) => {
  const model = (value ?? '').trim();
  if (!model || model === 'gpt-5.2-mini') return 'gpt-5-mini';
  return model;
};

const fetchWithTimeout = async (input: string, init: RequestInit, timeoutMs: number) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const verifySupabase = async (req: Request): Promise<ProviderStatus> => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authHeader = req.headers.get('Authorization') ?? '';

  if (!supabaseUrl || (!anonKey && !serviceRole)) {
    return { ok: false, message: 'Variables de Supabase no configuradas en Edge Function.' };
  }
  if (!authHeader) {
    return { ok: false, message: 'No hay sesión autenticada para validar contexto de Supabase.' };
  }

  const client = createClient(supabaseUrl, anonKey ?? serviceRole!, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });

  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData.user) {
    return {
      ok: false,
      message: safeMessage(authError?.message, 'No fue posible validar la sesión en Supabase.'),
    };
  }

  const { error: pingError } = await client.from('profiles').select('id').limit(1);
  if (pingError) {
    return {
      ok: false,
      message: `Sesión válida, pero falló lectura de DB: ${safeMessage(pingError.message, 'error de lectura')}`,
    };
  }

  return { ok: true, message: `Conectado como ${authData.user.email ?? authData.user.id}.` };
};

const verifyOpenAI = async (apiKey: string, model: string): Promise<ProviderStatus> => {
  if (!apiKey?.trim()) return { ok: false, message: 'API Key de OpenAI vacía.' };

  try {
    const response = await fetchWithTimeout(
      'https://api.openai.com/v1/responses',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: 'Responde únicamente: ok',
          max_output_tokens: 16,
        }),
      },
      12000,
    );

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const message = payload?.error?.message ?? `HTTP ${response.status}`;
      return { ok: false, message: `OpenAI: ${safeMessage(message, 'no se pudo verificar')}` };
    }

    return { ok: true, message: `OpenAI verificado con modelo ${model}.` };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { ok: false, message: 'OpenAI tardó demasiado en responder (timeout).' };
    }
    return { ok: false, message: `OpenAI: ${safeMessage((error as Error)?.message, 'error desconocido')}` };
  }
};

const verifySerper = async (apiKey: string): Promise<ProviderStatus> => {
  if (!apiKey?.trim()) return { ok: false, message: 'API Key de Serper vacía.' };

  try {
    const response = await fetchWithTimeout(
      'https://google.serper.dev/search',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': apiKey,
        },
        body: JSON.stringify({ q: '642 studio social media', num: 1 }),
      },
      12000,
    );

    if (!response.ok) {
      const text = await response.text();
      return { ok: false, message: `Serper: ${safeMessage(text, `HTTP ${response.status}`)}` };
    }

    return { ok: true, message: 'Serper respondió correctamente.' };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { ok: false, message: 'Serper tardó demasiado en responder (timeout).' };
    }
    return { ok: false, message: `Serper: ${safeMessage((error as Error)?.message, 'error desconocido')}` };
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = (await req.json()) as Payload;
    const model = normalizeModel(body.ai_model);

    const [supabaseStatus, openaiStatus, serperStatus] = await Promise.all([
      verifySupabase(req),
      verifyOpenAI(body.openai_key ?? '', model),
      verifySerper(body.serper_api_key ?? ''),
    ]);

    return new Response(
      JSON.stringify({
        supabase: supabaseStatus,
        openai: openaiStatus,
        serper: serperStatus,
        tested_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        supabase: { ok: false, message: 'No se pudo validar Supabase.' },
        openai: { ok: false, message: 'No se pudo validar OpenAI.' },
        serper: { ok: false, message: 'No se pudo validar Serper.' },
        tested_at: new Date().toISOString(),
        error: safeMessage((error as Error)?.message, 'Solicitud inválida para verificación.'),
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
