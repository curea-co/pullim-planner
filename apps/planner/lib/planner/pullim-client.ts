import {
  ApiError,
  createPullimPlannerClient,
  maskToWeekdays,
  weekdaysToMask,
  type PullimDiscoverUser,
  type PullimFriend,
  type PullimBlockCompletionClient,
  type PullimPlanner,
  type PullimPlannerClient,
  type PullimPlannerWrite,
  type PullimRoutine,
  type PullimRoutineClient,
  type PullimRoutineWrite,
  type PullimRoutinePatch,
  type PullimStudygramClient,
  type PullimStudygramSetting,
  type PullimStudygramSettingWrite,
  type PullimStudyProof,
  type PullimStudyProofCreateInput,
} from '@pullim-planner/api-client';

import { notifyPullimSessionExpired, pullimSession } from '@/lib/auth/pullim-session-client';
import { minutesBetween, type Planner, type Routine, type RoutineSubject } from '@/lib/mock';
import type { BlockType } from '@/lib/mock';
import type {
  DiscoverableUser,
  Friend,
  FriendshipStatus,
  StudyProof,
  StudygramSetting,
  TonePresetId,
  Visibility,
} from '@/lib/mock/studygram';

/**
 * pullim-api(흡수형 planner) base/CSRF — `pullim-session-client` 와 동일 규칙.
 * prefix 없음(`/planner/*`). 회원 인증은 HttpOnly 쿠키(브라우저 자동 첨부, same-site `*.pullim.ai`).
 * dev: `NEXT_PUBLIC_PULLIM_API_URL=https://dev-api.pullim.ai`, `NEXT_PUBLIC_PULLIM_CSRF_COOKIE=dev-pullim-csrf`.
 */
const PULLIM_API_URL =
  process.env.NEXT_PUBLIC_PULLIM_API_URL ?? 'http://localhost:3000';
const CSRF_COOKIE_NAME =
  process.env.NEXT_PUBLIC_PULLIM_CSRF_COOKIE ?? 'local-pullim-csrf';

const rawPullimPlannerClient = createPullimPlannerClient({
  baseUrl: PULLIM_API_URL,
  csrfCookieName: CSRF_COOKIE_NAME,
  // 401 자동 재발급(게이트키퍼 공통 계약) — 세션 클라의 single-flight 재발급을 공유해
  // planner/routine/studygram 데이터 요청도 access 만료 시 refresh → 1회 재시도한다.
  // 재발급 실패(만료 확정)면 원 401 → on401 래퍼가 세션 만료를 전파(기존 로그인 복구).
  refreshSession: pullimSession.refreshSession,
});

/**
 * 401(쿠키 세션 만료·무효) 시 전역 세션 만료를 통지하도록 클라 메서드를 감싼다 — 흡수 §10.
 * 자체 BE 클라의 onSessionExpired(전역 전파)를 데이터 호출에서도 복원한다. auth-context 가
 * `onPullimSessionExpired` 로 구독해 상태를 unauthenticated 로 내린다.
 */
function on401<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401) {
        notifyPullimSessionExpired();
      }
      throw error;
    }
  };
}

/**
 * 앱 전역 pullim-api planner 데이터 클라이언트 싱글톤 — 흡수 전환 §10 cutover.
 *
 * 자체 BE planner 클라(`./client.ts` 의 레거시 구현, Bearer + 엔벨로프)를 대체한다. 인증은 쿠키
 * SSO(브라우저 자동 첨부)라 토큰을 클라가 들지 않고, 상태변경은 CSRF double-submit
 * (`csrfCookieName` 자동 동봉 + 회전 시 재부트스트랩). 모든 메서드는 401 에서 세션 만료를 통지한다.
 */
