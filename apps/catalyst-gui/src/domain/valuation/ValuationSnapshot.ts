export class ValuationSnapshot {
  public readonly raw: bigint;
  private readonly usdValue: number;

  public constructor(raw: bigint, usdValue: number) {
    this.raw = raw;
    this.usdValue = usdValue;
  }

  public toUsdNumber(): number {
    return this.usdValue;
  }

  public toHuman(): string {
    const usd = this.usdValue;
    if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(2)}M`;
    if (usd >= 1_000) return `$${usd.toFixed(0)}`;
    return `$${usd.toFixed(2)}`;
  }
}
