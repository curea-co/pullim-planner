/**
 * 3-Depth 교육과정 분류 (SKILL.md 4.2).
 *
 * 매핑 출처 (대한민국 고등학생 2015 개정 교육과정 기준):
 *   - 교육부 고시 제2015-74호 · 별책 5 (국어과) / 7 (사회과·한국사) /
 *     8 (수학과) / 9 (과학과) / 14 (영어과)
 *   - NCIC 국가교육과정정보센터 (ncic.re.kr) 공개
 *   - 수능 출제 영역: 한국교육과정평가원 (KICE) 수능 출제기본계획
 *
 * 적용 학년 (2026 기준):
 *   - 고1: 2022 개정 시행 — 별도 트리 v2에서 매핑 예정
 *   - 고2~3: 2015 개정 (현재 본 트리 적용)
 *   - 서연 페르소나(고2)는 2015 개정 적용 학년
 *
 * depth 1 = 과목 / depth 2 = 단원·과목명(선택과목) / depth 3 = 성취 기준
 */

import type { SubjectKey } from './persona';

export type CurriculumNode = {
  id: string;
  label: string;
  depth: 1 | 2 | 3;
  parent?: string;
  /** 학생의 현재 마스터리 (0~1). depth-3 노드만 의미 있음. */
  mastery?: number;
  /** 단원이 속한 코스/카테고리 (수학Ⅰ, 미적분, 일반선택, 진로선택, 수능 영역 등). */
  course?: string;
  /** 적용 학년·과목 분류 (예: '고1 공통', '고2-3 일반선택', 'KICE 출제 분류'). */
  appliedGrades?: string;
  /** 코스별 출처 — defaultSource와 다를 때만 지정 (예: 영어 수능 영역). */
  source?: string;
};

export type CurriculumSource = {
  /** 출처 본문 (모달에 표기) */
  text: string;
  /** 발행 기관 */
  authority: string;
  /** 외부 참조 URL (선택) */
  url?: string;
};

export type CurriculumTree = {
  subject: SubjectKey;
  nodes: CurriculumNode[];
  /** 트리의 기본 출처 (depth-2 노드 source 미지정 시 적용) */
  defaultSource: CurriculumSource;
};

/** 자주 쓰이는 출처 정의 — 트리에서 참조 */
const NATIONAL_2015 = (book: string): CurriculumSource => ({
  text: `2015 개정 교육과정 · 별책 ${book}`,
  authority: '교육부 고시 제2015-74호',
  url: 'http://ncic.re.kr',
});

const KICE_CSAT: CurriculumSource = {
  text: '한국교육과정평가원 수능 출제기본계획',
  authority: 'KICE',
  url: 'https://www.suneung.re.kr',
};

/* ─────────────────────────────────────────────────────
 * 수학 — 2015 개정 별책 8 (수학과)
 * 공통수학(고1) → 일반선택 5과목(고2-3) → 진로선택 (기하 등)
 * ───────────────────────────────────────────────────── */
