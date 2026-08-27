/* ──────────────────────────────────────────
   서버 응답 값에 대한 방어적 sanitizer.
   ─ 계약(§API_docs)이 유지된다는 전제에도 형식이 어긋난 값이
     인라인 style / <img src> 로 흘러들어가면 CSS 인젝션 / javascript: 스킴
     XSS 벡터가 될 수 있어 심층 방어(defense-in-depth) 용도.
   ────────────────────────────────────────── */

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
const DEFAULT_POSTER_COLOR = "#0B1220";

/** posterColor 등 인라인 style 로 들어가는 색상값. #RRGGBB 만 허용. */
export function safeHexColor(
  value: string | null | undefined,
  fallback: string = DEFAULT_POSTER_COLOR,
): string {
  if (typeof value === "string" && HEX_COLOR.test(value)) return value;
  return fallback;
}

/**
 * <Image src> / <img src> 로 들어가는 URL.
 * - 상대 경로("/..")
 * - https:// 절대 URL
 * 만 통과. javascript:, data:, vbscript: 등은 차단.
 */
export function safeImageUrl(
  value: string | null | undefined,
): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.protocol === "https:") return url.toString();
    return undefined;
  } catch {
    return undefined;
  }
}
