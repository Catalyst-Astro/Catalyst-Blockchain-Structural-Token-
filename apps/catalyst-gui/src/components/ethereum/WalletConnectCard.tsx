import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, LogOut, Send, Signature, Wallet } from 'lucide-react';
import EthereumProvider from '@walletconnect/ethereum-provider';
import { BrowserProvider, Contract, formatEther, parseEther } from 'ethers';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';

type CardState =
  | { state: 'empty'; message: string }
  | { state: 'connecting' }
  | { state: 'error'; message: string }
  | { state: 'ready'; address: string; chainId: number; balanceEth: string };

const SEPOLIA_CHAIN_ID = 11155111;
const SEPOLIA_CHAIN_ID_HEX = '0xaa36a7';
const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)'
];

function shortAddress(addr: string): string {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

const WalletConnectCard: React.FC = () => {
  const projectId = import.meta.env.VITE_WC_PROJECT_ID as string | undefined;
  const sepoliaRpcUrl = (import.meta.env.VITE_SEPOLIA_RPC_URL as string | undefined) || 'https://rpc.sepolia.org';

  const [wcProvider, setWcProvider] = useState<EthereumProvider | null>(null);
  const [card, setCard] = useState<CardState>(() => {
    if (!projectId) {
      return { state: 'empty', message: 'Missing VITE_WC_PROJECT_ID. Add it to apps/catalyst-gui/.env then restart.' };
    }
    return { state: 'empty', message: 'Not connected. Use Connect to link MetaMask (WalletConnect).' };
  });

  const [txTo, setTxTo] = useState('');
  const [txAmount, setTxAmount] = useState('0.001');
  const [txStatus, setTxStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);

  const [sigStatus, setSigStatus] = useState<'idle' | 'signing' | 'signed' | 'error'>('idle');
  const [sigValue, setSigValue] = useState<string | null>(null);

  const [erc20Address, setErc20Address] = useState('');
  const [erc20Balance, setErc20Balance] = useState<string | null>(null);
  const [erc20Meta, setErc20Meta] = useState<{ symbol: string; decimals: number } | null>(null);
  const [erc20Loading, setErc20Loading] = useState(false);
  const [erc20Error, setErc20Error] = useState<string | null>(null);

  const readWallet = useCallback(
    async (provider: EthereumProvider) => {
      const ethersProvider = new BrowserProvider(provider as any);
      const signer = await ethersProvider.getSigner();
      const address = await signer.getAddress();
      const network = await ethersProvider.getNetwork();
      const chainId = Number(network.chainId);
      const balance = await ethersProvider.getBalance(address);
      const balanceEth = Number(formatEther(balance)).toFixed(6);
      setCard({ state: 'ready', address, chainId, balanceEth });
    },
    [setCard]
  );

  const getEthersProvider = useCallback(
    () => (wcProvider ? new BrowserProvider(wcProvider as any) : null),
    [wcProvider]
  );

  const connect = useCallback(async () => {
    if (!projectId) {
      setCard({ state: 'empty', message: 'Missing VITE_WC_PROJECT_ID. Add it to apps/catalyst-gui/.env then restart.' });
      return;
    }

    setCard({ state: 'connecting' });
    try {
      const provider = await EthereumProvider.init({
        projectId,
        chains: [SEPOLIA_CHAIN_ID],
        rpcMap: { [SEPOLIA_CHAIN_ID]: sepoliaRpcUrl },
        showQrModal: true
      });

      await provider.connect();
      setWcProvider(provider);
      await readWallet(provider);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'WalletConnect error';
      setCard({ state: 'error', message });
    }
  }, [projectId, readWallet, sepoliaRpcUrl]);

  const disconnect = useCallback(async () => {
    try {
      await wcProvider?.disconnect();
    } finally {
      setWcProvider(null);
      if (!projectId) {
        setCard({ state: 'empty', message: 'Missing VITE_WC_PROJECT_ID. Add it to apps/catalyst-gui/.env then restart.' });
      } else {
        setCard({ state: 'empty', message: 'Disconnected.' });
      }
    }
  }, [projectId, wcProvider]);

  const switchToSepolia = useCallback(async () => {
    if (!wcProvider) return;
    try {
      await wcProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }]
      });
      await readWallet(wcProvider);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not switch chain';
      setCard({ state: 'error', message });
    }
  }, [readWallet, wcProvider]);

  useEffect(() => {
    if (!wcProvider) return;

    const onAccounts = async () => {
      try {
        await readWallet(wcProvider);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Could not read wallet';
        setCard({ state: 'error', message });
      }
    };

    const onChain = async () => {
      try {
        await readWallet(wcProvider);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Could not read chain';
        setCard({ state: 'error', message });
      }
    };

    const onDisconnect = () => {
      setWcProvider(null);
      setCard({ state: 'empty', message: 'Disconnected.' });
    };

    wcProvider.on('accountsChanged', onAccounts);
    wcProvider.on('chainChanged', onChain);
    wcProvider.on('disconnect', onDisconnect);

    return () => {
      wcProvider.removeListener('accountsChanged', onAccounts);
      wcProvider.removeListener('chainChanged', onChain);
      wcProvider.removeListener('disconnect', onDisconnect);
    };
  }, [readWallet, wcProvider]);

  const isSepolia = card.state === 'ready' && card.chainId === SEPOLIA_CHAIN_ID;
  const chainIdLabel = card.state === 'ready' ? card.chainId : null;
  const subtitle = useMemo(() => {
    if (card.state === 'ready') {
      return isSepolia ? 'Connected to Sepolia testnet.' : `Connected, but not Sepolia (chainId: ${chainIdLabel}).`;
    }
    return 'Connect MetaMask using WalletConnect (recommended for Electron).';
  }, [card.state, chainIdLabel, isSepolia]);

  const sendTransaction = useCallback(async () => {
    if (card.state !== 'ready' || !wcProvider) return;
    const provider = getEthersProvider();
    if (!provider) return;
    if (!isSepolia) {
      await switchToSepolia();
    }

    setTxStatus('sending');
    setTxHash(null);
    try {
      const signer = await provider.getSigner();
      const tx = await signer.sendTransaction({
        to: txTo || signer.address,
        value: parseEther(txAmount || '0.001')
      });
      setTxHash(tx.hash);
      await tx.wait();
      setTxStatus('sent');
      await readWallet(wcProvider);
    } catch (e) {
      setTxStatus('error');
      setTxHash((e as Error)?.message || 'tx failed');
    }
  }, [card.state, getEthersProvider, isSepolia, readWallet, switchToSepolia, txAmount, txTo, wcProvider]);

  const signMessage = useCallback(async () => {
    if (card.state !== 'ready' || !wcProvider) return;
    const provider = getEthersProvider();
    if (!provider) return;
    const signer = await provider.getSigner();
    setSigStatus('signing');
    setSigValue(null);
    try {
      const sig = await signer.signMessage('Catalyst GUI sign-in (Sepolia test)');
      setSigValue(sig);
      setSigStatus('signed');
    } catch (e) {
      setSigStatus('error');
      setSigValue((e as Error)?.message || 'sign error');
    }
  }, [card.state, getEthersProvider, wcProvider]);

  const loadErc20Balance = useCallback(async () => {
    if (!erc20Address || card.state !== 'ready' || !wcProvider) return;
    const provider = getEthersProvider();
    if (!provider) return;
    setErc20Loading(true);
    setErc20Error(null);
    try {
      const c = new Contract(erc20Address, ERC20_ABI, provider);
      const [symbol, decimals, bal] = await Promise.all([
        c.symbol(),
        c.decimals(),
        c.balanceOf(card.address)
      ]);
      setErc20Meta({ symbol, decimals });
      const balHuman = Number(bal) / 10 ** Number(decimals);
      setErc20Balance(`${balHuman.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${symbol}`);
    } catch (e) {
      setErc20Error((e as Error)?.message || 'ERC20 read failed');
      setErc20Balance(null);
    } finally {
      setErc20Loading(false);
    }
  }, [card, erc20Address, getEthersProvider, wcProvider]);

  return (
    <Card>
      <CardHeader className="flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center">
            <Wallet className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <CardTitle>Wallet (MetaMask)</CardTitle>
            <CardDescription>{subtitle}</CardDescription>
          </div>
        </div>
        <div className="flex gap-2">
          {card.state === 'ready' ? (
            <Button size="sm" variant="secondary" onClick={disconnect} iconLeft={<LogOut className="h-4 w-4" aria-hidden />}>
              Disconnect
            </Button>
          ) : (
            <Button size="sm" variant="primary" onClick={connect} disabled={card.state === 'connecting'}>
              Connect
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {card.state === 'connecting' ? (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-border bg-border/25 p-3">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-6 w-44" />
            </div>
            <div className="rounded-md border border-border bg-border/25 p-3">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-6 w-20" />
            </div>
            <div className="rounded-md border border-border bg-border/25 p-3">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-6 w-28" />
            </div>
          </div>
        ) : card.state === 'ready' ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-md border border-border bg-card p-3">
                <div className="text-xs text-muted">Account</div>
                <div className="mt-1 flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-300" aria-hidden />
                  <span className="tabular-nums">{shortAddress(card.address)}</span>
                </div>
                <div className="mt-1 text-xs text-muted break-all">{card.address}</div>
              </div>
              <div className="rounded-md border border-border bg-card p-3">
                <div className="text-xs text-muted">Chain</div>
                <div className="mt-1 text-lg font-semibold tabular-nums">{card.chainId}</div>
                {!isSepolia ? (
                  <div className="mt-2">
                    <Button size="sm" variant="primary" onClick={switchToSepolia}>
                      Switch to Sepolia
                    </Button>
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-muted">Sepolia test ETH has no real-world value.</div>
                )}
              </div>
              <div className="rounded-md border border-border bg-card p-3">
                <div className="text-xs text-muted">Balance</div>
                <div className="mt-1 text-lg font-semibold tabular-nums">{card.balanceEth} ETH</div>
                <div className="mt-1 text-xs text-muted">Network fees apply when sending transactions.</div>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border border-border bg-card p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Send className="h-4 w-4 text-primary" aria-hidden />
                  <span>Send Sepolia ETH</span>
                </div>
              <input
                className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
                placeholder="Recipient (default: self)"
                value={txTo}
                onChange={(e) => setTxTo(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 rounded-md border border-border bg-transparent px-3 py-2 text-sm"
                  placeholder="Amount in ETH"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                />
                <Button
                  size="sm"
                  variant="primary"
                  onClick={sendTransaction}
                  disabled={txStatus === 'sending'}
                  iconLeft={txStatus === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
                >
                  {txStatus === 'sending' ? 'Sending' : 'Send'}
                </Button>
              </div>
              {txHash && (
                <p className="text-xs text-muted break-all">
                  {txStatus === 'sent' ? 'Sent tx:' : 'Error:'} {txHash}
                </p>
              )}
            </div>

            <div className="rounded-md border border-border bg-card p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Signature className="h-4 w-4 text-primary" aria-hidden />
                <span>Sign message</span>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={signMessage}
                disabled={sigStatus === 'signing'}
                iconLeft={sigStatus === 'signing' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Signature className="h-4 w-4" aria-hidden />}
              >
                {sigStatus === 'signing' ? 'Signing…' : 'Sign test message'}
              </Button>
              {sigValue && (
                <p className="text-xs text-muted break-words">
                  {sigStatus === 'signed' ? 'Signature:' : 'Error:'} {sigValue}
                </p>
              )}
            </div>
            </div>

            <div className="rounded-md border border-border bg-card p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Wallet className="h-4 w-4 text-primary" aria-hidden />
                <span>Read ERC-20 balance</span>
              </div>
              <input
                className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
                placeholder="ERC20 contract address (Sepolia)"
                value={erc20Address}
                onChange={(e) => setErc20Address(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={loadErc20Balance} disabled={erc20Loading}>
                  {erc20Loading ? 'Checking…' : 'Check balance'}
                </Button>
                {erc20Meta && <span className="text-xs text-muted">Symbol: {erc20Meta.symbol}</span>}
              </div>
              {erc20Balance && <p className="text-sm font-semibold">{erc20Balance}</p>}
              {erc20Error && <p className="text-xs text-red-500 break-words">Error: {erc20Error}</p>}
              <p className="text-xs text-muted">Uses connected account for balanceOf.</p>
            </div>
          </div>
        ) : card.state === 'error' ? (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-100">
            <AlertTriangle className="h-5 w-5 mt-0.5" aria-hidden />
            <div className="space-y-1">
              <div className="font-semibold">Wallet error</div>
              <div className="break-words">{card.message}</div>
              <div className="pt-2">
                <Button size="sm" variant="primary" onClick={connect}>
                  Retry
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-border bg-border/25 p-4 text-sm text-muted">{card.message}</div>
        )}
      </CardContent>
    </Card>
  );
};

export default WalletConnectCard;
