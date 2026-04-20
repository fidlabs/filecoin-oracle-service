import { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { AppError, ErrorCode, ErrorResponse, SuccessResponse } from "./types";

export const responseCustomFormatterPlugin: FastifyPluginAsync = async (
  fastify,
) => {
  fastify.decorateReply("success", function <
    T,
  >(this: FastifyReply, data: T, statusCode = 200) {
    const response: SuccessResponse<T> = {
      success: true,
      data,
      error: null,
    };

    return this.code(statusCode).send(response);
  });

  fastify.decorateReply(
    "fail",
    function (
      this: FastifyReply,
      {
        message,
        code,
        statusCode = 500,
      }: {
        message: string;
        code: ErrorCode;
        statusCode?: number;
      },
    ) {
      const response: ErrorResponse = {
        success: false,
        data: null,
        error: {
          message,
          code,
        },
      };

      return this.code(statusCode).send(response);
    },
  );

  fastify.setErrorHandler(
    (error: Error, _request: FastifyRequest, reply: FastifyReply) => {
      let statusCode = 500;
      let code: ErrorCode = "INTERNAL_ERROR";

      if (error instanceof AppError) {
        statusCode = error.statusCode;
        code = error.code;
      }

      const response: ErrorResponse = {
        success: false,
        data: null,
        error: {
          message: error.message,
          code,
          statusCode,
        },
      };

      return reply.code(statusCode).send(response);
    },
  );
};

export default fp(responseCustomFormatterPlugin);
