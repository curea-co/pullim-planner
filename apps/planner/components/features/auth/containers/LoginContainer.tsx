'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ApiError } from '@pullim-planner/api-client';
import { useAuth } from '@/lib/auth/auth-context';
import {
  LoginPresenter,
  type LoginErrors,
  type LoginFields,
} from '../presenters/LoginPresenter';
import { validateEmail } from '../lib/validation';

export function LoginContainer() {
  const router = useRouter();
  const { status, login } = useAuth();

  const [values, setValues] = useState<LoginFields>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<LoginErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // 이미 로그인된(또는 부분 인증: onboarding/forbidden) 상태로 /login 진입 시 앱으로 돌려보낸다.
  // RequireAuth 가 onboarding → /planner/onboarding, forbidden → 안내 화면으로 처리한다.
  useEffect(() => {
    if (
      status === 'authenticated' ||
      status === 'onboarding' ||
      status === 'forbidden'
    ) {
      router.replace('/');
    }
  }, [status, router]);

  function handleChange<K extends keyof LoginFields>(field: K, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleSubmit() {
    const nextErrors: LoginErrors = {
      email: validateEmail(values.email) ?? undefined,
      password: values.password ? undefined : '비밀번호를 입력해주세요.',
    };
    if (nextErrors.email || nextErrors.password) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      await login({ email: values.email, password: values.password });
      router.replace('/');
    } catch (error) {
      // 자격 증명 오류(401)는 폼 상단 대신 비밀번호 필드 근처에 표시한다.
      if (error instanceof ApiError && error.statusCode === 401) {
        setErrors({ password: '이메일 또는 비밀번호가 올바르지 않아요.' });
      } else {
        toast.error('로그인에 실패했어요', {
          description:
            error instanceof ApiError
              ? error.message
              : '잠시 후 다시 시도해주세요.',
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LoginPresenter
      values={values}
      errors={errors}
      submitting={submitting}
      onChange={handleChange}
      onSubmit={handleSubmit}
    />
  );
}
