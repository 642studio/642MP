import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { riderApi } from '../../lib/db';
import { Card, LoadingState, PageHeader, StatusBadge } from '../../components/ui';
import { formatDate } from '../../lib/date';

export const RidersPage = () => {
  const ridersQuery = useQuery({ queryKey: ['riders'], queryFn: riderApi.list });

  if (ridersQuery.isLoading) return <LoadingState label="Cargando riders..." />;

  return (
    <section>
      <PageHeader
        title="Rider Builder Pro"
        subtitle="Documento operativo premium para sesión de producción y validación de cliente."
        actions={
          <Link to="/riders/new" className="btn btn-primary">
            Crear rider
          </Link>
        }
      />

      <Card>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Título</th>
                <th>Campaña</th>
                <th>Cliente</th>
                <th>Estatus</th>
                <th>Enviado</th>
                <th>Aprobado</th>
              </tr>
            </thead>
            <tbody>
              {(ridersQuery.data ?? []).map((rider) => (
                <tr key={rider.id}>
                  <td>
                    <Link to={`/riders/${rider.id}`}>{rider.title}</Link>
                  </td>
                  <td>{rider.monthly_campaigns?.name ?? '—'}</td>
                  <td>{rider.monthly_campaigns?.clients?.name ?? '—'}</td>
                  <td>
                    <StatusBadge value={rider.status} />
                  </td>
                  <td>{formatDate(rider.sent_at)}</td>
                  <td>{formatDate(rider.approved_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
};
