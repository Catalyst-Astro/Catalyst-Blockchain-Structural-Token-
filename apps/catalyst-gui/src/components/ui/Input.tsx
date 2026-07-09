import React from 'react';
import clsx from 'clsx';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={clsx(
      'w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-fg placeholder:text-muted/70 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none transition',
      className
    )}
    {...props}
  />
));

Input.displayName = 'Input';

export default Input;
