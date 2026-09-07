'use client';

import { useCallback, useEffect, useState, use, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import {
  plannerToForm, formToPlannerPatch, resolvedExamName,
  type PlannerForm,
} from '@/components/features/planner-builder/components/builder-types';
import type { Planner, Routine } from '@/lib/mock';
import { getRoutines } from '@/lib/mock';
import { findPlanner, updatePlanner } from '@/lib/mock/planner';
import { apiToPlanner, plannerClient, toWriteInput } from '@/lib/planner/client';
import { mapServerPreview, type PreviewDay } from '@/lib/planner/preview-map';
import { toRoutineApplications } from '@/lib/planner/routine-selection';
import { todayIsoKst } from '@/components/features/planner-builder/components/builder-types';
import { pullimPlannerClient, pullimToRoutine } from '@/lib/planner/pullim-client';
import { usePlannerForm } from '../hooks/use-planner-form';
import { useRoutineTimeUpdate } from '../hooks/use-routine-time-update';
import EditPlannerPresenter from '../presenters/EditPlannerPresenter';

export type EditTab = 'config' | 'layout';

const DEV_AUTH_BYPASS = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1';

/**
 * 기존 시간표 수정 Container — 빌더 with pre-fill (mode='edit').
 *
 * 실 BE planner API(per-user) 연동: list() 로 본인 시간표를 받아 id 로 찾는다
 * (단건 GET 엔드포인트 미존재). 데이터 준비 후 빌더 폼을 마운트한다 (usePlannerForm 이
 * 초기 폼을 마운트 시점에 한 번 잡으므로 inner 컴포넌트로 분리해 hooks 규칙을 지킨다).
 *
 * Next 16: dynamic params 는 Promise. `use()` hook 으로 unwrap.
 */
export default function EditPlannerContainer({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [planner, setPlanner] = useState<Planner | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!cancelled) setLoaded(false);
      // 로컬 dev 우회 — 실 API 대신 공유 mock store에서 단건을 찾는다 (ManagePlannersContainer 정합).
      if (DEV_AUTH_BYPASS) {
        if (!cancelled) {
          setPlanner(findPlanner(id) ?? null);
          setLoadError(false);
          setLoaded(true);
        }
        return;
      }
      try {
        const list = await plannerClient.list();
        const found =
          list.map(apiToPlanner).find((p) => p.id === id) ?? null;
        if (!cancelled) {
          setPlanner(found);
          setLoadError(false);
        }
      } catch (e) {
        // fetch 실패와 not-found(planner=null)를 구분한다 — 합치면 인증 만료/일시 장애에도
        // 사용자가 "시간표가 삭제됐다"고 오해한다 (codex).
        if (!cancelled) {
          setLoadError(true);
          toast.error(
            e instanceof ApiError ? e.message : '시간표를 불러오지 못했어요',
          );
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, tick]);

  // 로딩 중에는 빌더를 마운트하지 않는다 (폼 초기값을 데이터 준비 후 한 번에 잡기 위함).
  if (!loaded) return null;
  // 불러오기 실패 — not-found 와 구분해 재시도 제공.
  if (loadError) {
    return (
      <div className="bg-card flex flex-col items-center gap-3 rounded-2xl border p-8 text-center">
        <p className="text-pullim-slate-600 text-sm font-semibold">
          시간표를 불러오지 못했어요
        </p>
        <button
          type="button"
          onClick={() => setTick(t => t + 1)}
          className="bg-pullim-blue-600 hover:bg-pullim-blue-700 rounded-lg px-3.5 py-2 text-xs font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
        >
          다시 시도
        </button>
      </div>
    );
  }
  return <EditPlannerForm id={id} planner={planner} />;
}

/** 데이터 준비 후 마운트되는 빌더 폼 — usePlannerForm 초기화를 로드된 planner 로 한다. */
function EditPlannerForm({
  id,
  planner,
}: {
  id: string;
  planner: Planner | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTab: EditTab =
    searchParams.get('tab') === 'layout' ? 'layout' : 'config';
  const [tab, setTab] = useState<EditTab>(initialTab);

  // STEP5·미리보기용 루틴 — bypass는 mock(초기값), 배포는 실 API로 교체(dev QA #4).
  const [routines, setRoutines] = useState<Routine[]>(() => (DEV_AUTH_BYPASS ? getRoutines() : []));
  // 목록을 **받았는가** — 요약의 "선택한 루틴 N개" 집계에만 쓴다(확인 단계로 내려간다).
  // 「루틴 0개」와 「못 받음」을 가르되, **「조회 중」은 못 가른다**(둘 다 false). 그래서
  // 서버로 나가는 전송은 이 state 가 아니라 아래 `knownRoutines()` 를 본다 — 거기선 기다린다.
  const [routinesLoaded, setRoutinesLoaded] = useState(DEV_AUTH_BYPASS);
  /**
   * 진행 중인 루틴 조회 — 저장·미리보기가 **응답을 기다린 뒤** 거르게 한다.
   *
   * `routinesLoaded` 는 「조회 중」과 「실패」를 구분하지 못한다(둘 다 false). 그 상태로
   * 전송을 결정하면, 느린 네트워크에서 응답 전에 저장한 사용자는 죽은 id 를 그대로 보내고
   * 400 을 받는다 — 이 PR 이 고치려는 바로 그 증상이 첫 저장에 재현된다(Codex).
   *
   * 그래서 전송 경로는 state 가 아니라 이 promise 를 본다. 성공하면 목록을, 실패하면
   * `null`(= 모른다 → 거르지 않는다)을 준다.
   */
  const routinesReq = useRef<Promise<Routine[] | null> | null>(null);
  /** 조회가 끝날 때까지 기다린 뒤의 목록. `null` 이면 「못 받았다」 — 거르지 않는다. */
  const knownRoutines = useCallback(
    (): Promise<Routine[] | null> => routinesReq.current ?? Promise.resolve(null),
    [],
  );
  useEffect(() => {
    if (DEV_AUTH_BYPASS) return;
    let alive = true;
    routinesReq.current = pullimPlannerClient
      .routines()
      .then((list) => {
        const mapped = list.map(pullimToRoutine);
        if (alive) { setRoutines(mapped); setRoutinesLoaded(true); }
        return mapped;
      })
      .catch(() => { if (alive) { setRoutines([]); setRoutinesLoaded(false); } return null; });
    return () => { alive = false; };
  }, []);

  const formState = usePlannerForm(
    planner ? plannerToForm(planner) : ({} as PlannerForm),
  );

  // 4단계 충돌 배너의 '옮기기' — 루틴 원본 시각을 PATCH 한다(확인 다이얼로그 뒤).
  const handleUpdateRoutine = useRoutineTimeUpdate(routines, setRoutines);

  // STEP8 서버 dry-run 미리보기 — PATCH 루틴 재적용(오너 확정 08-03)이 들어와 수정에서도
  // STEP5 선택(원하는 적용 집합)이 저장 결과와 일치한다. bypass·실패면 휴리스틱 폴백.
  const form = formState.form;
  const handleServerPreview = useCallback(async (): Promise<PreviewDay[] | null> => {
    if (DEV_AUTH_BYPASS) return null;
    // 조회가 끝날 때까지 기다린다 — 응답 전에 보내면 죽은 id 를 거르지 못한다.
    const known = await knownRoutines();
    try {
      // 저장(PATCH)과 동일 조건 — 프리필 근거(appliedRoutineIds)가 있을 때만 루틴을 포함해
      // 미리보기와 저장 결과가 항상 일치한다(구버전 BE 응답이면 둘 다 루틴 무접촉, Codex).
      const res = await plannerClient.preview({
        ...toWriteInput(formToPlannerPatch(form)),
        ...(planner?.appliedRoutineIds !== undefined
          ? {
              routineApplications: toRoutineApplications(form.routineIds, known),
            }
          : {}),
      });
      return mapServerPreview(
        res.blocks,
        todayIsoKst(),
        form.examStartDate ?? null,
        form.examEndDate ?? null,
      );
    } catch (e) {
      // 폴백(휴리스틱)으로 떨어지는 건 그대로 두되 **왜** 떨어졌는지는 남긴다 — 지금까지는
      // 네트워크 장애·서버 거부가 화면에서 똑같은 노란 배너 하나였다.
      console.error('[planner] 서버 미리보기 실패 — 휴리스틱으로 대체', e);
      // 400 을 띄우는 조건이 **`known !== null`** 이다. 목록을 못 받았을 때는 위에서 일부러
      // 거르지 않고 보내므로(데이터 손실 방지), 그때 돌아온 400 은 사용자가 고칠 수 있는
      // 입력 오류가 아니라 **조회 실패의 2차 증상**이다. 그걸 "적용할 수 없는 루틴" 으로
      // 띄우면 목록이 로드되면 저장될 상황인데도 저장이 막힌 줄 알게 된다(Codex).
      // 미리보기는 폼이 바뀔 때마다 재요청되므로 고정 id 로 겹쳐 띄운다 — 타이핑 중 쌓이지 않게.
      if (known !== null && e instanceof ApiError && e.statusCode === 400) {
        toast.error(e.message, { id: 'planner-preview-rejected' });
      }
      return null;
    }
  }, [form, planner, knownRoutines]);

  async function handleSave(submitted: PlannerForm) {
    // 로컬 dev 우회 — 실 API 대신 공유 mock store를 갱신한다.
    if (DEV_AUTH_BYPASS) {
      // 루틴 선택도 mock 스토어에 보존 — 재진입 프리필·bypass 왕복 정합(Codex).
      updatePlanner(id, {
        ...formToPlannerPatch(submitted),
        appliedRoutineIds: submitted.routineIds,
      });
      toast.success('✓ 변경 사항 저장 완료', {
        description: `${resolvedExamName(submitted)} — 다음 활성화 시 반영됩니다`,
        duration: 3000,
      });
      router.push('/planner/manage');
      return;
    }
    // 조회 완료를 기다린 뒤 거른다 — 응답 전에 저장하면 죽은 id 가 그대로 나간다(Codex).
    const knownAtSave = await knownRoutines();
    try {
      // customization 은 PUT /planners 가 갱신하지 않는다(전용 엔드포인트 소유, BE 보존).
      // 따라서 폼 결과를 그대로 보낸다 — 굳이 customization 을 실으면 꾸미기 탭에서 방금 저장한
      // 값과 stale 충돌만 생긴다 (codex R4). toWriteInput 결과에 customization 이 있어도 BE 무시.
      await plannerClient.update(id, {
        ...toWriteInput(formToPlannerPatch(submitted)),
        // STEP5 선택 = 원하는 적용 집합 전체 — BE 가 현재 적용과 diff(추가 bake·해제 삭제).
        // 단, 프리필 근거(appliedRoutineIds)를 받은 경우에만 전송 — 구버전 BE 응답이면
        // 빈 프리필을 desired 로 보내 기존 적용을 전부 해제하는 회귀를 막는다(Codex).
        ...(planner?.appliedRoutineIds !== undefined
          ? {
              routineApplications: toRoutineApplications(submitted.routineIds, knownAtSave),
            }
          : {}),
      });
      toast.success('✓ 변경 사항 저장 완료', {
        description: `${resolvedExamName(submitted)} — 다음 활성화 시 반영됩니다`,
        duration: 3000,
      });
      router.push('/planner/manage');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '저장 실패');
    }
  }

  return (
    <EditPlannerPresenter
      planner={planner ?? null}
      tab={tab}
      onTabChange={setTab}
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
      onSave={handleSave}
      routines={routines}
      routinesLoaded={routinesLoaded}
      onServerPreview={handleServerPreview}
      onUpdateRoutine={handleUpdateRoutine}
    />
  );
}
