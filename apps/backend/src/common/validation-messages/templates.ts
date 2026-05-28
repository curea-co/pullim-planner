/**
 * 유효성 검증 메시지 템플릿.
 * class-validator 메시지 함수와 Swagger 에러 예시에서 공통으로 사용한다.
 */

export const stringMessage = (property: string) =>
  `${property}은(는) 문자열이어야 합니다.`;

export const emailMessage = (property: string) =>
  `${property}은(는) 올바른 이메일 형식이어야 합니다.`;

export const urlMessage = (property: string) =>
  `${property}은(는) 올바른 URL 형식이어야 합니다.`;

export const uuidMessage = (property: string) =>
  `${property}은(는) 올바른 UUID 형식이어야 합니다.`;

export const numberMessage = (property: string) =>
  `${property}은(는) 숫자여야 합니다.`;

export const minMessage = (property: string, min: number) =>
  `${property}은(는) ${min} 이상이어야 합니다.`;

export const maxMessage = (property: string, max: number) =>
  `${property}은(는) ${max} 이하여야 합니다.`;

export const minLengthMessage = (property: string, min: number) =>
  `${property}은(는) ${min}자 이상이어야 합니다.`;

export const maxLengthMessage = (property: string, max: number) =>
  `${property}은(는) ${max}자 이하여야 합니다.`;

export const exactLengthMessage = (property: string, length: number) =>
  `${property}은(는) ${length}자여야 합니다.`;

export const matchesMessage = (property: string, description: string) =>
  `${property}은(는) ${description} 형식이어야 합니다.`;

export const notEmptyMessage = (property: string) =>
  `${property}은(는) 비어 있을 수 없습니다.`;

export const isInMessage = (property: string, values: readonly string[]) =>
  `${property}은(는) ${values.join(", ")} 중 하나여야 합니다.`;

export const booleanMessage = (property: string) =>
  `${property}은(는) true 또는 false여야 합니다.`;

export const arrayMessage = (property: string) =>
  `${property}은(는) 배열이어야 합니다.`;

export const enumMessage = (property: string, values: string[]) =>
  `${property}은(는) ${values.join(", ")} 중 하나여야 합니다.`;

export const dateStringMessage = (property: string) =>
  `${property}은(는) 올바른 날짜 형식(ISO 8601)이어야 합니다.`;
