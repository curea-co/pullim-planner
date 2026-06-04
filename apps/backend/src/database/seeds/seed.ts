/**
 * planner 도메인 seed (Phase γ).
 *
 * fresh DB(신규/CI/로컬 클린)에 데모 데이터를 채운다 — 데모 사용자 `student_001`(서연)과
 * 그의 플래너 3개·오늘 학습 블록 8개·컨디션·번아웃, 그리고 정적 참조 데이터 pedagogy_engines 7종.
 * 데이터 원천은 FE mock 픽스처(`apps/planner/lib/mock/{persona,planner}.ts`)다.
 *
 * 멱등: 모든 INSERT 가 `ON CONFLICT DO NOTHING` — 운영 DB(이미 데이터 보유)나 재실행에서
 * 기존 행을 건드리지 않는다. `bun --filter @pullim-planner/backend seed` 로 실행.
 *
 * 범위 메모: 전체 curriculum 트리(부모 연결 포함)는 Phase ζ 소관. 여기선 mock todayBlocks 가
 * 참조하는 노드만 평면(parent_id NULL)으로 심어 블록↔노드 연결을 보존한다 — Phase δ
 * `/api/planners/:id/blocks` 응답이 기존 mock shape(curriculumNodeId 포함)와 일치하도록.
 */
import { todayKstIsoDate } from "../../common/utils/datetime.util";
import AppDataSource from "../data-source";

// 데모 "오늘" — 오늘의 블록/컨디션/번아웃 기준일. 고정일이면 날짜가 지나는 순간 기본
// `GET /api/planners/:id/blocks`(date 미지정=KST 오늘)가 빈 배열이 되므로 시드 시점의 KST
// 오늘로 잡는다(fresh DB 데모가 당일 동작). 시험 일정(examStartDate 등)은 별도 고정값.
const SEED_DATE = todayKstIsoDate();

const PEDAGOGY_ENGINES: ReadonlyArray<[string, string, string, string]> = [
  [
    "spaced_repetition",
    "간격 복습",
    "망각 곡선 기반으로 복습 간격을 늘려가며 장기 기억을 형성",
    "어제 오답 단어를 오늘·3일 후·7일 후에 다시 노출",
  ],
  [
    "interleaving",
    "교차 학습",
    "비슷한 유형을 연달아 풀지 않고 다른 과목·유형과 섞어 학습",
    "수학·영어·국어를 40분 간격으로 교차 배치",
  ],
  [
    "cognitive_load",
    "인지 부하 관리",
    "작업 기억의 한계를 고려해 어려운 학습 사이에 회복 시간 배치",
    "개념 40분 학습 → 10분 휴식 → 문제 풀이",
  ],
  [
    "pomodoro",
    "포모도로",
    "25분 집중 + 5분 회복으로 집중력을 유지",
    "50분 블록을 25+5+20 분으로 분할",
  ],
  [
    "active_recall",
    "능동 인출",
    '단순 읽기보다 "말로 설명·문제 풀이"가 학습 효과가 큼 (시험 효과)',
    "개념 학습 후 즉시 빈칸 문제로 인출 연습",
  ],
  [
    "deliberate_practice",
    "약점 집중",
    "실력 점수가 낮은 유형에 학습 시간을 가중 배분",
    "오답률 60%인 빈칸 추론에 주 3회 보강 블록",
  ],
  [
    "zeigarnik",
    "미완성 효과",
    "의도적으로 끝내지 않고 중단하면 다음 학습 동기가 강화됨",
    "문제 1개 남기고 종료 → 다음 블록에서 자연스럽게 시작",
  ],
];

interface PlannerSeed {
  id: string;
  name: string;
  examType: string;
  examLabel: string;
  examStartDate: string;
  examEndDate: string;
  targetKind: string;
  targetValue: string;
  weekdayStart: number;
  weekdayEnd: number;
  weekendStart: number;
  weekendEnd: number;
  blockPattern: string;
  weaknessAutoReflect: boolean;
  motivationStyle: string;
  motto: string;
  active: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  customization: Record<string, string>;
  subjectUnits: Record<string, string[]>;
}

