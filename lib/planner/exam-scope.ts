/**
 * 학습 범위 카탈로그 — 과목을 고르면 단원을 채워 주기 위한 규칙.
 *
 * 핵심 전제: **선택과목은 시스템이 알 수 없다.** 수능 국어는 화법과작문/언어와매체 택1,
 * 수학은 확률과통계/미적분/기하 택1, 탐구는 과목당 택2다. 그 학생이 뭘 배우는지는 기록에
 * 없으므로 임의로 하나 넣어두면 아는 척하는 것이고, 범위가 통째로 틀린다. 그래서 `choose`
 * 만큼 고르기 전에는 범위를 확정하지 않는다.
 *
 * 교육과정 트리(`lib/mock/curriculum.ts`)는 2015 개정 기준이라 2022 개정(고1) 과목이 없다.
 * 목록에 없는 과목·단원은 **단원 직접 편집**(자유 입력)으로 우회한다 — 데이터가 없다고
 * 막다른 길이 되지 않게.
 */

import { allCurricula, subjectLabels, type CurriculumTree, type SubjectKey } from '@/lib/mock';

/** 선택과목 후보 하나 — 고르면 `units` 가 범위에 들어간다. */
export type ScopeOption = {
  /** 식별자 겸 표기명 */
  key: string;
  /** 이 선택과목이 담고 있는 단원 라벨 (교육과정 순서) */
  units: string[];
};

export type SubjectScopeSpec = {
  /** 골라야 하는 선택과목 수 — 0이면 선택과목이 없는 과목 */
  choose: number;
  /** 선택과목 후보 */
  options: ScopeOption[];
  /** 선택과 무관하게 늘 포함되는 단원 */
  fixedUnits: string[];
  /** "이 중 하나를 배우고 있어" 같은 안내 문구 */
  prompt: string;
};

/** 교육과정 트리에서 무엇을 집을지 — 코스 단위(수학Ⅰ) 또는 단원 단위(화법과 작문) */
type ScopeRef = { kind: 'course' | 'node'; label: string };

const course = (label: string): ScopeRef => ({ kind: 'course', label });
const node = (label: string): ScopeRef => ({ kind: 'node', label });

type RawSpec = { choose: number; options: ScopeRef[]; fixed: ScopeRef[]; prompt: string };

const RAW: Partial<Record<SubjectKey, RawSpec>> = {
  korean: {
    choose: 1,
    options: [node('화법과 작문'), node('언어와 매체')],
    fixed: [node('독서'), node('문학')],
    prompt: '이 중 하나를 배우고 있어',
  },
  math: {
    choose: 1,
    options: [course('확률과 통계'), course('미적분'), course('기하')],
    fixed: [course('수학Ⅰ'), course('수학Ⅱ')],
    prompt: '이 중 하나를 배우고 있어',
  },
  english: {
    choose: 0,
    options: [],
    fixed: [course('수능 영역')],
    prompt: '',
  },
  science: {
    choose: 2,
    options: [course('물리학Ⅰ'), course('화학Ⅰ'), course('생명과학Ⅰ'), course('지구과학Ⅰ')],
    fixed: [],
    prompt: '이 중 2개를 배우고 있어',
  },
  social: {
    choose: 2,
    options: [
      node('생활과 윤리'), node('윤리와 사상'), node('한국지리'), node('세계지리'),
      node('동아시아사'), node('세계사'), node('경제'), node('정치와 법'), node('사회·문화'),
    ],
    fixed: [],
    prompt: '이 중 2개를 배우고 있어',
  },
  history: {
    choose: 0,
    options: [],
    fixed: [course('한국사')],
    prompt: '',
  },
};

const EMPTY_SPEC: SubjectScopeSpec = { choose: 0, options: [], fixedUnits: [], prompt: '' };

function treeOf(subject: SubjectKey): CurriculumTree | null {
  return allCurricula[subject as keyof typeof allCurricula] ?? null;
}

/** 단원 라벨 — 성취기준(depth 3)이 있으면 그것들이, 없으면 단원(depth 2) 자신이 단위다. */
function unitLabelsOf(tree: CurriculumTree, nodeId: string, nodeLabel: string): string[] {
  const children = tree.nodes.filter(n => n.depth === 3 && n.parent === nodeId);
  return children.length > 0 ? children.map(c => c.label) : [nodeLabel];
}

/** 참조에 해당하는 단원들을 교육과정 정의 순서로 모은다 (중복 제거) */
function unitsOfRefs(subject: SubjectKey, refs: ScopeRef[]): string[] {
  const tree = treeOf(subject);
  if (!tree || refs.length === 0) return [];
  const out: string[] = [];
  for (const n of tree.nodes) {
    if (n.depth !== 2) continue;
    const hit = refs.some(r => (r.kind === 'course' ? n.course === r.label : n.label === r.label));
    if (!hit) continue;
    for (const label of unitLabelsOf(tree, n.id, n.label)) {
      if (!out.includes(label)) out.push(label);
    }
  }
  return out;
}

/** 과목의 범위 규칙 — 교육과정 데이터가 없는 과목(기타 등)은 빈 규칙 */
export function subjectScope(subject: SubjectKey): SubjectScopeSpec {
  const raw = RAW[subject];
  if (!raw) return EMPTY_SPEC;
  return {
    choose: raw.choose,
    options: raw.options.map(o => ({ key: o.label, units: unitsOfRefs(subject, [o]) })),
    fixedUnits: unitsOfRefs(subject, raw.fixed),
    prompt: raw.prompt,
  };
}

/**
 * 확정된 범위 — 고정 단원 + 고른 선택과목의 단원을 **교육과정 순서로** 합친다.
 * 진도 커트(prefix 자르기)가 이 순서를 그대로 쓰므로 순서가 곧 의미다.
 */
export function scopeUnits(subject: SubjectKey, chosen: string[]): string[] {
  const raw = RAW[subject];
  if (!raw) return [];
  const picked = raw.options.filter(o => chosen.includes(o.label));
  return unitsOfRefs(subject, [...raw.fixed, ...picked]);
}

/**
 * 이미 저장된 단원에서 선택과목을 되짚는다 — 수정 모드 프리필용.
 * 자유 입력 단원만 있는 과목은 빈 배열이 나오므로, 호출부가 "이미 확정된 과목"으로
 * 따로 다뤄야 한다(다시 물어보면 기존 범위를 잃는다).
 */
export function inferElectives(subject: SubjectKey, units: string[]): string[] {
  return subjectScope(subject)
    .options.filter(o => o.units.some(u => units.includes(u)))
    .map(o => o.key);
}

/** 과목 표기명 — 안내 문구 조립용 (lib/mock 재노출) */
export function subjectLabel(subject: SubjectKey): string {
  return subjectLabels[subject] ?? subject;
}
