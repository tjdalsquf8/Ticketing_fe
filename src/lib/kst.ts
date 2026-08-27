/* ──────────────────────────────────────────
   KST (UTC+9) 유틸
   ─ 브라우저 로컬타임에 의존하지 않고 항상 서울 기준으로 판정
   ────────────────────────────────────────── */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function toKstShifted(iso: string | Date): Date {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  // 유효하지 않은 입력(null/undefined/Invalid Date)은 epoch 로 폴백해서
  // 페이지 전체가 크래시하지 않도록 방어.
  const ms = d && typeof d.getTime === 'function' ? d.getTime() : NaN;
  if (!Number.isFinite(ms)) return new Date(KST_OFFSET_MS);
  return new Date(ms + KST_OFFSET_MS);
}

/** ISO(또는 Date) → "YYYY-MM-DD" (KST 달력 기준) */
export function toKstDate(iso: string | Date): string {
  const k = toKstShifted(iso);
  const y = k.getUTCFullYear();
  const m = String(k.getUTCMonth() + 1).padStart(2, '0');
  const d = String(k.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 오늘 KST 날짜 "YYYY-MM-DD" */
export function getKstToday(): string {
  return toKstDate(new Date());
}

/**
 * 신청 마감 시각 (UTC ms).
 * "opensAt 전날 KST 00:00" — 즉 opensAt 해당 KST 날짜의 하루 전 자정.
 * 이 시각을 지나면 신청 불가.
 */
export function getRegistrationDeadline(opensAt: string | Date): number {
  const opensDate = toKstDate(opensAt); // "YYYY-MM-DD" KST
  const [y, m, d] = opensDate.split('-').map(Number);
  // 전날 KST 00:00 = 해당 KST 날짜의 00:00 - 24h
  // KST 00:00 in UTC = 전날 UTC 15:00
  // Date.UTC(y, m-1, d, -9, 0, 0) = 해당 KST 날짜의 00:00 UTC ms
  const opensDayKstMidnightUtc = Date.UTC(y, m - 1, d, -9, 0, 0, 0);
  return opensDayKstMidnightUtc - 24 * 60 * 60 * 1000;
}

/** 리스트/카드용 KST 날짜·시각 표시. e.g. "2026.09.03 (목) 20:00" */
export function formatKstDateTime(iso: string | Date): string {
  const k = toKstShifted(iso);
  const y = k.getUTCFullYear();
  const m = String(k.getUTCMonth() + 1).padStart(2, '0');
  const d = String(k.getUTCDate()).padStart(2, '0');
  const hh = String(k.getUTCHours()).padStart(2, '0');
  const mm = String(k.getUTCMinutes()).padStart(2, '0');
  const dow = ['일', '월', '화', '수', '목', '금', '토'][k.getUTCDay()];
  return `${y}.${m}.${d} (${dow}) ${hh}:${mm}`;
}

/** "YYYY-MM" → 해당 달 첫날 KST 00:00 의 UTC ms 정보 (달력 그리기용) */
export function getMonthMeta(ym: string): {
  year: number;
  month: number; // 1~12
  firstWeekday: number; // 0(일)~6(토) — 그 달 1일의 KST 요일
  daysInMonth: number;
} {
  const [y, m] = ym.split('-').map(Number);
  // 첫날 KST 00:00 을 UTC로 표현: Date.UTC(y, m-1, 1, -9, 0, 0)
  const firstKstMidnightUtc = new Date(Date.UTC(y, m - 1, 1, -9, 0, 0, 0));
  // 요일: 이 UTC 순간을 다시 +9h 하면 그날 KST의 자정이므로 UTC 요일이 KST 요일
  const shifted = new Date(firstKstMidnightUtc.getTime() + KST_OFFSET_MS);
  const firstWeekday = shifted.getUTCDay();
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { year: y, month: m, firstWeekday, daysInMonth };
}

/** "YYYY-MM" 이전/다음 달 계산 */
export function shiftYm(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const total = y * 12 + (m - 1) + delta;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, '0')}`;
}

/** 현재 KST 기준 "YYYY-MM" */
export function getKstCurrentYm(): string {
  return getKstToday().slice(0, 7);
}

/**
 * 남은 시간(ms) → "HH:MM:SS" 형식. 음수/0 이하는 "00:00:00" 반환.
 * 카운트다운 CTA 문구에 사용.
 */
export function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return '00:00:00';
  const total = Math.floor(msRemaining / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
