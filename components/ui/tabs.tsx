"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"

import { cn } from "@/lib/utils"

// OS(pullim-web)/PUDS underline 탭 — 세그먼트 필 → 밑줄 스타일 전환.
// Base UI 엔진 유지(data-active 활성). 리스트 하단 1px 보더 + 트리거 -mb-px 로 활성 밑줄이 겹쳐 표시.

function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  )
}

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "flex items-center gap-1 border-b border-[var(--border-subtle)]",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative -mb-px inline-flex items-center justify-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-3.5 py-2.5 text-sm font-medium text-[var(--text-secondary)] outline-none transition-[color,border-color] duration-200 hover:text-[var(--text-primary)] focus-visible:rounded-[var(--puds-radius-sm)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] disabled:pointer-events-none disabled:opacity-50 data-active:border-[var(--color-action-primary)] data-active:font-semibold data-active:text-[var(--color-action-primary)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