export const mathCurriculum: CurriculumTree = {
  subject: 'math',
  defaultSource: NATIONAL_2015('8 (수학과)'),
  nodes: [
    { id: 'math', label: '수학', depth: 1 },

    // ── 공통수학 (1학년 공통)
    { id: 'math.poly',       label: '다항식',          depth: 2, parent: 'math', course: '공통수학', appliedGrades: '고1 공통' },
    { id: 'math.eq_ineq',    label: '방정식과 부등식', depth: 2, parent: 'math', course: '공통수학', appliedGrades: '고1 공통' },
    { id: 'math.coord_geom', label: '도형의 방정식',   depth: 2, parent: 'math', course: '공통수학', appliedGrades: '고1 공통' },
    { id: 'math.set_logic',  label: '집합과 명제',     depth: 2, parent: 'math', course: '공통수학', appliedGrades: '고1 공통' },
    { id: 'math.func',       label: '함수',            depth: 2, parent: 'math', course: '공통수학', appliedGrades: '고1 공통' },

    // ── 수학Ⅰ (일반선택)
    { id: 'math.exp_log',           label: '지수함수와 로그함수', depth: 2, parent: 'math', course: '수학Ⅰ', appliedGrades: '고2 일반선택' },
    { id: 'math.exp_log.def',       label: '지수·로그의 정의와 성질', depth: 3, parent: 'math.exp_log', mastery: 0.82 },
    { id: 'math.exp_log.eq',        label: '지수·로그 방정식과 부등식', depth: 3, parent: 'math.exp_log', mastery: 0.41 },
    { id: 'math.exp_log.graph',     label: '지수·로그 함수의 그래프', depth: 3, parent: 'math.exp_log', mastery: 0.67 },
    { id: 'math.trig',              label: '삼각함수', depth: 2, parent: 'math', course: '수학Ⅰ', appliedGrades: '고2 일반선택' },
    { id: 'math.seq',               label: '수열',     depth: 2, parent: 'math', course: '수학Ⅰ', appliedGrades: '고2 일반선택' },

    // ── 수학Ⅱ (일반선택)
    { id: 'math.lim_continuity', label: '함수의 극한과 연속', depth: 2, parent: 'math', course: '수학Ⅱ', appliedGrades: '고2 일반선택' },
    { id: 'math.diff_basic',     label: '미분',              depth: 2, parent: 'math', course: '수학Ⅱ', appliedGrades: '고2 일반선택' },
    { id: 'math.int_basic',      label: '적분',              depth: 2, parent: 'math', course: '수학Ⅱ', appliedGrades: '고2 일반선택' },

    // ── 미적분 (일반선택, 주로 이과)
    { id: 'math.seq_lim',     label: '수열의 극한', depth: 2, parent: 'math', course: '미적분', appliedGrades: '고2-3 일반선택 (이과)' },
    { id: 'math.calc_diff',   label: '미분법',      depth: 2, parent: 'math', course: '미적분', appliedGrades: '고2-3 일반선택 (이과)' },
    { id: 'math.calc_diff.composite',   label: '여러 가지 함수의 미분', depth: 3, parent: 'math.calc_diff', mastery: 0.38 },
    { id: 'math.calc_diff.application', label: '도함수의 활용',         depth: 3, parent: 'math.calc_diff', mastery: 0.34 },
    { id: 'math.calc_int',    label: '적분법',      depth: 2, parent: 'math', course: '미적분', appliedGrades: '고2-3 일반선택 (이과)' },
    { id: 'math.calc_int.application', label: '정적분의 활용', depth: 3, parent: 'math.calc_int', mastery: 0.22 },

    // ── 확률과 통계 (일반선택, 문이과 공통)
    { id: 'math.prob_combination',      label: '경우의 수', depth: 2, parent: 'math', course: '확률과 통계', appliedGrades: '고2-3 일반선택' },
    { id: 'math.prob_combination.perm', label: '순열과 조합', depth: 3, parent: 'math.prob_combination', mastery: 0.71 },
    { id: 'math.prob',         label: '확률', depth: 2, parent: 'math', course: '확률과 통계', appliedGrades: '고2-3 일반선택' },
    { id: 'math.statistics',   label: '통계', depth: 2, parent: 'math', course: '확률과 통계', appliedGrades: '고2-3 일반선택' },
    { id: 'math.statistics.dist', label: '확률분포', depth: 3, parent: 'math.statistics', mastery: 0.49 },

    // ── 기하 (진로선택)
    { id: 'math.geom_conic',  label: '이차곡선',            depth: 2, parent: 'math', course: '기하', appliedGrades: '고2-3 진로선택' },
    { id: 'math.geom_vec',    label: '평면벡터',            depth: 2, parent: 'math', course: '기하', appliedGrades: '고2-3 진로선택' },
    { id: 'math.geom_space',  label: '공간도형과 공간좌표', depth: 2, parent: 'math', course: '기하', appliedGrades: '고2-3 진로선택' },
  ],
};

