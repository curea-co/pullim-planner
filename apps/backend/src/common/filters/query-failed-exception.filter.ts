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
 * PostgreSQL unique constraint 위반(23505)을 409 Conflict로 변환한다.
 * detail 필드에서 컬럼명을 추출하여 매핑된 ErrorMessages를 사용한다.
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

    if (driverError.code !== "23505") {
      throw exception;
    }

    const errorMessage = this.resolveErrorMessage(driverError.detail);
    const requestContext = this.buildRequestContext(request);

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
