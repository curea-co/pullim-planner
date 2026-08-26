import * as React from "react";
import { cn } from "@/lib/cn";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(({ className, invalid, ...props }, ref) => (
  <input
    ref={ref}
    aria-invalid={invalid || undefined}
    className={cn(
      "w-full h-[var(--input-h)] px-[var(--pad-md)] bg-[var(--surface-raised)] text-[var(--text-primary)] border rounded-[var(--radius-md)] transition-[border-color,box-shadow] duration-[var(--duration-fast)]",
      "border-[var(--border-default)] hover:border-[var(--border-strong)]",
      "focus:outline-none focus:border-[var(--color-action-primary)] focus:ring-[3px] focus:ring-[color-mix(in_oklch,var(--color-action-primary)_25%,transparent)]",
      "placeholder:text-[var(--text-tertiary)]",
      invalid && "border-[var(--color-danger-500)]",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(({ className, invalid, ...props }, ref) => (
  <textarea
    ref={ref}
    aria-invalid={invalid || undefined}
    lang="ko"
    className={cn(
      "w-full min-h-24 p-[var(--pad-md)] bg-[var(--surface-raised)] text-[var(--text-primary)] border rounded-[var(--radius-md)] transition-[border-color,box-shadow] duration-[var(--duration-fast)] resize-y",
      "border-[var(--border-default)] hover:border-[var(--border-strong)]",
      "focus:outline-none focus:border-[var(--color-action-primary)] focus:ring-[3px] focus:ring-[color-mix(in_oklch,var(--color-action-primary)_25%,transparent)]",
      "placeholder:text-[var(--text-tertiary)]",
      invalid && "border-[var(--color-danger-500)]",
      className
    )}
    style={{ wordBreak: "keep-all", overflowWrap: "break-word", lineHeight: 1.7, letterSpacing: "-0.011em" }}
    {...props}
  />
));
Textarea.displayName = "Textarea";

/** Field 가 자식 컨트롤에 주입하는 prop 들. */
interface FieldChildProps {
  id?: string;
  /** CUDS 컨트롤(Input/Textarea/SelectTrigger/Rating)이 소비하는 커스텀 prop. */
  invalid?: boolean;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

/**
 * 자식에게 주입할 접근성 prop 을 계산한다.
 *
 * `<label for>` 는 **네이티브 폼 컨트롤에만** 동작한다. `role="radiogroup"` 인
 * div 기반 컨트롤(Rating 등)을 감싸면 라벨 클릭 포커스도, 접근 가능한 이름도
 * 잡히지 않는다. 그래서 `aria-labelledby` 를 함께 건다.
 */
function fieldChildProps(
  child: React.ReactElement<FieldChildProps>,
  opts: { id: string; labelId: string; describedBy?: string; hasError: boolean }
): FieldChildProps {
  const own = child.props;
  const next: FieldChildProps = { id: opts.id };

  // `invalid` 는 DOM 속성이 아니다. 호스트 엘리먼트(<div> 등)에 넘기면
  // DOM 으로 새어나가 React 가 경고한다. 컴포넌트 자식에게만 준다.
  if (typeof child.type !== "string") next.invalid = opts.hasError;
  // aria-invalid 는 어떤 엘리먼트에도 유효하므로 항상 안전하게 걸 수 있다.
  if (opts.hasError) next["aria-invalid"] = true;

  // 자식이 이미 자기 이름을 갖고 있으면 존중한다.
  if (own["aria-labelledby"] == null && own["aria-label"] == null) {
    next["aria-labelledby"] = opts.labelId;
  }

  // aria-describedby 는 id 목록이므로 덮어쓰지 않고 합친다.
  if (opts.describedBy) {
    next["aria-describedby"] = own["aria-describedby"]
      ? `${own["aria-describedby"]} ${opts.describedBy}`
      : opts.describedBy;
  }

  return next;
}

/**
 * Field — 라벨 + 컨트롤 + 힌트/에러를 묶고 접근성 배선을 자동으로 한다.
 *
 * 네이티브 컨트롤은 `htmlFor`/`id` 로, div 기반 컨트롤은 `aria-labelledby` 로
 * 라벨과 연결된다. `hint`/`error` 는 `aria-describedby` 로 연결돼 스크린리더가
 * 읽는다 — 연결하지 않으면 `error` 가 시각 사용자 전용이 된다.
 */
export function Field({
  label,
  hint,
  error,
  children,
  required,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const id = React.useId();
  const labelId = `${id}-label`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  // hint 는 error 가 없을 때만 렌더된다 — describedby 도 같은 규칙을 따른다.
  const describedBy = error ? errorId : hint ? hintId : undefined;

  const child = React.isValidElement<FieldChildProps>(children)
    ? React.cloneElement(
        children,
        fieldChildProps(children, { id, labelId, describedBy, hasError: !!error })
      )
    : children;

  return (
    <div className={cn("flex flex-col gap-[var(--gap-sm)]", className)}>
      <label id={labelId} htmlFor={id} className="text-[length:var(--text-sm)] font-medium text-[var(--text-primary)]" style={{ letterSpacing: "-0.008em" }}>
        {label}
        {required && <span className="text-[var(--text-danger)] ml-[var(--gap-xs)]">*</span>}
      </label>
      {child}
      {hint && !error && (
        <span id={hintId} className="text-[length:var(--text-sm)] text-[var(--text-tertiary)]">{hint}</span>
      )}
      {error && (
        <span id={errorId} className="text-[length:var(--text-sm)] text-[var(--text-danger)]" role="alert">{error}</span>
      )}
    </div>
  );
}
Field.displayName = "Field";
