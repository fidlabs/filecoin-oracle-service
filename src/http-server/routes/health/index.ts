import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";

export function healthRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
  done: (err?: Error) => void,
) {
  fastify.get("/", async (req: FastifyRequest, replay: FastifyReply) => {
    return replay.success({ status: "ok" });
  });

  done();
}
