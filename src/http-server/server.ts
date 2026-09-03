import { SERVICE_CONFIG } from "../config/env";
import { baseLogger } from "../utils/logger";
import cors from "@fastify/cors";
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
import { onChainTransactionsRoutes } from "./routes/on-chain-transactions";
import { responseCustomFormatterPlugin } from "./utils/response-formatter-plugin/response-plugin";

const httpLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[HTTP] " },
);

const fastify = Fastify({
  loggerInstance: httpLogger,
  disableRequestLogging: true,
});

export const app = fastify.withTypeProvider<ZodTypeProvider>();

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.register(cors, {
  origin: "*",
  methods: ["GET", "POST"],
});

app.addHook("onResponse", (request, reply, done) => {
  request.log.info(
    `${request.method} ${request.url} → ${reply.statusCode} (${reply.elapsedTime.toFixed(2)} ms) [${request.id}]`,
  );
  done();
});

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
app.register(onChainTransactionsRoutes, { prefix: "/on-chain-transactions" });

app.listen(
  { port: Number(SERVICE_CONFIG.APP_PORT), host: "0.0.0.0" },
  (error, address) => {
    if (error) {
      fastify.log.error({ err: error }, "Failed to start HTTP server");
      process.exit(1);
    }

    fastify.log.info(`Oracle HTTP service listening on ${address}`);
    fastify.log.info("Health endpoint: GET /health");

    fastify.log.info(
      `Manual job trigger endpoint: POST /trigger-job?job=<job-name>`,
    );
  },
);

export type FastifyTypedInstance = typeof app;
