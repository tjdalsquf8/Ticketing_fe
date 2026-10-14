import { apiFetch, ROUTES } from "./api";

// ── 타입 정의 ─────────────────────────────────────────

export type LiveRoundStatus = "scheduled" | "open" | "closed" | "cancelled";
export type LiveSeatStatus = "available" | "held" | "sold";
/** `failed` 는 이탈(DELETE)·라운드 마감으로 끝난 세션. 재참여 시 새 세션이 발급된다. */
export type LiveSessionStatus = "queued" | "active" | "completed" | "failed";

/**
 * GET /api/live/current · /api/live/next · /api/live/rounds/:roundId · /api/live/last-round 공통 페이로드.
 *
 * BE 리팩터로 이벤트 참조가 제거되고 공연장 기반으로 바뀌었다.
 * - 기존 `eventId: number` 제거
 * - 신규 `venueId: string` (venues.slug 문자열) — FE 는 이 값으로 LIVE_EVENTS 카탈로그를 룩업한다
 *
 * 주의: admin `LiveConfig.defaultVenueId` 는 **정수 PK**, 여기 `venueId` 는 **slug 문자열**.
 * 이름은 같아도 타입이 다르므로 자료구조 오해 주의 (BE 팀 공지).
 */
/** GET /api/live/rounds/:roundId 전용 필드. 요청자(로그인 유저/게스트 쿠키) 기준 참여 이력. */
export interface LiveMyParticipation {
  sessionId: string;
  status: LiveSessionStatus;
  queuePosition: number | null;
  seatLabel: string | null;
  elapsedMs: number | null;
}

export interface LiveRoundSummary {
  roundId: number;
  opensAt: string;
  closesAt: string;
  venueId: string;
  status: LiveRoundStatus;
  totalSeats: number;
  /** GET /api/live/rounds/:roundId 에서만 내려옴. 참여 이력 없거나 식별 불가면 null. */
  myParticipation?: LiveMyParticipation | null;
}

/** GET /api/live/rounds/:roundId. */
export type LiveRoundPublic = LiveRoundSummary;

/** POST /api/live/rounds/:roundId/sessions. queued 이면 queuePosition 양수, active 이면 null. */
export interface LiveSession {
  sessionId: string;
  status: LiveSessionStatus;
  queuePosition: number | null;
  startedAt: string | null;
  nickname?: string;
}

/** 대기열 스트림 `snapshot` / `queue_update` payload. */
export interface LiveQueueState {
  sessionId: string;
  status: LiveSessionStatus;
  queuePosition: number | null;
  ready: boolean;
}

export interface LiveSeat {
  seatLabel: string;
  status: LiveSeatStatus;
}

export interface LiveSeatMap {
  seats: LiveSeat[];
  myHold: { seatLabel: string; expiresAt: string } | null;
}

/** 좌석 스트림 `seat_update` payload — 변경된 좌석 한 건만 온다. */
export interface LiveSeatUpdate {
  seatLabel: string;
  status: LiveSeatStatus;
  contextType: "round" | "event";
  contextId: number;
}

export interface LiveHold {
  seatLabel: string;
  expiresAt: string;
}

/** POST /api/live/sessions/:sessionId/confirm. */
export interface LiveConfirmResult {
  rankNumber: number;
  elapsedMs: number;
}

export interface LastRoundResult {
  round: LiveRoundSummary;
  rankings: Array<{
    rank: number;
    nickname: string;
    seatLabel: string;
    elapsedMs: number;
    isMember: boolean;
  }>;
}

// ── 공용 조회 ─────────────────────────────────────────

/** 진행중 회차. 없으면 null. */
export function getLiveCurrent() {
  return apiFetch<LiveRoundSummary | null>(ROUTES.live.current);
}

/** 다음 예정 회차. 없으면 null. */
export function getLiveNext() {
  return apiFetch<LiveRoundSummary | null>(ROUTES.live.next);
}

/** 회차 상세. 상세 페이지 진입 시 1회. */
export function getLiveRound(roundId: number | string) {
  return apiFetch<LiveRoundPublic>(ROUTES.live.round(roundId));
}

/** 지난 회차 TOP N. 종료 회차 없으면 null. */
export function getLastRound(limit = 10) {
  return apiFetch<LastRoundResult | null>(ROUTES.live.lastRound(limit));
}

