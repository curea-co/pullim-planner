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

function Harness({ initial = startForm }: { initial?: PlannerForm }) {
  const [form, setForm] = useState<PlannerForm>(initial);
  const [scope, setScope] = useState<ScopeState>(() => initialScopeState(initial));
  // 렌더 중 바깥 변수를 건드리지 않는다 — 검증용 스냅샷은 커밋 후 effect 에서 노출
  useEffect(() => { latest = { form, scope }; }, [form, scope]);
  return <PStep3Subjects form={form} setForm={setForm} scope={scope} setScope={setScope} />;
}

const blocker = () => scopeBlocker(latest.form, latest.scope);
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));

/** [단원 직접 편집] 모달을 열어 자유 입력 단원 하나만 남긴다 — 교육과정에 없는 값이라 자동 범위와 구분된다 */
function editUnitsTo(label: string) {
  fireEvent.click(screen.getAllByRole('button', { name: /단원 직접 편집/ })[0]);
  fireEvent.click(screen.getByRole('button', { name: '전체 초기화' }));
  fireEvent.change(screen.getByPlaceholderText(/수능특강 영어 3강/), { target: { value: label } });
  click('추가');
  click(/적용/);
}

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

  it('답을 고르기 전에 직접 편집한 단원은 답을 골라도 덮어쓰지 않는다', () => {
    // 답 변경이 settled 를 통째로 비우던 시절엔, 답하기 전에 저장한 단원을 첫 답 한 번에
    // 자동 범위가 되살려 덮어썼다 — 학생이 손수 적은 값이 조용히 사라진다(Codex).
    render(<Harness />);
    click('영어');
    editUnitsTo('학원 교재 3단원');
    expect(latest.form.subjectUnits.english).toEqual(['학원 교재 3단원']);

    click(/시험 범위가 따로 있어/);
    expect(latest.form.subjectUnits.english).toEqual(['학원 교재 3단원']);
    // 직접 편집한 과목은 이미 학생이 확인한 범위 — custom 증명도 선다
    expect(blocker()).toBeNull();
    // 답 변경으로 선 확정(settled)은 풀리되 직접 편집 표시는 남는다
    expect(latest.scope.settled).toEqual([]);
    expect(latest.scope.manualUnits).toEqual(['english']);

    // 다른 답으로 또 바꿔도 마찬가지 — 손수 적은 범위는 학생이 다시 손대기 전까지 유지된다
    click(/전 범위 다 해야 해/);
    expect(latest.form.subjectUnits.english).toEqual(['학원 교재 3단원']);
    // 왜 안 바뀌는지 화면에서도 알린다
    expect(screen.getByText(/답을 바꿔도 그대로 둬요/)).toBeInTheDocument();
  });

  it('직접 편집한 과목도 과목 칩을 껐다 켜면 자동 범위로 돌아온다', () => {
    // 유지가 곧 감옥이 되면 안 된다 — 자동 범위로 돌아갈 출구가 있어야 한다.
    render(<Harness />);
    click('영어');
    editUnitsTo('학원 교재 3단원');
    click(/전 범위 다 해야 해/);

    click('영어'); // 끄기
    click('영어'); // 다시 켜기
    expect(latest.scope.manualUnits).toEqual([]);
    expect(latest.form.subjectUnits.english!.length).toBeGreaterThan(1);
    expect(latest.form.subjectUnits.english).not.toContain('학원 교재 3단원');
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

  it('프리필은 직접 편집이 아니다 — 답을 바꾸면 범위가 다시 파생된다', () => {
    // 프리필까지 '직접 편집'으로 묶어 답 변경에서 보존하면, 수정 모드에선 모든 과목이
    // 보존 대상이라 게이트가 눌러도 아무것도 안 바뀌는 죽은 컨트롤이 된다.
    const saved: PlannerForm = { ...startForm, subjectUnits: { english: ['빈칸 추론'] } };
    render(<Harness initial={saved} />);
    expect(latest.scope.answer).toBe('custom');
    expect(latest.scope.manualUnits).toEqual([]);
    expect(blocker()).toBeNull();

    click(/전 범위 다 해야 해/);
    expect(latest.scope.settled).toEqual([]);
    expect(latest.form.subjectUnits.english!.length).toBeGreaterThan(1);
    expect(latest.form.subjectUnits.english).toContain('글의 목적');
  });

  it('선택과목이 역추론되는 프리필도 답을 바꾸면 다시 파생된다', () => {
    // 위 영어(선택과목 없음)와 달리 선택과목이 있는 과목도 역추론만 되면 자동 파생 대상이다.
    const saved: PlannerForm = { ...startForm, subjectUnits: { math: ['수열의 극한', '도함수의 활용'] } };
    render(<Harness initial={saved} />);
    expect(latest.scope.electives.math).toEqual(['미적분']);
    expect(latest.scope.manualUnits).toEqual([]);

    click(/전 범위 다 해야 해/);
    // 되짚은 선택과목(미적분) + 고정 단원(수학Ⅰ·Ⅱ)으로 범위가 새로 잡힌다
    expect(latest.form.subjectUnits.math).toContain('수열');
    expect(latest.form.subjectUnits.math).toContain('도함수의 활용');
    expect(latest.form.subjectUnits.math).not.toContain('확률');
  });

  it('선택과목을 역추론할 수 없는 프리필은 답을 바꿔도 범위를 잃지 않는다', () => {
    // 자유 입력 단원만 있는 프리필은 시스템이 자동 범위로 되돌릴 수 없다. settled 만 비우면
    // 이 과목이 다시 파생 대상이 되고, needsElective 가 서서 단원이 [] 로 덮어써진다 —
    // 학생은 저장해 둔 범위를 확인 한 번에 잃고 선택과목부터 다시 고르게 된다(Codex).
    const saved: PlannerForm = { ...startForm, subjectUnits: { math: ['학원 교재 3단원'] } };
    render(<Harness initial={saved} />);
    expect(latest.scope.manualUnits).toEqual(['math']);
    expect(blocker()).toBeNull();

    click(/전 범위 다 해야 해/);
    expect(latest.form.subjectUnits.math).toEqual(['학원 교재 3단원']);
    // 선택과목을 다시 묻는 화면으로 되돌아가지도 않는다
    expect(screen.queryByText('선택과목을 골라줘')).toBeNull();
    expect(blocker()).toBeNull();
  });

  it('교육과정 데이터가 없는 과목(기타)의 프리필도 유지된다', () => {
    // '기타'는 자동 범위가 아예 비어 있어 파생에 맡기면 단원이 통째로 사라진다.
    const saved: PlannerForm = { ...startForm, subjectUnits: { etc: ['논술 특강'] } };
    render(<Harness initial={saved} />);

    click(/전 범위 다 해야 해/);
    expect(latest.form.subjectUnits.etc).toEqual(['논술 특강']);
    expect(blocker()).toBeNull();
  });
});
