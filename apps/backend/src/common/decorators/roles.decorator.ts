import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = "roles";

/**
 * 라우트에 허용된 역할(role) 목록을 메타데이터로 설정한다.
 *
 * Phase β 시점에는 planner 단일 사용자 모델이므로 RolesGuard가 사실상 비활성이다.
 * 향후 도메인 분화(다른 사용자 권한 추가)에 대비해 인터페이스만 정의한다.
 * @param roles - 허용 role 문자열 목록
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
