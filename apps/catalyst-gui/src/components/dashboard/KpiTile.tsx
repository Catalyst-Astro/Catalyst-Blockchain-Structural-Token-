import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';

interface KpiTileProps {
  label: string;
  value: string;
  helper: string;
  trend?: 'up' | 'down' | 'flat';
}

const accentByTrend: Record<NonNullable<KpiTileProps['trend']>, string> = {
  up: 'text-emerald-600 dark:text-emerald-300',
  down: 'text-red-600 dark:text-red-300',
  flat: 'text-muted'
};

const KpiTile: React.FC<KpiTileProps> = ({ label, value, helper, trend = 'flat' }) => (
  <Card className="relative overflow-hidden border-border/70 bg-card">
    <CardContent className="p-4">
      <p className="text-xs uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold leading-none tracking-tight">{value}</p>
      <p className={`mt-2 text-sm ${accentByTrend[trend]}`}>{helper}</p>
    </CardContent>
  </Card>
);

export default KpiTile;
