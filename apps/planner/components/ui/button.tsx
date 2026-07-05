import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// PUDS(pullim-jr) 레시피 이식 — 색·radius(18px)·높이(48/36/56)·전환·포커스는 PUDS 토큰,
// variant/size 키·Base UI 엔진·기능 유틸(svg 크기·aria-expanded·aria-invalid)은 planner 유지.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center whitespace-nowrap font-medium select-none outline-none transition-[background,color,transform,box-shadow] duration-200 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] focus-visible:ring-offset-2 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:ring-2 aria-invalid:ring-[var(--color-danger-500)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-action-primary)] text-[var(--color-action-primary-fg)] shadow-sm hover:bg-[var(--color-action-primary-hover)]",
        outline:
          "border border-[var(--border-default)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--surface-sunken)] aria-expanded:bg-[var(--surface-sunken)]",
        secondary:
          "bg-[var(--color-action-secondary)] text-[var(--color-action-secondary-fg)] hover:brightness-95 aria-expanded:brightness-95",
        ghost:
          "bg-transparent text-[var(--text-primary)] hover:bg-[var(--surface-sunken)] aria-expanded:bg-[var(--surface-sunken)]",
        destructive:
          "bg-[var(--color-danger-500)] text-white shadow-sm hover:bg-[var(--color-danger-600)]",
        link: "text-[var(--color-action-primary)] underline-offset-4 hover:underline",
      },
      // default/lg/icon/icon-lg = OS 스케일(button-h 토큰). xs/sm/icon-xs/icon-sm = 기존 컴팩트 계약 유지
      // (dense UI·닫기버튼 등 밀집 호출부 회귀 방지 — Codex #102 대응). radius는 os 테마 토큰(min으로 작게 유지).
      size: {
        default:
          "h-[var(--button-h)] gap-2 rounded-[var(--puds-radius-md)] px-5 text-[length:var(--text-base)]",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-[var(--button-h-lg)] gap-2 rounded-[var(--puds-radius-md)] px-7 text-[length:var(--text-md)]",
        icon: "size-[var(--button-h)] rounded-[var(--puds-radius-md)] p-0",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-[var(--button-h-lg)] rounded-[var(--puds-radius-md)] p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