/* ─────────────────────────────────────────────────────
 * 영어 — 2015 개정 별책 14 (영어과) + 수능 영역(KICE)
 * ───────────────────────────────────────────────────── */
export const englishCurriculum: CurriculumTree = {
  subject: 'english',
  defaultSource: NATIONAL_2015('14 (영어과)'),
  nodes: [
    { id: 'eng', label: '영어', depth: 1 },

    // ── 일반선택 (5과목)
    { id: 'eng.general',         label: '영어 (공통)',     depth: 2, parent: 'eng', course: '일반선택', appliedGrades: '고1 공통' },
    { id: 'eng.conversation',    label: '영어 회화',       depth: 2, parent: 'eng', course: '일반선택', appliedGrades: '고1-3 일반선택' },
    { id: 'eng.eng1',            label: '영어Ⅰ',          depth: 2, parent: 'eng', course: '일반선택', appliedGrades: '고2 일반선택' },
    { id: 'eng.eng2',            label: '영어Ⅱ',          depth: 2, parent: 'eng', course: '일반선택', appliedGrades: '고2-3 일반선택' },
    { id: 'eng.reading_writing', label: '영어 독해와 작문', depth: 2, parent: 'eng', course: '일반선택', appliedGrades: '고2-3 일반선택' },

    // ── 진로선택 (4과목)
    { id: 'eng.practical',  label: '실용 영어',     depth: 2, parent: 'eng', course: '진로선택', appliedGrades: '고2-3 진로선택' },
    { id: 'eng.literature', label: '영미 문학 읽기', depth: 2, parent: 'eng', course: '진로선택', appliedGrades: '고2-3 진로선택' },
    { id: 'eng.career',     label: '진로 영어',     depth: 2, parent: 'eng', course: '진로선택', appliedGrades: '고2-3 진로선택' },
    { id: 'eng.culture',    label: '영어권 문화',   depth: 2, parent: 'eng', course: '진로선택', appliedGrades: '고2-3 진로선택' },

    // ── 수능 영역 (KICE 출제 분류, 별도 출처)
    { id: 'eng.listening',         label: '듣기·말하기',    depth: 2, parent: 'eng', course: '수능 영역', appliedGrades: 'KICE 출제 분류', source: KICE_CSAT.text },
    { id: 'eng.purpose',           label: '글의 목적',       depth: 2, parent: 'eng', course: '수능 영역', appliedGrades: 'KICE 출제 분류', source: KICE_CSAT.text },
    { id: 'eng.mood',              label: '심경·분위기',     depth: 2, parent: 'eng', course: '수능 영역', appliedGrades: 'KICE 출제 분류', source: KICE_CSAT.text },
    { id: 'eng.claim_main',        label: '주장·요지',       depth: 2, parent: 'eng', course: '수능 영역', appliedGrades: 'KICE 출제 분류', source: KICE_CSAT.text },
    { id: 'eng.implication',       label: '함축적 의미',     depth: 2, parent: 'eng', course: '수능 영역', appliedGrades: 'KICE 출제 분류', source: KICE_CSAT.text },
    { id: 'eng.theme_title',       label: '주제·제목',       depth: 2, parent: 'eng', course: '수능 영역', appliedGrades: 'KICE 출제 분류', source: KICE_CSAT.text, mastery: 0.66 },
    { id: 'eng.chart',             label: '도표·실용문',     depth: 2, parent: 'eng', course: '수능 영역', appliedGrades: 'KICE 출제 분류', source: KICE_CSAT.text },
    { id: 'eng.match',             label: '일치·불일치',     depth: 2, parent: 'eng', course: '수능 영역', appliedGrades: 'KICE 출제 분류', source: KICE_CSAT.text },
    { id: 'eng.blank',             label: '빈칸 추론',       depth: 2, parent: 'eng', course: '수능 영역', appliedGrades: 'KICE 출제 분류', source: KICE_CSAT.text },
    { id: 'eng.blank.unit',        label: '빈칸 추론 — 사고 패턴', depth: 3, parent: 'eng.blank', mastery: 0.34 },
    { id: 'eng.order',             label: '글의 순서',       depth: 2, parent: 'eng', course: '수능 영역', appliedGrades: 'KICE 출제 분류', source: KICE_CSAT.text },
    { id: 'eng.insert',            label: '문장 삽입',       depth: 2, parent: 'eng', course: '수능 영역', appliedGrades: 'KICE 출제 분류', source: KICE_CSAT.text },
    { id: 'eng.irrelevant',        label: '무관한 문장',     depth: 2, parent: 'eng', course: '수능 영역', appliedGrades: 'KICE 출제 분류', source: KICE_CSAT.text },
    { id: 'eng.summary',           label: '요약문 완성',     depth: 2, parent: 'eng', course: '수능 영역', appliedGrades: 'KICE 출제 분류', source: KICE_CSAT.text },
    { id: 'eng.grammar',           label: '어법',           depth: 2, parent: 'eng', course: '수능 영역', appliedGrades: 'KICE 출제 분류', source: KICE_CSAT.text },
    { id: 'eng.grammar.tense',     label: '시제·태',         depth: 3, parent: 'eng.grammar', mastery: 0.81 },
    { id: 'eng.grammar.relative',  label: '관계사·접속사',   depth: 3, parent: 'eng.grammar', mastery: 0.59 },
    { id: 'eng.vocab',             label: '어휘',           depth: 2, parent: 'eng', course: '수능 영역', appliedGrades: 'KICE 출제 분류', source: KICE_CSAT.text },
    { id: 'eng.vocab.high',        label: '수능 빈출 어휘',  depth: 3, parent: 'eng.vocab', mastery: 0.62 },
    { id: 'eng.long_passage',      label: '장문 독해 (1지문 2문항)', depth: 2, parent: 'eng', course: '수능 영역', appliedGrades: 'KICE 출제 분류', source: KICE_CSAT.text },
  ],
};

