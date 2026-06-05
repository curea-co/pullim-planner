import type {
  Planner,
  PlannerCustomization,
  PlannerWriteInput,
} from "@pullim-planner/types";

import type { AuthClient } from "./auth";
import { request, type HttpConfig } from "./http";

/**
 * planner(시간표) 도메인 API 클라이언트.
 *
 * 모든 호출은 `auth.withAuth` 로 감싼다 → access token 첨부 + 401 시 refresh 1회 후 재시도.
 * BE 의 planner 엔드포인트는 인증 필수(per-user)라, 호출 사용자의 본인 시간표에만 적용된다.
 */
export interface PlannerClient {
  /** 본인 시간표 목록 (active/inactive/archived 함께). */
  list(): Promise<Planner[]>;
  /** 시간표 생성 (신규는 inactive). */
  create(input: PlannerWriteInput): Promise<Planner>;
  /** 시간표 수정 (편집 필드 전체 교체). */
  update(id: string, input: PlannerWriteInput): Promise<Planner>;
  /** 시간표 삭제 (활성 플래너는 409). */
  remove(id: string): Promise<void>;
  /** 활성 시간표 전환 (다른 플래너는 비활성). */
  activate(id: string): Promise<Planner>;
  /** 아카이브 (활성 플래너는 409). */
  archive(id: string): Promise<Planner>;
  /** 아카이브 해제. */
  unarchive(id: string): Promise<Planner>;
  /** 복제 (이름에 "(복사)" 접미, inactive). */
  duplicate(id: string): Promise<Planner>;
  /** 시간표 꾸미기(레이아웃·팔레트) 저장. */
  updateCustomization(
    id: string,
    customization: PlannerCustomization,
  ): Promise<Planner>;
}

/**
 * planner 클라이언트 팩토리. 인증 호출을 위임할 `auth` 클라이언트를 함께 받는다.
 * 반환 메서드는 `this` 에 의존하지 않아 구조분해해도 안전하다.
 */
export function createPlannerClient(
  config: HttpConfig,
  auth: AuthClient,
): PlannerClient {
  return {
    list() {
      return auth.withAuth((token) =>
        request<Planner[]>(config, "/planners", { bearer: token }),
      );
    },

    create(input) {
      return auth.withAuth((token) =>
        request<Planner>(config, "/planners", {
          method: "POST",
          body: input,
          bearer: token,
        }),
      );
    },

    update(id, input) {
      return auth.withAuth((token) =>
        request<Planner>(config, `/planners/${id}`, {
          method: "PUT",
          body: input,
          bearer: token,
        }),
      );
    },

    remove(id) {
      return auth.withAuth((token) =>
        request<void>(config, `/planners/${id}`, {
          method: "DELETE",
          bearer: token,
        }),
      );
    },

    activate(id) {
      return auth.withAuth((token) =>
        request<Planner>(config, `/planners/${id}/activate`, {
          method: "POST",
          bearer: token,
        }),
      );
    },

    archive(id) {
      return auth.withAuth((token) =>
        request<Planner>(config, `/planners/${id}/archive`, {
          method: "POST",
          bearer: token,
        }),
      );
    },

    unarchive(id) {
      return auth.withAuth((token) =>
        request<Planner>(config, `/planners/${id}/unarchive`, {
          method: "POST",
          bearer: token,
        }),
      );
    },

    duplicate(id) {
      return auth.withAuth((token) =>
        request<Planner>(config, `/planners/${id}/duplicate`, {
          method: "POST",
          bearer: token,
        }),
      );
    },

    updateCustomization(id, customization) {
      return auth.withAuth((token) =>
        request<Planner>(config, `/planners/${id}/customization`, {
          method: "PUT",
          body: { customization },
          bearer: token,
        }),
      );
    },
  };
}
