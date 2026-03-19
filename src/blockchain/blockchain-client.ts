import {
  Address,
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  PublicClient,
  WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { filecoin, filecoinCalibration } from "viem/chains";
import { SERVICE_CONFIG } from "../config/env";
import { baseLogger } from "../utils/logger";
import { WalletAccountRole } from "./client-contract";

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