/* ─────────────────────────────────────────────────────
 * 국어 — 2015 개정 별책 5 (국어과)
 * 국어(공통, 고1) → 일반선택 4과목(고2-3) → 진로선택 3과목
 * ───────────────────────────────────────────────────── */
export const koreanCurriculum: CurriculumTree = {
  subject: 'korean',
  defaultSource: NATIONAL_2015('5 (국어과)'),
  nodes: [
    { id: 'kor', label: '국어', depth: 1 },

    // ── 일반선택 4과목
    { id: 'kor.speech_writing', label: '화법과 작문', depth: 2, parent: 'kor', course: '일반선택', appliedGrades: '고2-3 일반선택' },
    { id: 'kor.speech_writing.speech',  label: '화법', depth: 3, parent: 'kor.speech_writing' },
    { id: 'kor.speech_writing.writing', label: '작문', depth: 3, parent: 'kor.speech_writing' },

    { id: 'kor.read', label: '독서', depth: 2, parent: 'kor', course: '일반선택', appliedGrades: '고2-3 일반선택' },
    { id: 'kor.read.humanities', label: '독서 — 인문',     depth: 3, parent: 'kor.read' },
    { id: 'kor.read.social',     label: '독서 — 사회',     depth: 3, parent: 'kor.read' },
    { id: 'kor.read.science',    label: '독서 — 과학·기술', depth: 3, parent: 'kor.read' },
    { id: 'kor.read.art',        label: '독서 — 예술',     depth: 3, parent: 'kor.read' },

    { id: 'kor.lang_media', label: '언어와 매체', depth: 2, parent: 'kor', course: '일반선택', appliedGrades: '고2-3 일반선택' },
    { id: 'kor.lang_media.phonology',  label: '음운',     depth: 3, parent: 'kor.lang_media' },
    { id: 'kor.lang_media.morphology', label: '형태소·단어', depth: 3, parent: 'kor.lang_media' },
    { id: 'kor.lang_media.syntax',     label: '문장',     depth: 3, parent: 'kor.lang_media' },
    { id: 'kor.lang_media.semantics',  label: '의미',     depth: 3, parent: 'kor.lang_media' },
    { id: 'kor.lang_media.media',      label: '매체',     depth: 3, parent: 'kor.lang_media' },

    { id: 'kor.lit', label: '문학', depth: 2, parent: 'kor', course: '일반선택', appliedGrades: '고2-3 일반선택' },
    { id: 'kor.lit.modern_poem',      label: '현대시',          depth: 3, parent: 'kor.lit' },
    { id: 'kor.lit.modern_novel',     label: '현대소설',        depth: 3, parent: 'kor.lit' },
    { id: 'kor.lit.classical_poetry', label: '고전시가',        depth: 3, parent: 'kor.lit' },
    { id: 'kor.lit.classical_prose',  label: '고전소설·수필',   depth: 3, parent: 'kor.lit' },
    { id: 'kor.lit.essay_drama',      label: '수필·극문학',     depth: 3, parent: 'kor.lit' },

    // ── 진로선택 3과목
    { id: 'kor.practical',     label: '실용 국어', depth: 2, parent: 'kor', course: '진로선택', appliedGrades: '고2-3 진로선택' },
    { id: 'kor.advanced',      label: '심화 국어', depth: 2, parent: 'kor', course: '진로선택', appliedGrades: '고2-3 진로선택' },
    { id: 'kor.classics_read', label: '고전 읽기', depth: 2, parent: 'kor', course: '진로선택', appliedGrades: '고2-3 진로선택' },
  ],
};

