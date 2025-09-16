import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { symbolicEventLogAbi, symbolicEventLogAddress } from '../lib/contractInterfaces';

export default function useSymbolicEvents(provider) {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!provider) return;
    const contract = new ethers.Contract(symbolicEventLogAddress, symbolicEventLogAbi, provider);
    async function load() {
      const filter = contract.filters.SymbolicEvent();
      const logs = await contract.queryFilter(filter, -1000); // last blocks
      const parsed = logs.map(log => ({
        timestamp: log.args.timestamp.toString(),
        evento: log.args.evento,
        validador: log.args.validador,
        hash_simb: log.args.hashSimb,
        firma: log.args.firma,
        glifo_hash: log.args.glifoHash,
        ipfs: log.args.ipfs
      }));
      setEvents(parsed.reverse());
    }
    load();

    contract.on('SymbolicEvent', (...args) => {
      load();
    });

    return () => {
      contract.removeAllListeners();
    };
  }, [provider]);

  return events;
}
