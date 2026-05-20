import { apiErrorStatus, type ApiErrorCode } from './errors';

export function ok<T>(data: T): Response {
  return Response.json({ data });
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  details?: Record<string, unknown>,
): Response {
  const body = details
    ? { error: { code, message, details } }
    : { error: { code, message } };
  return Response.json(body, { status: apiErrorStatus[code] });
}
