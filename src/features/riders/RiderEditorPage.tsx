import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { campaignApi, productionApi, riderApi } from '../../lib/db';
import type { RiderContent, RiderStatus } from '../../types/domain';
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  LoadingState,
  PageHeader,
  Select,
  Textarea,
} from '../../components/ui';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import logoWhite from '../../assets/642-logo-white.png';

interface RiderForm {
  campaign_id: string;
  session_id: string;
  title: string;
  period_label: string;
  session_date: string;
  session_start: string;
  session_end: string;
  session_duration: string;
  session_location: string;
  objective_summary: string;
  objective_bullets: string;
  deliverables: string;
  client_responsibilities: string;
  studio_responsibilities: string;
  photo_line: string;
  reels_line: string;
  deadlines: string;
  extra_requirements: string;
  confirmation_text: string;
}

const parseTable = (source: string, columns: number) =>
  source
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split('|').map((col) => col.trim()))
    .filter((parts) => parts.length >= columns);

const buildDefaultContent = (): RiderContent => ({
  cover: {
    campaign_name: '',
    client_name: '',
    period_label: '',
  },
  session: {
    date: '',
    start_time: '',
    end_time: '',
    duration: '',
    location: '',
  },
  deliverables: [
    { deliverable: 'Reels', format: '9:16', eta: '72h preview' },
    { deliverable: 'Fotografías', format: 'JPG/RAW', eta: '5 días hábiles' },
  ],
  objective_summary: '',
  objective_bullets: [],
  client_responsibilities: [
    'Productos listos en locación',
    'Persona de apoyo designada',
    'Permisos y uso de imagen autorizados',
  ],
  studio_responsibilities: [
    'Dirección creativa de captura',
    'Producción foto/video',
    'Curaduría de material y edición',
  ],
  photo_line: [
    { area: 'Producto', responsible: 'Foto', spec: 'Planos generales + close-up' },
  ],
  reels_line: [
    { area: 'Hook principal', responsible: 'Video', spec: 'Toma de apertura 3 segundos' },
  ],
  deadlines: [
    { item: 'Previsualización', due: '48 horas después de sesión' },
    { item: 'Entrega final', due: 'Según paquete contratado' },
  ],
  extra_requirements: [],
  confirmation_text: 'Confirmamos fecha, horario y requerimientos operativos de sesión.',
});

const requiredSectionsReady = (content: RiderContent) => {
  const checks = [
    content.cover.campaign_name,
    content.cover.client_name,
    content.cover.period_label,
    content.session.date,
    content.session.location,
    content.objective_summary,
    content.deliverables.length > 0,
    content.client_responsibilities.length > 0,
    content.studio_responsibilities.length > 0,
    content.confirmation_text,
  ];
  return checks.every(Boolean);
};