/* ─────────────────────────────────────────────────────
 * 과학 — 2015 개정 별책 9 (과학과)
 * 통합과학(고1 공통) → 일반선택 4과목(Ⅰ) → 진로선택 (Ⅱ + 과학사·생활과학·융합과학)
 * ───────────────────────────────────────────────────── */
export const scienceCurriculum: CurriculumTree = {
  subject: 'science',
  defaultSource: NATIONAL_2015('9 (과학과)'),
  nodes: [
    { id: 'sci', label: '과학탐구', depth: 1 },

    // ── 통합과학 (1학년 공통, 4영역)
    { id: 'sci.integrated.matter',  label: '물질과 규칙성',      depth: 2, parent: 'sci', course: '통합과학', appliedGrades: '고1 공통' },
    { id: 'sci.integrated.system',  label: '시스템과 상호작용',  depth: 2, parent: 'sci', course: '통합과학', appliedGrades: '고1 공통' },
    { id: 'sci.integrated.change',  label: '변화와 다양성',      depth: 2, parent: 'sci', course: '통합과학', appliedGrades: '고1 공통' },
    { id: 'sci.integrated.environ', label: '환경과 에너지',      depth: 2, parent: 'sci', course: '통합과학', appliedGrades: '고1 공통' },

    // ── 물리학Ⅰ (3영역)
    { id: 'sci.phy.mechanics',  label: '역학과 에너지',          depth: 2, parent: 'sci', course: '물리학Ⅰ', appliedGrades: '고2-3 일반선택' },
    { id: 'sci.phy.mechanics.motion', label: '운동의 표현',         depth: 3, parent: 'sci.phy.mechanics', mastery: 0.74 },
    { id: 'sci.phy.mechanics.newton', label: '뉴턴 운동 법칙',      depth: 3, parent: 'sci.phy.mechanics', mastery: 0.58 },
    { id: 'sci.phy.mechanics.work',   label: '일과 에너지',         depth: 3, parent: 'sci.phy.mechanics', mastery: 0.43 },
    { id: 'sci.phy.em',         label: '물질과 전자기장',        depth: 2, parent: 'sci', course: '물리학Ⅰ', appliedGrades: '고2-3 일반선택' },
    { id: 'sci.phy.wave',       label: '파동과 정보 통신',       depth: 2, parent: 'sci', course: '물리학Ⅰ', appliedGrades: '고2-3 일반선택' },
    { id: 'sci.phy.wave.basic', label: '파동의 기본 성질',        depth: 3, parent: 'sci.phy.wave', mastery: 0.51 },

    // ── 화학Ⅰ (4영역)
    { id: 'sci.chem.intro', label: '화학의 첫걸음',         depth: 2, parent: 'sci', course: '화학Ⅰ', appliedGrades: '고2-3 일반선택' },
    { id: 'sci.chem.atom',  label: '원자의 세계',           depth: 2, parent: 'sci', course: '화학Ⅰ', appliedGrades: '고2-3 일반선택' },
    { id: 'sci.chem.bond',  label: '화학 결합과 분자의 세계', depth: 2, parent: 'sci', course: '화학Ⅰ', appliedGrades: '고2-3 일반선택' },
    { id: 'sci.chem.react', label: '역동적인 화학 반응',     depth: 2, parent: 'sci', course: '화학Ⅰ', appliedGrades: '고2-3 일반선택' },

    // ── 생명과학Ⅰ (5영역)
    { id: 'sci.bio.intro',       label: '생명 과학의 이해',     depth: 2, parent: 'sci', course: '생명과학Ⅰ', appliedGrades: '고2-3 일반선택' },
    { id: 'sci.bio.metabolism',  label: '사람의 물질대사',      depth: 2, parent: 'sci', course: '생명과학Ⅰ', appliedGrades: '고2-3 일반선택' },
    { id: 'sci.bio.homeostasis', label: '항상성과 몸의 조절',   depth: 2, parent: 'sci', course: '생명과학Ⅰ', appliedGrades: '고2-3 일반선택' },
    { id: 'sci.bio.genetics',    label: '유전',                 depth: 2, parent: 'sci', course: '생명과학Ⅰ', appliedGrades: '고2-3 일반선택' },
    { id: 'sci.bio.ecosystem',   label: '생태계와 상호 작용',   depth: 2, parent: 'sci', course: '생명과학Ⅰ', appliedGrades: '고2-3 일반선택' },

    // ── 지구과학Ⅰ (5영역)
    { id: 'sci.earth.geo',      label: '지권의 변동',           depth: 2, parent: 'sci', course: '지구과학Ⅰ', appliedGrades: '고2-3 일반선택' },
    { id: 'sci.earth.history',  label: '지구의 역사',           depth: 2, parent: 'sci', course: '지구과학Ⅰ', appliedGrades: '고2-3 일반선택' },
    { id: 'sci.earth.atmo',     label: '대기와 해양의 변화',    depth: 2, parent: 'sci', course: '지구과학Ⅰ', appliedGrades: '고2-3 일반선택' },
    { id: 'sci.earth.star',     label: '별과 외계 행성계',      depth: 2, parent: 'sci', course: '지구과학Ⅰ', appliedGrades: '고2-3 일반선택' },
    { id: 'sci.earth.universe', label: '외부 은하와 우주 팽창', depth: 2, parent: 'sci', course: '지구과학Ⅰ', appliedGrades: '고2-3 일반선택' },

    // ── 진로선택 Ⅱ 시리즈 (3-4단원씩만 대표 노출)
    { id: 'sci.phy2.dynamics',   label: '역학적 상호작용',          depth: 2, parent: 'sci', course: '물리학Ⅱ', appliedGrades: '고2-3 진로선택' },
    { id: 'sci.phy2.em',          label: '전자기장 (Ⅱ)',           depth: 2, parent: 'sci', course: '물리학Ⅱ', appliedGrades: '고2-3 진로선택' },
    { id: 'sci.phy2.wave',        label: '파동과 물질의 성질',     depth: 2, parent: 'sci', course: '물리학Ⅱ', appliedGrades: '고2-3 진로선택' },
    { id: 'sci.chem2.equilibrium', label: '반응엔탈피와 화학평형', depth: 2, parent: 'sci', course: '화학Ⅱ',   appliedGrades: '고2-3 진로선택' },
    { id: 'sci.chem2.kinetics',    label: '반응속도와 촉매',       depth: 2, parent: 'sci', course: '화학Ⅱ',   appliedGrades: '고2-3 진로선택' },
    { id: 'sci.chem2.electro',     label: '전기화학과 이용',       depth: 2, parent: 'sci', course: '화학Ⅱ',   appliedGrades: '고2-3 진로선택' },
    { id: 'sci.bio2.cell',     label: '세포의 특성',                depth: 2, parent: 'sci', course: '생명과학Ⅱ', appliedGrades: '고2-3 진로선택' },
    { id: 'sci.bio2.gene',     label: '유전자의 발현과 조절',       depth: 2, parent: 'sci', course: '생명과학Ⅱ', appliedGrades: '고2-3 진로선택' },
    { id: 'sci.bio2.evolution', label: '생물의 진화와 다양성',      depth: 2, parent: 'sci', course: '생명과학Ⅱ', appliedGrades: '고2-3 진로선택' },
    { id: 'sci.earth2.ocean',  label: '해수의 운동과 순환',         depth: 2, parent: 'sci', course: '지구과학Ⅱ', appliedGrades: '고2-3 진로선택' },
    { id: 'sci.earth2.atmo',   label: '대기의 운동과 순환',         depth: 2, parent: 'sci', course: '지구과학Ⅱ', appliedGrades: '고2-3 진로선택' },
    { id: 'sci.earth2.planet', label: '행성의 운동',                depth: 2, parent: 'sci', course: '지구과학Ⅱ', appliedGrades: '고2-3 진로선택' },

    // ── 진로선택 — 융합·교양
    { id: 'sci.history',     label: '과학사',     depth: 2, parent: 'sci', course: '교양·융합', appliedGrades: '고2-3 진로선택' },
    { id: 'sci.life_science', label: '생활과 과학', depth: 2, parent: 'sci', course: '교양·융합', appliedGrades: '고2-3 진로선택' },
    { id: 'sci.fusion',      label: '융합과학',   depth: 2, parent: 'sci', course: '교양·융합', appliedGrades: '고2-3 진로선택' },
  ],
};

