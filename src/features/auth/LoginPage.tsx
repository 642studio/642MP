import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button, Card, Field, Input } from '../../components/ui';
import logoBlack from '../../assets/642-logo-black.png';

const schema = z.object({
  email: z.string({ required_error: 'Correo requerido' }).email('Correo inválido'),
  password: z.string({ required_error: 'Contraseña requerida' }).min(6, 'Mínimo 6 caracteres'),
});

type FormValues = z.infer<typeof schema>;

export const LoginPage = () => {
  const { session, signIn, hasConfig } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  if (session) return <Navigate to="/dashboard" replace />;

  const onSubmit = handleSubmit(async (values) => {
    try {
      await signIn(values.email, values.password);
      navigate('/dashboard');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo iniciar sesión', 'error');
    }
  });

  return (
    <div className="login-page">
      <Card className="login-card">
        <img src={logoBlack} alt="642 Studio" className="login-logo" />
        <h1>642MediaPlanner</h1>
        <p>Acceso operativo para 642 Studio.</p>

        {!hasConfig ? (
          <div className="config-warning">
            <strong>Supabase no configurado</strong>
            <p>Configura `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` para habilitar login productivo.</p>
          </div>
        ) : null}

        <form onSubmit={onSubmit}>
          <Field label="Correo">
            <Input type="email" placeholder="equipo@642studio.mx" {...register('email')} />
          </Field>
          {errors.email ? <span className="error-text">{errors.email.message}</span> : null}

          <Field label="Contraseña">
            <Input type="password" placeholder="••••••••" {...register('password')} />
          </Field>
          {errors.password ? <span className="error-text">{errors.password.message}</span> : null}

          <Button type="submit" disabled={isSubmitting || !hasConfig} className="btn-primary full">
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </Card>
    </div>
  );
};
