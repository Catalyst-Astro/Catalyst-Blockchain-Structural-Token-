import React from 'react';
import clsx from 'clsx';
import type { OperationStatus } from '@/domain/operations/OperationRecord';

interface StatusPillProps {
  status: OperationStatus;
}

const statusClassByValue: Record<OperationStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-100',
  blocked: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200'
};

const labelByStatus: Record<OperationStatus, string> = {
  active: 'Active',
  pending: 'Pending',
  blocked: 'Blocked'
};

const StatusPill: React.FC<StatusPillProps> = ({ status }) => (
  <span
    className={clsx(
      'inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold',
      statusClassByValue[status]
    )}
  >
    {labelByStatus[status]}
  </span>
);

export default StatusPill;
