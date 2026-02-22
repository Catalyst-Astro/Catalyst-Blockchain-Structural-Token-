export type OperationStatus = 'active' | 'pending' | 'blocked';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface OperationRecordProps {
  id?: string;
  name: string;
  owner: string;
  status: OperationStatus;
  updatedAt: string;
  risk: RiskLevel;
}

const riskWeightByLevel: Record<RiskLevel, number> = {
  low: 1,
  medium: 2,
  high: 3
};

export class OperationRecord {
  public readonly id?: string;
  public readonly name: string;
  public readonly owner: string;
  public readonly status: OperationStatus;
  public readonly updatedAt: string;
  public readonly risk: RiskLevel;

  public constructor(props: OperationRecordProps) {
    this.id = props.id;
    this.name = props.name;
    this.owner = props.owner;
    this.status = props.status;
    this.updatedAt = props.updatedAt;
    this.risk = props.risk;
  }

  public matches(search: string, status: string): boolean {
    const normalizedSearch = search.trim().toLowerCase();
    const matchesSearch = normalizedSearch.length === 0 || this.name.toLowerCase().includes(normalizedSearch);
    const matchesStatus = status === 'all' || status === this.status;
    return matchesSearch && matchesStatus;
  }

  public get riskWeight(): number {
    return riskWeightByLevel[this.risk];
  }

  public get statusLabel(): string {
    if (this.status === 'active') return 'Active';
    if (this.status === 'pending') return 'Pending';
    return 'Blocked';
  }

  public get riskLabel(): string {
    if (this.risk === 'low') return 'Low';
    if (this.risk === 'medium') return 'Medium';
    return 'High';
  }

  public get updateAgeDays(): number {
    const parsedDate = new Date(this.updatedAt);
    if (Number.isNaN(parsedDate.valueOf())) return 0;
    const ageMs = Date.now() - parsedDate.valueOf();
    return Math.max(0, Math.floor(ageMs / (1000 * 60 * 60 * 24)));
  }
}
