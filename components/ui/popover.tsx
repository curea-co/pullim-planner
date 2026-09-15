"use client";

import * as React from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "@/lib/cn";

/**
 * PUDS Popover
 *
 * Built on @base-ui/react/popover. Anchor-positioned floating panel with
 * tokenized surface, border, shadow, radius, and padding. Works in both
 * themes via [data-theme="dark"] token overrides.
 *
 * Composition mirrors shadcn/radix:
 *   <Popover>
 *     <PopoverTrigger asChild><Button>열기</Button></PopoverTrigger>
 *     <PopoverContent>
 *       <p>본문 내용</p>
 *     </PopoverContent>
 *   </Popover>
 *
 * Required deps:
 *  - @base-ui/react
 */

/* ══════════════════════════════════════════════════════════════════════════
 * B8 이 세운 `Positioner` 패턴 — B9(메뉴)·B10(다이얼로그)·B11(셀렉트)·
 * B12(콤보박스) 가 그대로 베낀다. 세 파일(popover·tooltip·hover-card)에
 * **같은 순서·같은 이름**으로 쓰여 있으니 아무 파일이나 골라 베끼면 된다.
 *
 *   Portal → Positioner → Popup           (Radix 는 Portal → Content 였다)
 *
 * 1. **레이어 토큰(`z-[var(--z-popover)]` 같은 것)은 Positioner 에.**
 *    ─ 여기 별표 와일드카드로 줄여 쓰지 말 것. Tailwind 는 **주석의 문자열도**
 *      클래스로 잡아 컴파일하고, `--z-*` 는 파싱 불가 CSS 가 되어 playground 가
 *      모든 경로에서 500 을 낸다 (`apps/playground/app/globals.css` 주석 참고).
 *    Positioner 가 포탈 안 최상위 엘리먼트다. 엔진이 여기에 `position`/`top`/
 *    `left`/`--available-*` 를 **인라인으로** 심지만 `z-index` 는 건드리지
 *    않으므로 클래스가 인라인과 싸우지 않는다. Popup 에만 걸면 계약 §4 를
 *    만족하긴 하나, 나중에 Backdrop 같은 형제 파트가 생기면 층이 어긋난다.
 *
 * 2. **크기·모양·`className` 은 전부 Popup 에.**
 *    Positioner 에 `w-*`/`h-*`/`w-full`/`h-full` 을 붙이지 않는다 — 엔진이
 *    심는 인라인 배치값과 싸우고, 충돌 계산의 기준 사각형까지 바꾼다
 *    (계약 §6 「Base UI 가 인라인 style 을 심는 자리」). Radix 시절
 *    `PopoverContent` 에 있던 `w-72` 가 **Popup 으로 옮겨진 것**이 이 규칙이다.
 *
 * 3. **소비자 `className` 은 Popup 한 곳에만 합친다.**
 *    두 파트로 쪼개면 `cn`(twMerge)이 기본 클래스를 걷어내지 못해 소비자
 *    override 가 조용히 무시된다 (`popover.test.tsx` 의 `w-40` vs `w-72`).
 *
 * 4. **Positioner 로 가는 prop 은 PUDS 가 명시 선언해 손으로 넘긴다.**
 *    `side`·`sideOffset`·`align`·`alignOffset`·`collisionPadding`·`arrowPadding`·
 *    `sticky`·`anchor` … 는 이제 `Popup.Props` 에 없다. `{...props}` 로 흘리면
 *    타입은 통과하고 **DOM 속성**이 되어 조용히 죽는다. 아래 `POSITIONER_PROPS`
 *    분해가 그 방어선이다.
 *
 * 5. **`pointer-events-auto` 는 B14 에서 지웠다 — 되살리지 마라.**
 *    Radix 모달(`Dialog`/`AlertDialog`/`Sheet`/메뉴/셀렉트)은 `<body>` 에
 *    `pointer-events: none` 을 심고 **자기 레이어에만** `auto` 를 되돌렸다.
 *    Base UI 가 만든 포탈은 그 목록에 없어 상속으로 죽었고 — 모달 안에서 연
 *    팝오버가 보이기는 하는데 클릭이 안 됐다 — 그 방어로 Positioner 에
 *    `pointer-events-auto` 를 붙여 두었다.
 *    **Base UI 모달은 `<body>` 를 아예 건드리지 않는다**(B10 실측, B14 재확인).
 *    대신 (a) 포탈 밖 형제 트리에 `aria-hidden` + `data-base-ui-inert`,
 *    (b) 포탈 «안»에 전면 백드롭(`role="presentation"`, `position:fixed;
 *    inset:0`, `z-index` 없음)을 깐다. B9(메뉴)·B11(셀렉트)·B14(command) 로
 *    그렇게 심던 컴포넌트가 저장소에서 전부 사라지면서 방어할 대상이 없어졌다.
 *    근거는 `__tests__/popover.test.tsx` 의 「PUDS 의 오버레이 계열은 `<body>` 의
 *    pointer-events 를 건드리지 않는다」가 상시로 지킨다 — Dialog·Sheet·
 *    AlertDialog·CommandPalette 에 더해 DropdownMenu·Select 까지 목록에 있어서,
 *    어느 하나가 Radix 로 되돌아가면 그 테스트가 먼저 빨개진다.
 *
 *    **대신 새 실패 모드가 생겼다.** 부유 레이어의 **z 토큰을 빠뜨리면** 그
 *    전면 백드롭(z 0)이 팝업(z auto)을 덮어 «보이는데 안 눌리는» 똑같은 증상이
 *    난다. 위 1번의 「레이어 토큰은 Positioner 에」가 그래서 더 중요해졌다.
 *
 * 6. **Arrow 는 Popup 안에 들어가고, Popup 은 `relative` 여야 한다.**
 *    Base UI 는 Arrow 에 `position:absolute` 와 **교차축 좌표만** 인라인으로
 *    심는다(top/bottom 면일 땐 `left`, left/right 면일 땐 `top`). 주축 오프셋과
 *    회전은 우리가 `data-[side=…]` 클래스로 준다 — 서로 다른 속성이라 안 싸운다.
 * ══════════════════════════════════════════════════════════════════════════ */

