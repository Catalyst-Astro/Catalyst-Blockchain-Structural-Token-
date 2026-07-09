import React from 'react';
import clsx from 'clsx';
import { CheckCircle2, XCircle } from 'lucide-react';

type Tone = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  tone?: Tone;
  show: boolean;
}

const iconFor: Record<Tone, React.ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4" aria-hidden />,
  error: <XCircle className="h-4 w-4" aria-hidden />,
  info: <CheckCircle2 className="h-4 w-4" aria-hidden />
};

const bgFor: Record<Tone, string> = {
  success: 'bg-emerald-500 text-white',
  error: 'bg-red-500 text-white',
  info: 'bg-primary text-primary-foreground'
};

const Toast: React.FC<ToastProps> = ({ message, tone = 'info', show }) => {
  return (
    <div
      className={clsx(
        'fixed bottom-4 right-4 z-50 rounded-md px-4 py-3 shadow-soft flex items-center gap-2 text-sm transition-all duration-200 ease-out',
        show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none',
        bgFor[tone]
      )}
      role="status"
      aria-live="polite"
    >
      {iconFor[tone]}
      <span>{message}</span>
    </div>
  );
};

export default Toast;
