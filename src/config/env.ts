import "dotenv/config";

enum EnvKeys {
  LOG_LEVEL = "LOG_LEVEL",
  WALLET_PRIVATE_KEY = "WALLET_PRIVATE_KEY",
  ORACLE_CONTRACT_ADDRESS = "ORACLE_CONTRACT_ADDRESS",
  SLA_ALLOCATOR_CONTRACT_ADDRESS = "SLA_ALLOCATOR_CONTRACT_ADDRESS",
  FILECOIN_RPC_URL = "FILECOIN_RPC_URL",
  CHAIN = "CHAIN",
  TRIGGER_INTERVAL_HOURS = "TRIGGER_INTERVAL_HOURS",
  CDP_SERVICE_URL = "CDP_SERVICE_URL",
}

export const SERVICE_CONFIG: { [key in EnvKeys]: string } = {
  LOG_LEVEL: "info",
  ORACLE_CONTRACT_ADDRESS: "",
  SLA_ALLOCATOR_CONTRACT_ADDRESS: "",
  WALLET_PRIVATE_KEY: "",
  FILECOIN_RPC_URL: "",
  CHAIN: "",
  TRIGGER_INTERVAL_HOURS: "",
  CDP_SERVICE_URL: "",
};

for (const key of Object.values(EnvKeys)) {
  if (!process.env[key]) {
    console.error(`Missing required ENV: ${key}`);
    process.exit(1);
  }

  SERVICE_CONFIG[key] = process.env[key] as string;
}
