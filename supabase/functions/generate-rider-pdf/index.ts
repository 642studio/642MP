import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';
import chromium from 'npm:@sparticuz/chromium@123.0.1';
import { chromium as playwrightChromium } from 'npm:playwright-core@1.53.0';

interface RiderPayload {
  rider_id: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as RiderPayload;
    if (!body.rider_id) {
      return new Response(JSON.stringify({ error: 'rider_id es requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: 'Configuración de Supabase incompleta en función' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: rider, error: riderError } = await supabase
      .from('riders')
      .select(
        `
          *,
          monthly_campaigns:campaign_id (
            id,
            name,
            month_date,
            clients:client_id (
              id,
              name
            )
          ),
          production_sessions:session_id (
            date,
            start_time,
            end_time,
            location
          )
        `,
      )
      .eq('id', body.rider_id)
      .single();

    if (riderError || !rider) {
      return new Response(JSON.stringify({ error: riderError?.message ?? 'Rider no encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const content = rider.content_json ?? {};
    const html = buildRiderHtml({
      title: rider.title,
      status: rider.status,
      campaignName: rider.monthly_campaigns?.name ?? '',
      campaignMonth: rider.monthly_campaigns?.month_date ?? '',
      clientName: rider.monthly_campaigns?.clients?.name ?? '',
      session: rider.production_sessions,
      content,
    });

    const executablePath = await chromium.executablePath();
    const browser = await playwrightChromium.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    });

    const page = await browser.newPage({
      viewport: { width: 1280, height: 1810 },
    });

    await page.setContent(html, { waitUntil: 'networkidle' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', right: '10mm', bottom: '12mm', left: '10mm' },
      displayHeaderFooter: false,
    });

    await browser.close();

    const fileName = `${rider.id}-${Date.now()}.pdf`;
    const storagePath = `riders-pdf/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('riders-pdf')
      .upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: true });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data: publicData } = supabase.storage.from('riders-pdf').getPublicUrl(storagePath);

    const { error: updateError } = await supabase
      .from('riders')
      .update({ pdf_url: publicData.publicUrl })
      .eq('id', rider.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return new Response(JSON.stringify({ pdf_url: publicData.publicUrl, path: storagePath }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido al generar PDF' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});

const toRows = (input: unknown, columns: number) => {
  if (!Array.isArray(input)) return [];
  return input
    .map((row) => {
      if (typeof row !== 'object' || row === null) return null;
      const values = Object.values(row).slice(0, columns).map((value) => String(value ?? ''));
      return values.length === columns ? values : null;
    })
    .filter(Boolean) as string[][];
};

const toBulletList = (input: unknown) => {
  if (!Array.isArray(input)) return '';
  return input.map((line) => `<li>${escapeHtml(String(line))}</li>`).join('');
};

const escapeHtml = (unsafe: string) =>
  unsafe
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const buildRiderHtml = (params: {
  title: string;
  status: string;
  campaignName: string;
  campaignMonth: string;
  clientName: string;
  session: {
    date?: string;
    start_time?: string;
    end_time?: string;
    location?: string;
  } | null;
  content: Record<string, unknown>;
}) => {
  const cover = (params.content.cover as Record<string, string> | undefined) ?? {};
  const sessionBlock = (params.content.session as Record<string, string> | undefined) ?? {};

  const deliverables = toRows(params.content.deliverables, 3);
  const photoLine = toRows(params.content.photo_line, 3);
  const reelsLine = toRows(params.content.reels_line, 3);
  const deadlines = toRows(params.content.deadlines, 2);

  const objectiveSummary = String(params.content.objective_summary ?? '');
  const confirmation = String(params.content.confirmation_text ?? '');

  return `<!doctype html>
  <html lang="es-MX">
  <head>
    <meta charset="UTF-8" />
    <title>Rider ${escapeHtml(params.title)}</title>
    <style>
      @page { size: A4; margin: 0; }
      :root {
        --ink:#111;
        --soft:#6f6a63;
        --line:#d7cfc3;
        --bg:#f5f1ea;
        --brand:#14100d;
        --accent:#c95f1a;
      }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: 'IBM Plex Sans', Arial, sans-serif; color: var(--ink); background: var(--bg); }
      .page { width: 210mm; min-height: 297mm; padding: 14mm 12mm; page-break-after: always; }
      .page:last-child { page-break-after: auto; }
      .cover { background: linear-gradient(170deg, #14100d 0%, #2a1d15 58%, #5d311a 100%); color: #fff; display:flex; flex-direction:column; justify-content:space-between; }
      .brand { font-family: 'Space Grotesk', Arial, sans-serif; font-size: 58px; line-height: 1; letter-spacing: -1px; }
      .title { font-family: 'Space Grotesk', Arial, sans-serif; font-size: 36px; margin: 12px 0; }
      .meta { color: #dbcbb8; font-size: 14px; display:grid; gap:6px; }
      .status { border:1px solid rgba(255,255,255,.4); border-radius:999px; padding:6px 12px; width:fit-content; font-size:11px; text-transform:uppercase; letter-spacing:.12em; }
      .section { background:#fff; border:1px solid var(--line); border-radius:12px; padding:12px; margin-bottom:10px; }
      h2 { margin:0 0 8px; font-family:'Space Grotesk', Arial, sans-serif; font-size:20px; }
      h3 { margin:0 0 6px; font-family:'Space Grotesk', Arial, sans-serif; font-size:14px; text-transform:uppercase; letter-spacing:.08em; color:#3f3830; }
      p { margin:0 0 8px; line-height:1.45; }
      ul { margin:0; padding-left:18px; }
      .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
      table { width:100%; border-collapse:collapse; }
      th, td { border:1px solid var(--line); padding:7px 8px; font-size:12px; text-align:left; vertical-align:top; }
      th { background:#f6f3ee; text-transform:uppercase; letter-spacing:.07em; font-size:10px; }
      .small { color:var(--soft); font-size:12px; }
      .split { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
      .footer { color: var(--soft); font-size: 11px; margin-top: 10px; }
      @media print {
        .page { break-after: page; }
        .section, table, ul, p { break-inside: avoid; }
      }
    </style>
  </head>
  <body>
    <section class="page cover">
      <div>
        <div class="brand">642</div>
        <div class="title">${escapeHtml(params.title)}</div>
        <div class="meta">
          <div><strong>Cliente:</strong> ${escapeHtml(cover.client_name || params.clientName)}</div>
          <div><strong>Campaña mensual:</strong> ${escapeHtml(cover.campaign_name || params.campaignName)}</div>
          <div><strong>Periodo:</strong> ${escapeHtml(cover.period_label || params.campaignMonth)}</div>
        </div>
      </div>
      <div class="status">Estatus: ${escapeHtml(params.status)}</div>
    </section>

    <section class="page">
      <div class="section">
        <h2>Fecha y Horario</h2>
        <p><strong>Fecha:</strong> ${escapeHtml(sessionBlock.date || params.session?.date || '')}</p>
        <p><strong>Hora:</strong> ${escapeHtml(sessionBlock.start_time || params.session?.start_time || '')} - ${escapeHtml(sessionBlock.end_time || params.session?.end_time || '')}</p>
        <p><strong>Duración estimada:</strong> ${escapeHtml(sessionBlock.duration || '')}</p>
        <p><strong>Locación:</strong> ${escapeHtml(sessionBlock.location || params.session?.location || '')}</p>
      </div>

      <div class="section">
        <h2>Entregables Finales</h2>
        <table>
          <thead><tr><th>Entregable</th><th>Formato</th><th>Tiempo de entrega</th></tr></thead>
          <tbody>
            ${deliverables.map((row) => `<tr><td>${escapeHtml(row[0])}</td><td>${escapeHtml(row[1])}</td><td>${escapeHtml(row[2])}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Objetivo de Sesión</h2>
        <p>${escapeHtml(objectiveSummary)}</p>
        <ul>${toBulletList(params.content.objective_bullets)}</ul>
      </div>

      <div class="section split">
        <div>
          <h2>Responsabilidades del Cliente</h2>
          <ul>${toBulletList(params.content.client_responsibilities)}</ul>
        </div>
        <div>
          <h2>Responsabilidades de 642 Studio</h2>
          <ul>${toBulletList(params.content.studio_responsibilities)}</ul>
        </div>
      </div>
    </section>

    <section class="page">
      <div class="section">
        <h2>Línea de Producción Fotográfica</h2>
        <table>
          <thead><tr><th>Área</th><th>Responsable</th><th>Especificación</th></tr></thead>
          <tbody>
            ${photoLine.map((row) => `<tr><td>${escapeHtml(row[0])}</td><td>${escapeHtml(row[1])}</td><td>${escapeHtml(row[2])}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Línea de Producción de Reels</h2>
        <table>
          <thead><tr><th>Área</th><th>Responsable</th><th>Especificación</th></tr></thead>
          <tbody>
            ${reelsLine.map((row) => `<tr><td>${escapeHtml(row[0])}</td><td>${escapeHtml(row[1])}</td><td>${escapeHtml(row[2])}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>

      <div class="section grid2">
        <div>
          <h3>Plazos de Entrega</h3>
          <table>
            <thead><tr><th>Item</th><th>Fecha</th></tr></thead>
            <tbody>
              ${deadlines.map((row) => `<tr><td>${escapeHtml(row[0])}</td><td>${escapeHtml(row[1])}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div>
          <h3>Requerimientos Extra</h3>
          <ul>${toBulletList(params.content.extra_requirements)}</ul>
        </div>
      </div>

      <div class="section">
        <h2>Confirmación Final del Cliente</h2>
        <p>${escapeHtml(confirmation)}</p>
      </div>

      <p class="footer">Documento operativo generado por 642MP · 642 Studio</p>
    </section>
  </body>
  </html>`;
};
