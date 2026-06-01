/**
 * HTML 특수문자를 이스케이프하여 태그/링크 주입을 방지한다.
 * @param str - 이스케이프할 문자열
 * @returns 이스케이프된 문자열
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}
