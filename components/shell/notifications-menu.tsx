'use client';

// 헤더 알림 — 풀림 Q(`apps/components/shell/notifications-menu.tsx`) 이식.
// 벨은 페이지로 떠나지 않고 **제자리에서 패널을 연다**. 범위는 "알림을 받을 창구"까지고,
// 데이터 소스(pullim-api·웹푸시)는 후속 — 지금은 빈 상태만 보인다.
//
// ⚠️ **DropdownMenu 가 아니라 Popover 다.** Q 는 shadcn DropdownMenu 를 쓰지만, 이 리포의
// `DropdownMenuContent` 는 base-ui `Menu.Popup` 이라 컨테이너에 `role="menu"` 가 붙는다.
// 알림 피드의 내용물은 메뉴 항목이 아니라 읽을 거리(제목·본문·시각)라서, 그 안에 `menuitem`
// 이 하나도 없는 "항목 없는 메뉴"가 만들어진다 — 스크린리더가 그렇게 읽고 방향키로 갈 곳도
// 없다(Codex #270). Popover 는 `role="dialog"` 라 피드에 맞는 그릇이고, `PopoverTitle` 이
// 패널의 접근성 이름("알림")을 준다.
//
// 트리거는 기존 `.icon-btn`, 배지는 `.dot` 으로 벤더 CSS(`app/os-topbar.css`)를 그대로 쓴다.
// Tailwind 로 다시 그리지 않는 이유: 헤더는 OS 정본에서 통째로 벤더링한 표면이라, 한 버튼만
// 다른 경로로 스타일을 주면 다음 재벤더링 때 그 자리만 따로 어긋난다.

import { Bell, BellOff } from 'lucide-react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverTitle,
} from '@/components/ui/popover';

export function NotificationsMenu() {
  // 후속: pullim-api 에서 알림 목록·미읽음 수를 받아 배지와 목록을 채운다.
  const notifications: { id: string; title: string }[] = [];
  const unread = 0;

  return (
    <Popover>
      <PopoverTrigger className="icon-btn" aria-label={unread > 0 ? `알림 ${unread}건` : '알림'}>
        <Bell width={20} height={20} aria-hidden />
        {/* 미읽음이 있을 때만 점을 찍는다. 항상 켜진 배지는 "안 읽은 알림 있음" 오해를 만든다
            — 발송 인프라 미구현(NOTIFICATIONS_ENABLED off)이라 지금 실제 미읽음은 0이다. */}
        {unread > 0 && <span className="dot" />}
      </PopoverTrigger>
      {/* 기본값은 w-72 + pad-lg — 피드는 행이 가장자리까지 닿아야 해서 폭을 늘리고 패딩을 0으로 */}
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-border flex items-center justify-between border-b px-3 py-2.5">
          <PopoverTitle className="text-[var(--text-primary)] text-sm font-bold">알림</PopoverTitle>
        </div>

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 px-4 py-8 text-center">
            <BellOff className="text-[var(--text-tertiary)] h-6 w-6" aria-hidden />
            <p className="text-[var(--text-secondary)] text-sm font-semibold">받은 알림이 없어요</p>
            <p className="text-[var(--text-tertiary)] text-sm">중요한 소식이 생기면 여기로 알려드릴게요.</p>
          </div>
        ) : (
          <ul className="max-h-[60vh] overflow-y-auto py-1">
            {notifications.map((n) => (
              <li key={n.id} className="text-[var(--text-secondary)] px-3 py-2 text-sm">
                {n.title}
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