const POPOVER_SIDE_OFFSET = 6;

/* ------------------------------------------------------------------ */
/* Anchor — Base UI 에 대응 파트가 없어 PUDS 가 다시 만든다            */
/* ------------------------------------------------------------------ */

/**
 * Base UI Popover 의 파트 목록에 **`Anchor` 가 없다** (Root·Trigger·Portal·
 * Positioner·Popup·Arrow·Backdrop·Title·Description·Close·Viewport 뿐).
 * 대신 `Positioner` 가 `anchor` prop 으로 임의의 엘리먼트를 받는다.
 *
 * 그래서 `PopoverAnchor` 는 「자기 DOM 노드를 컨텍스트에 등록하는 래퍼」로
 * 다시 만든다. 소비자 입장에서는 Radix 때와 똑같이 쓰인다.
 *
 * ref 가 아니라 **state** 로 들고 있는 이유: 앵커 엘리먼트가 마운트될 때
 * Positioner 가 다시 렌더돼야 위치를 잡는다. ref 만 채우면 리렌더가 없어
 * 첫 열림이 트리거 기준으로 계산된다.
 */
const PopoverAnchorContext = React.createContext<{
  anchor: HTMLElement | null;
  setAnchor: (el: HTMLElement | null) => void;
} | null>(null);

export interface PopoverProps extends Omit<PopoverPrimitive.Root.Props, "children"> {
  /**
   * Base UI 는 `children` 으로 «활성 트리거의 payload 를 받는 렌더 함수»도
   * 허용하지만(`handle`/`payload` 기능) PUDS 는 평범한 노드만 받는다 —
   * Radix 에 없던 기능이고, 지금 이 자리에서 노출하면 나중에 되돌릴 수 없다.
   */
  children?: React.ReactNode;
}

/**
 * `onOpenChange` 는 **두 번째 인자 `eventDetails` 를 그대로 통과시킨다.**
 *
 * Radix 의 네 가지 해제 콜백(`onEscapeKeyDown`·`onPointerDownOutside`·
 * `onFocusOutside`·`onInteractOutside`)은 Base UI 에 **대응이 없고**, 해제
 * 이유는 `eventDetails.reason` 에만 남는다. 이유를 지우면 기능이 준다.
 * (B4 의 「인자 하나만 넘긴다」 규칙은 *Radix 에 없던 것을 새로 노출하지
 * 않는다*는 뜻이었다 — `checkbox.tsx` 주석 참조. 여기서는 반대로 *Radix 에
 * 있던 것을 잃지 않기 위해* 통과시킨다.)
 *
 * 옛 콜백 → `reason` 대응:
 *   onEscapeKeyDown      → reason === "escape-key"
 *   onPointerDownOutside → reason === "outside-press"
 *   onFocusOutside       → reason === "focus-out"
 *   onInteractOutside    → reason === "outside-press" | "focus-out"
 * 해제를 거부하려면 `eventDetails.cancel()` (Radix 의 `event.preventDefault()`).
 */
