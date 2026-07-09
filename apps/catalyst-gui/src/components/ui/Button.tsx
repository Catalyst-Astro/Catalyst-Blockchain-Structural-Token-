import React from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const base =
  'inline-flex items-center justify-center rounded-md font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary focus-visible:ring-offset-bg disabled:opacity-60 disabled:cursor-not-allowed transition duration-150 ease-out';

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-primary-foreground hover:shadow-soft hover:-translate-y-[1px]',
  secondary: 'bg-card text-fg border border-border hover:border-primary/70',
  ghost: 'text-fg hover:bg-border/60',
  outline: 'border border-border text-fg hover:border-primary/70'
};

const sizes: Record<Size, string> = {
  sm: 'text-sm px-3.5 py-2 gap-2',
  md: 'text-sm px-4.5 py-2.5 gap-2',
  lg: 'text-base px-5.5 py-3 gap-2'
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading,
  iconLeft,
  iconRight,
  className,
  ...props
}) => {
  return (
    <button
      className={clsx(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : iconLeft}
      <span>{children}</span>
      {iconRight}
    </button>
  );
};

export default Button;
