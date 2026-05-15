import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { settingsApi } from '../../lib/db';
import { Button, Card, Field, Input, LoadingState, PageHeader, Select } from '../../components/ui';
import { useToast } from '../../contexts/ToastContext';
import type { ConnectionsVerificationResult, ProviderConnectionStatus } from '../../types/domain';

interface FormValues {
  openai_key: string;
  serper_api_key: string;
  ai_model: string;
}

const normalizeModelId = (value?: string) => {
  if (!value || value === 'gpt-5.2-mini') return 'gpt-5-mini';
  return value;
};

export const SettingsPage = () => {
  const { showToast } = useToast();
  const qc = useQueryClient();
  const [verification, setVerification] = useState<ConnectionsVerificationResult | null>(null);

  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: settingsApi.list });

  const form = useForm<FormValues>({
    defaultValues: {
      openai_key: '',
      serper_api_key: '',
      ai_model: 'gpt-5-mini',
    },
  });

  useEffect(() => {
    if (!settingsQuery.data) return;
    const map = new Map(settingsQuery.data.map((item) => [item.key, item.value]));
    form.reset({
      openai_key: map.get('openai_key') ?? '',
      serper_api_key: map.get('serper_api_key') ?? '',
      ai_model: normalizeModelId(map.get('ai_model')),
    });
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      await Promise.all([
        settingsApi.upsert('openai_key', values.openai_key, true),
        settingsApi.upsert('serper_api_key', values.serper_api_key, true),
        settingsApi.upsert('ai_model', values.ai_model, false),
      ]);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['settings'] });
      showToast('Configuración actualizada', 'ok');
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  const verifyMutation = useMutation({
    mutationFn: async () =>
      settingsApi.verifyConnections({
        openai_key: form.getValues('openai_key'),
        serper_api_key: form.getValues('serper_api_key'),
        ai_model: form.getValues('ai_model'),
      }),
    onSuccess: (result) => {
      setVerification(result);
      const allOk = result.supabase.ok && result.openai.ok && result.serper.ok;
      showToast(allOk ? 'Conexión verificada en todos los proveedores.' : 'Verificación completada con observaciones.', allOk ? 'ok' : 'info');
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  const statusTone = (status: ProviderConnectionStatus | null | undefined) =>
    !status ? 'muted' : status.ok ? 'ok' : 'error';

  if (settingsQuery.isError) {
    const message = settingsQuery.error instanceof Error ? settingsQuery.error.message : 'Error de configuración';
    return (
      <section>
        <PageHeader
          title="Configuración"
          subtitle="No se pudo cargar la tabla de settings en Supabase."
        />
        <Card>
          <p className="error-text" style={{ marginBottom: 10 }}>
            {message}
          </p>
          <p className="muted">Aplica la migración base y recarga la app.</p>
          <div className="json-preview">
            <code>npx supabase db push</code>
          </div>
        </Card>
      </section>
    );
  }

  if (settingsQuery.isLoading) return <LoadingState label="Cargando configuración..." />;

  return (
    <section>
      <PageHeader
        title="Configuración"
        subtitle="Ajustes técnicos: OpenAI + Serper para diagnóstico y estrategias asistidas."
      />

      <Card>
        <div className="grid-3" style={{ marginBottom: 14 }}>
          <Card>
            <h3>Estado OpenAI</h3>
            <p className="muted">{form.watch('openai_key') ? 'Conectado (key configurada)' : 'No configurado'}</p>
            <p className={`status-line ${statusTone(verification?.openai)}`}>
              {verifyMutation.isPending
                ? 'Probando conexión...'
                : verification?.openai
                  ? verification.openai.message
                  : 'Sin prueba ejecutada.'}
            </p>
          </Card>
          <Card>
            <h3>Estado Serper</h3>
            <p className="muted">{form.watch('serper_api_key') ? 'Conectado (key configurada)' : 'No configurado'}</p>
            <p className={`status-line ${statusTone(verification?.serper)}`}>
              {verifyMutation.isPending
                ? 'Probando conexión...'
                : verification?.serper
                  ? verification.serper.message
                  : 'Sin prueba ejecutada.'}
            </p>
          </Card>
          <Card>
            <h3>Estado Supabase</h3>
            <p className="muted">Verificación de sesión + lectura autenticada.</p>
            <p className={`status-line ${statusTone(verification?.supabase)}`}>
              {verifyMutation.isPending
                ? 'Probando conexión...'
                : verification?.supabase
                  ? verification.supabase.message
                  : 'Sin prueba ejecutada.'}
            </p>
          </Card>
        </div>

        <form onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
          <Field label="API Key OpenAI">
            <Input type="password" placeholder="sk-..." {...form.register('openai_key')} />
          </Field>

          <Field label="API Key Serper">
            <Input type="password" placeholder="serper_..." {...form.register('serper_api_key')} />
          </Field>

          <Field label="Modelo IA">
            <Select {...form.register('ai_model')}>
              <option value="gpt-5-mini">gpt-5-mini</option>
              <option value="gpt-5.2">gpt-5.2</option>
              <option value="gpt-5.5">gpt-5.5</option>
            </Select>
          </Field>

          <div className="inline-actions">
            <Button type="submit" className="btn-primary" disabled={saveMutation.isPending}>
              Guardar cambios
            </Button>
            <Button
              type="button"
              onClick={() => verifyMutation.mutate()}
              disabled={verifyMutation.isPending}
            >
              {verifyMutation.isPending ? 'Verificando...' : 'Verificar conexión'}
            </Button>
          </div>
          {verification ? (
            <p className="muted" style={{ marginTop: 10 }}>
              Última verificación: {new Date(verification.tested_at).toLocaleString('es-MX')}
            </p>
          ) : null}
        </form>
      </Card>
    </section>
  );
};
