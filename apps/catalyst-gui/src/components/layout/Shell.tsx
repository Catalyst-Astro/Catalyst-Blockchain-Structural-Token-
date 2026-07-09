import React from 'react';
import Sidebar, { NavKey } from './Sidebar';

interface ShellProps {
  active: NavKey;
  onChange: (key: NavKey) => void;
  children: React.ReactNode;
}

const Shell: React.FC<ShellProps> = ({ active, onChange, children }) => {
  return (
    <div className="app-shell-background min-h-screen bg-[color:var(--bg)] text-fg">
      <div className="mx-auto max-w-6xl px-4 py-6 md:py-8 flex flex-col gap-8">
        <div className="flex flex-col md:flex-row gap-4">
          <Sidebar active={active} onChange={onChange} />
          <main className="flex-1 w-full">{children}</main>
        </div>
      </div>
    </div>
  );
};

export default Shell;
