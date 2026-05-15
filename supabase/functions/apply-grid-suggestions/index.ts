import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

interface Payload {
  campaign_id: string;
  selected_slots?: number[];
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const [{ data: campaign, error: campaignError }, { data: latestSuggestion, error: suggestionError }, { data: feedItems, error: feedError }] =
      await Promise.all([
        supabase.from('monthly_campaigns').select('*').eq('id', body.campaign_id).single(),
        supabase
          .from('monthly_grid_suggestions')
          .select('*')
          .eq('campaign_id', body.campaign_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from('feed_items').select('grid_position').eq('campaign_id', body.campaign_id),
      ]);

    if (campaignError || !campaign) throw new Error(campaignError?.message ?? 'Campaña no encontrada');
    if (suggestionError) throw new Error(suggestionError.message);
    if (!latestSuggestion) throw new Error('No existe sugerencia para esta campaña');
    if (feedError || !feedItems) throw new Error(feedError?.message ?? 'No se pudieron leer feed_items');

    const slots = Array.isArray((latestSuggestion.suggestion_json as Record<string, unknown>)?.slots)
      ? (((latestSuggestion.suggestion_json as Record<string, unknown>).slots as unknown[]) || [])
      : [];

    const selectedSet = new Set(Array.isArray(body.selected_slots) && body.selected_slots.length > 0 ? body.selected_slots : slots.map((_, index) => index));

    let maxPosition = feedItems.reduce((max, item) => Math.max(max, Number(item.grid_position ?? 0)), 0);

    const rows = slots
      .map((slot, index) => ({ slot, index }))
      .filter(({ index }) => selectedSet.has(index))
      .map(({ slot }) => {
        const row = slot as Record<string, unknown>;
        maxPosition += 1;
        return {
          campaign_id: campaign.id,
          content_type: String(row.type ?? 'Post'),
          internal_title: String(row.theme ?? `Pieza sugerida ${maxPosition}`),
          public_title: String(row.theme ?? ''),
          pillar: String(row.pillar ?? ''),
          objective: String(row.objective ?? ''),
          hook: String(row.hook ?? ''),
          copy_base: '',
          script: '',
          cta: String(row.cta ?? campaign.cta ?? ''),
          shotlist: '',
          format: '',
          grid_position: maxPosition,
          status: 'idea',
          reference_links: [],
          internal_notes: 'Insertado desde grid sugerido por paquete',
          client_comments: '',
          is_extra: false,
        };
      });

    if (rows.length === 0) {
      return new Response(JSON.stringify({ inserted: 0, skipped: slots.length, message: 'No se seleccionaron slots para insertar.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: insertError } = await supabase.from('feed_items').insert(rows);
    if (insertError) throw new Error(insertError.message);

    return new Response(
      JSON.stringify({
        inserted: rows.length,
        skipped: Math.max(slots.length - rows.length, 0),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'No se pudo aplicar grid sugerido' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
