export type ErrorCode = string;

export interface ApiError {
  message: string;
  code: ErrorCode;
  statusCode?: number;
}

export interface SuccessResponse<T> {
  success: true;
  data: T;
  error: null;
}

export interface ErrorResponse {
  success: false;
  data: null;
  error: ApiError;
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

declare module "fastify" {
  interface FastifyReply {
    success<T>(data: T, statusCode?: number): FastifyReply;
    fail(params: {
      message: string;
      code: ErrorCode;
      statusCode?: number;
    }): FastifyReply;
  }
}

export type RouteWithResponse<T> = {
  Reply: ApiResponse<T>;
};

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;

  constructor(message: string, code: ErrorCode, statusCode = 500) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}
