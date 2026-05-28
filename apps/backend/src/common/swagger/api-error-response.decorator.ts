import { ApiResponse } from "@nestjs/swagger";

interface ErrorExample {
  code: string;
  message: string;
}

/**
 * HttpExceptionFilter의 에러 응답 래핑을 Swagger 스키마에 반영하는 헬퍼.
 *
 * 같은 상태 코드에 여러 에러 예시가 필요할 경우 배열로 전달하면
 * Swagger UI의 examples 드롭다운에 모두 표시된다.
 *
 * @param status - HTTP 상태 코드
 * @param description - 에러 설명
 * @param examples - 에러 응답 예시 (단건 또는 배열)
 */
export function ApiErrorResponse(
  status: number,
  description: string,
  examples: ErrorExample | ErrorExample[],
) {
  const exampleList = Array.isArray(examples) ? examples : [examples];

  const swaggerExamples: Record<string, { summary: string; value: object }> =
    {};

  for (const ex of exampleList) {
    swaggerExamples[ex.code + ":" + ex.message] = {
      summary: ex.message,
      value: {
        success: false,
        error: {
          code: ex.code,
          message: ex.message,
          statusCode: status,
        },
      },
    };
  }

  return ApiResponse({
    status,
    description,
    content: {
      "application/json": {
        schema: {
          properties: {
            success: { type: "boolean", example: false },
            error: {
              type: "object",
              properties: {
                code: { type: "string" },
                message: { type: "string" },
                statusCode: { type: "number", example: status },
              },
            },
          },
        },
        examples: swaggerExamples,
      },
    },
  });
}
