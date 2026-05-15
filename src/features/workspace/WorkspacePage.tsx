import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { campaignApi, feedApi, packageApi, productionApi, riderApi } from '../../lib/db';
import type { FeedItem } from '../../types/domain';
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Kpi,
  LoadingState,
  PageHeader,
  Select,
  StatusBadge,
  Textarea,
} from '../../components/ui';
import { formatDate, formatMonth } from '../../lib/date';
import { useToast } from '../../contexts/ToastContext';

const tabs = [
  { id: 'summary', label: 'Resumen' },
  { id: 'feed', label: 'Feed' },
  { id: 'production', label: 'Producción' },
  { id: 'rider', label: 'Rider' },
  { id: 'report', label: 'Reporte' },
];

const normalizeDeliverable = (raw: string) => {
  const value = raw.toLowerCase();
  if (value.includes('reel')) return 'reel';
  if (value.includes('post')) return 'post';
  if (value.includes('carr')) return 'carrusel';
  if (value.includes('hist')) return 'historia';
  return value;
};

const feedStatusOptions: FeedItem['status'][] = [
  'idea',
  'planned',
  'script_ready',
  'in_production',
  'shot',
  'editing',
  'internal_review',
  'ready_for_client',
  'sent_to_client',
  'approved',
  'published',
  'changes_requested',
];

