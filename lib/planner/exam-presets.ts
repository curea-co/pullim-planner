/**
 * 시험일 프리셋 — 수능·모의고사는 전국이 같은 날 치른다. 앱이 갖고 있어야 할 값이지
 * 학생에게 물을 값이 아니라서, 시험 종류를 고르면 날짜까지 채워 준다.
 *
 * ⚠️ 여기 날짜는 관례(그 달의 N번째 무슨 요일)로 **계산한 근삿값**이다. 평가원·교육청이
 * 발표하는 확정 일정은 해마다 어긋날 수 있으므로 **학생이 언제나 날짜를 고칠 수 있어야 한다**
 * (STEP1 은 프리셋을 골라도 날짜 입력을 그대로 노출한다). 확정 일정표를 서버에서 받게 되면
 * 이 계산을 그 값으로 대체한다.
 */

/** 프리셋을 제공하는 시험 종류 — 중간·기말은 학교마다 달라 직접 입력한다. */
export type PresetExamType = 'mock' | 'suneung';

export type ExamPreset = {
  /** 회차 식별자 (규칙명) */
  key: string;
  /** 표기명 — 자동 시험명에도 그대로 쓴다 */
  name: string;
  /** YYYY-MM-DD */
  date: string;
};

type PresetRule = {
  name: string;
  /** 1~12 */
  month: number;
  /** 0=일 … 6=토 */
  weekday: number;
  /** 그 달의 N번째 해당 요일 */
  nth: number;
  /** 학년도 표기(수능) — 시행 연도 + 1 */
  academic?: boolean;
};

const PRESET_RULES: Record<PresetExamType, readonly PresetRule[]> = {
  mock: [
    { name: '3월 학력평가', month: 3, weekday: 4, nth: 4 },
    { name: '6월 모의평가', month: 6, weekday: 2, nth: 1 },
    { name: '9월 모의평가', month: 9, weekday: 2, nth: 1 },
    { name: '10월 학력평가', month: 10, weekday: 2, nth: 2 },
  ],
  suneung: [{ name: '수능', month: 11, weekday: 4, nth: 3, academic: true }],
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** 해당 연·월의 N번째 지정 요일 — UTC 기준이라 타임존 영향 없음 */
function nthWeekdayOf(year: number, month: number, weekday: number, nth: number): string {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const shift = (weekday - first.getUTCDay() + 7) % 7;
  const d = new Date(Date.UTC(year, month - 1, 1 + shift + (nth - 1) * 7));
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function ruleName(rule: PresetRule, year: number): string {
  return rule.academic ? `${year + 1}학년도 ${rule.name}` : `${year} ${rule.name}`;
}

/**
 * 기준일 이후(당일 포함)에 오는 회차 — 올해 회차가 이미 지났으면 내년 회차.
 *
 * 당일을 지난 것으로 치면 시험 당일에 플래너를 만들 때 오늘 시험이 아니라 다음 회차가
 * 잡힌다. 시험일 하한(`goalBlocker`)도 `< 오늘` 만 막으므로 여기서도 당일은 살린다.
 */
function nextOccurrence(rule: PresetRule, fromIso: string): string {
  const year = Number(fromIso.slice(0, 4));
  const cand = nthWeekdayOf(year, rule.month, rule.weekday, rule.nth);
  return cand >= fromIso ? cand : nthWeekdayOf(year + 1, rule.month, rule.weekday, rule.nth);
}

/** 두 ISO 날짜 사이 일수 — UTC 기준 */
export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000);
}

/**
 * 오늘 기준으로 제안할 회차 목록.
 *
 * - 수능은 언제나 한 회차.
 * - 모의고사는 **다음 한 회차**만. 단 그게 코앞(D-7 이내)이라 준비할 시간이 없고, 그 다음
 *   회차가 두 달 안쪽이면 둘 다 준다. 상한을 두는 건 10월 학평이 D-5 일 때 다음 회차가
 *   이듬해 3월(D-168)인데 그건 "다음 시험"이 아니라 다른 학년의 이야기이기 때문이다.
 * - 계산 결과가 오늘보다 과거면 제안하지 않는다 — 시험일 하한(오늘)에 막혀 고를 수 없는
 *   값을 채워 주면 학생이 막다른 길에 빠진다.
 */
export function examPresets(type: PresetExamType, todayIso: string): ExamPreset[] {
  const all = PRESET_RULES[type]
    .map(rule => {
      const date = nextOccurrence(rule, todayIso);
      return { key: rule.name, name: ruleName(rule, Number(date.slice(0, 4))), date };
    })
    .filter(p => p.date >= todayIso)
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  if (all.length <= 1) return all;
  if (type === 'suneung') return all.slice(0, 1);
  const showSecond = daysBetween(todayIso, all[0].date) <= 7 && daysBetween(todayIso, all[1].date) <= 60;
  return showSecond ? all.slice(0, 2) : all.slice(0, 1);
}

/**
 * 그 날짜가 어느 회차인지 되짚는다 — 자동 시험명에 쓴다. 프리셋 목록에서 사라진 뒤
 * (예: 회차가 지나 다음 회차만 남은 뒤)에도 이름이 유지되도록 날짜만으로 판정한다.
 * 학생이 날짜를 직접 고쳐 어느 회차와도 맞지 않으면 null.
 */
export function presetNameForDate(type: PresetExamType, iso: string): string | null {
  if (!iso) return null;
  const year = Number(iso.slice(0, 4));
  if (!Number.isFinite(year)) return null;
  for (const rule of PRESET_RULES[type]) {
    if (nthWeekdayOf(year, rule.month, rule.weekday, rule.nth) === iso) return ruleName(rule, year);
  }
  return null;
}