const USER_ID = "student_001";

const PLANNERS: PlannerSeed[] = [
  {
    id: "pl_001",
    name: "6월 모의평가",
    examType: "mock",
    examLabel: "6월 모의평가",
    examStartDate: "2026-06-04",
    examEndDate: "2026-06-04",
    targetKind: "grade",
    targetValue: "1",
    weekdayStart: 18,
    weekdayEnd: 23,
    weekendStart: 10,
    weekendEnd: 22,
    blockPattern: "focused",
    weaknessAutoReflect: true,
    motivationStyle: "guided",
    motto: "영어 빈칸 추론 1등급 사수",
    active: true,
    archived: false,
    createdAt: "2026-04-15T09:00:00",
    updatedAt: "2026-04-23T20:00:00",
    customization: {
      layoutId: "vertical_timeline",
      weekLayoutId: "matrix_by_type",
      paletteId: "pullim_blue",
    },
    subjectUnits: {
      math: ["미적분", "확률과 통계"],
      english: ["독해", "수능특강 영어 3강"],
      science: ["역학과 에너지"],
    },
  },
  {
    id: "pl_002",
    name: "1학기 기말고사",
    examType: "final",
    examLabel: "1학기 기말고사",
    examStartDate: "2026-06-27",
    examEndDate: "2026-07-01",
    targetKind: "score",
    targetValue: "90",
    weekdayStart: 19,
    weekdayEnd: 22,
    weekendStart: 14,
    weekendEnd: 20,
    blockPattern: "pomodoro",
    weaknessAutoReflect: true,
    motivationStyle: "guided",
    motto: "내신 1등급",
    active: false,
    archived: false,
    createdAt: "2026-04-20T10:00:00",
    updatedAt: "2026-04-20T10:00:00",
    customization: {
      layoutId: "block_cards",
      weekLayoutId: "school_grid",
      paletteId: "forest",
    },
    subjectUnits: {
      math: ["미적분 II"],
      english: ["독해"],
      korean: ["문학"],
      science: ["전자기학"],
    },
  },
  {
    id: "pl_003",
    name: "4월 학력평가",
    examType: "mock",
    examLabel: "4월 학평",
    examStartDate: "2026-04-15",
    examEndDate: "2026-04-15",
    targetKind: "grade",
    targetValue: "2",
    weekdayStart: 18,
    weekdayEnd: 22,
    weekendStart: 10,
    weekendEnd: 20,
    blockPattern: "focused",
    weaknessAutoReflect: true,
    motivationStyle: "autonomous",
    motto: "",
    active: false,
    archived: true,
    createdAt: "2026-03-25T09:00:00",
    updatedAt: "2026-04-15T22:00:00",
    customization: {
      layoutId: "pie_list",
      weekLayoutId: "heatmap",
      paletteId: "sunset",
    },
    subjectUnits: {
      math: ["미적분 I"],
      english: ["독해"],
      science: ["역학"],
    },
  },
];

interface BlockSeed {
  id: string;
  start: string;
  end: string;
  subject: string;
  type: string;
  title: string;
  linkedFeatureSlug: string | null;
  engines: string[];
  status: string;
  progress: number;
  expectedMinutes: number;
  reasoning: string | null;
}