/* ─────────────────────────────────────────────────────
 * 사회 — 2015 개정 별책 7 (사회과)
 * 통합사회(고1) → 일반선택 9과목(고2-3) → 진로선택 3과목
 * ───────────────────────────────────────────────────── */
export const socialCurriculum: CurriculumTree = {
  subject: 'social',
  defaultSource: NATIONAL_2015('7 (사회과)'),
  nodes: [
    { id: 'soc', label: '사회', depth: 1 },

    // ── 통합사회 (1학년 공통, 9대단원)
    { id: 'soc.integrated.happy',    label: '인간, 사회, 환경과 행복',     depth: 2, parent: 'soc', course: '통합사회', appliedGrades: '고1 공통' },
    { id: 'soc.integrated.nature',   label: '자연환경과 인간 생활',        depth: 2, parent: 'soc', course: '통합사회', appliedGrades: '고1 공통' },
    { id: 'soc.integrated.space',    label: '생활공간과 사회',             depth: 2, parent: 'soc', course: '통합사회', appliedGrades: '고1 공통' },
    { id: 'soc.integrated.rights',   label: '인권 보장과 헌법',            depth: 2, parent: 'soc', course: '통합사회', appliedGrades: '고1 공통' },
    { id: 'soc.integrated.market',   label: '시장경제와 금융',             depth: 2, parent: 'soc', course: '통합사회', appliedGrades: '고1 공통' },
    { id: 'soc.integrated.justice',  label: '사회 정의와 불평등',          depth: 2, parent: 'soc', course: '통합사회', appliedGrades: '고1 공통' },
    { id: 'soc.integrated.culture',  label: '문화와 다양성',               depth: 2, parent: 'soc', course: '통합사회', appliedGrades: '고1 공통' },
    { id: 'soc.integrated.global',   label: '세계화와 평화',               depth: 2, parent: 'soc', course: '통합사회', appliedGrades: '고1 공통' },
    { id: 'soc.integrated.future',   label: '미래와 지속 가능한 삶',       depth: 2, parent: 'soc', course: '통합사회', appliedGrades: '고1 공통' },

    // ── 일반선택 9과목
    { id: 'soc.kor_geo',     label: '한국지리',     depth: 2, parent: 'soc', course: '일반선택', appliedGrades: '고2-3 일반선택' },
    { id: 'soc.world_geo',   label: '세계지리',     depth: 2, parent: 'soc', course: '일반선택', appliedGrades: '고2-3 일반선택' },
    { id: 'soc.eastasia',    label: '동아시아사',   depth: 2, parent: 'soc', course: '일반선택', appliedGrades: '고2-3 일반선택' },
    { id: 'soc.world_hist',  label: '세계사',       depth: 2, parent: 'soc', course: '일반선택', appliedGrades: '고2-3 일반선택' },
    { id: 'soc.economy',     label: '경제',         depth: 2, parent: 'soc', course: '일반선택', appliedGrades: '고2-3 일반선택' },
    { id: 'soc.politics_law', label: '정치와 법',   depth: 2, parent: 'soc', course: '일반선택', appliedGrades: '고2-3 일반선택' },
    { id: 'soc.culture',     label: '사회·문화',    depth: 2, parent: 'soc', course: '일반선택', appliedGrades: '고2-3 일반선택' },
    { id: 'soc.life_ethics', label: '생활과 윤리',  depth: 2, parent: 'soc', course: '일반선택', appliedGrades: '고2-3 일반선택' },
    { id: 'soc.thought',     label: '윤리와 사상',  depth: 2, parent: 'soc', course: '일반선택', appliedGrades: '고2-3 일반선택' },

    // ── 진로선택 3과목
    { id: 'soc.travel_geo',  label: '여행지리',         depth: 2, parent: 'soc', course: '진로선택', appliedGrades: '고2-3 진로선택' },
    { id: 'soc.problems',    label: '사회문제 탐구',    depth: 2, parent: 'soc', course: '진로선택', appliedGrades: '고2-3 진로선택' },
    { id: 'soc.classics',    label: '고전과 윤리',      depth: 2, parent: 'soc', course: '진로선택', appliedGrades: '고2-3 진로선택' },
  ],
};

