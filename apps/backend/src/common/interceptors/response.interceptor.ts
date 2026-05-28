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
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data: unknown) => ({
        success: true,
        data,
      })),
    );
  }
}
