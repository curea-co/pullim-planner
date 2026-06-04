'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ApiError } from '@pullim-planner/api-client';
import { useAuth } from '@/lib/auth/auth-context';
import {
  SignupPresenter,
  type SignupErrors,
  type SignupFields,
} from '../presenters/SignupPresenter';
import {
  validateEmail,
  validateName,
  validatePassword,
  validatePasswordConfirm,
} from '../lib/validation';

export function SignupContainer() {
  const router = useRouter();
  const { status, signup, checkEmail } = useAuth();

  const [values, setValues] = useState<SignupFields>({
    name: '',
    email: '',
    password: '',
    passwordConfirm: '',
  });
  const [errors, setErrors] = useState<SignupErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // 가장 최근 이메일 입력값 — checkEmail blur 응답이 늦게 도착했을 때 stale 여부 판정용.
  const latestEmailRef = useRef('');

  useEffect(() => {
    if (status === 'authenticated') router.replace('/');
  }, [status, router]);

  function handleChange<K extends keyof SignupFields>(field: K, value: string) {
    if (field === 'email') latestEmailRef.current = value;
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  // 이메일 blur 시 중복 확인 — 형식이 유효할 때만. 확정은 submit conflict 가 담당.
  async function handleEmailBlur() {
    const email = values.email;
    if (validateEmail(email)) return;
    try {
      const available = await checkEmail(email);
      // 응답이 도착하기 전 사용자가 이메일을 바꿨으면 stale 결과 — 버린다(잘못된 에러 덮어쓰기 방지).
      if (latestEmailRef.current !== email) return;
      if (!available) {
        setErrors((prev) => ({ ...prev, email: '이미 가입된 이메일이에요.' }));
      }
    } catch {
      // 네트워크 등 실패는 조용히 무시 — submit 시 서버가 최종 검증한다.
    }
  }

  function validateAll(): SignupErrors {
    return {
      name: validateName(values.name) ?? undefined,
      email: validateEmail(values.email) ?? undefined,
      password: validatePassword(values.password) ?? undefined,
      passwordConfirm:
        validatePasswordConfirm(values.password, values.passwordConfirm) ??
        undefined,
    };
  }

  async function handleSubmit() {
    const nextErrors = validateAll();
    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      await signup({
        name: values.name.trim(),
        email: values.email,
        password: values.password,
        passwordConfirm: values.passwordConfirm,
      });
      router.replace('/');
    } catch (error) {
      // 이메일 중복: BE 는 409 + USER_EMAIL_DUPLICATED 를 내려보낸다(소문자 conflict 아님).
      // 코드 문자열보다 안정적인 statusCode 409 로 분기한다.
      if (error instanceof ApiError && error.statusCode === 409) {
        setErrors({ email: '이미 가입된 이메일이에요.' });
      } else if (error instanceof ApiError && error.statusCode === 400) {
        toast.error('입력값을 확인해주세요', { description: error.message });
      } else {
        toast.error('회원가입에 실패했어요', {
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
    <SignupPresenter
      values={values}
      errors={errors}
      submitting={submitting}
      onChange={handleChange}
      onEmailBlur={handleEmailBlur}
      onSubmit={handleSubmit}
    />
  );
}
