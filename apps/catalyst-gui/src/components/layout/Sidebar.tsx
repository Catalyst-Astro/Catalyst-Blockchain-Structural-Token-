import React from 'react';
import { LayoutDashboard, Palette, Settings, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';

type NavKey = 'dashboard' | 'operator' | 'ui_lab' | 'settings';

interface SidebarProps {
  active: NavKey;
  onChange: (key: NavKey) => void;
}

const items: { key: NavKey; label: string; icon: React.ReactNode }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" aria-hidden /> },
  { key: 'operator', label: 'Operator', icon: <ShieldCheck className="h-4 w-4" aria-hidden /> },
  { key: 'ui_lab', label: 'UI Lab', icon: <Palette className="h-4 w-4" aria-hidden /> },
  { key: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" aria-hidden /> }
];

const Sidebar: React.FC<SidebarProps> = ({ active, onChange }) => (
  <nav className="flex flex-row md:flex-col gap-2 md:min-w-[220px]" aria-label="Primary">
    {items.map((item) => (
      <button
        key={item.key}
        onClick={() => onChange(item.key)}
        className={clsx(
          'w-full inline-flex items-center gap-3 rounded-md px-3.5 py-2.5 text-sm font-semibold transition duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
          active === item.key
            ? 'bg-primary text-primary-foreground shadow-soft'
            : 'bg-card border border-border text-fg hover:border-primary/70'
        )}
        aria-current={active === item.key ? 'page' : undefined}
      >
        {item.icon}
        <span>{item.label}</span>
      </button>
    ))}
  </nav>
);

export type { NavKey };
export default Sidebar;
