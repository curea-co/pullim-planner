import { registerDecorator, type ValidationOptions } from "class-validator";

/**
 * 값이 **순수 객체**(배열·null 아님)인지 검증.
 *
 * `@ValidateNested()` 만으로는 `target: []` 같은 배열이 들어오면 빈 배열을 원소 순회만 하고
 * vacuously 통과시켜, service 의 `dto.target.kind` 접근이 undefined → 500 으로 떨어진다 (codex).
 * `@IsObject()` 도 배열을 객체로 보아 통과시키므로, 배열을 명시적으로 거부하는 본 검증을
 * nested 객체 앞단에 둔다.
 */
export function IsPlainObject(options?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: "isPlainObject",
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown): boolean {
          return (
            typeof value === "object" && value !== null && !Array.isArray(value)
          );
        },
      },
    });
  };
}
