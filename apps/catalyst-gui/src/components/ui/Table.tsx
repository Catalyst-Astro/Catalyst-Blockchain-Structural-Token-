import React from 'react';
import clsx from 'clsx';

export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({ className, children, ...props }) => (
  <div className="overflow-auto rounded-lg border border-border">
    <table className={clsx('min-w-full text-sm text-left table-sticky', className)} {...props}>
      {children}
    </table>
  </div>
);

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ className, children, ...props }) => (
  <thead className={clsx('bg-card/95 backdrop-blur supports-[backdrop-filter]:backdrop-blur', className)} {...props}>
    {children}
  </thead>
);

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ className, children, ...props }) => (
  <tbody className={clsx('divide-y divide-border', className)} {...props}>
    {children}
  </tbody>
);

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({ className, children, ...props }) => (
  <tr className={clsx('hover:bg-border/50 transition-colors duration-150 focus-within:bg-border/60', className)} {...props}>
    {children}
  </tr>
);

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({ className, children, ...props }) => (
  <th
    className={clsx(
      'px-4 py-3 text-[11px] font-semibold text-muted uppercase tracking-[0.08em] border-b border-border/80',
      className
    )}
    {...props}
  >
    {children}
  </th>
);

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ className, children, ...props }) => (
  <td className={clsx('px-4 py-3 align-middle text-sm text-fg/90', className)} {...props}>
    {children}
  </td>
);

export default Table;
