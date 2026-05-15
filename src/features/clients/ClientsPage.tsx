import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  clientApi,
  researchApi,
  serviceContractApi,
  snapshotApi,
  strategyPrefillApi,
  packageApi,
} from '../../lib/db';
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  LoadingState,
  PageHeader,
  Select,
  StatusBadge,
  Textarea,
} from '../../components/ui';
import type { AppRole, Client, ClientAccountSnapshot } from '../../types/domain';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';

const canManageClientData = (role?: AppRole) => ['admin', 'direccion', 'community'].includes(role ?? 'readonly');
const canManagePackageData = (role?: AppRole) => ['admin', 'direccion'].includes(role ?? 'readonly');

const defaultClient: Partial<Client> = {
  name: '',
  business_name: '',
  industry: '',
  city: '',
  zone: '',
  address: '',
  instagram: '',
  facebook: '',
  tiktok: '',
  website: '',
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  notes: '',
  status: 'prospect',
};

const defaultSnapshot: Partial<ClientAccountSnapshot> = {
  captured_at: new Date().toISOString().slice(0, 10),
  instagram_handle: '',
  tiktok_handle: '',
  facebook_handle: '',
  followers: null,
  avg_views: null,
  engagement_rate: null,
  posting_frequency: '',
  top_posts_notes: '',
};

export const ClientsPage = () => {
  const { id } = useParams();

  if (id) return <ClientProfilePage clientId={id} />;
  return <ClientsListPage />;
};

