'use client';

import { useId, type ComponentProps } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = ComponentProps<'input'> & {
  label: string;
  /** 검증 에러 메시지. 있으면 aria-invalid + 메시지 노출. */
  error?: string | null;
  /** 입력 아래에 표시할 보조 안내(에러가 없을 때만). */
  hint?: string;
};

/**
 * label + input + 에러/힌트 묶음. a11y: label htmlFor, aria-invalid, aria-describedby 연결.
 */
export function FormField({ label, error, hint, id, ...inputProps }: Props) {
  const reactId = useId();
  const fieldId = id ?? reactId;
  const describedById = error
    ? `${fieldId}-error`
    : hint
      ? `${fieldId}-hint`
      : undefined;

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={fieldId}>{label}</Label>
      <Input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedById}
        {...inputProps}
      />
      {error ? (
        <p id={`${fieldId}-error`} className="text-destructive text-xs">
          {error}
        </p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="text-pullim-slate-500 text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
