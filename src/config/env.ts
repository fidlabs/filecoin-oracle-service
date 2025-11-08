import "dotenv/config";

export const EnvKeys = {
  LOG_LEVEL: "LOG_LEVEL",
  WALLET_PRIVATE_KEY: "WALLET_PRIVATE_KEY",
  ORACLE_CONTRACT_ADDRESS: "ORACLE_CONTRACT_ADDRESS",
  SLA_ALLOCATOR_CONTRACT_ADDRESS: "SLA_ALLOCATOR_CONTRACT_ADDRESS",
  RPC_URL: "RPC_URL",
  CHAIN_ID: "CHAIN_ID",
  TRIGGER_INTERVAL_HOURS: "TRIGGER_INTERVAL_HOURS",
  CDP_SERVICE_URL: "CDP_SERVICE_URL",
  JOB_TRIGGER_AUTH_TOKEN: "JOB_TRIGGER_AUTH_TOKEN",
  APP_PORT: "APP_PORT",
} as const;

type EnvKey = (typeof EnvKeys)[keyof typeof EnvKeys];

export const SERVICE_CONFIG: Record<EnvKey, string> = {
  LOG_LEVEL: "info",
  ORACLE_CONTRACT_ADDRESS: "",
  SLA_ALLOCATOR_CONTRACT_ADDRESS: "",
  WALLET_PRIVATE_KEY: "",
  RPC_URL: "",
  CHAIN_ID: "",
  TRIGGER_INTERVAL_HOURS: "",
  CDP_SERVICE_URL: "",
  JOB_TRIGGER_AUTH_TOKEN: "",
  APP_PORT: "",
};

for (const key of Object.values(EnvKeys)) {
  if (!process.env[key]) {
    console.error(`Missing required ENV: ${key}`);
    process.exit(1);
  }

  SERVICE_CONFIG[key] = process.env[key] as string;
}