const ClientsListPage = () => {
  const [draft, setDraft] = useState<Partial<Client>>(defaultClient);
  const [filters, setFilters] = useState({
    status: '',
    industry: '',
    city: '',
    search: '',
  });

  const qc = useQueryClient();
  const { profile } = useAuth();
  const { showToast } = useToast();
  const canEdit = canManageClientData(profile?.role);

  const clientsQuery = useQuery({ queryKey: ['clients'], queryFn: clientApi.list });

  const createMutation = useMutation({
    mutationFn: () => clientApi.create(draft),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['clients'] });
      setDraft(defaultClient);
      showToast('Cliente creado', 'ok');
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  const initialLoading = clientsQuery.isPending && !clientsQuery.data;
  const refreshing = clientsQuery.isFetching;

  if (initialLoading) return <LoadingState label="Cargando clientes..." />;

  const clients = clientsQuery.data ?? [];

  const industries = Array.from(new Set(clients.map((item) => item.industry).filter(Boolean))) as string[];
  const cities = Array.from(new Set(clients.map((item) => item.city).filter(Boolean))) as string[];

  const filtered = clients.filter((client) => {
    if (filters.status && client.status !== filters.status) return false;
    if (filters.industry && client.industry !== filters.industry) return false;
    if (filters.city && client.city !== filters.city) return false;
    if (filters.search) {
      const term = filters.search.toLowerCase();
      const haystack = `${client.name} ${client.business_name ?? ''} ${client.industry ?? ''}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });

  return (
    <section>
      <PageHeader
        title="Clientes"
        subtitle="Registro, contexto estratégico y diagnóstico operativo por cliente."
      />
      {refreshing ? <p className="refresh-hint">Actualizando clientes...</p> : null}

      <div className="grid-2">
        <Card>
          <h3>Filtros</h3>
          <div className="inline-grid">
            <Field label="Estado">
              <Select value={filters.status} onChange={(event) => setFilters((s) => ({ ...s, status: event.target.value }))}>
                <option value="">Todos</option>
                <option value="prospect">prospect</option>
                <option value="active">active</option>
                <option value="paused">paused</option>
                <option value="finished">finished</option>
              </Select>
            </Field>
            <Field label="Nicho">
              <Select value={filters.industry} onChange={(event) => setFilters((s) => ({ ...s, industry: event.target.value }))}>
                <option value="">Todos</option>
                {industries.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Ciudad">
              <Select value={filters.city} onChange={(event) => setFilters((s) => ({ ...s, city: event.target.value }))}>
                <option value="">Todas</option>
                {cities.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Buscar">
              <Input value={filters.search} onChange={(event) => setFilters((s) => ({ ...s, search: event.target.value }))} placeholder="Nombre o nicho" />
            </Field>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Nicho</th>
                  <th>Ubicación</th>
                  <th>Estatus</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => (
                  <tr key={client.id}>
                    <td>{client.name}</td>
                    <td>{client.industry ?? '—'}</td>
                    <td>{[client.city, client.zone].filter(Boolean).join(' · ') || '—'}</td>
                    <td>
                      <StatusBadge value={client.status} />
                    </td>
                    <td>
                      <Link className="btn" to={`/clients/${client.id}`}>
                        Abrir perfil
                      </Link>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted">
                      No hay clientes con estos filtros.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <h3>Nuevo cliente</h3>
          {!canEdit ? <p className="muted">Tu rol es solo lectura para este módulo.</p> : null}
          <div className="stack">
            <Field label="Nombre comercial">
              <Input value={draft.name ?? ''} onChange={(event) => setDraft((s) => ({ ...s, name: event.target.value }))} disabled={!canEdit} />
            </Field>
            <Field label="Razón social">
              <Input value={draft.business_name ?? ''} onChange={(event) => setDraft((s) => ({ ...s, business_name: event.target.value }))} disabled={!canEdit} />
            </Field>
            <Field label="Nicho">
              <Input value={draft.industry ?? ''} onChange={(event) => setDraft((s) => ({ ...s, industry: event.target.value }))} disabled={!canEdit} />
            </Field>
            <div className="inline-grid">
              <Field label="Ciudad">
                <Input value={draft.city ?? ''} onChange={(event) => setDraft((s) => ({ ...s, city: event.target.value }))} disabled={!canEdit} />
              </Field>
              <Field label="Zona">
                <Input value={draft.zone ?? ''} onChange={(event) => setDraft((s) => ({ ...s, zone: event.target.value }))} disabled={!canEdit} />
              </Field>
            </div>
            <Field label="Instagram">
              <Input value={draft.instagram ?? ''} onChange={(event) => setDraft((s) => ({ ...s, instagram: event.target.value }))} disabled={!canEdit} />
            </Field>
            <Field label="TikTok">
              <Input value={draft.tiktok ?? ''} onChange={(event) => setDraft((s) => ({ ...s, tiktok: event.target.value }))} disabled={!canEdit} />
            </Field>
            <Field label="Facebook">
              <Input value={draft.facebook ?? ''} onChange={(event) => setDraft((s) => ({ ...s, facebook: event.target.value }))} disabled={!canEdit} />
            </Field>
            <Field label="Sitio web">
              <Input value={draft.website ?? ''} onChange={(event) => setDraft((s) => ({ ...s, website: event.target.value }))} disabled={!canEdit} />
            </Field>
            <Button className="btn-primary" onClick={() => createMutation.mutate()} disabled={!canEdit || createMutation.isPending || !draft.name}>
              Registrar cliente
            </Button>
          </div>
        </Card>
      </div>
    </section>
  );
};

const ClientProfilePage = ({ clientId }: { clientId: string }) => {
  const [tab, setTab] = useState<'snapshot' | 'research' | 'diagnostic' | 'prefill'>('snapshot');
  const [snapshotDraft, setSnapshotDraft] = useState<Partial<ClientAccountSnapshot>>(defaultSnapshot);
  const [editingClient, setEditingClient] = useState<Partial<Client>>({});
  const [diagnosticDraft, setDiagnosticDraft] = useState<string>('{}');
  const [researchDraft, setResearchDraft] = useState<string>('{}');
  const [selectedReportId, setSelectedReportId] = useState<string>('');

  const navigate = useNavigate();
  const qc = useQueryClient();
  const { profile } = useAuth();
  const { showToast } = useToast();

  const canEdit = canManageClientData(profile?.role);
  const canEditPackages = canManagePackageData(profile?.role);

  const clientQuery = useQuery({ queryKey: ['client', clientId], queryFn: () => clientApi.get(clientId) });
  const snapshotsQuery = useQuery({ queryKey: ['client-snapshots', clientId], queryFn: () => snapshotApi.listByClient(clientId) });
  const reportsQuery = useQuery({ queryKey: ['client-reports', clientId], queryFn: () => researchApi.listByClient(clientId) });
  const prefillQuery = useQuery({ queryKey: ['client-prefills', clientId], queryFn: () => strategyPrefillApi.listByClient(clientId) });
  const packageQuery = useQuery({ queryKey: ['packages-all'], queryFn: () => packageApi.list(false) });
  const contractsQuery = useQuery({ queryKey: ['client-contracts', clientId], queryFn: () => serviceContractApi.listByClient(clientId) });

  const client = clientQuery.data;
  const latestSnapshot = (snapshotsQuery.data ?? [])[0] ?? null;
  const reports = reportsQuery.data ?? [];
  const prefills = prefillQuery.data ?? [];

  const selectedReport = useMemo(() => {
    if (selectedReportId) return reports.find((item) => item.id === selectedReportId) ?? null;
    return reports[0] ?? null;
  }, [reports, selectedReportId]);

  const selectedPrefill = prefills[0] ?? null;

  const updateClientMutation = useMutation({
    mutationFn: () => clientApi.update(clientId, editingClient),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['client', clientId] });
      showToast('Cliente actualizado', 'ok');
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  const createSnapshotMutation = useMutation({
    mutationFn: () => snapshotApi.create({ ...snapshotDraft, client_id: clientId }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['client-snapshots', clientId] });
      showToast('Snapshot guardado', 'ok');
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  const generateResearchMutation = useMutation({
    mutationFn: async () => {
      if (!latestSnapshot) throw new Error('Primero registra un snapshot de cuenta.');
      return researchApi.generateContext({
        client_id: clientId,
        snapshot_id: latestSnapshot.id,
        scope: 'local_global',
        local_limit: 10,
        global_limit: 10,
      });
    },
    onSuccess: async (result) => {
      await qc.invalidateQueries({ queryKey: ['client-reports', clientId] });
      setTab('research');
      showToast(result.mode === 'demo' ? 'Investigación en modo demo.' : 'Investigación generada.', 'ok');
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  const generateDiagnosticMutation = useMutation({
    mutationFn: async () => {
      if (!latestSnapshot) throw new Error('Primero registra un snapshot de cuenta.');
      const report = selectedReport ?? reports[0];
      if (!report) throw new Error('Primero genera investigación.');
      return researchApi.generateDiagnostic({
        client_id: clientId,
        snapshot_id: latestSnapshot.id,
        research_report_id: report.id,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['client-reports', clientId] });
      showToast('Diagnóstico actualizado', 'ok');
      setTab('diagnostic');
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  const saveDiagnosticMutation = useMutation({
    mutationFn: async () => {
      if (!selectedReport) throw new Error('No hay reporte seleccionado.');
      const payload = JSON.parse(diagnosticDraft) as Record<string, unknown>;
      return researchApi.updateDiagnostic(selectedReport.id, payload);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['client-reports', clientId] });
      showToast('Diagnóstico guardado', 'ok');
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  const saveResearchMutation = useMutation({
    mutationFn: async () => {
      if (!selectedReport) throw new Error('No hay reporte seleccionado.');
      const payload = JSON.parse(researchDraft) as Record<string, unknown>;
      return researchApi.updateResearch(selectedReport.id, payload);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['client-reports', clientId] });
      showToast('Investigación actualizada', 'ok');
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  const generatePrefillMutation = useMutation({
    mutationFn: async () => {
      if (!selectedReport) throw new Error('No hay reporte para generar prefill.');
      return strategyPrefillApi.generate({ client_id: clientId, report_id: selectedReport.id });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['client-prefills', clientId] });
      showToast('Prefill de estrategia generado', 'ok');
      setTab('prefill');
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  const applyPrefillMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPrefill) throw new Error('No hay prefill disponible.');
      return strategyPrefillApi.apply(selectedPrefill.id);
    },
    onSuccess: async (result) => {
      await qc.invalidateQueries({ queryKey: ['campaigns'] });
      await qc.invalidateQueries({ queryKey: ['client-prefills', clientId] });
      showToast('Prefill aplicado a estrategia. Revisa y ajusta.', 'ok');
      navigate(`/campaigns/${result.campaign.id}/workspace`);
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  const upsertContractMutation = useMutation({
    mutationFn: async (payload: { package_id: string; start_date: string; end_date?: string }) =>
      serviceContractApi.upsertActive({
        client_id: clientId,
        package_id: payload.package_id,
        start_date: payload.start_date,
        end_date: payload.end_date,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['client-contracts', clientId] });
      showToast('Servicio activo actualizado', 'ok');
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  const initialLoading =
    (clientQuery.isPending && !clientQuery.data) ||
    (snapshotsQuery.isPending && !snapshotsQuery.data) ||
    (reportsQuery.isPending && !reportsQuery.data) ||
    (prefillQuery.isPending && !prefillQuery.data) ||
    (packageQuery.isPending && !packageQuery.data) ||
    (contractsQuery.isPending && !contractsQuery.data);
  const refreshing =
    clientQuery.isFetching ||
    snapshotsQuery.isFetching ||
    reportsQuery.isFetching ||
    prefillQuery.isFetching ||
    packageQuery.isFetching ||
    contractsQuery.isFetching;

  if (initialLoading) {
    return <LoadingState label="Cargando perfil de cliente..." />;
  }

  if (!client) return <EmptyState label="Cliente no encontrado." action={<Link to="/clients" className="btn">Volver</Link>} />;

  const activeContract = (contractsQuery.data ?? []).find((item) => item.status === 'active') ?? null;

  return (
    <section>
      <PageHeader
        title={client.name}
        subtitle={`${client.industry ?? 'Sin nicho'} · ${[client.city, client.zone].filter(Boolean).join(' · ') || 'Ubicación sin definir'}`}
        actions={
          <>
            <Link className="btn" to="/clients">Volver a clientes</Link>
            <Button className="btn-primary" onClick={() => generateResearchMutation.mutate()} disabled={!canEdit || generateResearchMutation.isPending}>
              Investigar cliente
            </Button>
            <Button onClick={() => generateDiagnosticMutation.mutate()} disabled={!canEdit || generateDiagnosticMutation.isPending}>
              Generar reporte actual
            </Button>
            <Button onClick={() => generatePrefillMutation.mutate()} disabled={!canEdit || generatePrefillMutation.isPending}>
              Generar estrategia
            </Button>
          </>
        }
      />
      {refreshing ? <p className="refresh-hint">Actualizando perfil...</p> : null}

      <div className="grid-2">
        <Card>
          <h3>Datos base del cliente</h3>
          <div className="stack">
            <Field label="Nombre comercial">
              <Input
                defaultValue={client.name}
                onChange={(event) => setEditingClient((s) => ({ ...s, name: event.target.value }))}
                disabled={!canEdit}
              />
            </Field>
            <Field label="Nicho">
              <Input
                defaultValue={client.industry ?? ''}
                onChange={(event) => setEditingClient((s) => ({ ...s, industry: event.target.value }))}
                disabled={!canEdit}
              />
            </Field>
            <div className="inline-grid">
              <Field label="Ciudad">
                <Input defaultValue={client.city ?? ''} onChange={(event) => setEditingClient((s) => ({ ...s, city: event.target.value }))} disabled={!canEdit} />
              </Field>
              <Field label="Zona">
                <Input defaultValue={client.zone ?? ''} onChange={(event) => setEditingClient((s) => ({ ...s, zone: event.target.value }))} disabled={!canEdit} />
              </Field>
            </div>
            <Field label="Instagram">
              <Input defaultValue={client.instagram ?? ''} onChange={(event) => setEditingClient((s) => ({ ...s, instagram: event.target.value }))} disabled={!canEdit} />
            </Field>
            <Field label="TikTok">
              <Input defaultValue={client.tiktok ?? ''} onChange={(event) => setEditingClient((s) => ({ ...s, tiktok: event.target.value }))} disabled={!canEdit} />
            </Field>
            <Field label="Facebook">
              <Input defaultValue={client.facebook ?? ''} onChange={(event) => setEditingClient((s) => ({ ...s, facebook: event.target.value }))} disabled={!canEdit} />
            </Field>
            <Field label="Website">
              <Input defaultValue={client.website ?? ''} onChange={(event) => setEditingClient((s) => ({ ...s, website: event.target.value }))} disabled={!canEdit} />
            </Field>
            <Field label="Notas">
              <Textarea rows={3} defaultValue={client.notes ?? ''} onChange={(event) => setEditingClient((s) => ({ ...s, notes: event.target.value }))} disabled={!canEdit} />
            </Field>
            <Button className="btn-primary" onClick={() => updateClientMutation.mutate()} disabled={!canEdit || updateClientMutation.isPending}>
              Guardar cliente
            </Button>
          </div>
        </Card>

        <Card>
          <h3>Servicio activo (paquete oficial)</h3>
          {!canEditPackages ? <p className="muted">Solo admin/dirección puede modificar paquetes activos.</p> : null}
          <ServiceContractEditor
            packages={packageQuery.data ?? []}
            activeContract={activeContract}
            disabled={!canEditPackages}
            onSave={(payload) => upsertContractMutation.mutate(payload)}
          />
        </Card>
      </div>

      <div className="tab-row">
        <button className={tab === 'snapshot' ? 'tab active' : 'tab'} onClick={() => setTab('snapshot')}>Snapshot</button>
        <button className={tab === 'research' ? 'tab active' : 'tab'} onClick={() => setTab('research')}>Investigación</button>
        <button className={tab === 'diagnostic' ? 'tab active' : 'tab'} onClick={() => setTab('diagnostic')}>Diagnóstico</button>
        <button className={tab === 'prefill' ? 'tab active' : 'tab'} onClick={() => setTab('prefill')}>Prefill estrategia</button>
      </div>

      {tab === 'snapshot' ? (
        <Card>
          <h3>Snapshot de cuenta</h3>
          <div className="inline-grid">
            <Field label="Fecha captura">
              <Input type="date" value={snapshotDraft.captured_at ?? ''} onChange={(event) => setSnapshotDraft((s) => ({ ...s, captured_at: event.target.value }))} disabled={!canEdit} />
            </Field>
            <Field label="Frecuencia publicación">
              <Input value={snapshotDraft.posting_frequency ?? ''} onChange={(event) => setSnapshotDraft((s) => ({ ...s, posting_frequency: event.target.value }))} disabled={!canEdit} />
            </Field>
            <Field label="Instagram handle">
              <Input value={snapshotDraft.instagram_handle ?? ''} onChange={(event) => setSnapshotDraft((s) => ({ ...s, instagram_handle: event.target.value }))} disabled={!canEdit} />
            </Field>
            <Field label="TikTok handle">
              <Input value={snapshotDraft.tiktok_handle ?? ''} onChange={(event) => setSnapshotDraft((s) => ({ ...s, tiktok_handle: event.target.value }))} disabled={!canEdit} />
            </Field>
            <Field label="Facebook handle">
              <Input value={snapshotDraft.facebook_handle ?? ''} onChange={(event) => setSnapshotDraft((s) => ({ ...s, facebook_handle: event.target.value }))} disabled={!canEdit} />
            </Field>
            <Field label="Followers">
              <Input type="number" value={snapshotDraft.followers ?? ''} onChange={(event) => setSnapshotDraft((s) => ({ ...s, followers: Number(event.target.value) || 0 }))} disabled={!canEdit} />
            </Field>
            <Field label="Avg views">
              <Input type="number" value={snapshotDraft.avg_views ?? ''} onChange={(event) => setSnapshotDraft((s) => ({ ...s, avg_views: Number(event.target.value) || 0 }))} disabled={!canEdit} />
            </Field>
            <Field label="Engagement rate">
              <Input type="number" step="0.001" value={snapshotDraft.engagement_rate ?? ''} onChange={(event) => setSnapshotDraft((s) => ({ ...s, engagement_rate: Number(event.target.value) || 0 }))} disabled={!canEdit} />
            </Field>
          </div>
          <Field label="Notas top posts">
            <Textarea rows={3} value={snapshotDraft.top_posts_notes ?? ''} onChange={(event) => setSnapshotDraft((s) => ({ ...s, top_posts_notes: event.target.value }))} disabled={!canEdit} />
          </Field>
          <Button className="btn-primary" onClick={() => createSnapshotMutation.mutate()} disabled={!canEdit || createSnapshotMutation.isPending}>
            Guardar snapshot
          </Button>

          <div className="table-wrap" style={{ marginTop: 14 }}>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Followers</th>
                  <th>Avg views</th>
                  <th>Engagement</th>
                  <th>Frecuencia</th>
                </tr>
              </thead>
              <tbody>
                {(snapshotsQuery.data ?? []).map((item) => (
                  <tr key={item.id}>
                    <td>{item.captured_at}</td>
                    <td>{item.followers ?? '—'}</td>
                    <td>{item.avg_views ?? '—'}</td>
                    <td>{item.engagement_rate ?? '—'}</td>
                    <td>{item.posting_frequency ?? '—'}</td>
                  </tr>
                ))}
                {(snapshotsQuery.data ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted">
                      Sin snapshots capturados.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {tab === 'research' ? (
        <Card>
          <h3>Investigación IA + Web</h3>
          {!selectedReport ? (
            <EmptyState label="No hay investigación generada todavía." />
          ) : (
            <>
              <div className="between" style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="muted">Reporte:</span>
                  <Select value={selectedReport.id} onChange={(event) => setSelectedReportId(event.target.value)}>
                    {reports.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.created_at.slice(0, 10)} · {item.status}
                      </option>
                    ))}
                  </Select>
                </div>
                <StatusBadge value={selectedReport.status} />
              </div>
              <Field label="Research JSON editable">
                <Textarea
                  rows={14}
                  value={researchDraft || JSON.stringify(selectedReport.research_json, null, 2)}
                  onChange={(event) => setResearchDraft(event.target.value)}
                  disabled={!canEdit}
                />
              </Field>
              <Button onClick={() => saveResearchMutation.mutate()} disabled={!canEdit || saveResearchMutation.isPending}>
                Guardar investigación
              </Button>
            </>
          )}
        </Card>
      ) : null}

      {tab === 'diagnostic' ? (
        <Card>
          <h3>Reporte actual de la cuenta</h3>
          {!selectedReport ? (
            <EmptyState label="No hay reporte de investigación para diagnosticar." />
          ) : (
            <>
              <Field label="Diagnóstico JSON editable">
                <Textarea
                  rows={14}
                  value={diagnosticDraft || JSON.stringify(selectedReport.diagnostic_json, null, 2)}
                  onChange={(event) => setDiagnosticDraft(event.target.value)}
                  disabled={!canEdit}
                />
              </Field>
              <Button className="btn-primary" onClick={() => saveDiagnosticMutation.mutate()} disabled={!canEdit || saveDiagnosticMutation.isPending}>
                Guardar diagnóstico
              </Button>
            </>
          )}
        </Card>
      ) : null}

      {tab === 'prefill' ? (
        <Card>
          <h3>Prefill de estrategia</h3>
          {!selectedPrefill ? (
            <EmptyState label="No hay prefill generado para este cliente." />
          ) : (
            <>
              <div className="between" style={{ marginBottom: 10 }}>
                <StatusBadge value={selectedPrefill.status} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button onClick={() => navigate(`/strategy?prefill_id=${selectedPrefill.id}&client_id=${clientId}`)}>Cargar en estrategia</Button>
                  <Button className="btn-primary" onClick={() => applyPrefillMutation.mutate()} disabled={!canEdit || applyPrefillMutation.isPending}>
                    Aplicar a estrategia
                  </Button>
                </div>
              </div>
              <div className="grid-3">
                <Card>
                  <h3>Objetivo</h3>
                  <pre className="json-preview">{JSON.stringify(selectedPrefill.objective_payload_json, null, 2)}</pre>
                </Card>
                <Card>
                  <h3>Semestral</h3>
                  <pre className="json-preview">{JSON.stringify(selectedPrefill.semester_payload_json, null, 2)}</pre>
                </Card>
                <Card>
                  <h3>Mensual</h3>
                  <pre className="json-preview">{JSON.stringify(selectedPrefill.monthly_campaign_payload_json, null, 2)}</pre>
                </Card>
              </div>
            </>
          )}
        </Card>
      ) : null}
    </section>
  );
};

const ServiceContractEditor = ({
  packages,
  activeContract,
  disabled,
  onSave,
}: {
  packages: Array<{ id: string; name: string; price: number }>;
  activeContract: { package_id: string; start_date: string; end_date: string | null } | null;
  disabled: boolean;
  onSave: (payload: { package_id: string; start_date: string; end_date?: string }) => void;
}) => {
  const [packageId, setPackageId] = useState(activeContract?.package_id ?? '');
  const [startDate, setStartDate] = useState(activeContract?.start_date ?? new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(activeContract?.end_date ?? '');

  return (
    <div className="stack">
      <Field label="Paquete activo">
        <Select value={packageId} onChange={(event) => setPackageId(event.target.value)} disabled={disabled}>
          <option value="">Selecciona paquete</option>
          {packages.map((pkg) => (
            <option key={pkg.id} value={pkg.id}>
              {pkg.name}
            </option>
          ))}
        </Select>
      </Field>
      <div className="inline-grid">
        <Field label="Inicio">
          <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} disabled={disabled} />
        </Field>
        <Field label="Fin (opcional)">
          <Input type="date" value={endDate ?? ''} onChange={(event) => setEndDate(event.target.value)} disabled={disabled} />
        </Field>
      </div>
      <Button className="btn-primary" disabled={disabled || !packageId || !startDate} onClick={() => onSave({ package_id: packageId, start_date: startDate, end_date: endDate || undefined })}>
        Guardar servicio activo
      </Button>
    </div>
  );
};
