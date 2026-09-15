'use client';

// 헤더 메뉴 검색 — 풀림 Q(`apps/components/shell/command-search.tsx`) 이식.
// 범위: 사이드바 메뉴(navSearchItems) 검색·이동만. (전역 콘텐츠 검색은 후속.)
// Q 는 풀이 이탈 가드를 거쳐 이동하지만(confirmNavigate) 플래너엔 그 가드가 없어 router.push 로 간다.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search as SearchIcon, CornerDownLeft } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Kbd } from '@/components/ui/kbd';
import { navSearchItems } from './nav-config';
import { cn } from '@/lib/utils';

/** 부분 일치 퍼지 점수 — 연속 매칭에 가중. 매칭 실패 시 -1. (풀림 Q / os 팔레트 차용) */
function fuzzyScore(query: string, target: string): number {
  if (!query) return 0;
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let qi = 0;
  let score = 0;
  let lastMatch = -1;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += lastMatch === ti - 1 ? 3 : 1;
      lastMatch = ti;
      qi++;
    }
  }
  return qi === q.length ? score : -1;
}

/**
 * 섹션 라벨 노출 여부 — Q 는 섹션이 여럿(풀림 Q·무한풀기·복습)이라 결과마다 소속을 적어 준다.
 * 플래너는 현재 섹션이 '풀림 플래너' 하나뿐이라 모든 행에 같은 글자가 반복될 뿐이다.
 * 섹션이 둘 이상으로 늘어나면 자동으로 다시 켜진다.
 */
const SHOW_SECTION = new Set(navSearchItems.map((i) => i.section)).size > 1;

export function CommandSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const results = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return navSearchItems;
    return navSearchItems
      .map((item) => ({
        item,
        score: fuzzyScore(trimmed, `${item.label} ${item.section} ${item.description ?? ''} ${item.href}`),
      }))
      .filter((r) => r.score >= 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.item);
  }, [query]);

  // active 를 결과 범위 안으로 — state 가 아닌 파생값으로 클램프(렌더 중 보정, effect setState 회피).
  const activeIndex = results.length ? Math.min(active, results.length - 1) : -1;

  // active 항목을 보이도록 스크롤.
  useEffect(() => {
    if (activeIndex < 0) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setQuery('');
      setActive(0);
    }
    onOpenChange(next);
  };

  const go = (item: (typeof navSearchItems)[number] | undefined) => {
    if (!item) return;
    handleOpenChange(false);
    router.push(item.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    // 한글 IME 조합 중 키(Enter=글자 확정, 방향키=후보 이동)는 팔레트가 가로채지 않는다.
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (results.length ? (Math.min(a, results.length - 1) + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (results.length ? (Math.min(a, results.length - 1) - 1 + results.length) % results.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(results[activeIndex]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        // 열자마자 타이핑할 수 있어야 한다. base-ui 기본값(첫 tabbable)으로도 지금은 입력이 잡히지만,
        // 그건 **입력이 우연히 첫 tabbable 이라서**다 — 닫기 버튼이나 필터 칩을 앞에 하나 두는 순간
        // 초기 포커스가 조용히 옮겨간다. 대상을 못박아 둔다(회귀는 command-search.test.tsx 가 잡는다).
        initialFocus={inputRef}
        // 모바일: 상단 가까이 + 거의 풀폭(키보드 위로 보이도록). 데스크톱(sm+): 컴팩트 팔레트.
        className="top-[6vh] translate-y-0 sm:top-[12vh] sm:max-w-[560px]"
        onKeyDown={onKeyDown}
      >
        <DialogTitle className="sr-only">메뉴 검색</DialogTitle>
        <DialogDescription className="sr-only">사이드바 메뉴를 검색해 이동합니다.</DialogDescription>

        {/* 입력 */}
        <div className="border-border flex shrink-0 items-center gap-2 border-b px-4">
          <SearchIcon className="text-[var(--text-tertiary)] h-4 w-4 shrink-0" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="메뉴 검색…"
            aria-label="메뉴 검색"
            // 모바일은 16px(text-base) — iOS Safari 는 16px 미만 입력에 포커스하면 화면을 자동 확대한다.
            className="text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] h-12 w-full bg-transparent text-base outline-none sm:text-sm"
          />
        </div>

        {/* 결과 */}
        <div ref={listRef} className="max-h-[70vh] min-h-0 flex-1 overflow-y-auto p-1.5 sm:max-h-[360px]">
          {results.length === 0 ? (
            <p className="text-[var(--text-tertiary)] px-3 py-8 text-center text-sm">
              일치하는 메뉴가 없어요.
            </p>
          ) : (
            results.map((item, i) => {
              const Icon = item.icon;
              const isActive = i === activeIndex;
              return (
                <button
                  key={item.href}
                  type="button"
                  data-index={i}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(item)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-[11px] px-3 py-2 text-left transition-colors',
                    // 활성 행 틴트는 **알파 토큰**이다. 레일 활성(`--color-primary-50`)을 그대로 쓰면
                    // 다크에서 깨진다 — 그 토큰은 명암을 따라가지 않고 L≈97 로 밝게 남는데
                    // `--text-primary` 는 흰색으로 뒤집혀 흰 글자가 흰 배경에 올라앉는다(실측).
                    // 알파 틴트는 뒤 표면 위에 합성되므로 라이트·다크 양쪽에서 성립한다.
                    isActive && 'bg-[var(--color-primary-a3)]',
                  )}
                >
                  <Icon className="text-[var(--text-secondary)] h-4 w-4 shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="text-[var(--text-primary)] block text-sm font-semibold">{item.label}</span>
                    {item.description && (
                      <span className="text-[var(--text-secondary)] block truncate text-[length:var(--text-xs)] font-medium">
                        {item.description}
                      </span>
                    )}
                  </span>
                  {SHOW_SECTION && (
                    <span className="text-[var(--text-tertiary)] shrink-0 text-[length:var(--text-xs)] font-medium">
                      {item.section}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* 힌트 */}
        <div className="text-[var(--text-tertiary)] border-border flex shrink-0 items-center gap-3 border-t px-4 py-2 text-[length:var(--text-xs)] font-medium">
          <span className="flex items-center gap-1">
            <Kbd size="sm">↑</Kbd>
            <Kbd size="sm">↓</Kbd>
            이동
          </span>
          <span className="flex items-center gap-1">
            <Kbd size="sm">
              <CornerDownLeft className="h-3 w-3" aria-hidden />
            </Kbd>
            열기
          </span>
          <span className="flex items-center gap-1">
            <Kbd size="sm">Esc</Kbd>
            닫기
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
