import { OperationRecord, OperationRecordProps, OperationStatus } from './OperationRecord';

export interface PortfolioMetrics {
  total: number;
  active: number;
  pending: number;
  blocked: number;
  riskIndex: number;
  freshnessIndex: number;
}

export class OperationPortfolio {
  private readonly records: OperationRecord[];

  public constructor(records: OperationRecord[]) {
    this.records = records;
  }

  public static fromSeed(seedRows: OperationRecordProps[]): OperationPortfolio {
    return new OperationPortfolio(seedRows.map((row) => new OperationRecord(row)));
  }

  public filter(search: string, status: string): OperationRecord[] {
    return this.records.filter((record) => record.matches(search, status));
  }

  public get all(): OperationRecord[] {
    return this.records;
  }

  public countByStatus(status: OperationStatus): number {
    return this.records.filter((record) => record.status === status).length;
  }

  public get metrics(): PortfolioMetrics {
    const total = this.records.length;
    const active = this.countByStatus('active');
    const pending = this.countByStatus('pending');
    const blocked = this.countByStatus('blocked');

    const aggregateRiskWeight = this.records.reduce((sum, record) => sum + record.riskWeight, 0);
    const maxWeight = total * 3;
    const riskIndex = total === 0 ? 0 : Math.round((aggregateRiskWeight / maxWeight) * 100);

    const avgAge = total === 0 ? 0 : this.records.reduce((sum, record) => sum + record.updateAgeDays, 0) / total;
    const freshnessIndex = Math.max(0, Math.min(100, Math.round(100 - avgAge * 12)));

    return { total, active, pending, blocked, riskIndex, freshnessIndex };
  }

  public get mostCritical(): OperationRecord | null {
    if (this.records.length === 0) return null;
    const ordered = [...this.records].sort((a, b) => {
      if (a.riskWeight !== b.riskWeight) return b.riskWeight - a.riskWeight;
      return b.updateAgeDays - a.updateAgeDays;
    });
    return ordered[0];
  }
}
