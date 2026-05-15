import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { campaignApi, objectiveApi, riderApi, semesterApi } from '../../lib/db';
import { Card, Kpi, LoadingState, PageHeader, StatusBadge } from '../../components/ui';
import { formatDate, formatMonth } from '../../lib/date';

export const DashboardPage = () => {
  const campaignsQuery = useQuery({ queryKey: ['campaigns'], queryFn: campaignApi.list });
  const objectivesQuery = useQuery({ queryKey: ['objectives'], queryFn: objectiveApi.list });
  const semesterQuery = useQuery({ queryKey: ['semester-plans'], queryFn: () => semesterApi.list() });
  const ridersQuery = useQuery({ queryKey: ['riders'], queryFn: riderApi.list });

  const loading = campaignsQuery.isLoading || objectivesQuery.isLoading || semesterQuery.isLoading || ridersQuery.isLoading;

  const attention = useMemo(() => {
    const campaigns = campaignsQuery.data ?? [];
    const riders = ridersQuery.data ?? [];

    const noRider = campaigns.filter((c) => !riders.some((r) => r.campaign_id === c.id));
    const approvalPending = riders.filter((r) => r.status === 'sent');

    return [
      ...noRider.slice(0, 4).map((campaign) => ({
        title: `Rider pendiente · ${campaign.name}`,
        meta: campaign.clients?.name ?? 'Sin cliente',
      })),
      ...approvalPending.slice(0, 4).map((rider) => ({
        title: `Cliente pendiente de aprobación · ${rider.title}`,
        meta: rider.monthly_campaigns?.name ?? 'Sin campaña',
      })),
    ];
  }, [campaignsQuery.data, ridersQuery.data]);

  if (loading) return <LoadingState label="Cargando dashboard operativo..." />;

  const objectives = objectivesQuery.data ?? [];
  const semesters = semesterQuery.data ?? [];
  const campaigns = campaignsQuery.data ?? [];
  const riders = ridersQuery.data ?? [];

  return (
    <section>
      <PageHeader
        title="Dashboard Operativo"
        subtitle="Estado diario de objetivos, planes semestrales, campañas mensuales y producción."
        actions={<Link className="btn btn-primary" to="/strategy">Crear estrategia</Link>}
      />

      <div className="grid-4">
        <Kpi label="Objetivos generales" value={objectives.length} helper="Nivel cliente/servicio" />
        <Kpi label="Planes semestrales" value={semesters.length} helper="Periodo fijo inicio/fin" />
        <Kpi label="Campañas mensuales" value={campaigns.length} helper="Trazables por semestre" />
        <Kpi
          label="Riders"
          value={`${riders.filter((r) => r.status === 'approved').length}/${riders.length}`}
          helper="Aprobados / totales"
        />
      </div>

      <div className="grid-2">
        <Card>
          <h3>Hoy requiere atención</h3>
          {attention.length === 0 ? (
            <p className="muted">No hay alertas operativas críticas.</p>
          ) : (
            <ul className="list">
              {attention.map((item, index) => (
                <li key={`${item.title}-${index}`}>
                  <strong>{item.title}</strong>
                  <span>{item.meta}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h3>Campañas activas del mes</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Campaña</th>
                  <th>Cliente</th>
                  <th>Mes</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.slice(0, 8).map((campaign) => (
                  <tr key={campaign.id}>
                    <td>
                      <Link to={`/campaigns/${campaign.id}/workspace`}>{campaign.name}</Link>
                    </td>
                    <td>{campaign.clients?.name ?? '—'}</td>
                    <td>{formatMonth(campaign.month_date)}</td>
                    <td>
                      <StatusBadge value={campaign.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card>
        <h3>Trazabilidad estratégica</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Objetivo general</th>
                <th>Plan semestral</th>
                <th>Campaña mensual</th>
                <th>Estatus</th>
                <th>Actualizado</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.slice(0, 10).map((campaign) => (
                <tr key={campaign.id}>
                  <td>{campaign.objective_generals?.title ?? '—'}</td>
                  <td>{campaign.semester_plans?.name ?? '—'}</td>
                  <td>{campaign.name}</td>
                  <td>
                    <StatusBadge value={campaign.status} />
                  </td>
                  <td>{formatDate(campaign.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
};
