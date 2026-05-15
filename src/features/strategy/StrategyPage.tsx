import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useMemo } from 'react';
import {
  campaignApi,
  clientApi,
  objectiveApi,
  packageApi,
  semesterApi,
} from '../../lib/db';
import { Button, Card, EmptyState, Field, Input, LoadingState, PageHeader, Select, Textarea } from '../../components/ui';
import { useToast } from '../../contexts/ToastContext';
import { formatDate, formatMonth, monthStart } from '../../lib/date';

const objectiveSchema = z.object({
  client_id: z.string().uuid('Selecciona un cliente válido'),
  title: z.string().min(4),
  business_goal: z.string().min(8),
  primary_kpi: z.string().min(2),
  target_value: z.string().min(1),
  start_date: z.string().min(10),
  end_date: z.string().min(10),
});

const semesterSchema = z.object({
  objective_general_id: z.string().uuid('Selecciona objetivo'),
  name: z.string().min(4),
  start_date: z.string().min(10),
  end_date: z.string().min(10),
  strategic_focus: z.string().min(8),
  pillars: z.string().min(2),
  risks: z.string().optional(),
});

const campaignSchema = z.object({
  objective_general_id: z.string().uuid(),
  semester_plan_id: z.string().uuid(),
  client_id: z.string().uuid(),
  package_id: z.string().uuid().optional().or(z.literal('')),
  month_date: z.string().min(10),
  name: z.string().min(4),
  monthly_goal: z.string().min(8),
  audience: z.string().min(4),
  tone: z.string().min(3),
  cta: z.string().min(3),
  promotion: z.string().optional(),
});

type ObjectiveForm = z.infer<typeof objectiveSchema>;
type SemesterForm = z.infer<typeof semesterSchema>;
type CampaignForm = z.infer<typeof campaignSchema>;

