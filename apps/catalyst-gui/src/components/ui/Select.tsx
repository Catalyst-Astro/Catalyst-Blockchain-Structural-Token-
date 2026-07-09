import React from 'react';
import clsx from 'clsx';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={clsx(
      'w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-fg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none transition',
      className
    )}
    {...props}
  >
    {children}
  </select>
));

Select.displayName = 'Select';

export default Select;
