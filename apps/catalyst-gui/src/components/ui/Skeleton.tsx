import React from 'react';
import clsx from 'clsx';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => (
  <div
    className={clsx('skeleton bg-border/70 rounded-md', className)}
    aria-label="Loading"
    {...props}
  />
);

export default Skeleton;