// pl_001 의 오늘(SEED_DATE) 블록 8개. curriculum_node_id 는 Phase ζ 까지 NULL.
const BLOCKS: BlockSeed[] = [
  {
    id: "b0",
    start: "13:30",
    end: "13:55",
    subject: "english",
    type: "memorize",
    title: "점심 직후 단어 복습 (어제 못한 25분)",
    linkedFeatureSlug: "memory",
    engines: ["spaced_repetition"],
    status: "skipped",
    progress: 0,
    expectedMinutes: 25,
    reasoning: "어제 못한 25분, 오늘로 이월했어요",
  },
  {
    id: "b1",
    start: "17:30",
    end: "18:10",
    subject: "math",
    type: "concept",
    title: "미분 기본 공식 시각화",
    linkedFeatureSlug: "visual",
    engines: ["cognitive_load", "active_recall"],
    status: "done",
    progress: 1,
    expectedMinutes: 40,
    reasoning: null,
  },
  {
    id: "b2",
    start: "18:10",
    end: "18:25",
    subject: "rest",
    type: "break",
    title: "저녁 식사",
    linkedFeatureSlug: null,
    engines: [],
    status: "done",
    progress: 0,
    expectedMinutes: 15,
    reasoning: null,
  },
  {
    id: "b3",
    start: "18:25",
    end: "19:25",
    subject: "math",
    type: "practice",
    title: "미분 — 적응형 문제 풀이",
    linkedFeatureSlug: "infinity",
    engines: ["pomodoro", "deliberate_practice"],
    status: "doing",
    progress: 0.6,
    expectedMinutes: 60,
    reasoning: "D-day 빈출 가중",
  },
  {
    id: "b4",
    start: "19:30",
    end: "20:00",
    subject: "english",
    type: "review",
    title: "빈칸 추론 정복 세트",
    linkedFeatureSlug: "conqueror",
    engines: ["interleaving", "deliberate_practice"],
    status: "todo",
    progress: 0,
    expectedMinutes: 30,
    reasoning: "어제 오답 보강",
  },
  {
    id: "b5",
    start: "20:05",
    end: "20:35",
    subject: "english",
    type: "memorize",
    title: "수능 빈출 어휘 50개 복습",
    linkedFeatureSlug: "memory",
    engines: ["spaced_repetition", "active_recall"],
    status: "todo",
    progress: 0,
    expectedMinutes: 30,
    reasoning: null,
  },
  {
    id: "b6",
    start: "20:35",
    end: "21:15",
    subject: "science",
    type: "practice",
    title: "뉴턴 운동 법칙 — 실전 문제",
    linkedFeatureSlug: "infinity",
    engines: ["interleaving", "pomodoro"],
    status: "todo",
    progress: 0,
    expectedMinutes: 40,
    reasoning: null,
  },
  {
    id: "b7",
    start: "21:20",
    end: "22:00",
    subject: "math",
    type: "mock",
    title: "미적분 미니 모의고사",
    linkedFeatureSlug: "exam",
    engines: ["zeigarnik", "active_recall"],
    status: "todo",
    progress: 0,
    expectedMinutes: 40,
    reasoning: null,
  },
];

// done + 정확도/감정 기록이 있는 블록만 완료 기록 생성 (mock 상 b1).
const COMPLETIONS: ReadonlyArray<{
  blockId: string;
  completedAt: string;
  accuracy: number | null;
  emotion: number | null;
}> = [
  {
    blockId: "b1",
    completedAt: `${SEED_DATE}T18:10:00+09:00`,
    accuracy: 88,
    emotion: 4,
  },
];

const BURNOUT_FACTORS = [
  {
    label: "평균 수면 시간",
    value: 5.8,
    unit: "h",
    weight: 0.3,
    status: "warn",
  },
  {
    label: "연속 블록 완료율",
    value: 78,
    unit: "%",
    weight: 0.25,
    status: "good",
  },
  { label: "감정 평균", value: 3.4, unit: "/5", weight: 0.2, status: "good" },
  { label: "휴식 수용률", value: 40, unit: "%", weight: 0.15, status: "warn" },
  { label: '"쉴래요" 사용', value: 1, unit: "회", weight: 0.1, status: "good" },
];

// time_blocks 가 참조하는 curriculum 노드 — mock todayBlocks 의 curriculumNodeId 보존용.
// 전체 커리큘럼 트리는 Phase ζ 소관이라 여기선 참조 노드만 평면(parent_id NULL)으로 심는다
// (블록 ↔ 노드 연결은 보존, 트리 구조는 ζ 에서 부모 연결).
const CURRICULUM_NODES: ReadonlyArray<{
  id: string;
  subject: string;
  level: number;
  label: string;
}> = [
  { id: "math.calc", subject: "math", level: 2, label: "미적분" },
  {
    id: "math.calc_diff.application",
    subject: "math",
    level: 3,
    label: "도함수의 활용",
  },
  {
    id: "eng.vocab.high",
    subject: "english",
    level: 3,
    label: "수능 빈출 어휘",
  },
  { id: "eng.blank.unit", subject: "english", level: 3, label: "빈칸 추론" },
  {
    id: "sci.phy.mechanics.newton",
    subject: "science",
    level: 3,
    label: "뉴턴 운동 법칙",
  },
];

