/**
 * 교육과정 단원 순서 — 배열 순서가 곧 '학교 진도 순서'라는 계약을 고정한다.
 *
 * 위저드 3단계의 '진도 나간 데까지'는 학생이 고른 단원까지를 `slice(0, idx + 1)` 로 잘라
 * 시험 범위를 확정한다. 그래서 `lib/mock/curriculum.ts` 의 배열 순서가 교과서 목차와
 * 어긋나면 커트 뒤의 단원이 잘못 포함·제외된다 — 순서 자체가 기능이다.
 *
 * 여기서 고정하는 건 "무엇이 들어있나"가 아니라 **"어느 쪽이 먼저 오나"** 다.
 */
import { useEffect, useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('sonner', () => ({ toast: { error: jest.fn(), success: jest.fn(), warning: jest.fn() } }));

import {
  initialPlannerForm, initialScopeState,
  type PlannerForm, type ScopeState,
} from '@/components/features/planner-builder/components/builder-types';
import { PStep3Subjects } from '@/components/features/planner-builder/components/step-scope';
import { scopeUnits } from '@/lib/planner/exam-scope';

/** a 가 b 보다 앞에 오는가 — 둘 다 목록에 있어야 한다 */
function expectBefore(units: string[], a: string, b: string) {
  const ia = units.indexOf(a);
  const ib = units.indexOf(b);
  expect(ia).toBeGreaterThanOrEqual(0);
  expect(ib).toBeGreaterThanOrEqual(0);
  expect(ia).toBeLessThan(ib);
}

describe('교과서 목차 순서 — 과목별 단원 배열', () => {
  it('수학Ⅰ: 지수와 로그 → 그래프 → 활용(방정식·부등식) → 삼각함수 → 수열', () => {
    const units = scopeUnits('math', ['확률과 통계']);
    expectBefore(units, '지수·로그의 정의와 성질', '지수·로그 함수의 그래프');
    // 방정식·부등식은 교과서에서 '지수함수와 로그함수의 활용' — 그래프 다음이다
    expectBefore(units, '지수·로그 함수의 그래프', '지수·로그 방정식과 부등식');
    expectBefore(units, '지수·로그 방정식과 부등식', '삼각함수');
    expectBefore(units, '삼각함수', '수열');
  });

  it('수학: 수학Ⅰ → 수학Ⅱ → 선택과목 순으로 이어진다', () => {
    const units = scopeUnits('math', ['미적분']);
    expectBefore(units, '수열', '함수의 극한과 연속');
    expectBefore(units, '함수의 극한과 연속', '미분');
    expectBefore(units, '미분', '적분');
    expectBefore(units, '적분', '수열의 극한');
    expectBefore(units, '여러 가지 함수의 미분', '도함수의 활용');
  });

  it('영어(수능 영역): 어법·어휘(29~30) → 빈칸(31~34) → 무관한 문장(35) → 순서(36~37)', () => {
    // 어법·어휘·빈칸은 성취기준(depth 3)이 있어 그 라벨이 단위가 된다
    const units = scopeUnits('english', []);
    expectBefore(units, '일치·불일치', '시제·태');
    expectBefore(units, '시제·태', '관계사·접속사');
    expectBefore(units, '관계사·접속사', '수능 빈출 어휘');
    expectBefore(units, '수능 빈출 어휘', '빈칸 추론 — 사고 패턴');
    expectBefore(units, '빈칸 추론 — 사고 패턴', '무관한 문장');
    expectBefore(units, '무관한 문장', '글의 순서');
    expectBefore(units, '글의 순서', '문장 삽입');
    expectBefore(units, '문장 삽입', '요약문 완성');
    expectBefore(units, '요약문 완성', '장문 독해 (1지문 2문항)');
  });

  it('국어(독서): 인문·예술 → 사회·문화 → 과학·기술', () => {
    const units = scopeUnits('korean', ['언어와 매체']);
    expectBefore(units, '독서 — 인문', '독서 — 예술');
    expectBefore(units, '독서 — 예술', '독서 — 사회');
    expectBefore(units, '독서 — 사회', '독서 — 과학·기술');
    // 언어와 매체 내부도 교과서 순서: 음운 → 단어 → 문장 → 담화·의미 → 매체
    expectBefore(units, '음운', '형태소·단어');
    expectBefore(units, '형태소·단어', '문장');
    expectBefore(units, '문장', '매체');
  });

  it('과학Ⅰ: 각 과목 대단원이 교과서 순서로 이어진다', () => {
    const units = scopeUnits('science', ['화학Ⅰ', '생명과학Ⅰ']);
    expectBefore(units, '화학의 첫걸음', '원자의 세계');
    expectBefore(units, '원자의 세계', '화학 결합과 분자의 세계');
    expectBefore(units, '화학 결합과 분자의 세계', '역동적인 화학 반응');
    expectBefore(units, '생명 과학의 이해', '사람의 물질대사');
    expectBefore(units, '사람의 물질대사', '항상성과 몸의 조절');
    expectBefore(units, '항상성과 몸의 조절', '유전');
    expectBefore(units, '유전', '생태계와 상호 작용');
  });

  it('한국사: 시대 순으로 이어진다', () => {
    expect(scopeUnits('history', [])).toEqual([
      '전근대 한국사의 이해',
      '근대 국민 국가 수립 운동',
      '일제 식민지 지배와 민족 운동의 전개',
      '대한민국의 발전',
    ]);
  });
});

/* ─── 순서가 커트에 그대로 반영되는지 ─── */

let latest: { form: PlannerForm; scope: ScopeState };

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

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));

describe('진도 커트 — 교과서 순서대로 앞만 남는다', () => {
  it('지수·로그 그래프까지 배웠으면 방정식·부등식은 빠진다', () => {
    // 순서가 뒤집혀 있던 시절엔 그래프를 커트로 골라도 아직 안 배운 '방정식과 부등식'이
    // 범위에 딸려 들어왔다 — 진도 커트가 정반대로 동작한 셈이다.
    render(<Harness />);
    click('수학');
    click('확률과 통계');
    click(/진도 나간 데까지/);
    click('지수·로그 함수의 그래프');

    const units = latest.form.subjectUnits.math!;
    expect(units).toEqual(['지수·로그의 정의와 성질', '지수·로그 함수의 그래프']);
    expect(units).not.toContain('삼각함수');
  });

  it('영어에서 어휘까지 눌렀으면 빈칸 추론부터는 빠진다', () => {
    // 어법·어휘가 빈칸 뒤에 있던 시절엔 '어휘까지'를 눌러도 빈칸·순서·삽입이 다 딸려 왔다.
    render(<Harness />);
    click('영어');
    click(/진도 나간 데까지/);
    click('수능 빈출 어휘');

    const units = latest.form.subjectUnits.english!;
    expect(units).toContain('시제·태');
    expect(units).toContain('수능 빈출 어휘');
    expect(units).not.toContain('빈칸 추론 — 사고 패턴');
    expect(units).not.toContain('무관한 문장');
    expect(units).not.toContain('장문 독해 (1지문 2문항)');
  });
});
