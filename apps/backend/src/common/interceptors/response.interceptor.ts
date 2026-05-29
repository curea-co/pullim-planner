import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, map } from "rxjs";

/**
 * 응답 envelope을 `{ success: true, data }` 형식으로 래핑한다.
 *
 * 응답 envelope (옵션 A): plan §6.2 결정. 컨트롤러는 `data`에 들어갈 값만 반환하면
 * 본 인터셉터가 success 키와 함께 감싼다.
 *
 * 컨트롤러가 `undefined`(void; DELETE 등)를 반환하면 `data` 키를 생략해
 * `{ success: true }` 만 내려보낸다. 이렇게 해야 `ApiEmptySuccessResponse` 의
 * Swagger 계약(`{ success: true }`)과 실제 응답이 일치한다 (codex R9 지적).
 * `null` 은 유효한 data 값이므로(예: 세션 없음) 생략하지 않는다.
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next
      .handle()
      .pipe(
        map((data: unknown) =>
          data === undefined ? { success: true } : { success: true, data },
        ),
      );
  }
}
