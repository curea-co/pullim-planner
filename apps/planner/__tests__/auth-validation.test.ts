/**
 * auth 클라이언트 검증 헬퍼 단위 테스트.
 *
 * 이 규칙들은 BE DTO(`apps/backend/.../auth/controller/dto` + `validation.constant.ts`)를
 * 미러링한다 — 회귀 시 양쪽 정합이 깨지므로 경계값을 고정한다.
 */

import {
  validateEmail,
  validateName,
  validatePassword,
  validatePasswordConfirm,
} from '@/components/features/auth/lib/validation';

describe('validateName', () => {
  it('빈 값/공백은 에러', () => {
    expect(validateName('')).not.toBeNull();
    expect(validateName('   ')).not.toBeNull();
  });

  it('100자 이하 정상, 초과 에러', () => {
    expect(validateName('서연')).toBeNull();
    expect(validateName('a'.repeat(100))).toBeNull();
    expect(validateName('a'.repeat(101))).not.toBeNull();
  });
});

describe('validateEmail', () => {
  it('형식 유효 시 null', () => {
    expect(validateEmail('you@example.com')).toBeNull();
  });

  it('형식 위반 시 에러', () => {
    expect(validateEmail('')).not.toBeNull();
    expect(validateEmail('nope')).not.toBeNull();
    expect(validateEmail('a@b')).not.toBeNull();
    expect(validateEmail('a b@example.com')).not.toBeNull();
  });
});

describe('validatePassword', () => {
  it('영문·숫자·특수문자 8자 이상이면 통과', () => {
    expect(validatePassword('abcd123!')).toBeNull();
    expect(validatePassword('Str0ng#Pass')).toBeNull();
  });

  it('길이 미달/초과 에러', () => {
    expect(validatePassword('a1!aaa')).not.toBeNull(); // 6자
    expect(validatePassword(`a1!${'x'.repeat(62)}`)).not.toBeNull(); // 65자
  });

  it('문자 종류 누락 에러', () => {
    expect(validatePassword('abcdefgh')).not.toBeNull(); // 숫자·특수 없음
    expect(validatePassword('abcd1234')).not.toBeNull(); // 특수 없음
    expect(validatePassword('1234!@#$')).not.toBeNull(); // 영문 없음
  });
});

describe('validatePasswordConfirm', () => {
  it('일치하면 null, 불일치면 에러', () => {
    expect(validatePasswordConfirm('abcd123!', 'abcd123!')).toBeNull();
    expect(validatePasswordConfirm('abcd123!', 'abcd123?')).not.toBeNull();
    expect(validatePasswordConfirm('abcd123!', '')).not.toBeNull();
  });
});
