import { Injectable } from "@nestjs/common";
import { type EntityManager } from "typeorm";

import { ONBOARDING_PENDING_DEFAULTS } from "../../../common/constants/auth.constant";
import { DomainUser } from "./domain-user.entity";

/**
 * 신원 단일화 — 가입 시 도메인 `users` 행을 `id = auth_user.id` 로 프로비저닝한다.
 *
 * auth(`auth_users`, uuid PK)와 도메인(`users`, text PK)을 같은 id 로 묶어, 향후 도메인
 * 모듈이 들어오면 `auth_user.id == users.id` 로 사용자 데이터를 즉시 연결할 수 있게 한다.
 * 온보딩 전이라 NOT NULL 도메인 필드는 플레이스홀더로 채운다.
 *
 * 멱등: 같은 id 행이 이미 있으면(재가입/경합) 아무것도 하지 않는다 (ON CONFLICT DO NOTHING).
 */
@Injectable()
export class DomainUserProvisioner {
  /**
   * 가입 트랜잭션 내부에서 도메인 `users` 행을 만든다.
   * @param params - id(=auth_user.id) 와 name
   * @param manager - 가입과 동일한 트랜잭션 매니저
   */
  async provision(
    params: { id: string; name: string },
    manager: EntityManager,
  ): Promise<void> {
    await manager
      .createQueryBuilder()
      .insert()
      .into(DomainUser)
      .values({
        id: params.id,
        name: params.name,
        grade: ONBOARDING_PENDING_DEFAULTS.grade,
        track: ONBOARDING_PENDING_DEFAULTS.track,
        // 레거시 Drizzle `users.focus_subjects` 는 NOT NULL 인데, 엔티티 default 는 명시
        // INSERT 에 값을 채워주지 않고 실 DB default 도 보장되지 않으므로 빈 배열을 명시한다.
        // 누락 시 가입 트랜잭션이 focus_subjects NOT NULL 위반으로 롤백됐다 (codex #40).
        focusSubjects: [...ONBOARDING_PENDING_DEFAULTS.focusSubjects],
        weeklyHours: ONBOARDING_PENDING_DEFAULTS.weeklyHours,
        preferredStudyTime: ONBOARDING_PENDING_DEFAULTS.preferredStudyTime,
        joinedAt: new Date(),
      })
      .orIgnore()
      .execute();
  }
}
