import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/**
 * 인증 가드를 건너뛰는 라우트를 마킹한다.
 * MockAuthGuard에서 본 메타데이터를 확인하고 통과시킨다.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
