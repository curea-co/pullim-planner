'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import {
  seededPlannerForm, formToPlannerPatch,
  type PlannerForm,
} from '@/components/features/planner-builder/components/builder-types';
import { createPlanner, activatePlanner } from '@/lib/mock/planner';
import { getRoutines, type Routine } from '@/lib/mock';
import { plannerClient, toWriteInput } from '@/lib/planner/client';
import { mapServerPreview, type PreviewDay } from '@/lib/planner/preview-map';
import { todayIsoKst } from '@/components/features/planner-builder/components/builder-types';
import { pullimPlannerClient, pullimToRoutine } from '@/lib/planner/pullim-client';
import type { ActivateSummary } from '@/components/features/planner-builder/components/step-content';
import { WizardDone, type WizardDoneSummary } from '@/components/features/planner-builder/components/wizard-done';
import { blockPatternMeta, examTypeMeta, resolvedExamName } from '@/components/features/planner-builder/components/builder-types';
import { daysBetween } from '@/lib/planner/exam-presets';
import { ROUTINE_ENABLED } from '@/lib/flags';
import { usePlannerForm } from '../hooks/use-planner-form';
import { useRoutineTimeUpdate } from '../hooks/use-routine-time-update';
import NewPlannerPresenter from '../presenters/NewPlannerPresenter';

const DEV_AUTH_BYPASS = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1';

/**
 * 생성 완료 표식 쿼리. 활성화에 성공하면 이 쿼리를 붙여 위저드 URL 을 **완료 화면 URL 로
 * 덮는다**(history replace). 새로고침·뒤로가기로 같은 엔트리에 돌아와도 빈 위저드가 다시
 * 열리지 않으므로, 같은 입력으로 한 번 더 활성화해 중복 플래너를 만드는 경로가 막힌다 (codex).
 */
const CREATED_PARAM = 'created';

