import { getConfig } from "@repo/config";
import { Fiorino__factory } from "@repo/contracts";
import { useCallback, useMemo } from "react";
import { getFiorinoBalanceQueryKey } from "./useFiorinoBalance";
import { useWallet, useBuildTransaction } from "@vechain/vechain-kit";
import { ethers } from "ethers";

type Props = { onSuccess?: () => void };

type useMintFiorinoParams = {
  amount: string;
  receiver: string;
};

export const useMintFiorino = ({ onSuccess }: Props) => {
  const { account } = useWallet();

  const clauseBuilder = useCallback(
    ({ amount, receiver }: useMintFiorinoParams) => {
      const GovernorInterface = Fiorino__factory.createInterface();
      const contractAmount = ethers.parseEther(amount);
      const clausesArray: any[] = [];
      clausesArray.push({
        to: getConfig(import.meta.env.VITE_APP_ENV).fiorinoContractAddress,
        contractInterface: GovernorInterface,
        method: "mint",
        args: [receiver, contractAmount],
        comment: "mint fiorino",
      });
      return clausesArray;
    },
    [account?.address]
  );

  const refetchQueryKeys = useMemo(
    () => [getFiorinoBalanceQueryKey(account?.address || "")],
    [account?.address]
  );

  return useBuildTransaction({
    clauseBuilder,
    refetchQueryKeys,
    onSuccess,
  });
};
