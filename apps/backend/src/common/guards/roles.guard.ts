import { CanActivate, Injectable } from "@nestjs/common";

/**
 * 역할 기반 접근 제어 가드.
 *
 * pullim 본체의 `RolesGuard` 패턴을 **차용하되 비활성**으로 둔다.
 * 권위 문서 `proc/plan/2026-05-26_pullim-be-adoption.md` (Phase β) 가 planner 단일
 * 사용자 모델에서는 RolesGuard 를 비활성으로 두라고 규정하므로, 현 단계에서는
 * 모든 요청을 통과시키는 no-op 이다 (codex R6 지적 — 기존 fail-closed 는 권위 문서와 충돌).
 *
 * Phase η 실인증 도입 시 `request.user.role` 과 `@Roles()` 교차 검사 로직으로 교체한다.
 * (그때 `Reflector` / `ROLES_KEY` / `ForbiddenException` 을 다시 도입)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(): boolean {
    // Phase β: 비활성 (권위 문서 규정). 모든 요청 통과.
    return true;
  }
}
