import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { campaignApi } from '../../lib/db';
import { Card, LoadingState, PageHeader, StatusBadge } from '../../components/ui';
import { formatMonth } from '../../lib/date';

export const CampaignsPage = () => {
  const campaignsQuery = useQuery({ queryKey: ['campaigns'], queryFn: campaignApi.list });

  if (campaignsQuery.isLoading) return <LoadingState label="Cargando campañas..." />;

  return (
    <section>
      <PageHeader
        title="Campañas Mensuales"
        subtitle="Operación mensual conectada a objetivo general y plan semestral."
        actions={<Link className="btn btn-primary" to="/strategy">Crear campaña</Link>}
      />

      <Card>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Campaña</th>
                <th>Cliente</th>
                <th>Objetivo general</th>
                <th>Plan semestral</th>
                <th>Mes</th>
                <th>Estatus</th>
              </tr>
            </thead>
            <tbody>
              {(campaignsQuery.data ?? []).map((campaign) => (
                <tr key={campaign.id}>
                  <td>
                    <Link to={`/campaigns/${campaign.id}/workspace`}>{campaign.name}</Link>
                  </td>
                  <td>{campaign.clients?.name ?? '—'}</td>
                  <td>{campaign.objective_generals?.title ?? '—'}</td>
                  <td>{campaign.semester_plans?.name ?? '—'}</td>
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
    </section>
  );
};
