import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { packageApi } from '../../lib/db';
import { Button, Card, EmptyState, Field, Input, LoadingState, PageHeader, Select, StatusBadge } from '../../components/ui';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import type { AppRole } from '../../types/domain';

const canManagePackages = (role?: AppRole) => ['admin', 'direccion'].includes(role ?? 'readonly');

const normalizeType = (value: string) => {
  const lower = value.toLowerCase();
  if (lower.includes('reel')) return 'Reel';
  if (lower.includes('post')) return 'Post';
  if (lower.includes('carr')) return 'Carrusel';
  if (lower.includes('hist')) return 'Historia';
  return value;
};

export const PackagesPage = () => {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { profile } = useAuth();
  const canEdit = canManagePackages(profile?.role);

  const [draft, setDraft] = useState({ name: '', price: 0, description: '' });
  const [selectedId, setSelectedId] = useState<string>('');
  const [itemDraft, setItemDraft] = useState({
    item_type: 'Reel',
    quantity: 1,
    periodicity: 'monthly',
    description: '',
    requires_production: true,
    requires_approval: true,
  });

  const packagesQuery = useQuery({ queryKey: ['packages-all'], queryFn: () => packageApi.list(false) });

  const createPackageMutation = useMutation({
    mutationFn: () => packageApi.create(draft),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['packages-all'] });
      setDraft({ name: '', price: 0, description: '' });
      showToast('Paquete creado', 'ok');
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  const updatePackageMutation = useMutation({
    mutationFn: (payload: { id: string; data: { name?: string; price?: number; description?: string; is_active?: boolean } }) =>
      packageApi.update(payload.id, payload.data),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['packages-all'] });
      showToast('Paquete actualizado', 'ok');
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  const addItemMutation = useMutation({
    mutationFn: () =>
      packageApi.addItem({
        package_id: selectedId,
        item_type: itemDraft.item_type,
        quantity: itemDraft.quantity,
        periodicity: itemDraft.periodicity as 'monthly' | 'weekly' | 'one_time',
        description: itemDraft.description,
        requires_production: itemDraft.requires_production,
        requires_approval: itemDraft.requires_approval,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['packages-all'] });
      showToast('Entregable agregado', 'ok');
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => packageApi.deleteItem(itemId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['packages-all'] });
      showToast('Entregable eliminado', 'ok');
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  if (packagesQuery.isLoading) return <LoadingState label="Cargando paquetes..." />;

  const packages = packagesQuery.data ?? [];
  const selectedPackage = packages.find((pkg) => pkg.id === selectedId) ?? packages[0] ?? null;

  const coverage = useMemo(() => {
    if (!selectedPackage) return [] as Array<{ type: string; quantity: number }>;
    const map = new Map<string, number>();
    selectedPackage.package_items.forEach((item) => {
      const key = normalizeType(item.item_type);
      map.set(key, (map.get(key) ?? 0) + Number(item.quantity ?? 0));
    });
    return Array.from(map.entries()).map(([type, quantity]) => ({ type, quantity }));
  }, [selectedPackage]);

  return (
    <section>
      <PageHeader title="Paquetes" subtitle="Definición de entregables y cobertura mensual para planeación del feed." />

      <div className="grid-2">
        <Card>
          <h3>Catálogo de paquetes</h3>
          {!canEdit ? <p className="muted">Solo admin/dirección puede modificar paquetes.</p> : null}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Precio</th>
                  <th>Estatus</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {packages.map((pkg) => (
                  <tr key={pkg.id}>
                    <td>{pkg.name}</td>
                    <td>${Number(pkg.price ?? 0).toLocaleString('es-MX')}</td>
                    <td>
                      <StatusBadge value={pkg.is_active ? 'active' : 'paused'} />
                    </td>
                    <td>
                      <Button onClick={() => setSelectedId(pkg.id)}>Editar</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divider" />
          <h3>Crear paquete</h3>
          <div className="stack">
            <Field label="Nombre">
              <Input value={draft.name} onChange={(event) => setDraft((s) => ({ ...s, name: event.target.value }))} disabled={!canEdit} />
            </Field>
            <Field label="Precio mensual">
              <Input type="number" value={draft.price} onChange={(event) => setDraft((s) => ({ ...s, price: Number(event.target.value) || 0 }))} disabled={!canEdit} />
            </Field>
            <Field label="Descripción">
              <Input value={draft.description} onChange={(event) => setDraft((s) => ({ ...s, description: event.target.value }))} disabled={!canEdit} />
            </Field>
            <Button className="btn-primary" disabled={!canEdit || !draft.name || createPackageMutation.isPending} onClick={() => createPackageMutation.mutate()}>
              Crear paquete
            </Button>
          </div>
        </Card>

        <Card>
          {!selectedPackage ? (
            <EmptyState label="Selecciona un paquete para editar su cobertura." />
          ) : (
            <>
              <h3>Editar paquete</h3>
              <Field label="Paquete seleccionado">
                <Select value={selectedPackage.id} onChange={(event) => setSelectedId(event.target.value)}>
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="inline-grid">
                <Field label="Nombre">
                  <Input
                    defaultValue={selectedPackage.name}
                    onBlur={(event) =>
                      updatePackageMutation.mutate({
                        id: selectedPackage.id,
                        data: { name: event.target.value },
                      })
                    }
                    disabled={!canEdit}
                  />
                </Field>
                <Field label="Precio">
                  <Input
                    type="number"
                    defaultValue={selectedPackage.price}
                    onBlur={(event) =>
                      updatePackageMutation.mutate({
                        id: selectedPackage.id,
                        data: { price: Number(event.target.value) || 0 },
                      })
                    }
                    disabled={!canEdit}
                  />
                </Field>
              </div>

              <Field label="Activo">
                <Select
                  value={selectedPackage.is_active ? 'yes' : 'no'}
                  onChange={(event) =>
                    updatePackageMutation.mutate({
                      id: selectedPackage.id,
                      data: { is_active: event.target.value === 'yes' },
                    })
                  }
                  disabled={!canEdit}
                >
                  <option value="yes">Sí</option>
                  <option value="no">No</option>
                </Select>
              </Field>

              <div className="divider" />

              <h3>Entregables del paquete</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Cantidad</th>
                      <th>Periodicidad</th>
                      <th>Prod.</th>
                      <th>Aprob.</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPackage.package_items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.item_type}</td>
                        <td>{item.quantity}</td>
                        <td>{item.periodicity}</td>
                        <td>{item.requires_production ? 'Sí' : 'No'}</td>
                        <td>{item.requires_approval ? 'Sí' : 'No'}</td>
                        <td>
                          <Button disabled={!canEdit} onClick={() => deleteItemMutation.mutate(item.id)}>
                            Eliminar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="inline-grid" style={{ marginTop: 10 }}>
                <Field label="Tipo">
                  <Select value={itemDraft.item_type} onChange={(event) => setItemDraft((s) => ({ ...s, item_type: event.target.value }))} disabled={!canEdit}>
                    <option value="Reel">Reel</option>
                    <option value="Post">Post</option>
                    <option value="Carrusel">Carrusel</option>
                    <option value="Historia">Historia</option>
                    <option value="Sesión">Sesión</option>
                  </Select>
                </Field>
                <Field label="Cantidad">
                  <Input type="number" value={itemDraft.quantity} onChange={(event) => setItemDraft((s) => ({ ...s, quantity: Number(event.target.value) || 1 }))} disabled={!canEdit} />
                </Field>
                <Field label="Periodicidad">
                  <Select value={itemDraft.periodicity} onChange={(event) => setItemDraft((s) => ({ ...s, periodicity: event.target.value }))} disabled={!canEdit}>
                    <option value="monthly">monthly</option>
                    <option value="weekly">weekly</option>
                    <option value="one_time">one_time</option>
                  </Select>
                </Field>
                <Field label="Descripción">
                  <Input value={itemDraft.description} onChange={(event) => setItemDraft((s) => ({ ...s, description: event.target.value }))} disabled={!canEdit} />
                </Field>
              </div>
              <Button className="btn-primary" disabled={!canEdit || !selectedId || addItemMutation.isPending} onClick={() => addItemMutation.mutate()}>
                Agregar entregable
              </Button>

              <div className="divider" />
              <h3>Cobertura mensual</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Cuota mensual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coverage.map((row) => (
                      <tr key={row.type}>
                        <td>{row.type}</td>
                        <td>{row.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      </div>
    </section>
  );
};
