import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.spec.ts"],
  setupFiles: ["dotenv/config"],
  clearMocks: true,
  testTimeout: 30_000,
};

export default config;
