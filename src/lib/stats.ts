/* ──────────────────────────────────────────
   Admin stats 공용 타입
   ─ 이벤트 stats(`/api/admin/events/:eventId/stats`)와
     라이브 라운드 stats(`/api/admin/live/rounds/:roundId/stats`)는
     식별자 필드(eventId/roundId)만 다르고 나머지 shape 이 동일.
   ─ 여기 정의한 AdminStats 를 두 곳에서 파생 타입으로 재사용.
   ────────────────────────────────────────── */

export type AdminStatsStatus = "scheduled" | "open" | "closed" | "cancelled";

/**
 * 이벤트/라이브 라운드 결과 통계 공통 필드.
 * - registered: 유효 신청·참여 시도 총 세션 수 (cancelled/refunded 제외)
 * - ticketed:   좌석 잡기 성공 (라이브는 top10 제한)
 * - noShow:     세션 시작했지만 좌석 못 잡음. 종료(closed) 후에만 의미
 * - netRevenue: 걷은 포인트 − 환불 포인트. 라이브는 무료라 항상 0
 */
export interface AdminStats {
  status: AdminStatsStatus;
  registered: number;
  ticketed: number;
  noShow: number;
  netRevenue: number;
}

/** 성공률(ticketed / registered) 반환. registered=0 이면 null. */
export function successRate(stats: Pick<AdminStats, "registered" | "ticketed">): number | null {
  if (!stats.registered) return null;
  return (stats.ticketed / stats.registered) * 100;
}

/** 미참여율(noShow / registered) 반환. registered=0 이면 null. */
export function noShowRate(stats: Pick<AdminStats, "registered" | "noShow">): number | null {
  if (!stats.registered) return null;
  return (stats.noShow / stats.registered) * 100;
}