/** 서버 시각 (clock drift 보정). */
export function getServerTime() {
  return apiFetch<{ now: string }>(ROUTES.time);
}

// ── 참여 흐름 ─────────────────────────────────────────

/** 라이브 세션 시작. 1인 1세션 idempotent. 게스트는 nickname 필수. */
export function startLiveSession(
  roundId: number | string,
  body: { nickname?: string } = {},
) {
  return apiFetch<LiveSession>(ROUTES.live.roundSessions(roundId), {
    method: "POST",
    body,
  });
}

/**
 * 세션 이탈. active/queued 세션을 failed 로 종료하고 hold 중이던 좌석을 반환한다.
 * 이미 failed 면 멱등하게 성공, completed 면 409 ALREADY_COMPLETED.
 * 이탈 후 다시 참여하면 새 sessionId · 새 started_at 으로 시작한다.
 */
export function leaveLiveSession(sessionId: string) {
  return apiFetch<unknown>(ROUTES.live.session(sessionId).root, {
    method: "DELETE",
  });
}

/**
 * 대기열 순번 SSE URL. `snapshot` / `queue_update` 이벤트로 LiveQueueState 가 push 된다.
 * (기존 폴링 엔드포인트 GET /live/sessions/:id/queue 는 삭제됨.)
 */
export function liveQueueStreamUrl(roundId: number | string, sessionId: string) {
  return ROUTES.live.roundQueueStream(roundId, sessionId);
}

/**
 * 좌석맵 SSE URL. `snapshot`(전체) 1회 + `seat_update`(변경분) push.
 * (기존 폴링 엔드포인트 GET /live/sessions/:id/seats 는 삭제됨.)
 */
export function liveSeatsStreamUrl(roundId: number | string, sessionId: string) {
  return ROUTES.live.roundSeatsStream(roundId, sessionId);
}

/** 좌석 hold. 재호출 시 기존 hold 자동 해제. TTL 30초. */
export function holdSeat(sessionId: string, seatLabel: string) {
  return apiFetch<LiveHold>(ROUTES.live.session(sessionId).hold, {
    method: "POST",
    body: { seatLabel },
  });
}

/**
 * 좌석 확정. clientElapsedMs 없음 (서버 계산).
 *
 * 방어적 정규화:
 *   백엔드가 camelCase 계약을 지키지 못하고 snake_case (`rank_number`, `elapsed_ms`)
 *   로 응답하는 경우에도 프론트가 오분기하지 않도록 응답 원본을 관대한 매핑으로
 *   흡수해 통일된 `LiveConfirmResult`로 반환한다. 필드가 실제로 없으면 0을 유지
 *   → 백엔드 계약 위반은 그때만 드러난다.
 */
export async function confirmSeat(
  sessionId: string,
  seatLabel: string,
): Promise<LiveConfirmResult> {
  const raw = await apiFetch<Record<string, unknown>>(
    ROUTES.live.session(sessionId).confirm,
    { method: "POST", body: { seatLabel } },
  );

  const pickNumber = (...vals: unknown[]): number | null => {
    for (const v of vals) {
      if (typeof v === "number" && Number.isFinite(v)) return v;
      if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
        return Number(v);
      }
    }
    return null;
  };

  const rankNumber =
    pickNumber(
      (raw as Record<string, unknown>)?.rankNumber,
      (raw as Record<string, unknown>)?.rank_number,
      (raw as Record<string, unknown>)?.rank,
    ) ?? 0;

  const elapsedMs =
    pickNumber(
      (raw as Record<string, unknown>)?.elapsedMs,
      (raw as Record<string, unknown>)?.elapsed_ms,
      (raw as Record<string, unknown>)?.elapsed,
    ) ?? 0;

  const normalized: LiveConfirmResult = { rankNumber, elapsedMs };

  if (process.env.NODE_ENV !== "production" && typeof console !== "undefined") {
    const rawKeys =
      raw && typeof raw === "object" ? Object.keys(raw as object) : [];
    console.log(
      "[live] confirmSeat raw response →",
      raw,
      "keys:",
      rawKeys,
      "normalized:",
      normalized,
    );
  }

  return normalized;
}
