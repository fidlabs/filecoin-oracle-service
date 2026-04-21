import { FastifyPluginOptions } from "fastify";
import { FastifyTypedInstance } from "../../server";

export function healthRoutes(
  fastify: FastifyTypedInstance,
  options: FastifyPluginOptions,
  done: (err?: Error) => void,
) {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["Maintenance"],
        description:
          "Health check endpoint to verify if the service is running",
      },
    },
    async (_, replay) => {
      return replay.success({ status: "ok" });
    },
  );

  done();
}
