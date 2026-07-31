import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        // PUDS(pullim-jr) 인풋 레시피 — input-h + surface-raised + radius-md(18px) + action-primary 포커스 링.
        "h-[var(--input-h)] w-full min-w-0 rounded-[var(--puds-radius-md)] border border-[var(--border-default)] bg-[var(--surface-raised)] px-3 py-1 text-base outline-none transition-[border-color,box-shadow] duration-200 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus-visible:border-[var(--color-action-primary)] focus-visible:ring-[3px] focus-visible:ring-[color-mix(in_oklch,var(--color-action-primary)_25%,transparent)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-[var(--color-danger-500)] aria-invalid:ring-[3px] aria-invalid:ring-[color-mix(in_oklch,var(--color-danger-500)_25%,transparent)] md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
