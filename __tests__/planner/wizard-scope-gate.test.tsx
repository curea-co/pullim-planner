/**
 * 학습 범위 확인 게이트 — 3단계.
 *
 * 지키려는 두 가지:
 *  1) 범위는 자동으로 채우되 **학생이 확인하기 전에는 다음으로 넘어가지 못한다.**
 *     미리 채운 값은 확인 없이 그냥 통과되기 때문이다.
 *  2) 선택과목(국어 택1·수학 택1·탐구 택2)은 시스템이 알 수 없으므로 **고르기 전에는
 *     범위를 확정하지 않는다.** 임의로 채우면 범위가 통째로 틀린다.
 */
import { useEffect, useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('sonner', () => ({ toast: { error: jest.fn(), success: jest.fn(), warning: jest.fn() } }));

import {
  initialPlannerForm, initialScopeState, maxReachableStep, scopeBlocker,
  type PlannerForm, type ScopeState,
} from '@/components/features/planner-builder/components/builder-types';
import { PStep3Subjects } from '@/components/features/planner-builder/components/step-scope';
import { subjectScope } from '@/lib/planner/exam-scope';

let latest: { form: PlannerForm; scope: ScopeState };

/** 1단계는 이미 통과한 상태 — 3단계 게이트만 본다 */
const startForm: PlannerForm = {
  ...initialPlannerForm,
  examType: 'midterm',
  examStartDate: '2099-05-01',
  examEndDate: '2099-05-03',
};

function Harness() {
  const [form, setForm] = useState<PlannerForm>(startForm);
  const [scope, setScope] = useState<ScopeState>(() => initialScopeState(startForm));
  // 렌더 중 바깥 변수를 건드리지 않는다 — 검증용 스냅샷은 커밋 후 effect 에서 노출
  useEffect(() => { latest = { form, scope }; }, [form, scope]);
  return <PStep3Subjects form={form} setForm={setForm} scope={scope} setScope={setScope} />;
}

const blocker = () => scopeBlocker(latest.form, latest.scope);
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));

describe('선택과목 — 고르기 전에는 범위를 확정하지 않는다', () => {
  it('국어 택1 · 수학 택1 · 탐구 택2 규칙을 갖는다', () => {
    expect(subjectScope('korean').choose).toBe(1);
    expect(subjectScope('math').choose).toBe(1);
    expect(subjectScope('science').choose).toBe(2);
    expect(subjectScope('social').choose).toBe(2);
    // 선택과목이 없는 과목은 곧바로 범위가 잡힌다
    expect(subjectScope('english').choose).toBe(0);
    expect(subjectScope('history').choose).toBe(0);
  });

  it('선택과목을 고르기 전에는 단원을 채우지 않고 진행을 막는다', () => {
    render(<Harness />);
    click('수학');

    expect(screen.getByText('선택과목을 골라줘')).toBeInTheDocument();
    expect(latest.form.subjectUnits.math).toEqual([]);
    expect(blocker()).toBe('수학 선택과목을 골라주세요');
    // 확인 게이트는 선택과목을 다 고른 뒤에 나온다 — 순서 강제
    expect(screen.queryByText(/학교 진도는 어디까지/)).toBeNull();
  });

  it('선택과목을 고르면 그때부터 범위를 채운다', () => {
    render(<Harness />);
    click('수학');
    click('미적분');

    // 고정(수학Ⅰ·수학Ⅱ) + 고른 선택과목(미적분)만 들어간다
    expect(latest.form.subjectUnits.math).toContain('수열');
    expect(latest.form.subjectUnits.math).toContain('도함수의 활용');
    expect(latest.form.subjectUnits.math).not.toContain('확률');
    expect(blocker()).toBe('학교 진도를 골라주세요');
  });

  it('한 번 고른 선택과목은 [바꾸기]로 다시 고른다', () => {
    render(<Harness />);
    click('수학');
    click('미적분');
    click('바꾸기');

    // 다시 고르는 동안에는 범위를 확정하지 않는다
    expect(blocker()).toBe('수학 선택과목을 골라주세요');

    click('확률과 통계');
    expect(latest.scope.electives.math).toEqual(['확률과 통계']);
    expect(latest.form.subjectUnits.math).toContain('확률');
    expect(latest.form.subjectUnits.math).not.toContain('도함수의 활용');
  });

  it('탐구는 2개를 다 고를 때까지 막는다', () => {
    render(<Harness />);
    click('과학');
    click('화학Ⅰ');

    expect(blocker()).toBe('과학 선택과목을 골라주세요');

    click('생명과학Ⅰ');
    expect(latest.scope.electives.science).toEqual(['화학Ⅰ', '생명과학Ⅰ']);
    expect(blocker()).toBe('학교 진도를 골라주세요');
  });

  it('교육과정 목록에 없는 과목도 막다른 길이 되지 않는다', () => {
    render(<Harness />);
    click('과학');
    // 2022 개정 등 목록에 없는 경우를 위한 우회로가 선택과목 화면에 있다
    expect(screen.getByRole('button', { name: /목록에 없어/ })).toBeInTheDocument();
  });
});