export const WorkspacePage = () => {
  const { campaignId = '' } = useParams();
  const { showToast } = useToast();
  const qc = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor));

  const [tab, setTab] = useState('summary');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const campaignQuery = useQuery({ queryKey: ['campaign', campaignId], queryFn: () => campaignApi.get(campaignId) });
  const feedQuery = useQuery({ queryKey: ['feed', campaignId], queryFn: () => feedApi.list(campaignId) });
  const productionQuery = useQuery({
    queryKey: ['production', campaignId],
    queryFn: () => productionApi.list(campaignId),
  });
  const packageQuery = useQuery({ queryKey: ['packages'], queryFn: packageApi.list });
  const ridersQuery = useQuery({ queryKey: ['riders'], queryFn: riderApi.list });

  const addFeedMutation = useMutation({
    mutationFn: (payload: Partial<FeedItem>) => feedApi.create(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['feed', campaignId] });
      showToast('Pieza agregada al feed', 'ok');
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  const updateFeedMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<FeedItem> }) => feedApi.update(id, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['feed', campaignId] });
      showToast('Pieza actualizada', 'ok');
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  const createSessionMutation = useMutation({
    mutationFn: () => {
      const c = campaignQuery.data;
      if (!c) throw new Error('Campaña no disponible');
      return productionApi.create({
        campaign_id: c.id,
        client_id: c.client_id,
        date: new Date().toISOString().slice(0, 10),
        confirmation_status: 'pending',
        rider_status: 'draft',
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['production', campaignId] });
      showToast('Sesión de producción creada', 'ok');
    },
  });

  const loading =
    campaignQuery.isLoading ||
    feedQuery.isLoading ||
    packageQuery.isLoading ||
    productionQuery.isLoading ||
    ridersQuery.isLoading;

  if (loading) return <LoadingState label="Cargando workspace..." />;

  const campaign = campaignQuery.data;
  if (!campaign) return <EmptyState label="No se encontró la campaña." />;

  const feed = feedQuery.data ?? [];
  const sessions = productionQuery.data ?? [];
  const rider = (ridersQuery.data ?? []).find((r) => r.campaign_id === campaign.id) ?? null;
  const currentPackage = (packageQuery.data ?? []).find((pkg) => pkg.id === campaign.package_id);

  const contractedMap = useMemo(() => {
    const map = new Map<string, number>();
    currentPackage?.package_items.forEach((item) => {
      const key = normalizeDeliverable(item.item_type);
      map.set(key, (map.get(key) ?? 0) + item.quantity);
    });
    return map;
  }, [currentPackage]);

  const plannedMap = useMemo(() => {
    const map = new Map<string, number>();
    feed.forEach((item) => {
      const key = normalizeDeliverable(item.content_type);
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return map;
  }, [feed]);

  const allDeliverables = Array.from(new Set([...contractedMap.keys(), ...plannedMap.keys()]));
  const selected = feed.find((item) => item.id === selectedId) ?? feed[0] ?? null;

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = feed.findIndex((item) => item.id === active.id);
    const newIndex = feed.findIndex((item) => item.id === over.id);

    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(feed, oldIndex, newIndex);
    await feedApi.reorder(
      campaign.id,
      reordered.map((item) => item.id),
    );
    await qc.invalidateQueries({ queryKey: ['feed', campaignId] });
    showToast('Orden del feed actualizado', 'ok');
  };

  return (
    <section>
      <PageHeader
        title={campaign.name}
        subtitle={`${campaign.clients.name} · ${formatMonth(campaign.month_date)} · ${campaign.semester_plans.name}`}
        actions={
          <>
            <Link className="btn" to="/campaigns">
              Volver a campañas
            </Link>
            <Link className="btn btn-primary" to={`/riders/new?campaign_id=${campaign.id}`}>
              Generar rider
            </Link>
          </>
        }
      />

      <div className="grid-4">
        <Kpi label="Objetivo general" value={campaign.objective_generals.title} helper={campaign.objective_generals.primary_kpi} />
        <Kpi label="Plan semestral" value={campaign.semester_plans.name} helper={`${formatDate(campaign.semester_plans.start_date)} - ${formatDate(campaign.semester_plans.end_date)}`} />
        <Kpi label="Campaña mensual" value={formatMonth(campaign.month_date)} helper={campaign.monthly_goal} />
        <Kpi label="Estado" value={campaign.status} helper="Flujo operativo" />
      </div>

      <div className="tab-row">
        {tabs.map((item) => (
          <button
            key={item.id}
            className={item.id === tab ? 'tab active' : 'tab'}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'summary' ? (
        <div className="grid-2">
          <Card>
            <h3>Entregables contratados vs planeados</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Contratado</th>
                    <th>Planeado</th>
                    <th>Lectura</th>
                  </tr>
                </thead>
                <tbody>
                  {allDeliverables.map((item) => {
                    const contracted = contractedMap.get(item) ?? 0;
                    const planned = plannedMap.get(item) ?? 0;
                    const delta = planned - contracted;
                    return (
                      <tr key={item}>
                        <td>{item}</td>
                        <td>{contracted}</td>
                        <td>{planned}</td>
                        <td>
                          {delta === 0 ? (
                            <span className="pill ok">Completo</span>
                          ) : delta < 0 ? (
                            <span className="pill warn">Faltan {Math.abs(delta)}</span>
                          ) : (
                            <span className="pill info">+{delta} extra</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <h3>Checklist operativo</h3>
            <ul className="list check-list">
              <li className={campaign.objective_general_id ? 'done' : ''}>Objetivo general asignado</li>
              <li className={campaign.semester_plan_id ? 'done' : ''}>Plan semestral asignado</li>
              <li className={feed.length > 0 ? 'done' : ''}>Feed mensual planeado</li>
              <li className={sessions.length > 0 ? 'done' : ''}>Sesión de producción creada</li>
              <li className={Boolean(rider) ? 'done' : ''}>Rider generado</li>
              <li className={rider?.status === 'sent' || rider?.status === 'approved' ? 'done' : ''}>Rider enviado</li>
              <li className={rider?.status === 'approved' ? 'done' : ''}>Rider aprobado</li>
            </ul>
          </Card>
        </div>
      ) : null}

      {tab === 'feed' ? (
        <div className="feed-layout">
          <Card>
            <div className="between">
              <h3>Grid de feed</h3>
              <Button
                className="btn-primary"
                onClick={() =>
                  addFeedMutation.mutate({
                    campaign_id: campaign.id,
                    content_type: 'Reel',
                    internal_title: 'Nueva pieza',
                    status: 'idea',
                    grid_position: feed.length + 1,
                    public_title: '',
                    pillar: '',
                    objective: '',
                    hook: '',
                    copy_base: '',
                    script: '',
                    cta: '',
                    shotlist: '',
                    format: '',
                    reference_links: [],
                    internal_notes: '',
                    client_comments: '',
                    is_extra: false,
                  })
                }
              >
                Agregar pieza
              </Button>
            </div>

            {feed.length === 0 ? (
              <EmptyState label="No hay piezas en esta campaña mensual." />
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={feed.map((item) => item.id)} strategy={rectSortingStrategy}>
                  <div className="feed-grid">
                    {feed.map((item) => (
                      <FeedCard
                        key={item.id}
                        item={item}
                        active={item.id === selected?.id}
                        onClick={() => setSelectedId(item.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </Card>

          <Card>
            <h3>Detalle de pieza</h3>
            {!selected ? (
              <p className="muted">Selecciona una pieza del grid.</p>
            ) : (
              <div className="stack">
                <Field label="Tipo de contenido">
                  <Select
                    value={selected.content_type}
                    onChange={(e) =>
                      updateFeedMutation.mutate({
                        id: selected.id,
                        payload: { content_type: e.target.value },
                      })
                    }
                  >
                    <option>Reel</option>
                    <option>Post</option>
                    <option>Carrusel</option>
                    <option>Historia</option>
                  </Select>
                </Field>

                <Field label="Título interno">
                  <Input
                    value={selected.internal_title}
                    onChange={(e) =>
                      updateFeedMutation.mutate({ id: selected.id, payload: { internal_title: e.target.value } })
                    }
                  />
                </Field>

                <Field label="Hook">
                  <Textarea
                    rows={3}
                    value={selected.hook}
                    onChange={(e) =>
                      updateFeedMutation.mutate({ id: selected.id, payload: { hook: e.target.value } })
                    }
                  />
                </Field>

                <Field label="Estatus">
                  <Select
                    value={selected.status}
                    onChange={(e) =>
                      updateFeedMutation.mutate({
                        id: selected.id,
                        payload: { status: e.target.value as FeedItem['status'] },
                      })
                    }
                  >
                    {feedStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            )}
          </Card>
        </div>
      ) : null}

      {tab === 'production' ? (
        <Card>
          <div className="between">
            <h3>Sesiones de producción</h3>
            <Button className="btn-primary" onClick={() => createSessionMutation.mutate()}>
              Crear sesión
            </Button>
          </div>
          {sessions.length === 0 ? (
            <EmptyState label="No hay sesiones de producción registradas." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Horario</th>
                    <th>Locación</th>
                    <th>Confirmación</th>
                    <th>Rider</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.id}>
                      <td>{formatDate(session.date)}</td>
                      <td>
                        {session.start_time ?? '—'} - {session.end_time ?? '—'}
                      </td>
                      <td>{session.location ?? '—'}</td>
                      <td>{session.confirmation_status}</td>
                      <td>
                        <StatusBadge value={session.rider_status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}

      {tab === 'rider' ? (
        <Card>
          <h3>Rider de campaña</h3>
          {!rider ? (
            <EmptyState
              label="No hay rider para esta campaña."
              action={
                <Link className="btn btn-primary" to={`/riders/new?campaign_id=${campaign.id}`}>
                  Crear rider
                </Link>
              }
            />
          ) : (
            <div className="stack">
              <p>
                <strong>{rider.title}</strong>
              </p>
              <p className="muted">Estatus: {rider.status}</p>
              <div className="inline-actions">
                <Link className="btn" to={`/riders/${rider.id}`}>
                  Abrir editor
                </Link>
                {rider.pdf_url ? (
                  <a className="btn" href={rider.pdf_url} target="_blank" rel="noreferrer">
                    Ver PDF
                  </a>
                ) : null}
              </div>
            </div>
          )}
        </Card>
      ) : null}

      {tab === 'report' ? (
        <Card>
          <h3>Reporte interno</h3>
          <p className="muted">
            V1 habilita reporte operativo via exportación CSV/PDF desde la sección de reportes. Esta campaña mantiene trazabilidad completa de objetivo y semestre.
          </p>
        </Card>
      ) : null}
    </section>
  );
};

const FeedCard = ({
  item,
  active,
  onClick,
}: {
  item: FeedItem;
  active: boolean;
  onClick: () => void;
}) => {
  const { setNodeRef, attributes, listeners, transform, transition } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      className={active ? 'feed-card active' : 'feed-card'}
      onClick={onClick}
      type="button"
      {...attributes}
      {...listeners}
    >
      <div className="feed-card-type">{item.content_type}</div>
      <strong>{item.internal_title || 'Sin título'}</strong>
      <p>{item.pillar || 'Sin pilar'}</p>
      <StatusBadge value={item.status} />
    </button>
  );
};