// 블록 id → curriculum 노드 id (mock todayBlocks 연결). 없는 블록(휴식)은 NULL.
const BLOCK_CURRICULUM: Record<string, string> = {
  b0: "eng.vocab.high",
  b1: "math.calc_diff.application",
  b3: "math.calc_diff.application",
  b4: "eng.blank.unit",
  b5: "eng.vocab.high",
  b6: "sci.phy.mechanics.newton",
  b7: "math.calc",
};

async function seed(): Promise<void> {
  const ds = await AppDataSource.initialize();
  // 타입 래퍼 — DataSource.query 는 Promise<any> 라 strict-eslint 가 unsafe 로 잡는다.
  const q = (sql: string, params: unknown[] = []): Promise<unknown[]> =>
    ds.query(sql, params);
  try {
    // 1) pedagogy_engines (정적 참조)
    for (const [id, label, principle, example] of PEDAGOGY_ENGINES) {
      await q(
        `INSERT INTO "pedagogy_engines" ("id","label","principle","example")
         VALUES ($1,$2,$3,$4) ON CONFLICT ("id") DO NOTHING`,
        [id, label, principle, example],
      );
    }

    // 1.5) curriculum_nodes — 블록이 참조하는 노드(평면, parent_id NULL). 트리는 Phase ζ.
    for (const node of CURRICULUM_NODES) {
      await q(
        `INSERT INTO "curriculum_nodes" ("id","parent_id","subject","level","label","position")
         VALUES ($1, NULL, $2, $3, $4, 0) ON CONFLICT ("id") DO NOTHING`,
        [node.id, node.subject, node.level, node.label],
      );
    }

    // 2) 데모 사용자 (도메인 users) — persona 서연
    await q(
      `INSERT INTO "users"
         ("id","name","grade","track","school","focus_subjects","weekly_hours","preferred_study_time","joined_at","streak_days")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT ("id") DO NOTHING`,
      [
        USER_ID,
        "서연",
        "고2",
        "이과",
        "풀림고등학교",
        ["math", "english", "science"],
        28,
        "저녁",
        "2026-01-12T00:00:00",
        17,
      ],
    );

    // 3) planners + 4) planner_subject_units
    for (const p of PLANNERS) {
      // INSERT...SELECT...WHERE NOT EXISTS — id 충돌뿐 아니라 partial unique index
      // `planners_user_active_uniq`(user 당 active·non-archived 1행)도 회피한다.
      // 이미 같은 id 가 있거나(재실행), active 플래너를 넣으려는데 user 에 이미 active 가
      // 있으면(다른 active 존재) 삽입을 건너뛴다 — ON CONFLICT("id") 만으로는 index 충돌을
      // 못 잡아 실패하던 문제 수정(codex #45).
      await q(
        `INSERT INTO "planners"
           ("id","user_id","name","exam_type","exam_label","exam_start_date","exam_end_date",
            "target_kind","target_value","weekday_start","weekday_end","weekend_start","weekend_end",
            "block_pattern","weakness_auto_reflect","motivation_style","motto","active","archived",
            "customization","created_at","updated_at")
         SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22
         WHERE NOT EXISTS (SELECT 1 FROM "planners" WHERE "id" = $1)
           AND (
             $18::boolean = false
             OR NOT EXISTS (
               SELECT 1 FROM "planners"
               WHERE "user_id" = $2 AND "active" = true AND "archived" = false
             )
           )`,
        [
          p.id,
          USER_ID,
          p.name,
          p.examType,
          p.examLabel,
          p.examStartDate,
          p.examEndDate,
          p.targetKind,
          p.targetValue,
          p.weekdayStart,
          p.weekdayEnd,
          p.weekendStart,
          p.weekendEnd,
          p.blockPattern,
          p.weaknessAutoReflect,
          p.motivationStyle,
          p.motto,
          p.active,
          p.archived,
          JSON.stringify(p.customization),
          p.createdAt,
          p.updatedAt,
        ],
      );
      const subjects = Object.keys(p.subjectUnits);
      for (const subject of subjects) {
        const units = p.subjectUnits[subject];
        for (let position = 0; position < units.length; position++) {
          // 부모 planner 가 실제로 삽입됐을 때만(WHERE EXISTS) 자식을 넣는다 — 위 planner
          // insert 가 partial-unique 가드로 스킵된 경우 FK 위반을 막는다.
          await q(
            `INSERT INTO "planner_subject_units" ("planner_id","subject","unit_label","position")
             SELECT $1,$2,$3,$4
             WHERE EXISTS (SELECT 1 FROM "planners" WHERE "id" = $1)
             ON CONFLICT ("planner_id","subject","position") DO NOTHING`,
            [p.id, subject, units[position], position],
          );
        }
      }
    }

    // 5) time_blocks (활성 플래너 pl_001 의 오늘 블록)
    for (const b of BLOCKS) {
      await q(
        `INSERT INTO "time_blocks"
           ("id","planner_id","date","start_time","end_time","subject","type","title",
            "linked_feature_slug","curriculum_node_id","engines","status","progress",
            "expected_minutes","reasoning")
         SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
         WHERE EXISTS (SELECT 1 FROM "planners" WHERE "id" = $2)
         ON CONFLICT ("id") DO NOTHING`,
        [
          b.id,
          "pl_001",
          SEED_DATE,
          b.start,
          b.end,
          b.subject,
          b.type,
          b.title,
          b.linkedFeatureSlug,
          BLOCK_CURRICULUM[b.id] ?? null, // 블록↔노드 연결(mock 보존). 트리 전체는 Phase ζ.
          b.engines,
          b.status,
          b.progress,
          b.expectedMinutes,
          b.reasoning,
        ],
      );
    }

    // 6) block_completions
    for (const c of COMPLETIONS) {
      await q(
        `INSERT INTO "block_completions" ("block_id","completed_at","accuracy","emotion","notes")
         SELECT $1,$2,$3,$4,$5
         WHERE EXISTS (SELECT 1 FROM "time_blocks" WHERE "id" = $1)
         ON CONFLICT ("block_id") DO NOTHING`,
        [c.blockId, c.completedAt, c.accuracy, c.emotion, null],
      );
    }

    // 7) daily_conditions (오늘 컨디션 = 3)
    await q(
      `INSERT INTO "daily_conditions" ("user_id","date","level")
       VALUES ($1,$2,$3) ON CONFLICT ("user_id","date") DO NOTHING`,
      [USER_ID, SEED_DATE, 3],
    );

    // 8) burnout_snapshots (오늘 번아웃)
    await q(
      `INSERT INTO "burnout_snapshots" ("user_id","date","score","trend","recommend_break","factors")
       VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT ("user_id","date") DO NOTHING`,
      [
        USER_ID,
        SEED_DATE,
        64,
        "falling",
        false,
        JSON.stringify(BURNOUT_FACTORS),
      ],
    );

    // 결과 요약
    const countOf = async (table: string): Promise<number> => {
      const rows = (await q(
        `SELECT count(*)::int AS count FROM "${table}"`,
      )) as Array<{ count: number }>;
      return rows[0].count;
    };
    console.log(
      `[seed] done — users=${await countOf("users")}, ` +
        `planners=${await countOf("planners")}, ` +
        `time_blocks=${await countOf("time_blocks")}, pedagogy_engines=7`,
    );
  } finally {
    await ds.destroy();
  }
}

seed().catch((error: unknown) => {
  console.error("[seed] failed:", error);
  process.exitCode = 1;
});
