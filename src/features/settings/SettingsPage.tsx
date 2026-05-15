import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { settingsApi } from '../../lib/db';
import { Button, Card, Field, Input, LoadingState, PageHeader, Select } from '../../components/ui';
import { useToast } from '../../contexts/ToastContext';

interface FormValues {
  openai_key: string;
  ai_model: string;
}

export const SettingsPage = () => {
  const { showToast } = useToast();
  const qc = useQueryClient();

  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: settingsApi.list });

  const form = useForm<FormValues>({
    defaultValues: {
      openai_key: '',
      ai_model: 'gpt-5.2-mini',
    },
  });

  useEffect(() => {
    if (!settingsQuery.data) return;
    const map = new Map(settingsQuery.data.map((item) => [item.key, item.value]));
    form.reset({
      openai_key: map.get('openai_key') ?? '',
      ai_model: map.get('ai_model') ?? 'gpt-5.2-mini',
    });
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      await Promise.all([
        settingsApi.upsert('openai_key', values.openai_key, true),
        settingsApi.upsert('ai_model', values.ai_model, false),
      ]);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['settings'] });
      showToast('Configuración actualizada', 'ok');
    },
    onError: (error: Error) => showToast(error.message, 'error'),
  });

  if (settingsQuery.isLoading) return <LoadingState label="Cargando configuración..." />;

  return (
    <section>
      <PageHeader
        title="Configuración"
        subtitle="Ajustes técnicos de 642MP: API Key y modelo IA para funciones asistidas."
      />

      <Card>
        <form onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
          <Field label="API Key OpenAI">
            <Input type="password" placeholder="sk-..." {...form.register('openai_key')} />
          </Field>

          <Field label="Modelo IA">
            <Select {...form.register('ai_model')}>
              <option value="gpt-5.2-mini">gpt-5.2-mini</option>
              <option value="gpt-5.2">gpt-5.2</option>
              <option value="gpt-5.5">gpt-5.5</option>
            </Select>
          </Field>

          <Button type="submit" className="btn-primary" disabled={saveMutation.isPending}>
            Guardar cambios
          </Button>
        </form>
      </Card>
    </section>
  );
};
