import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

import { ErrorMessages } from "../constants/error-messages.constant";
import { maskSensitiveFields } from "../utils/mask.util";

/**
 * HttpException 전용 필터.
 *
 * Service 레이어에서 `throw new NotFoundException(ErrorMessages.PLANNER_NOT_FOUND)`
 * 형태로 던지면 본 필터가 표준 응답 형식 `{ success: false, error: { code, message, statusCode } }`
 * 으로 변환한다.
 *
 * 응답 envelope (옵션 A): plan §6.2 결정.
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const requestContext = this.buildRequestContext(request);

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} ${status} - ${exception.message} ${requestContext}`,
        exception.stack,
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} ${status} - ${exception.message} ${requestContext}`,
      );
    }

    let error: { code: string; message: string; statusCode: number };

    if (typeof exceptionResponse === "string") {
      const resolved = this.resolveFromStatus(status);
      error = {
        code: resolved.code,
        message: resolved.message,
        statusCode: status,
      };
    } else if (this.isValidationError(exceptionResponse)) {
      error = {
        code: ErrorMessages.COMMON_VALIDATION_FAILED.code,
        message: exceptionResponse.message.join(", "),
        statusCode: status,
      };
    } else if (this.isErrorMessageResponse(exceptionResponse)) {
      const r = exceptionResponse;
      error = {
        code: r.code,
        message: r.message,
        statusCode: status,
      };
    } else {
      const resolved = this.resolveFromStatus(status);
      error = {
        code: resolved.code,
        message: resolved.message,
        statusCode: status,
      };
    }

    response.status(status).json({ success: false, error });
  }

  /** ValidationPipe가 던지는 에러인지 확인한다. */
  private isValidationError(
    res: object,
  ): res is { message: string[]; error: string } {
    return Array.isArray((res as { message?: unknown }).message);
  }

  /** ErrorMessages 상수를 사용한 에러인지 확인한다. */
  private isErrorMessageResponse(
    res: object,
  ): res is { code: string; message: string } {
    return (
      typeof (res as { code?: unknown }).code === "string" &&
      typeof (res as { message?: unknown }).message === "string"
    );
  }

  /** HTTP 상태 코드에 대응하는 기본 에러 코드와 메시지를 반환한다. */
  private resolveFromStatus(status: number): { code: string; message: string } {
    const statusMap: Record<number, { code: string; message: string }> = {
      400: ErrorMessages.COMMON_BAD_REQUEST,
      401: ErrorMessages.AUTH_UNAUTHORIZED,
      403: ErrorMessages.AUTH_FORBIDDEN,
      404: ErrorMessages.COMMON_NOT_FOUND,
      409: ErrorMessages.COMMON_CONFLICT,
      // 422 는 본 PR 이 validation 표준으로 채택(spec §3.2, ValidationPipe
      // errorHttpStatusCode). 컨트롤러/서비스가 422 를 string 메시지로 직접 던져
      // ValidationPipe 의 배열 경로를 타지 않더라도 `COMMON_VALIDATION_FAILED`
      // 로 내려가야 FE 에러 분기가 깨지지 않는다 (codex R9 지적).
      422: ErrorMessages.COMMON_VALIDATION_FAILED,
    };
    return statusMap[status] ?? ErrorMessages.COMMON_UNKNOWN_ERROR;
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
