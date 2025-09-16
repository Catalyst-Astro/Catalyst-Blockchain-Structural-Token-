import { getConfig } from "@repo/config";
import { Fiorino__factory } from "@repo/contracts";
import { useCallback, useMemo } from "react";
import { getFiorinoBalanceQueryKey } from "./useFiorinoBalance";
import { useWallet, useBuildTransaction } from "@vechain/vechain-kit";
import { ethers } from "ethers";

type Props = { onSuccess?: () => void };

type useSendFiorinoParams = {
  amount: string;
  receiver: string;
};

export const useSendFiorino = ({ onSuccess }: Props) => {
  const { account } = useWallet();

  const clauseBuilder = useCallback(
    ({ amount, receiver }: useSendFiorinoParams) => {
      const GovernorInterface = Fiorino__factory.createInterface();
      const contractAmount = ethers.parseEther(amount);
      const clausesArray: any[] = [];
      clausesArray.push({
        to: getConfig(import.meta.env.VITE_APP_ENV).fiorinoContractAddress,
        contractInterface: GovernorInterface,
        method: "transfer",
        args: [receiver, contractAmount],
        comment: "transfer fiorino",
      });
      return clausesArray;
    },
    [account]
  );

  const refetchQueryKeys = useMemo(
    () => [getFiorinoBalanceQueryKey(account?.address || "")],
    [account]
  );

  return useBuildTransaction({
    clauseBuilder,
    refetchQueryKeys,
    onSuccess,
  });
};
