import { Type, applyDecorators } from "@nestjs/common";
import { ApiExtraModels, ApiResponse, getSchemaPath } from "@nestjs/swagger";

/**
 * ResponseInterceptor의 `{ success: true, data }` 래핑을 Swagger 스키마에 반영하는 헬퍼.
 * @param type - data 필드의 DTO 클래스
 * @param status - HTTP 상태 코드 (기본 200)
 * @param description - 응답 설명
 */
export function ApiSuccessResponse(
  type: Type,
  status = 200,
  description = "성공",
) {
  return applyDecorators(
    ApiExtraModels(type),
    ApiResponse({
      status,
      description,
      schema: {
        properties: {
          success: { type: "boolean", example: true },
          data: { $ref: getSchemaPath(type) },
        },
      },
    }),
  );
}

/**
 * ResponseInterceptor의 `{ success: true }` 래핑을 Swagger 스키마에 반영하는 헬퍼.
 * Controller가 void를 반환하는 DELETE 등에 사용한다.
 * @param status - HTTP 상태 코드 (기본 200)
 * @param description - 응답 설명
 */
export function ApiEmptySuccessResponse(status = 200, description = "성공") {
  return applyDecorators(
    ApiResponse({
      status,
      description,
      schema: {
        required: ["success"],
        properties: {
          success: { type: "boolean", example: true },
        },
      },
    }),
  );
}

/**
 * ResponseInterceptor의 `{ success: true, data }` 래핑 + 페이지네이션을 Swagger 스키마에 반영하는 헬퍼.
 * @param itemType - items 배열 요소의 DTO 클래스
 * @param description - 응답 설명
 */
export function ApiPaginatedResponse(
  itemType: Type,
  description = "조회 성공",
) {
  return applyDecorators(
    ApiExtraModels(itemType),
    ApiResponse({
      status: 200,
      description,
      schema: {
        properties: {
          success: { type: "boolean", example: true },
          data: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: { $ref: getSchemaPath(itemType) },
              },
              page: { type: "number", example: 1 },
              limit: { type: "number", example: 10 },
              totalCount: { type: "number", example: 100 },
              totalPages: { type: "number", example: 10 },
            },
          },
        },
      },
    }),
  );
}
