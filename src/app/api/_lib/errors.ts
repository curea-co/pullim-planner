export type ApiErrorCode =
  | 'not_found'
  | 'validation_failed'
  | 'conflict'
  | 'forbidden'
  | 'internal';

export const apiErrorStatus: Record<ApiErrorCode, number> = {
  not_found: 404,
  validation_failed: 422,
  conflict: 409,
  forbidden: 403,
  internal: 500,
};
