import { Address, encodeFunctionData } from "viem";
import { SERVICE_CONFIG } from "../config/env";
import { baseLogger } from "../utils/logger";
import {
  SliAttestation,
  StorageProvidersSliData,
  StorageProvidersSliMetricType,
} from "../utils/types";
import { SLI_ORACLE_CONTRACT_ABI } from "./abis/sli-oracle-abi";
import { getRpcClient, getWalletClient } from "./blockchain-client";
import { WalletAccountRole } from "./client-contract";

const childLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[SLI Oracle Contract] " },
);

const rpcClient = getRpcClient();
const walletClient = getWalletClient(WalletAccountRole.ORACLE_ROLE);

export async function setSliOnOracleContract(sliDataForProviders: {
  [storageProviderId: string]: StorageProvidersSliData[];
}) {
  const oracleContractAddress =
    SERVICE_CONFIG.ORACLE_CONTRACT_ADDRESS as Address;

  childLogger.info(`Preparing SLI data for providers...`);

  const buildedSliData: SliAttestation[] = Object.entries(
    sliDataForProviders,
  ).map(([storageProviderId, data]) => {
    const retrievability =
      Number(
        data.find(
          (d) =>
            d.sliMetricType ===
            StorageProvidersSliMetricType.RPA_RETRIEVABILITY,
        )?.sliMetricValue,
      ) || 0;
    const indexingMetric =
      Number(
        data.find(
          (d) =>
            d.sliMetricType === StorageProvidersSliMetricType.IPNI_REPORTING,
        )?.sliMetricValue,
      ) || 0;

    const latencyMetric =
      Number(
        data.find((d) => d.sliMetricType === StorageProvidersSliMetricType.TTFB)
          ?.sliMetricValue,
      ) || 0;

    const bandwidthMetric =
      Number(
        data
          .find(
            (d) => d.sliMetricType === StorageProvidersSliMetricType.BANDWIDTH,
          )
          ?.sliMetricValue?.split(".")[0],
      ) || 0;

    const sliAttestation: SliAttestation = {
      provider: storageProviderId.startsWith("f0")
        ? BigInt(storageProviderId.slice(2))
        : BigInt(storageProviderId),
      slis: {
        retrievabilityBps: retrievability !== null ? retrievability * 100 : 0,
        indexingPct: indexingMetric,
        latencyMs: latencyMetric,
        bandwidthMbps: bandwidthMetric,
      },
    };

    childLogger.info(`Prepared SLI attestation for providers`);

    return sliAttestation;
  });

  const encodedCalls = buildedSliData.map((req) =>
    encodeFunctionData({
      abi: SLI_ORACLE_CONTRACT_ABI,
      functionName: "setSLI",
      args: [req.provider, req.slis],
    }),
  );

  childLogger.info("setSLI: Simulating request...");

  const { request } = await rpcClient.simulateContract({
    address: oracleContractAddress,
    abi: SLI_ORACLE_CONTRACT_ABI,
    functionName: "multicall",
    args: [encodedCalls],
    account: walletClient.account,
  });

  childLogger.info("setSLI: Sending transaction...");

  const txHash = await walletClient.writeContract(request);

  childLogger.info(
    `setSLI: Transaction sent: ${txHash}, waiting for confirmation...`,
  );

  const receipt = await rpcClient.waitForTransactionReceipt({
    hash: txHash,
  });

  childLogger.info(
    `setSLI: Transaction executed in block ${receipt.blockNumber}`,
  );
}
