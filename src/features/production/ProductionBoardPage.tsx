import { useQuery } from '@tanstack/react-query';
import { campaignApi, productionApi } from '../../lib/db';
import { Card, EmptyState, LoadingState, PageHeader, StatusBadge } from '../../components/ui';
import { formatDate } from '../../lib/date';

export const ProductionBoardPage = () => {
  const campaignsQuery = useQuery({ queryKey: ['campaigns'], queryFn: campaignApi.list });

  const sessionsQuery = useQuery({
    queryKey: ['production-board', campaignsQuery.data?.length],
    queryFn: async () => {
      const campaigns = campaignsQuery.data ?? [];
      const rows = await Promise.all(campaigns.map((campaign) => productionApi.list(campaign.id)));
      return rows.flat();
    },
    enabled: Boolean(campaignsQuery.data),
  });

  if (campaignsQuery.isLoading || sessionsQuery.isLoading) {
    return <LoadingState label="Cargando producción..." />;
  }

  return (
    <section>
      <PageHeader
        title="Producción"
        subtitle="Sesiones activas y trazabilidad de rider por campaña mensual."
      />

      <Card>
        {sessionsQuery.data?.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Campaña</th>
                  <th>Locación</th>
                  <th>Confirmación</th>
                  <th>Rider</th>
                </tr>
              </thead>
              <tbody>
                {sessionsQuery.data.map((session) => (
                  <tr key={session.id}>
                    <td>{formatDate(session.date)}</td>
                    <td>{session.campaign_id}</td>
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
        ) : (
          <EmptyState label="No hay sesiones de producción registradas." />
        )}
      </Card>
    </section>
  );
};
