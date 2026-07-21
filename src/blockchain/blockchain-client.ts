import {
  Address,
  createPublicClient,
  createWalletClient,
  defineChain,
  Hash,
  http,
  PublicClient,
  TransactionReceipt,
  WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { filecoin, filecoinCalibration } from "viem/chains";
import { SERVICE_CONFIG } from "../config/env";
import { baseLogger } from "../utils/logger";

export enum WalletAccountRole {
  POREP_SERVICE_ROLE = "POREP_SERVICE_ROLE",
  ORACLE_ROLE = "ORACLE_ROLE",
  TERMINATION_ORACLE_ROLE = "TERMINATION_ORACLE_ROLE",
  FILECOIN_PAY_ROLE = "FILECOIN_PAY_ROLE",
}

export const getChain = (chainId: number) => {
  switch (chainId) {
    case 314:
      return filecoin;
    case 314159:
      return filecoinCalibration;
    case 31415926:
      return defineChain({
        id: 31415926,
        name: "Filecoin DevChain",
        nativeCurrency: {
          decimals: 18,
          name: "testnet filecoin",
          symbol: "tFIL",
        },
        rpcUrls: {
          default: { http: ["http://fidlabs.servehttp.com:1234/rpc/v1"] },
        },
        testnet: true,
        contracts: {
          multicall3: {
            address: "0xe1C001010343EAEfa2E80bf0F1072f93b867616A",
            blockCreated: 1657068,
          },
        },
      });
    default:
      throw new Error(`Unsupported chain ID: ${chainId}`);
  }
};

const chain = getChain(Number(SERVICE_CONFIG.CHAIN_ID));
let rpcClient: PublicClient;

const walletClient: { [key in WalletAccountRole]?: WalletClient } = {};

export const getWalletClientAccount = (role: WalletAccountRole) => {
  switch (role) {
    case WalletAccountRole.POREP_SERVICE_ROLE:
      return privateKeyToAccount(
        SERVICE_CONFIG.POREP_SERVICE_ROLE_WALLET_PK as Address,
      );
    case WalletAccountRole.ORACLE_ROLE:
      return privateKeyToAccount(
        SERVICE_CONFIG.ORACLE_ROLE_WALLET_PK as Address,
      );
    case WalletAccountRole.TERMINATION_ORACLE_ROLE:
      return privateKeyToAccount(
        SERVICE_CONFIG.TERMINATION_ORACLE_ROLE_WALLET_PK as Address,
      );
    case WalletAccountRole.FILECOIN_PAY_ROLE:
      return privateKeyToAccount(
        SERVICE_CONFIG.FILECOIN_PAY_ROLE_WALLET_PK as Address,
      );
    default:
      throw new Error(`Unsupported wallet account role: ${role}`);
  }
};

export function getRpcClient() {
  if (!rpcClient) {
    rpcClient = createPublicClient({
      chain,
      transport: http(SERVICE_CONFIG.RPC_URL),
    });
    baseLogger.info("RPC client created on chain ID " + chain.id);
  }

  return rpcClient;
}

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export async function waitForTransactionReceiptWithRetry(
  hash: Hash,
): Promise<TransactionReceipt> {
  const client = getRpcClient();
  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await client.waitForTransactionReceipt({
        hash,
        timeout: 5 * 60 * 1000,
        retryCount: 12,
      });
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }

      const retryDelayMs = attempt * 15 * 1000;

      baseLogger.warn(
        { error, hash, attempt, maxAttempts, retryDelayMs },
        "Transaction receipt not available yet, retrying",
      );

      await sleep(retryDelayMs);
    }
  }

  throw new Error(`Transaction receipt with hash ${hash} could not be found`);
}

export function getWalletClient(role: WalletAccountRole) {
  if (!walletClient[role]) {
    const account = getWalletClientAccount(role);

    if (!account) {
      throw new Error(`No account found for role ${role}`);
    }

    walletClient[role] = createWalletClient({
      account,
      chain,
      transport: http(SERVICE_CONFIG.RPC_URL),
    });

    baseLogger.info(
      `Wallet client with role ${role} created on chain ID ${chain.id}`,
    );
  }

  return walletClient[role];
}