export const StrategyPage = () => {
  const qc = useQueryClient();
  const { showToast } = useToast();

  const clientsQuery = useQuery({ queryKey: ['clients'], queryFn: clientApi.list });
  const objectivesQuery = useQuery({ queryKey: ['objectives'], queryFn: objectiveApi.list });
  const semesterQuery = useQuery({ queryKey: ['semester-plans'], queryFn: () => semesterApi.list() });
  const campaignsQuery = useQuery({ queryKey: ['campaigns'], queryFn: campaignApi.list });
  const packagesQuery = useQuery({ queryKey: ['packages'], queryFn: packageApi.list });

  const loading =
    clientsQuery.isLoading ||
    objectivesQuery.isLoading ||
    semesterQuery.isLoading ||
    campaignsQuery.isLoading ||
    packagesQuery.isLoading;

  const objectiveForm = useForm<ObjectiveForm>({
    resolver: zodResolver(objectiveSchema),
    defaultValues: {
      title: '',
      business_goal: '',
      primary_kpi: '',
      target_value: '',
    },
  });

  const semesterForm = useForm<SemesterForm>({
    resolver: zodResolver(semesterSchema),
    defaultValues: {
      name: '',
      strategic_focus: '',
      pillars: '',
      risks: '',
    },
  });

  const campaignForm = useForm<CampaignForm>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: '',
      monthly_goal: '',
      audience: '',
      tone: '',
      cta: '',
      promotion: '',
      package_id: '',
    },
  });

  const createObjective = useMutation({
    mutationFn: (payload: ObjectiveForm) =>
      objectiveApi.create({
        ...payload,
        status: 'active',
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['objectives'] });
      objectiveForm.reset();
      showToast('Objetivo general creado', 'ok');
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  const createSemester = useMutation({
    mutationFn: (payload: SemesterForm) =>
      semesterApi.create({
        ...payload,
        pillars: payload.pillars.split(',').map((x) => x.trim()).filter(Boolean),
        risks: payload.risks ? payload.risks.split(',').map((x) => x.trim()).filter(Boolean) : [],
        status: 'active',
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['semester-plans'] });
      semesterForm.reset();
      showToast('Plan semestral creado', 'ok');
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  const createCampaign = useMutation({
    mutationFn: async (payload: CampaignForm) => {
      const semester = (semesterQuery.data ?? []).find((item) => item.id === payload.semester_plan_id);
      if (!semester) throw new Error('Plan semestral no encontrado');

      const month = new Date(monthStart(payload.month_date));
      const min = new Date(semester.start_date);
      const max = new Date(semester.end_date);

      if (month < min || month > max) {
        throw new Error('El mes de campaña debe estar dentro del rango del plan semestral.');
      }

      return campaignApi.create({
        ...payload,
        package_id: payload.package_id || null,
        month_date: month.toISOString().slice(0, 10),
        status: 'planning',
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['campaigns'] });
      campaignForm.reset();
      showToast('Campaña mensual creada', 'ok');
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  const strategyRows = useMemo(() => {
    const objectiveById = new Map((objectivesQuery.data ?? []).map((item) => [item.id, item]));
    const semesterById = new Map((semesterQuery.data ?? []).map((item) => [item.id, item]));
    return (campaignsQuery.data ?? []).map((campaign) => ({
      campaign,
      objective: objectiveById.get(campaign.objective_general_id),
      semester: semesterById.get(campaign.semester_plan_id),
    }));
  }, [campaignsQuery.data, objectivesQuery.data, semesterQuery.data]);

  if (loading) return <LoadingState label="Cargando estructura estratégica..." />;

  return (
    <section>
      <PageHeader
        title="Jerarquía Estratégica"
        subtitle="Objetivo General → Plan Semestral → Campaña Mensual."
      />

      <div className="grid-3">
        <Card>
          <h3>Nuevo objetivo general</h3>
          <form onSubmit={objectiveForm.handleSubmit((v) => createObjective.mutate(v))}>
            <Field label="Cliente">
              <Select {...objectiveForm.register('client_id')}>
                <option value="">Selecciona</option>
                {clientsQuery.data?.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Título">
              <Input {...objectiveForm.register('title')} />
            </Field>
            <Field label="Objetivo de negocio">
              <Textarea rows={3} {...objectiveForm.register('business_goal')} />
            </Field>
            <Field label="KPI principal">
              <Input {...objectiveForm.register('primary_kpi')} />
            </Field>
            <Field label="Meta objetivo">
              <Input {...objectiveForm.register('target_value')} />
            </Field>
            <div className="inline-grid">
              <Field label="Inicio">
                <Input type="date" {...objectiveForm.register('start_date')} />
              </Field>
              <Field label="Fin">
                <Input type="date" {...objectiveForm.register('end_date')} />
              </Field>
            </div>
            <Button className="btn-primary" disabled={createObjective.isPending}>
              Crear objetivo
            </Button>
          </form>
        </Card>

        <Card>
          <h3>Nuevo plan semestral</h3>
          <form onSubmit={semesterForm.handleSubmit((v) => createSemester.mutate(v))}>
            <Field label="Objetivo general">
              <Select {...semesterForm.register('objective_general_id')}>
                <option value="">Selecciona</option>
                {objectivesQuery.data?.map((objective) => (
                  <option key={objective.id} value={objective.id}>
                    {objective.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Nombre del plan">
              <Input placeholder="Semestre Jul-Dic 2026" {...semesterForm.register('name')} />
            </Field>
            <Field label="Enfoque estratégico">
              <Textarea rows={3} {...semesterForm.register('strategic_focus')} />
            </Field>
            <Field label="Pilares (coma separada)">
              <Input placeholder="Educativo, Producto, Autoridad" {...semesterForm.register('pillars')} />
            </Field>
            <Field label="Riesgos (coma separada)">
              <Input placeholder="Saturación de promociones, baja respuesta" {...semesterForm.register('risks')} />
            </Field>
            <div className="inline-grid">
              <Field label="Inicio">
                <Input type="date" {...semesterForm.register('start_date')} />
              </Field>
              <Field label="Fin">
                <Input type="date" {...semesterForm.register('end_date')} />
              </Field>
            </div>
            <Button className="btn-primary" disabled={createSemester.isPending}>
              Crear plan
            </Button>
          </form>
        </Card>

        <Card>
          <h3>Nueva campaña mensual</h3>
          <form onSubmit={campaignForm.handleSubmit((v) => createCampaign.mutate(v))}>
            <Field label="Objetivo general">
              <Select {...campaignForm.register('objective_general_id')}>
                <option value="">Selecciona</option>
                {objectivesQuery.data?.map((objective) => (
                  <option key={objective.id} value={objective.id}>
                    {objective.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Plan semestral">
              <Select {...campaignForm.register('semester_plan_id')}>
                <option value="">Selecciona</option>
                {semesterQuery.data?.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} ({formatDate(plan.start_date)} - {formatDate(plan.end_date)})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Cliente">
              <Select {...campaignForm.register('client_id')}>
                <option value="">Selecciona</option>
                {clientsQuery.data?.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Paquete contratado">
              <Select {...campaignForm.register('package_id')}>
                <option value="">Sin paquete</option>
                {packagesQuery.data?.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Mes de campaña">
              <Input type="month" {...campaignForm.register('month_date')} />
            </Field>
            <Field label="Nombre campaña">
              <Input placeholder="Feed Agosto 2026" {...campaignForm.register('name')} />
            </Field>
            <Field label="Objetivo mensual">
              <Textarea rows={2} {...campaignForm.register('monthly_goal')} />
            </Field>
            <Field label="Audiencia">
              <Input {...campaignForm.register('audience')} />
            </Field>
            <Field label="Tono">
              <Input {...campaignForm.register('tone')} />
            </Field>
            <Field label="CTA principal">
              <Input {...campaignForm.register('cta')} />
            </Field>
            <Field label="Promoción activa">
              <Input {...campaignForm.register('promotion')} />
            </Field>
            <Button className="btn-primary" disabled={createCampaign.isPending}>
              Crear campaña
            </Button>
          </form>
        </Card>
      </div>

      <Card>
        <h3>Trazabilidad completa</h3>
        {strategyRows.length === 0 ? (
          <EmptyState label="Todavía no hay campañas mensuales enlazadas." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Objetivo</th>
                  <th>Plan semestral</th>
                  <th>Campaña mensual</th>
                  <th>Mes</th>
                  <th>Estatus</th>
                </tr>
              </thead>
              <tbody>
                {strategyRows.map(({ campaign, objective, semester }) => (
                  <tr key={campaign.id}>
                    <td>{objective?.title ?? '—'}</td>
                    <td>{semester?.name ?? '—'}</td>
                    <td>{campaign.name}</td>
                    <td>{formatMonth(campaign.month_date)}</td>
                    <td>{campaign.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </section>
  );
};