describe('확인 게이트 — 확인 전에는 넘어가지 못한다', () => {
  it('과목이 없으면 막는다', () => {
    render(<Harness />);
    expect(blocker()).toBe('과목을 하나 이상 골라주세요 — 단원은 자동으로 채워집니다');
    expect(maxReachableStep(latest.form, latest.scope)).toBeLessThan(4);
  });

  it('범위가 자동으로 채워져도 답하기 전에는 막는다', () => {
    render(<Harness />);
    click('영어'); // 선택과목이 없어 곧바로 범위가 채워지는 과목

    expect(latest.form.subjectUnits.english?.length).toBeGreaterThan(0);
    expect(blocker()).toBe('학교 진도를 골라주세요');
    // 채워졌다는 이유로 미리보기까지 건너뛰지 못한다
    expect(maxReachableStep(latest.form, latest.scope)).toBe(3);
  });

  it('전 범위로 답하면 통과한다', () => {
    render(<Harness />);
    click('영어');
    click(/전 범위 다 해야 해/);

    expect(blocker()).toBeNull();
    expect(maxReachableStep(latest.form, latest.scope)).toBe(4);
  });

  it('진도로 답하면 과목마다 커트를 누를 때까지 막는다', () => {
    render(<Harness />);
    click('수학');
    click('미적분');
    click(/진도 나간 데까지/);

    expect(blocker()).toBe('수학 진도를 눌러주세요');

    click('삼각함수');
    expect(blocker()).toBeNull();
    // 커트 이후 단원은 빠진다
    expect(latest.form.subjectUnits.math).toContain('삼각함수');
    expect(latest.form.subjectUnits.math).not.toContain('수열');
  });

  it('직접 고르기로 답하면 실제로 손대기 전에는 막는다', () => {
    render(<Harness />);
    click('영어');
    click(/시험 범위가 따로 있어/);

    expect(blocker()).toBe('영어 시험 범위를 골라주세요');
  });

  it('직접 고르기 확인은 과목별이다 — 나중에 추가한 과목도 다시 묻는다', () => {
    // 전역 플래그였을 때는 영어를 편집해 증명이 서면 뒤에 추가한 수학이 자동으로 채워진
    // 전 범위 그대로 통과했다 — '직접 고르기' 를 고른 의미가 사라진다(Codex).
    render(<Harness />);
    click('영어');
    click(/시험 범위가 따로 있어/);
    fireEvent.click(screen.getAllByRole('button', { name: /단원 직접 편집/ })[0]);
    fireEvent.click(screen.getByRole('button', { name: /적용/ }));
    expect(blocker()).toBeNull();

    click('수학');
    expect(blocker()).toBe('수학 선택과목을 골라주세요');
    click('미적분');
    expect(blocker()).toBe('수학 시험 범위를 골라주세요');
  });

  it('답을 바꾸면 이전 답의 증명은 무효가 된다', () => {
    render(<Harness />);
    click('영어');
    click(/전 범위 다 해야 해/);
    expect(blocker()).toBeNull();

    click(/시험 범위가 따로 있어/);
    expect(blocker()).toBe('영어 시험 범위를 골라주세요');
  });
});

describe('수정 모드 — 만들 때 답한 걸 다시 묻지 않는다', () => {
  it('이미 범위가 있는 폼은 확정된 것으로 본다', () => {
    const saved: PlannerForm = {
      ...initialPlannerForm,
      subjectUnits: { math: ['수열', '미분'], english: ['빈칸 추론'] },
    };
    const scope = initialScopeState(saved);

    expect(scope.answer).toBe('custom');
    expect(scope.settled).toEqual(['math', 'english']);
    expect(scopeBlocker(saved, scope)).toBeNull();
  });

  it('자유 입력 단원만 있어도 선택과목을 다시 묻지 않는다', () => {
    const saved: PlannerForm = {
      ...initialPlannerForm,
      subjectUnits: { math: ['학원 교재 3단원'] },
    };
    const scope = initialScopeState(saved);
    expect(scopeBlocker(saved, scope)).toBeNull();
  });
});
