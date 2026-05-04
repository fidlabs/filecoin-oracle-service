import { SERVICE_CONFIG } from "../config/env";
import { baseLogger } from "../utils/logger";

import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import Fastify from "fastify";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { dealRoutes } from "./routes/deals";
import { debugRoutes } from "./routes/debug";
import { healthRoutes } from "./routes/health";
import { responseCustomFormatterPlugin } from "./utils/response-formatter-plugin/response-plugin";

const fastify = Fastify({
  logger: {
    level: "info",
  },
});

const httpLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[HTTP] " },
);

export const app = fastify.withTypeProvider<ZodTypeProvider>();

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.register(swagger, {
  openapi: {
    info: {
      title: "API",
      version: "1.0.0",
    },
  },
  transform: jsonSchemaTransform,
});

app.register(swaggerUI, {
  routePrefix: "/docs",
  uiConfig: {
    docExpansion: "full",
    deepLinking: true,
  },
});

app.register(responseCustomFormatterPlugin);

app.register(debugRoutes, {
  prefix: "/debug",
});
app.register(healthRoutes, { prefix: "/health" });
app.register(dealRoutes, { prefix: "/deals" });

app.listen({ port: Number(SERVICE_CONFIG.APP_PORT) }, (error, address) => {
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

export type FastifyTypedInstance = typeof app;
