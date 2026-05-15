import clsx from 'clsx';
import { forwardRef } from 'react';

type CardProps = React.HTMLAttributes<HTMLElement> & {
  children: React.ReactNode;
};

export const Card = ({ className, children, ...props }: CardProps) => (
  <article className={clsx('card', className)} {...props}>
    {children}
  </article>
);

export const PageHeader = ({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) => (
  <header className="page-header">
    <div>
      <h1>{title}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
    </div>
    {actions ? <div className="page-actions">{actions}</div> : null}
  </header>
);

export const Button = ({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button className={clsx('btn', className)} {...props}>
    {children}
  </button>
);

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={clsx('input', className)} {...props} />,
);

Input.displayName = 'Input';

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => <select ref={ref} className={clsx('input', className)} {...props} />,
);

Select.displayName = 'Select';

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => <textarea ref={ref} className={clsx('textarea', className)} {...props} />,
);

Textarea.displayName = 'Textarea';

export const Field = ({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) => (
  <label className="field">
    <span>{label}</span>
    {children}
    {hint ? <small>{hint}</small> : null}
  </label>
);

export const StatusBadge = ({ value }: { value: string }) => (
  <span className={clsx('badge', `badge-${value.replaceAll('_', '-')}`)}>{value}</span>
);

export const Kpi = ({ label, value, helper }: { label: string; value: string | number; helper?: string }) => (
  <Card className="kpi">
    <small>{label}</small>
    <strong>{value}</strong>
    {helper ? <p>{helper}</p> : null}
  </Card>
);

export const LoadingState = ({ label = 'Cargando...' }: { label?: string }) => (
  <div className="loading-state">{label}</div>
);

export const EmptyState = ({ label, action }: { label: string; action?: React.ReactNode }) => (
  <Card className="empty-state">
    <p>{label}</p>
    {action}
  </Card>
);
