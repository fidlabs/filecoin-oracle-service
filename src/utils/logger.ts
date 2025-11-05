import pino from "pino";
import { SERVICE_CONFIG } from "../config/env.js";

export const logger = pino({
  level: SERVICE_CONFIG.LOG_LEVEL,
});