export default function NewPlannerContainer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  /** 생성 표식이 붙은 URL 로 들어왔는가 — 붙어 있으면 이 히스토리 엔트리는 위저드가 아니다. */
  const createdId = searchParams.get(CREATED_PARAM);
  const formState = usePlannerForm(seededPlannerForm());

  // STEP5·미리보기용 루틴 — bypass는 mock(초기값), 배포는 실 API로 교체(dev QA #4: 실 루틴 노출).
  const [routines, setRoutines] = useState<Routine[]>(() => (DEV_AUTH_BYPASS ? getRoutines() : []));
  useEffect(() => {
    if (DEV_AUTH_BYPASS) return;
    let alive = true;
    pullimPlannerClient
      .routines()
      .then((list) => { if (alive) setRoutines(list.map(pullimToRoutine)); })
      .catch(() => { if (alive) setRoutines([]); });
    return () => { alive = false; };
  }, []);

  // 활성화 성공 후 완료 화면 — 관리 목록으로 곧장 튕기면 방금 만든 게 뭔지 볼 자리가 없다.
  const [done, setDone] = useState<WizardDoneSummary | null>(null);

  /**
   * 생성 표식만 있고 리캡이 없다 = 완료 URL 을 **새 문서로** 다시 연 경우(새로고침·히스토리
   * 재방문·링크 공유). 리캡은 메모리에만 있으니 복원할 수 없다. 이때 위저드를 다시 열면
   * 이미 만들어진 플래너와 무관한 빈 위저드가 뜨고 중복 생성이 가능해지므로, 방금 만든
   * 플래너가 보이는 관리 화면으로 보낸다.
   */
  useEffect(() => {
    if (createdId && !done) router.replace('/planner/manage');
  }, [createdId, done, router]);

  // 4단계 충돌 배너의 '옮기기' — 루틴 원본 시각을 PATCH 한다(확인 다이얼로그 뒤).
  const handleUpdateRoutine = useRoutineTimeUpdate(routines, setRoutines);

  // STEP8 서버 dry-run 미리보기(pullim-api #476) — 실제 bake 규칙으로 계산만(저장 없음).
  // bypass·실패면 null → 휴리스틱 폴백. 루틴 적용은 create 와 동일 매핑.
  const form = formState.form;
  const handleServerPreview = useCallback(async (): Promise<PreviewDay[] | null> => {
    if (DEV_AUTH_BYPASS) return null;
    try {
      const res = await plannerClient.preview({
        ...toWriteInput(formToPlannerPatch(form)),
        routineApplications: form.routineIds.map((routineId) => ({
          routineId,
          endRange: 'exam' as const,
        })),
      });
      return mapServerPreview(
        res.blocks,
        todayIsoKst(),
        form.examStartDate ?? null,
        form.examEndDate ?? null,
      );
    } catch {
      return null;
    }
  }, [form]);

  /** 활성화 직후 보여줄 리캡 — 폼과 미리보기 집계에서만 만든다(추가 fetch 없음). */
  function buildDoneSummary(submitted: PlannerForm, summary?: ActivateSummary): WizardDoneSummary {
    const units = submitted.subjectUnits ?? {};
    const dday = submitted.examStartDate
      ? daysBetween(todayIsoKst(), submitted.examStartDate)
      : null;
    return {
      plannerName: resolvedExamName(submitted),
      ddayLabel: dday === null ? null : dday > 0 ? `D-${dday}` : dday === 0 ? 'D-DAY' : `D+${-dday}`,
      examLabel: examTypeMeta[submitted.examType ?? 'mock'].label,
      subjectCount: Object.keys(units).length,
      unitCount: Object.values(units).reduce((a, b) => a + (b?.length ?? 0), 0),
      // 4단계 집계를 그대로 옮기되 출처를 함께 넘긴다 — 휴리스틱 근사(`local`)는 실제 bake 와
      // 규칙이 달라 실제보다 적을 수 있어 '예상' 으로 표기된다. 집계가 없으면 null(0 으로 지어내지 않음).
      blocks: summary
        ? {
            days: summary.previewDays,
            count: summary.previewBlocks,
            estimated: summary.source !== 'server',
          }
        : null,
      patternLabel: blockPatternMeta[submitted.blockPattern].label,
      patternSpec: blockPatternMeta[submitted.blockPattern].spec,
      routineCount: ROUTINE_ENABLED ? submitted.routineIds.length : null,
    };
  }

  /**
   * 완료 화면으로 넘어가면서 위저드 URL 을 생성 표식이 붙은 URL 로 덮는다.
   *
   * `router.replace` 대신 네이티브 `history.replaceState` 를 쓰는 이유 — 쿼리만 바꾸는
   * 라우팅이라도 세그먼트 재렌더가 끼면 방금 세팅한 `done` 이 날아갈 위험이 있는데, 완료
   * 화면은 이 한 번뿐인 자리라 그 실패가 치명적이다. Next App Router 는 네이티브 history
   * 메서드를 지원하고 `useSearchParams` 와도 동기화되므로 표식은 그대로 읽힌다.
   */
  function stampCreated(plannerId: string) {
    if (typeof window === 'undefined') return;
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}?${CREATED_PARAM}=${encodeURIComponent(plannerId)}`,
    );
  }

  async function handleActivate(submitted: PlannerForm, summary?: ActivateSummary) {
    // 로컬 dev 우회 — pullim-api CORS/쿠키 미지원 환경에서 실 API 대신 공유 mock store에
    // 생성·활성화한다. ManagePlannersContainer 의 confirmActivate 와 동일 store(lib/mock/planner)라
    // 관리/홈 화면과 일관되며, 위저드를 끝까지 검증할 수 있다.
    if (DEV_AUTH_BYPASS) {
      const planner = createPlanner({
        ...formToPlannerPatch(submitted),
        // bypass 에서도 루틴 선택 보존 — 수정 화면 프리필 왕복 정합.
        appliedRoutineIds: submitted.routineIds,
      });
      activatePlanner(planner.id);
      setDone(buildDoneSummary(submitted, summary));
      stampCreated(planner.id);
      return;
    }
    // create 와 activate 를 분리해 부분 성공을 구분한다 — 한 catch 로 뭉치면 create 성공 후
    // activate 만 실패해도 "생성 실패"로 보여 사용자가 재시도 → 동일 플래너가 중복 생성된다 (codex).
    let planner;
    try {
      planner = await plannerClient.create({
        ...toWriteInput(formToPlannerPatch(submitted)),
        // 5단계 선택 루틴을 bake 입력으로 — 미리보기(dry-run)와 동일 매핑(정합).
        routineApplications: submitted.routineIds.map((routineId) => ({
          routineId,
          endRange: 'exam' as const,
        })),
      });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '시간표 생성 실패');
      return;
    }
    try {
      await plannerClient.activate(planner.id);
      setDone(buildDoneSummary(submitted, summary));
      stampCreated(planner.id);
      return;
    } catch {
      // 생성은 성공 — 재시도로 중복 생성되지 않게 안내만 하고 관리 화면으로 보낸다.
      // 완료 화면은 띄우지 않는다(만들어지지 않은 상태를 만들어졌다고 하지 않는다). 이 경로는
      // 곧바로 화면을 떠나므로 생성 표식도 남기지 않는다 — 표식은 완료 화면에 머무는 경우의 장치다.
      toast.warning('시간표는 생성됐지만 활성화에 실패했어요', {
        description: `${planner.name} — 관리 화면에서 활성화해 주세요`,
        duration: 4000,
      });
    }
    router.push('/planner/manage');
  }

  if (done) {
    return (
      <WizardDone
        summary={done}
        onHome={() => router.push('/planner')}
        onManage={() => router.push('/planner/manage')}
      />
    );
  }

  // 생성 표식이 붙은 URL 인데 리캡이 없다 — 위저드를 열지 않는다(위 effect 가 관리 화면으로 보낸다).
  if (createdId) {
    return (
      <p className="text-pullim-slate-400 py-10 text-center text-sm">시간표 관리로 이동 중…</p>
    );
  }

  return (
    <NewPlannerPresenter
      form={formState.form}
      setForm={formState.setForm}
      scope={formState.scope}
      setScope={formState.setScope}
      currentStep={formState.currentStep}
      canPrev={formState.canPrev}
      canNext={formState.canNext}
      blockedReason={formState.blockedReason}
      maxReachable={formState.maxReachable}
      onPrev={formState.goPrev}
      onNext={formState.goNext}
      onJump={formState.jumpTo}
      onActivate={handleActivate}
      routines={routines}
      onServerPreview={handleServerPreview}
      onUpdateRoutine={handleUpdateRoutine}
    />
  );
}
