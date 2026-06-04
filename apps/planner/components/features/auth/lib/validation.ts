/**
 * 클라이언트 측 입력 검증 — BE DTO(`apps/backend/.../auth/controller/dto`)와 정렬.
 *
 * 서버가 최종 권위지만, 즉시 피드백으로 왕복을 줄이기 위해 동일 규칙을 미러링한다.
 * 규칙이 어긋나면 BE `validation.constant.ts`를 기준으로 본 파일을 갱신한다.
 */

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 64;
const MAX_NAME_LENGTH = 100;

// BE PASSWORD_PATTERN 정렬: 영문·숫자·특수문자 각 1개 이상.
const PASSWORD_PATTERN =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[~!@#$%^&*()_+\-={}[\]|;:'",.<>/?]).+$/;

// 단순 이메일 형식 (BE class-validator IsEmail 의 보수적 근사).
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return '이름을 입력해주세요.';
  if (trimmed.length > MAX_NAME_LENGTH)
    return `이름은 ${MAX_NAME_LENGTH}자 이하여야 해요.`;
  return null;
}

export function validateEmail(email: string): string | null {
  if (!email.trim()) return '이메일을 입력해주세요.';
  if (!EMAIL_PATTERN.test(email)) return '올바른 이메일 형식이 아니에요.';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return '비밀번호를 입력해주세요.';
  if (password.length < MIN_PASSWORD_LENGTH)
    return `비밀번호는 최소 ${MIN_PASSWORD_LENGTH}자 이상이어야 해요.`;
  if (password.length > MAX_PASSWORD_LENGTH)
    return `비밀번호는 ${MAX_PASSWORD_LENGTH}자 이하여야 해요.`;
  if (!PASSWORD_PATTERN.test(password))
    return '영문·숫자·특수문자를 각각 1개 이상 포함해주세요.';
  return null;
}

export function validatePasswordConfirm(
  password: string,
  confirm: string,
): string | null {
  if (!confirm) return '비밀번호 확인을 입력해주세요.';
  if (password !== confirm) return '비밀번호가 일치하지 않아요.';
  return null;
}
