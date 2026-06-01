export const MIN_NAME_LENGTH = 1;
export const MAX_NAME_LENGTH = 100;

/** ID(UUID/slug) 최대 길이 */
export const MAX_ID_LENGTH = 64;

/** 비밀번호 길이 제약 (본체 pullim 정렬). */
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 64;

/**
 * 비밀번호 복잡도 — 영문 + 숫자 + 특수문자 각 1개 이상 (본체 정렬).
 */
export const PASSWORD_PATTERN =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[~!@#$%^&*()_+\-={}[\]|;:'",.<>/?]).+$/;
