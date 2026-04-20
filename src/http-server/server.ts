import { SERVICE_CONFIG } from "../config/env";
import { baseLogger } from "../utils/logger";

import Fastify from "fastify";
import { dealRoutes } from "./routes/deals";
import { healthRoutes } from "./routes/health";
import { responseCustomFormatterPlugin } from "./utils/response-formatter-plugin/response-plugin";
import { debugRoutes } from "./routes/debug";

const fastify = Fastify({
  logger: {
    transport: {
      target: "pino-pretty",
      options: {
        messageFormat: "{msg}",
        ignore: "hostname,pid,avengers",
      },
    },
  },
});

const httpLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[HTTP] " },
);

fastify.register(responseCustomFormatterPlugin);

fastify.register(debugRoutes, { prefix: "/debug" });
fastify.register(healthRoutes, { prefix: "/health" });
fastify.register(dealRoutes, { prefix: "/deals" });

fastify.listen({ port: Number(SERVICE_CONFIG.APP_PORT) }, (error, address) => {
  if (error) {
    httpLogger.error(
      `Failed to start HTTP server: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }

  httpLogger.info(`Oracle HTTP service listening on ${address}`);
  httpLogger.info(`Health endpoint: GET /health`);

  httpLogger.info(
    `Manual job trigger endpoint: POST /trigger-job?job=<job-name>`,
  );
});
