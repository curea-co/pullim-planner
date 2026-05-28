import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

import { ErrorMessages } from "../constants/error-messages.constant";
import { maskSensitiveFields } from "../utils/mask.util";

/**
 * HttpException이 아닌 예상치 못한 에러를 캐치한다.
 * 500 응답과 함께 에러 로그를 남긴다.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const message =
      exception instanceof Error ? exception.message : "Internal server error";
    const stack = exception instanceof Error ? exception.stack : undefined;

    const requestContext = this.buildRequestContext(request);

    this.logger.error(
      `${request.method} ${request.url} ${HttpStatus.INTERNAL_SERVER_ERROR} - ${message} ${requestContext}`,
      stack,
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: ErrorMessages.COMMON_INTERNAL_SERVER_ERROR.code,
        message: ErrorMessages.COMMON_INTERNAL_SERVER_ERROR.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      },
    });
  }

  private buildRequestContext(request: Request): string {
    const parts: string[] = [];
    const query = maskSensitiveFields(request.query);
    const body = maskSensitiveFields(request.body as Record<string, unknown>);

    if (query && Object.keys(query).length > 0) {
      parts.push(`query=${JSON.stringify(query)}`);
    }
    if (body && Object.keys(body).length > 0) {
      parts.push(`body=${JSON.stringify(body)}`);
    }
    return parts.length > 0 ? `| ${parts.join(" ")}` : "";
  }
}
