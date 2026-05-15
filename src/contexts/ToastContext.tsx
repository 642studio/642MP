import { createContext, useContext, useMemo, useState } from 'react';

export interface ToastState {
  message: string;
  tone: 'ok' | 'error' | 'info';
}

interface ToastContextValue {
  toast: ToastState | null;
  showToast: (message: string, tone?: ToastState['tone']) => void;
  clearToast: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toast, setToast] = useState<ToastState | null>(null);

  const value = useMemo(
    () => ({
      toast,
      showToast: (message: string, tone: ToastState['tone'] = 'info') => {
        setToast({ message, tone });
        setTimeout(() => setToast(null), 3200);
      },
      clearToast: () => setToast(null),
    }),
    [toast],
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse en ToastProvider');
  return ctx;
};