export const pullimPlannerClient: PullimPlannerClient &
  PullimBlockCompletionClient &
  PullimRoutineClient &
  Pick<
    PullimStudygramClient,
    | 'getSetting'
    | 'updateSetting'
    | 'getProofs'
    | 'createProof'
    | 'updateProof'
    | 'deleteProof'
    | 'discoverUsers'
    | 'getFriends'
    | 'sendFriendRequest'
    | 'respondFriend'
    | 'getCloseFriends'
    | 'setCloseFriend'
    | 'removeCloseFriend'
    | 'addReaction'
    | 'removeReaction'
  > = {
  list: on401(rawPullimPlannerClient.list),
  blocks: on401(rawPullimPlannerClient.blocks),
  completeBlock: on401(rawPullimPlannerClient.completeBlock),
  uncompleteBlock: on401(rawPullimPlannerClient.uncompleteBlock),
  create: on401(rawPullimPlannerClient.create),
  update: on401(rawPullimPlannerClient.update),
  remove: on401(rawPullimPlannerClient.remove),
  activate: on401(rawPullimPlannerClient.activate),
  archive: on401(rawPullimPlannerClient.archive),
  unarchive: on401(rawPullimPlannerClient.unarchive),
  duplicate: on401(rawPullimPlannerClient.duplicate),
  updateCustomization: on401(rawPullimPlannerClient.updateCustomization),
  routines: on401(rawPullimPlannerClient.routines),
  createRoutine: on401(rawPullimPlannerClient.createRoutine),
  updateRoutine: on401(rawPullimPlannerClient.updateRoutine),
  deleteRoutine: on401(rawPullimPlannerClient.deleteRoutine),
  // studygram(공유) — routine 메서드와 동형으로 401 세션 만료를 통지한다.
  getSetting: on401(rawPullimPlannerClient.getSetting),
  updateSetting: on401(rawPullimPlannerClient.updateSetting),
  getProofs: on401(rawPullimPlannerClient.getProofs),
  createProof: on401(rawPullimPlannerClient.createProof),
  updateProof: on401(rawPullimPlannerClient.updateProof),
  deleteProof: on401(rawPullimPlannerClient.deleteProof),
  // studygram 친구·close-friend·응원 — 공유 FE 마지막 조각(친구·피드·응원 실전환)에서 노출.
  discoverUsers: on401(rawPullimPlannerClient.discoverUsers),
  getFriends: on401(rawPullimPlannerClient.getFriends),
  sendFriendRequest: on401(rawPullimPlannerClient.sendFriendRequest),
  respondFriend: on401(rawPullimPlannerClient.respondFriend),
  getCloseFriends: on401(rawPullimPlannerClient.getCloseFriends),
  setCloseFriend: on401(rawPullimPlannerClient.setCloseFriend),
  removeCloseFriend: on401(rawPullimPlannerClient.removeCloseFriend),
  addReaction: on401(rawPullimPlannerClient.addReaction),
  removeReaction: on401(rawPullimPlannerClient.removeReaction),
};

/**
 * pullim-api 응답(`PullimPlanner`) → FE mock `Planner` 뷰 어댑터.
 *
 * 두 타입은 구조가 동일하다(target/weekday·weekendHours/subjectUnits/enum). customization 만
 * API nullable → mock optional 로 정렬한다. 프리젠터·빌더가 기존 mock `Planner` 를 그대로 소비한다.
 */
export function pullimToPlanner(p: PullimPlanner): Planner {
  return {
    ...p,
    customization: p.customization ?? undefined,
  } as Planner;
}

/**
 * 빌더 폼 패치(`formToPlannerPatch` 반환) → pullim-api 쓰기 본문(`PullimPlannerWrite`).
 * subjectUnits 의 `undefined` 값은 BE 검증(문자열 배열 맵)을 통과하지 못하므로 제거한다.
 */
export function toPullimWrite(
  patch: Omit<Planner, 'id' | 'active' | 'archived' | 'createdAt' | 'updatedAt'>,
): PullimPlannerWrite {
  const subjectUnits: Record<string, string[]> = {};
  for (const [subject, units] of Object.entries(patch.subjectUnits)) {
    if (units) subjectUnits[subject] = units;
  }
  return {
    ...patch,
    subjectUnits,
  } as PullimPlannerWrite;
}

/**
 * pullim-api 루틴(`PullimRoutine`) → FE 뷰 `Routine` 어댑터.
 * 요일은 비트마스크(`weekdayMask`) → 배열(`maskToWeekdays`, 0=월…6=일)로 변환한다.
 * subject/type 은 BE 가 string 이지만 BE 가 FE enum 집합으로만 발급하므로 뷰 union 으로 단언한다.
 */
export function pullimToRoutine(r: PullimRoutine): Routine {
  return {
    id: r.id,
    title: r.title,
    subject: r.subject as RoutineSubject,
    type: r.type as BlockType,
    startTime: r.startTime,
    endTime: r.endTime,
    weekdays: maskToWeekdays(r.weekdayMask) as Routine['weekdays'],
  };
}

/** 루틴 폼값(id 제외) → pullim-api 쓰기 본문(`PullimRoutineWrite`). */
export function toRoutineWrite(
  form: Omit<Routine, 'id'>,
): PullimRoutineWrite {
  return {
    title: form.title,
    subject: form.subject,
    type: form.type,
    startTime: form.startTime,
    endTime: form.endTime,
    expectedMinutes: minutesBetween(form.startTime, form.endTime),
    weekdayMask: weekdaysToMask(form.weekdays),
  };
}

/** 루틴 폼값(부분) → pullim-api 부분 수정 본문(`PullimRoutinePatch`). */
export function toRoutinePatch(
  form: Omit<Routine, 'id'>,
): PullimRoutinePatch {
  return toRoutineWrite(form);
}

/**
 * pullim-api 인증카드(`PullimStudyProof`) → FE 뷰 `StudyProof` 어댑터.
 * 두 타입은 구조가 동일하다(snapshot/date/caption/reactionCount). tonePresetId·visibility·condition 은
 * BE 가 string/number 로 폭넓게 두지만 BE 가 FE union 집합으로만 발급하므로 뷰 union 으로 단언한다.
 */