export const RiderEditorPage = () => {
  const { riderId } = useParams();
  const [searchParams] = useSearchParams();
  const initialCampaignId = searchParams.get('campaign_id') ?? '';
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const campaignsQuery = useQuery({ queryKey: ['campaigns'], queryFn: campaignApi.list });
  const riderQuery = useQuery({
    queryKey: ['rider', riderId],
    queryFn: () => riderApi.get(riderId ?? ''),
    enabled: Boolean(riderId),
  });

  const sessionsQuery = useQuery({
    queryKey: ['sessions-by-campaign', riderQuery.data?.campaign_id, initialCampaignId],
    queryFn: async () => {
      const campaignId = riderQuery.data?.campaign_id ?? initialCampaignId;
      if (!campaignId) return [];
      return productionApi.list(campaignId);
    },
    enabled: Boolean(riderQuery.data?.campaign_id || initialCampaignId),
  });

  const loading = campaignsQuery.isLoading || riderQuery.isLoading || sessionsQuery.isLoading;
  const existing = riderQuery.data;

  const initialContent = existing?.content_json ?? buildDefaultContent();

  const form = useForm<RiderForm>({
    values: {
      campaign_id: existing?.campaign_id ?? initialCampaignId,
      session_id: existing?.session_id ?? '',
      title: existing?.title ?? 'Rider de Producción',
      period_label: initialContent.cover.period_label,
      session_date: initialContent.session.date,
      session_start: initialContent.session.start_time,
      session_end: initialContent.session.end_time,
      session_duration: initialContent.session.duration,
      session_location: initialContent.session.location,
      objective_summary: initialContent.objective_summary,
      objective_bullets: initialContent.objective_bullets.join('\n'),
      deliverables: initialContent.deliverables
        .map((item) => `${item.deliverable} | ${item.format} | ${item.eta}`)
        .join('\n'),
      client_responsibilities: initialContent.client_responsibilities.join('\n'),
      studio_responsibilities: initialContent.studio_responsibilities.join('\n'),
      photo_line: initialContent.photo_line.map((item) => `${item.area} | ${item.responsible} | ${item.spec}`).join('\n'),
      reels_line: initialContent.reels_line.map((item) => `${item.area} | ${item.responsible} | ${item.spec}`).join('\n'),
      deadlines: initialContent.deadlines.map((item) => `${item.item} | ${item.due}`).join('\n'),
      extra_requirements: initialContent.extra_requirements.join('\n'),
      confirmation_text: initialContent.confirmation_text,
    },
  });

  const mutation = useMutation({
    mutationFn: async ({ status }: { status: RiderStatus }) => {
      const values = form.getValues();
      const selectedCampaign = (campaignsQuery.data ?? []).find((item) => item.id === values.campaign_id);
      if (!selectedCampaign) throw new Error('Selecciona una campaña para guardar el rider.');

      const content: RiderContent = {
        cover: {
          campaign_name: selectedCampaign.name,
          client_name: selectedCampaign.clients?.name ?? '',
          period_label: values.period_label,
        },
        session: {
          date: values.session_date,
          start_time: values.session_start,
          end_time: values.session_end,
          duration: values.session_duration,
          location: values.session_location,
        },
        deliverables: parseTable(values.deliverables, 3).map(([deliverable, format, eta]) => ({
          deliverable,
          format,
          eta,
        })),
        objective_summary: values.objective_summary,
        objective_bullets: values.objective_bullets.split('\n').map((line) => line.trim()).filter(Boolean),
        client_responsibilities: values.client_responsibilities.split('\n').map((line) => line.trim()).filter(Boolean),
        studio_responsibilities: values.studio_responsibilities.split('\n').map((line) => line.trim()).filter(Boolean),
        photo_line: parseTable(values.photo_line, 3).map(([area, responsible, spec]) => ({
          area,
          responsible,
          spec,
        })),
        reels_line: parseTable(values.reels_line, 3).map(([area, responsible, spec]) => ({
          area,
          responsible,
          spec,
        })),
        deadlines: parseTable(values.deadlines, 2).map(([item, due]) => ({ item, due })),
        extra_requirements: values.extra_requirements.split('\n').map((line) => line.trim()).filter(Boolean),
        confirmation_text: values.confirmation_text,
      };

      if (status === 'sent' && !requiredSectionsReady(content)) {
        throw new Error('Para marcar como enviado debes completar secciones mínimas del rider.');
      }

      const payload = {
        campaign_id: values.campaign_id,
        session_id: values.session_id || null,
        title: values.title,
        status,
        content_json: content,
        sent_at: status === 'sent' ? new Date().toISOString() : existing?.sent_at ?? null,
        approved_at: status === 'approved' ? new Date().toISOString() : existing?.approved_at ?? null,
        approved_by: status === 'approved' ? profile?.id ?? null : existing?.approved_by ?? null,
      };

      if (existing) {
        return riderApi.update(existing.id, payload);
      }
      return riderApi.create(payload);
    },
    onSuccess: async (saved) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['riders'] }),
        qc.invalidateQueries({ queryKey: ['rider', saved.id] }),
      ]);
      showToast('Rider guardado', 'ok');
      if (!existing) navigate(`/riders/${saved.id}`);
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  const pdfMutation = useMutation({
    mutationFn: async () => {
      if (!existing) throw new Error('Guarda el rider antes de exportar PDF.');
      return riderApi.generatePdf(existing.id);
    },
    onSuccess: async (result) => {
      await qc.invalidateQueries({ queryKey: ['rider', existing?.id] });
      showToast('PDF generado y guardado en Supabase Storage', 'ok');
      window.open(result.pdf_url, '_blank', 'noopener');
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  const selectedCampaign = (campaignsQuery.data ?? []).find((item) => item.id === form.watch('campaign_id'));

  if (loading) return <LoadingState label="Cargando Rider Builder..." />;

  if (!campaignsQuery.data?.length) {
    return (
      <EmptyState
        label="No existen campañas mensuales para enlazar el rider."
        action={<Link to="/strategy" className="btn btn-primary">Crear campaña mensual</Link>}
      />
    );
  }

  return (
    <section>
      <PageHeader
        title={existing ? 'Editar Rider Pro' : 'Nuevo Rider Pro'}
        subtitle="Documento multipágina para operación y validación con cliente."
        actions={
          <>
            <Link className="btn" to="/riders">
              Volver
            </Link>
            <Button className="btn-primary" onClick={() => mutation.mutate({ status: 'draft' })}>
              Guardar borrador
            </Button>
            <Button onClick={() => mutation.mutate({ status: 'sent' })}>Marcar enviado</Button>
            <Button onClick={() => mutation.mutate({ status: 'approved' })}>Marcar aprobado</Button>
            <Button onClick={() => pdfMutation.mutate()} disabled={!existing || pdfMutation.isPending}>
              Generar PDF
            </Button>
          </>
        }
      />

      <div className="rider-layout">
        <Card>
          <h3>Configuración</h3>
          <div className="stack">
            <Field label="Título">
              <Input {...form.register('title')} />
            </Field>
            <Field label="Campaña mensual">
              <Select {...form.register('campaign_id')}>
                <option value="">Selecciona campaña</option>
                {campaignsQuery.data?.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Sesión de producción">
              <Select {...form.register('session_id')}>
                <option value="">Sin sesión</option>
                {sessionsQuery.data?.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.date} · {session.location ?? 'Locación por definir'}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Periodo mostrado en portada">
              <Input placeholder="Junio 2026" {...form.register('period_label')} />
            </Field>

            <div className="inline-grid">
              <Field label="Fecha sesión">
                <Input type="date" {...form.register('session_date')} />
              </Field>
              <Field label="Duración estimada">
                <Input placeholder="4 horas" {...form.register('session_duration')} />
              </Field>
              <Field label="Inicio">
                <Input type="time" {...form.register('session_start')} />
              </Field>
              <Field label="Fin">
                <Input type="time" {...form.register('session_end')} />
              </Field>
            </div>

            <Field label="Locación">
              <Input {...form.register('session_location')} />
            </Field>

            <Field label="Objetivo de sesión (resumen)">
              <Textarea rows={3} {...form.register('objective_summary')} />
            </Field>

            <Field label="Bullets objetivo (uno por línea)">
              <Textarea rows={4} {...form.register('objective_bullets')} />
            </Field>

            <Field label="Entregables (formato: Entregable | Formato | Entrega)">
              <Textarea rows={5} {...form.register('deliverables')} />
            </Field>

            <Field label="Responsabilidades del cliente (una por línea)">
              <Textarea rows={4} {...form.register('client_responsibilities')} />
            </Field>

            <Field label="Responsabilidades de 642 (una por línea)">
              <Textarea rows={4} {...form.register('studio_responsibilities')} />
            </Field>

            <Field label="Línea foto (Area | Responsable | Especificación)">
              <Textarea rows={4} {...form.register('photo_line')} />
            </Field>

            <Field label="Línea reels (Area | Responsable | Especificación)">
              <Textarea rows={4} {...form.register('reels_line')} />
            </Field>

            <Field label="Plazos (Entregable | Fecha)">
              <Textarea rows={4} {...form.register('deadlines')} />
            </Field>

            <Field label="Requerimientos extra (uno por línea)">
              <Textarea rows={4} {...form.register('extra_requirements')} />
            </Field>

            <Field label="Confirmación final">
              <Textarea rows={3} {...form.register('confirmation_text')} />
            </Field>
          </div>
        </Card>

        <Card className="rider-preview">
          <div className="rider-preview-cover">
            <img src={logoWhite} alt="642 Studio" className="rider-logo" />
            <h2>{form.watch('title')}</h2>
            <p>{selectedCampaign?.clients?.name ?? 'Cliente'} · {selectedCampaign?.name ?? 'Campaña mensual'}</p>
            <span>{form.watch('period_label')}</span>
          </div>

          <div className="rider-section">
            <h4>Fecha y horario</h4>
            <p>{form.watch('session_date')} · {form.watch('session_start')} - {form.watch('session_end')}</p>
            <p>{form.watch('session_duration')} · {form.watch('session_location')}</p>
          </div>

          <div className="rider-section">
            <h4>Objetivo de sesión</h4>
            <p>{form.watch('objective_summary')}</p>
          </div>

          <div className="rider-section">
            <h4>Entregables finales</h4>
            <pre>{form.watch('deliverables')}</pre>
          </div>

          <div className="rider-section split">
            <div>
              <h4>Responsabilidades del cliente</h4>
              <pre>{form.watch('client_responsibilities')}</pre>
            </div>
            <div>
              <h4>Responsabilidades de 642 Studio</h4>
              <pre>{form.watch('studio_responsibilities')}</pre>
            </div>
          </div>

          <div className="rider-section">
            <h4>Línea foto / reels</h4>
            <pre>{form.watch('photo_line')}</pre>
            <pre>{form.watch('reels_line')}</pre>
          </div>

          <div className="rider-section split">
            <div>
              <h4>Plazos de entrega</h4>
              <pre>{form.watch('deadlines')}</pre>
            </div>
            <div>
              <h4>Requerimientos extra</h4>
              <pre>{form.watch('extra_requirements')}</pre>
            </div>
          </div>

          <div className="rider-section">
            <h4>Confirmación final</h4>
            <p>{form.watch('confirmation_text')}</p>
          </div>
        </Card>
      </div>
    </section>
  );
};