export const Popover = ({ children, ...props }: PopoverProps) => {
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const value = React.useMemo(() => ({ anchor, setAnchor }), [anchor]);
  return (
    <PopoverAnchorContext.Provider value={value}>
      <PopoverPrimitive.Root {...props}>{children}</PopoverPrimitive.Root>
    </PopoverAnchorContext.Provider>
  );
};
Popover.displayName = "Popover";

export interface PopoverTriggerProps extends PopoverPrimitive.Trigger.Props {
  /**
   * 렌더 대상을 자식 엘리먼트에 위임한다 (`<PopoverTrigger asChild><Button/></…>`).
   *
   * Radix 의 prop 이름을 PUDS 가 이어받아 소유한다 — 내부는 Base UI 의
   * `render` 다. 계약 §6 「공개 `asChild` prop 은 그대로 둔다」.
   * 자식이 네이티브 `<button>` 이 아니면 `nativeButton={false}` 도 함께 준다.
   */
  asChild?: boolean;
}

export const PopoverTrigger = React.forwardRef<HTMLButtonElement, PopoverTriggerProps>(
  ({ asChild = false, children, render, ...props }, ref) => (
    <PopoverPrimitive.Trigger
      ref={ref}
      /* `children: undefined` 를 명시로 넘기지 않는다 — Base UI 의 `mergeProps`
       * 는 값이 undefined 인 키도 덮어써서 `render` 엘리먼트의 자식을 지운다. */
      {...(asChild ? { render: children as React.ReactElement } : { render, children })}
      {...props}
    />
  )
);
PopoverTrigger.displayName = "PopoverTrigger";

export interface PopoverAnchorProps extends React.ComponentPropsWithoutRef<"div"> {
  /** 렌더 대상을 자식 엘리먼트에 위임한다. */
  asChild?: boolean;
}

export const PopoverAnchor = React.forwardRef<HTMLDivElement, PopoverAnchorProps>(
  ({ asChild = false, children, ...props }, ref) => {
    const ctx = React.useContext(PopoverAnchorContext);
    const setAnchor = ctx?.setAnchor;
    const register = React.useCallback(
      (node: HTMLDivElement | null) => setAnchor?.(node),
      [setAnchor]
    );
    return useRender({
      defaultTagName: "div",
      render: asChild ? (children as React.ReactElement) : undefined,
      ref: [ref, register],
      props: { ...(asChild ? {} : { children }), ...props },
    });
  }
);
PopoverAnchor.displayName = "PopoverAnchor";

export interface PopoverCloseProps extends PopoverPrimitive.Close.Props {
  /** 렌더 대상을 자식 엘리먼트에 위임한다 (`<PopoverClose asChild><Button/></…>`). */
  asChild?: boolean;
}

export const PopoverClose = React.forwardRef<HTMLButtonElement, PopoverCloseProps>(
  ({ asChild = false, children, render, ...props }, ref) => (
    <PopoverPrimitive.Close
      ref={ref}
      {...(asChild ? { render: children as React.ReactElement } : { render, children })}
      {...props}
    />
  )
);
PopoverClose.displayName = "PopoverClose";

export const PopoverTitle = PopoverPrimitive.Title;

export const PopoverDescription = PopoverPrimitive.Description;

/**
 * Popup 이 아니라 **Positioner** 로 가야 하는 prop 들.
 *
 * Radix 에서는 전부 `PopoverContent` 에 있었다. 이름을 그대로 두되 목적지만
 * 바꾼다 — 소비자 호출부(`<PopoverContent align="start" sideOffset={4}>`)는
 * 한 줄도 바뀌지 않는다.
 *
 * Radix 에 있었지만 Base UI 에 없는 것: `avoidCollisions`(→`collisionAvoidance`
 * 객체), `hideWhenDetached`(→ Popup 의 `data-anchor-hidden` 상태),
 * `updatePositionStrategy`(→`disableAnchorTracking`). 셋 다 저장소·소비자
 * 사용처가 0 이라 옮겨 심지 않고 새 이름만 노출한다 — 옛 이름을 남겨두면
 * 「선언만 있고 매핑이 없는」 가장 나쁜 상태가 된다 (감사 §2-2 경로 A).
 * `sticky` 는 `'partial'|'always'` 에서 `boolean` 으로 의미가 바뀌었다.
 */
type PopoverPositionerProps = Pick<
  PopoverPrimitive.Positioner.Props,
  | "anchor"
  | "side"
  | "sideOffset"
  | "align"
  | "alignOffset"
  | "collisionBoundary"
  | "collisionPadding"
  | "collisionAvoidance"
  | "arrowPadding"
  | "sticky"
  | "positionMethod"
  | "disableAnchorTracking"
>;

