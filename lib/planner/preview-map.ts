import type { PullimPreviewBlock } from '@/lib/api-client';
import { routineSubjectLabel, subjectLabels, type BlockType, type RoutineSubject } from '@/lib/mock';

/**
 * step8 미리보기 도메인 타입 — FE 휴리스틱(`generatePreview`)과 서버 dry-run
 * (`POST /planner/planners/preview`, pullim-api #476) 매핑이 같은 shape 을 공유한다.
 */
export type PreviewItem = {
  start: string; end: string;
  subjectLabel: string;
  type: BlockType;
  unitLabel: string;
  /** 5단계에서 고른 루틴으로 들어간 블록 */
  isRoutine?: boolean;
  /** 배치 보류 사유 — 숨기지 않고 표기한다(선택 루틴 누락 인지 가능, Codex). */
  held?: '가용 시간 밖' | '루틴 겹침';
};

export type PreviewDay = {
  offset: number;          // today + offset (0=오늘, 1=내일)
  monthDay: string;        // "4/29"
  weekdayLabel: string;    // "수"
  isWeekend: boolean;
  isExamDay: boolean;
  items: PreviewItem[];
};

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;
const DAY_MS = 86_400_000;

/**
 * 서버 dry-run 블록 → 미리보기 일자 카드. 서버 범위(오늘~+6일)를 그대로 일자별로 묶고,
 * 시험 종료일 이후는 카드를 만들지 않는다(휴리스틱과 동일 규칙). 블록이 없는 날도 카드는
 * 유지한다(가용 시간 부족 안내·시험일 칩 노출).
 */
export function mapServerPreview(
  blocks: PullimPreviewBlock[],
  todayIso: string,
  examStartDate: string | null,
  examEndDate: string | null,
): PreviewDay[] {
  const byDate = new Map<string, PullimPreviewBlock[]>();
  for (const b of blocks) {
    const list = byDate.get(b.date) ?? [];
    list.push(b);
    byDate.set(b.date, list);
  }

  const todayMs = Date.parse(`${todayIso}T00:00:00Z`);
  // 빈 문자열도 미지정으로 정규화 — 단일일 시험(end 미지정)이 시험일 플래그를 잃지 않게.
  const examStart = examStartDate || null;
  const examEnd = examEndDate || examStart;
  const days: PreviewDay[] = [];
  for (let offset = 0; offset <= 6; offset++) {
    const d = new Date(todayMs + offset * DAY_MS);
    const iso = d.toISOString().slice(0, 10);
    if (examEnd && iso > examEnd) break;
    const wd = d.getUTCDay();
    const isExamDay =
      !!examStart && !!examEnd && examStart <= iso && iso <= examEnd;
    days.push({
      offset,
      monthDay: `${d.getUTCMonth() + 1}/${d.getUTCDate()}`,
      weekdayLabel: WEEKDAY_LABELS[wd],
      isWeekend: wd === 0 || wd === 6,
      isExamDay,
      items: (byDate.get(iso) ?? [])
        .map(toPreviewItem)
        .sort((a, b) => a.start.localeCompare(b.start)),
    });
  }
  return days;
}

/** 서버 블록 1건 → 미리보기 아이템. DB time(HH:MM:SS)도 HH:MM 로 정규화. */
function toPreviewItem(b: PullimPreviewBlock): PreviewItem {
  const isRoutine = b.source === 'routine';
  return {
    start: b.startTime.slice(0, 5),
    end: b.endTime.slice(0, 5),
    subjectLabel: isRoutine
      ? routineSubjectLabel(b.subject as RoutineSubject)
      : ((subjectLabels as Record<string, string>)[b.subject] ?? b.subject),
    type: b.type as BlockType,
    unitLabel: isRoutine ? b.title : unitFromTitle(b.title),
    isRoutine,
  };
}

/** 생성 블록 title("영어 · 독해 — 문제 풀이") → 단원("독해"). 단원 없는 형식(모의 등)은 ''. */
function unitFromTitle(title: string): string {
  const head = title.split(' — ')[0] ?? title;
  const sep = head.indexOf(' · ');
  return sep >= 0 ? head.slice(sep + 3) : '';
}
