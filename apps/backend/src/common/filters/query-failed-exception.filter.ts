import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { QueryFailedError } from "typeorm";

import { ErrorMessages } from "../constants/error-messages.constant";
import { UNIQUE_CONSTRAINT_MAP } from "../constants/unique-constraint-map.constant";
import { maskSensitiveFields } from "../utils/mask.util";

/**
 * PostgreSQL `QueryFailedError`를 envelope 형식으로 변환한다.
 *
 * - `23505` (unique violation): 409 Conflict + 매핑된 `ErrorMessages` 사용.
 * - 그 외 모든 DB 오류: 500 Internal Server Error + `COMMON_UNKNOWN_ERROR`.
 *
 * `@Catch(QueryFailedError)` 필터에서 `throw exception`으로 재던지면 다른 전역 필터
 * 체인이 이를 다시 잡는다는 보장이 없어 envelope가 깨질 수 있다. 따라서 이 필터에서
 * 모든 QueryFailedError를 직접 처리한다 (pullim 본체 동일 패턴).
 */
@Catch(QueryFailedError)
export class QueryFailedExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(QueryFailedExceptionFilter.name);

  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const driverError = exception as QueryFailedError & {
      code?: string;
      detail?: string;
    };
    const requestContext = this.buildRequestContext(request);

    if (driverError.code === "23505") {
      const errorMessage = this.resolveErrorMessage(driverError.detail);

      this.logger.warn(
        `${request.method} ${request.url} ${HttpStatus.CONFLICT} - Unique constraint violation: ${driverError.detail} ${requestContext}`,
      );

      response.status(HttpStatus.CONFLICT).json({
        success: false,
        error: {
          code: errorMessage.code,
          message: errorMessage.message,
          statusCode: HttpStatus.CONFLICT,
        },
      });
      return;
    }

    // 23505 이외 DB 오류 — re-throw 시 envelope 새어나갈 위험. 직접 500으로 감싼다.
    this.logger.error(
      `${request.method} ${request.url} ${HttpStatus.INTERNAL_SERVER_ERROR} - QueryFailedError(${driverError.code ?? "unknown"}): ${exception.message} ${requestContext}`,
      exception.stack,
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: ErrorMessages.COMMON_UNKNOWN_ERROR.code,
        message: ErrorMessages.COMMON_UNKNOWN_ERROR.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      },
    });
  }

  /**
   * detail 필드에서 컬럼명을 추출하여 매핑된 ErrorMessage를 반환한다.
   * @param detail - PostgreSQL detail 문자열 (e.g. 'Key (user_id)=(...) already exists.')
   * @returns 매핑된 ErrorMessage 또는 기본 충돌 에러
   */
  private resolveErrorMessage(detail?: string): {
    code: string;
    message: string;
  } {
    if (detail) {
      for (const [column, errorMessage] of UNIQUE_CONSTRAINT_MAP) {
        if (detail.includes(column)) {
          return errorMessage;
        }
      }
    }
    return ErrorMessages.COMMON_CONFLICT;
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
