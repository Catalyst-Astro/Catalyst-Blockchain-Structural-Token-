import { Contract, JsonRpcProvider, formatUnits } from 'ethers';
import { ValuationSnapshot } from '@/domain/valuation/ValuationSnapshot';

const VALUATION_ABI = [
  'function tvp() view returns (uint256)',
  'function latest(uint256) view returns (uint256 projectId, address asset, uint256 amount, uint8 decimals, bytes32 refHash, uint64 at)',
  'function valueOf(uint256) view returns (uint256)'
];

export class ValuationService {
  private readonly rpcUrl: string;
  private readonly contractAddress: string;

  public constructor(rpcUrl: string, contractAddress: string) {
    this.rpcUrl = rpcUrl;
    this.contractAddress = contractAddress;
  }

  public async loadSnapshot(): Promise<ValuationSnapshot> {
    const provider = new JsonRpcProvider(this.rpcUrl);
    const contract = new Contract(this.contractAddress, VALUATION_ABI, provider);
    const rawTvp = (await contract.tvp()) as bigint;
    const usd = Number(formatUnits(rawTvp, 18));
    return new ValuationSnapshot(rawTvp, usd);
  }
}
