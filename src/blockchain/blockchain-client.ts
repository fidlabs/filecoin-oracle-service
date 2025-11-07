import {
  Address,
  createPublicClient,
  createWalletClient,
  http,
  PublicClient,
  WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { filecoin, filecoinCalibration } from "viem/chains";
import { SERVICE_CONFIG } from "../config/env.js";

const chain =
  SERVICE_CONFIG.CHAIN === "mainnet" ? filecoin : filecoinCalibration;

let rpcClient: PublicClient;
let walletClient: WalletClient;

export const account = privateKeyToAccount(
  SERVICE_CONFIG.WALLET_PRIVATE_KEY as Address,
);

export function getRpcClient() {
  if (!rpcClient) {
    rpcClient = createPublicClient({
      chain,
      transport: http(SERVICE_CONFIG.FILECOIN_RPC_URL),
    });
  }

  return rpcClient;
}

export function getWalletClient() {
  if (!walletClient) {
    walletClient = createWalletClient({
      account,
      chain,
      transport: http(SERVICE_CONFIG.FILECOIN_RPC_URL),
    });
  }

  return walletClient;
}
