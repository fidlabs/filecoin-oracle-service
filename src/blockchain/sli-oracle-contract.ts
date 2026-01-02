import { Address, encodeFunctionData } from "viem";
import { SERVICE_CONFIG } from "../config/env.js";
import { baseLogger } from "../utils/logger.js";
import {
  CdpSliResponse,
  SLIAttestation,
  StorageProvidersSLIMetric,
} from "../utils/types.js";
import { SLI_ORACLE_CONTRACT_ABI } from "./abis/sli-oracle-abi.js";
import { getRpcClient, getWalletClient } from "./blockchain-client.js";

const childLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[SLI Oracle Contract] " },
);

export async function setSliOnOracleContract(
  sliDataForProviders: CdpSliResponse[],
) {
  const rpcClient = getRpcClient();
  const walletClient = getWalletClient();

  const oracleContractAddress =
    SERVICE_CONFIG.ORACLE_CONTRACT_ADDRESS as Address;

  const buildedSliData: {
    provider: bigint;
    sli: SLIAttestation;
  }[] = sliDataForProviders.map((provider) => {
    childLogger.info(
      `Preparing SLI data for provider ${provider.storageProviderId}`,
    );
    const availabilityMetric =
      Number(
        provider.data
          .find(
            (d) => d.sliMetric === StorageProvidersSLIMetric.RPA_RETRIEVABILITY,
          )
          ?.sliMetricValue?.split(".")[0],
      ) || 0;
    const indexingMetric =
      Number(
        provider.data.find(
          (d) => d.sliMetric === StorageProvidersSLIMetric.IPNI_REPORTING,
        )?.sliMetricValue,
      ) || 0;

    const retentionMetric =
      Number(
        provider.data.find(
          (d) => d.sliMetric === StorageProvidersSLIMetric.RETENTION,
        )?.sliMetricValue,
      ) || 0;

    const latencyMetric =
      Number(
        provider.data.find(
          (d) => d.sliMetric === StorageProvidersSLIMetric.TTFB,
        )?.sliMetricValue,
      ) || 0;

    const bandwidthMetric =
      Number(
        provider.data
          .find((d) => d.sliMetric === StorageProvidersSLIMetric.BANDWIDTH)
          ?.sliMetricValue?.split(".")[0],
      ) || 0;

    const data = {
      provider: provider.storageProviderId.startsWith("f0")
        ? BigInt(provider.storageProviderId.slice(2))
        : BigInt(provider.storageProviderId),
      sli: {
        availability: availabilityMetric,
        indexing: indexingMetric,
        latency: latencyMetric,
        retention: retentionMetric,
        bandwidth: bandwidthMetric,
        stability: 0,
        // lastUpdate: BigInt(new Date(provider.updatedAt).getTime()),
        lastUpdate: BigInt(Math.floor(Date.now() / 1000)), // TODO: which timestamp to use? each metric has its own updatedAt
      },
    };

    return data;
  });

  const encodedCalls = buildedSliData.map((req) =>
    encodeFunctionData({
      abi: SLI_ORACLE_CONTRACT_ABI,
      functionName: "setSLI",
      args: [req.provider, req.sli],
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

export async function getSPEmptyAttestations(): Promise<void> {
  const rpcClient = getRpcClient();

  childLogger.info(
    "Fetching Attestations from SLI Oracle contract for SP: f03315260",
  );

  const providers = await rpcClient.readContract({
    address: SERVICE_CONFIG.ORACLE_CONTRACT_ADDRESS as Address,
    abi: SLI_ORACLE_CONTRACT_ABI,
    functionName: "attestations",
    args: [90999],
  });

  childLogger.info(
    `Fetched Attestation from SLI Oracle contract: ` + providers,
  );
}

export async function getSPFillAttestations(): Promise<void> {
  const rpcClient = getRpcClient();

  childLogger.info(
    "Fetching Attestations from SLI Oracle contract for SP: f03315260",
  );

  const providers = await rpcClient.readContract({
    address: SERVICE_CONFIG.ORACLE_CONTRACT_ADDRESS as Address,
    abi: SLI_ORACLE_CONTRACT_ABI,
    functionName: "attestations",
    args: [3315260],
  });

  childLogger.info(
    `Fetched Attestations from SLI Oracle contract: ` + providers,
  );
}