export function pullimToStudyProof(p: PullimStudyProof): StudyProof {
  return {
    id: p.id,
    userId: p.userId,
    date: p.date,
    snapshot: {
      ...p.snapshot,
      condition: p.snapshot.condition as StudyProof['snapshot']['condition'],
    },
    tonePresetId: p.tonePresetId as TonePresetId,
    caption: p.caption,
    visibility: p.visibility as Visibility,
    createdAt: p.createdAt,
    reactionCount: p.reactionCount,
  };
}

/**
 * pullim-api 설정(`PullimStudygramSetting`) → FE `StudygramSetting`(mock) 투영 어댑터.
 * FE 뷰는 id/createdAt/updatedAt 을 갖지 않으므로(설정 폼이 다루는 필드만) 나머지 6필드로 투영한다.
 * nickname(피어 식별)은 설정 폼이 편집하는 값이라 그대로 실어 prefill 에 쓴다.
 */
export function pullimToStudygramSetting(
  s: PullimStudygramSetting,
): StudygramSetting {
  return {
    nickname: s.nickname,
    topicLine: s.topicLine,
    tonePresetId: s.tonePresetId as TonePresetId,
    goalHorizonDays: s.goalHorizonDays,
    goalPostsPerDay: s.goalPostsPerDay,
    consentGiven: s.consentGiven,
  };
}

/**
 * 설정 폼값 → pullim-api 부분 수정 본문(`PullimStudygramSettingWrite`).
 * 첫 생성(미온보딩)은 BE 가 nickname(1~20자)+tonePresetId 를 필수로 요구하므로(400), Setup 폼이
 * nickname 을 전용 필드로 받아 필수 검증(1~20자, presenter)한 실제 값을 그대로 싣는다.
 */
export function toStudygramSettingWrite(
  form: Omit<StudygramSetting, 'consentGiven'> & { consentGiven?: boolean },
): PullimStudygramSettingWrite {
  return {
    nickname: form.nickname,
    topicLine: form.topicLine,
    tonePresetId: form.tonePresetId,
    goalHorizonDays: form.goalHorizonDays,
    goalPostsPerDay: form.goalPostsPerDay,
    ...(form.consentGiven !== undefined
      ? { consentGiven: form.consentGiven }
      : {}),
  };
}

/**
 * pullim-api 친구(`PullimFriend`) → FE 뷰 `Friend` 어댑터.
 * BE 는 `grade` 를 내리지 않는다(또래 미노출 — 피어 안전 정책, `FriendResponseDto`)
 * — FE `Friend.grade` 는 optional 로 완화돼 있어 미세팅(프리젠터가 있을 때만 표시).
 * status 는 BE 가 FE union(pending|accepted) 집합으로만 발급하므로 뷰 union 으로 단언한다.
 * latestProofDate 는 API nullable → 뷰 optional 로 정렬한다.
 */
export function pullimToFriend(f: PullimFriend): Friend {
  return {
    id: f.id,
    userId: f.userId,
    name: f.name,
    isCloseFriend: f.isCloseFriend,
    status: f.status as FriendshipStatus,
    proofCount: f.proofCount,
    ...(f.latestProofDate !== null ? { latestProofDate: f.latestProofDate } : {}),
  };
}

/**
 * pullim-api 발견 결과(`PullimDiscoverUser`) → FE 뷰 `DiscoverableUser` 어댑터.
 * BE 는 userId·nickname 만 노출한다(피어 안전 — grade·PII 없음). mock 의 proofCount 는 BE 계약에
 * 없으므로 미세팅(뷰 optional — 프리젠터가 있을 때만 표시).
 */
export function pullimToDiscoverableUser(u: PullimDiscoverUser): DiscoverableUser {
  return {
    userId: u.userId,
    name: u.nickname,
  };
}

/**
 * 인증카드 게시 폼값 → pullim-api 생성 입력(`PullimStudyProofCreateInput`).
 * 객관 지표(snapshot)는 BE 가 해당 날짜 학습에서 조립하므로 FE 는 보내지 않는다 — date·tone·caption·
 * visibility·reflectionLine 만 싣는다.
 */
export function toProofCreateInput(form: {
  date: string;
  tonePresetId: TonePresetId;
  caption?: string;
  visibility?: Visibility;
  reflectionLine?: string;
}): PullimStudyProofCreateInput {
  return {
    date: form.date,
    tonePresetId: form.tonePresetId,
    ...(form.caption !== undefined ? { caption: form.caption } : {}),
    ...(form.visibility !== undefined ? { visibility: form.visibility } : {}),
    ...(form.reflectionLine !== undefined
      ? { reflectionLine: form.reflectionLine }
      : {}),
  };
}
