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
import { SERVICE_CONFIG } from "../config/env.js";
import { baseLogger } from "../utils/logger.js";

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
let walletClient: WalletClient;

export const account = privateKeyToAccount(
  SERVICE_CONFIG.WALLET_PRIVATE_KEY as Address,
);

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

export function getWalletClient() {
  if (!walletClient) {
    walletClient = createWalletClient({
      account,
      chain,
      transport: http(SERVICE_CONFIG.RPC_URL),
    });

    baseLogger.info("Wallet client created on chain ID " + chain.id);
  }

  return walletClient;
}