export interface PopoverContentProps
  extends PopoverPrimitive.Popup.Props,
    PopoverPositionerProps {
  /** Render an arrow pointing to the trigger. Defaults to false. */
  withArrow?: boolean;
  /** 닫혀 있어도 포탈을 DOM 에 붙여 둔다 (Radix `forceMount`). */
  keepMounted?: boolean;
  /** 포탈을 붙일 컨테이너. 기본 `<body>`. */
  container?: PopoverPrimitive.Portal.Props["container"];
}

export const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  (
    {
      className,
      // ── Positioner 로 가는 것 ─────────────────────────────────────────
      anchor,
      side,
      sideOffset = POPOVER_SIDE_OFFSET,
      align = "center",
      alignOffset,
      collisionBoundary,
      collisionPadding,
      collisionAvoidance,
      arrowPadding,
      sticky,
      positionMethod,
      disableAnchorTracking,
      // ── Portal 로 가는 것 ────────────────────────────────────────────
      keepMounted,
      container,
      // ── 나머지는 전부 Popup ──────────────────────────────────────────
      withArrow = false,
      children,
      ...props
    },
    ref
  ) => {
    const ctx = React.useContext(PopoverAnchorContext);
    return (
      <PopoverPrimitive.Portal keepMounted={keepMounted} container={container}>
        <PopoverPrimitive.Positioner
          anchor={anchor ?? ctx?.anchor ?? undefined}
          side={side}
          sideOffset={sideOffset}
          align={align}
          alignOffset={alignOffset}
          collisionBoundary={collisionBoundary}
          collisionPadding={collisionPadding}
          collisionAvoidance={collisionAvoidance}
          arrowPadding={arrowPadding}
          sticky={sticky}
          positionMethod={positionMethod}
          disableAnchorTracking={disableAnchorTracking}
          className="z-[var(--z-popover)]"
        >
          <PopoverPrimitive.Popup
            ref={ref}
            lang="ko"
            className={cn(
              // `relative` 는 필수다 — Arrow 가 이 박스를 기준으로 절대 배치된다.
              "relative w-72 p-[var(--pad-lg)] outline-none",
              "bg-[var(--surface-raised)] text-[var(--text-primary)]",
              "border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] focus-visible:ring-offset-2",
              "data-open:animate-in data-closed:animate-out",
              "data-closed:fade-out-0 data-open:fade-in-0",
              "data-closed:zoom-out-95 data-open:zoom-in-95",
              "data-[side=top]:slide-in-from-bottom-1 data-[side=bottom]:slide-in-from-top-1",
              "data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1",
              "tracking-[var(--tracking-kr-body)] leading-[var(--leading-kr-lead)] break-keep wrap-break-word",
              className
            )}
            {...props}
          >
            {children}
            {withArrow && <PopoverArrow />}
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    );
  }
);
PopoverContent.displayName = "PopoverContent";

/**
 * 화살표.
 *
 * Radix 는 `<Arrow width height>` 가 통째로 `<svg><polygon/></svg>` 를 그려
 * 줬지만 Base UI 의 `Arrow` 는 **빈 `<div>`** 다. 그림은 우리가 넣는다.
 *
 * `<polygon>` 대신 **열린 `<path>`** 를 쓴다. 빗변 두 개에만 선이 그려져
 * 서피스 테두리와 이어진다. (Radix 판의 `[&_path]:stroke-…` 는 실제로 렌더된
 * 요소가 `<polygon>` 이라 **한 번도 매치한 적이 없었다** — 지금 살아난다.)
 *
 * 주축 오프셋(`top`/`bottom`/`left`/`right`)과 회전은 클래스로 준다.
 * 엔진은 교차축 좌표만 인라인으로 심으므로 겹치지 않는다.
 * 기본 자세(회전 0)는 side="bottom" — 팝업이 앵커 **아래**에 있어 화살표가
 * 위를 가리키는 경우다.
 */
const ARROW_PLACEMENT =
  "absolute data-[side=bottom]:top-[-6px] data-[side=top]:bottom-[-6px] data-[side=top]:rotate-180 " +
  "data-[side=left]:right-[-9px] data-[side=left]:rotate-90 " +
  "data-[side=right]:left-[-9px] data-[side=right]:-rotate-90";

function PopoverArrow() {
  return (
    <PopoverPrimitive.Arrow className={ARROW_PLACEMENT}>
      <svg
        width={12}
        height={6}
        viewBox="0 0 12 6"
        aria-hidden="true"
        className="block fill-[var(--surface-raised)] [&_path]:stroke-[var(--border-subtle)]"
      >
        <path d="M0.5 6.5 L6 1 L11.5 6.5" />
      </svg>
    </PopoverPrimitive.Arrow>
  );
}
