import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// PUDS 소프트 pill 배지 — 색은 옅은 톤 배경 + 진한 톤 텍스트(OS/PUDS 배지 컨벤션). h-[22px] 풀 pill.
const badgeVariants = cva(
  "group/badge inline-flex h-[22px] w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-primary-100)] text-[var(--color-primary-700)] [a]:hover:brightness-95",
        secondary:
          "bg-[var(--surface-sunken)] text-[var(--text-secondary)] [a]:hover:brightness-95",
        destructive:
          "bg-[var(--color-danger-50)] text-[var(--color-danger-900)] [a]:hover:brightness-95",
        outline:
          "border-[var(--border-default)] text-[var(--text-secondary)] [a]:hover:bg-[var(--surface-sunken)]",
        ghost:
          "text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]",
        link: "text-[var(--color-action-primary)] underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
