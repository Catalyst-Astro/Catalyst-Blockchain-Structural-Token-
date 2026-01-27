import React from 'react';
import { Moon, Sun, RefreshCw } from 'lucide-react';
import Button from '../ui/Button';

interface HeaderBarProps {
  title: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onRefresh: () => void;
  accessory?: React.ReactNode;
}

const HeaderBar: React.FC<HeaderBarProps> = ({ title, theme, onToggleTheme, onRefresh, accessory }) => {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6" aria-label="Page header">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold shadow-soft">CG</div>
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-muted">Catalyst GUI</p>
          <h1 className="text-3xl font-semibold leading-tight">{title}</h1>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {accessory}
        <Button
          variant="secondary"
          size="sm"
          aria-label="Toggle theme"
          onClick={onToggleTheme}
          iconLeft={theme === 'light' ? <Moon className="h-4 w-4" aria-hidden /> : <Sun className="h-4 w-4" aria-hidden />}>
          Toggle theme
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Refresh"
          onClick={onRefresh}
          iconLeft={<RefreshCw className="h-4 w-4" aria-hidden />}
        >
          Refresh
        </Button>
      </div>
    </header>
  );
};

export default HeaderBar;
