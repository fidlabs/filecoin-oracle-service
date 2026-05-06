import { FastifyPluginOptions } from "fastify";
import { FastifyTypedInstance } from "../../server";

export function healthRoutes(
  fastify: FastifyTypedInstance,
  options: FastifyPluginOptions,
  done: (err?: Error) => void,
) {
  fastify.get(
    "/health",
    {
      schema: {
        tags: ["Maintenance"],
        description:
          "Health check endpoint to verify if the service is running",
      },
    },
    async (_, replay) => {
      return replay.status(200).send({ status: "ok" });
    },
  );

  done();
}