/* ─────────────────────────────────────────────────────
 * 한국사 — 2015 개정 별책 7 (사회과)
 * 한국사(1학년 공통, 4영역)
 * ───────────────────────────────────────────────────── */
export const historyCurriculum: CurriculumTree = {
  subject: 'history',
  defaultSource: NATIONAL_2015('7 (사회과·한국사)'),
  nodes: [
    { id: 'hist', label: '한국사', depth: 1 },
    { id: 'hist.premodern',     label: '전근대 한국사의 이해',                 depth: 2, parent: 'hist', course: '한국사', appliedGrades: '고1 공통' },
    { id: 'hist.modern_state',  label: '근대 국민 국가 수립 운동',             depth: 2, parent: 'hist', course: '한국사', appliedGrades: '고1 공통' },
    { id: 'hist.colonial',      label: '일제 식민지 지배와 민족 운동의 전개',  depth: 2, parent: 'hist', course: '한국사', appliedGrades: '고1 공통' },
    { id: 'hist.contemporary',  label: '대한민국의 발전',                      depth: 2, parent: 'hist', course: '한국사', appliedGrades: '고1 공통' },
  ],
};

export const allCurricula = {
  math:    mathCurriculum,
  english: englishCurriculum,
  korean:  koreanCurriculum,
  science: scienceCurriculum,
  social:  socialCurriculum,
  history: historyCurriculum,
};

/** 약점 노드 추출 (mastery < 0.5) — 분석/플래너 화면에서 사용 */
export function getWeakNodes(threshold = 0.5): CurriculumNode[] {
  return Object.values(allCurricula)
    .flatMap(c => c.nodes)
    .filter(n => n.depth === 3 && (n.mastery ?? 1) < threshold)
    .sort((a, b) => (a.mastery ?? 1) - (b.mastery ?? 1));
}
