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
      size: {
        default:
          "h-[var(--button-h)] gap-2 rounded-[var(--puds-radius-md)] px-5 text-[length:var(--text-base)]",
        xs: "h-8 gap-1 rounded-[var(--puds-radius-sm)] px-2.5 text-[length:var(--text-sm)] [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-[var(--button-h-sm)] gap-1.5 rounded-[var(--puds-radius-md)] px-4 text-[length:var(--text-sm)]",
        lg: "h-[var(--button-h-lg)] gap-2 rounded-[var(--puds-radius-md)] px-7 text-[length:var(--text-md)]",
        icon: "size-[var(--button-h)] rounded-[var(--puds-radius-md)] p-0",
        "icon-xs":
          "size-8 rounded-[var(--puds-radius-sm)] p-0 [&_svg:not([class*='size-'])]:size-4",
        "icon-sm": "size-[var(--button-h-sm)] rounded-[var(--puds-radius-md)] p-0",
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
