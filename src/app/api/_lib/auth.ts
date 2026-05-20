const FALLBACK_USER_ID = 'student_001';

export function getUserId(req: Request): string {
  return req.headers.get('x-user-id') ?? FALLBACK_USER_ID;
}
