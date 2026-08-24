import { apiFetch, ROUTES } from "./api";

// ── 타입 정의 ─────────────────────────────────────────

export type LiveRoundStatus = "scheduled" | "open" | "closed" | "cancelled";
export type LiveSeatStatus = "available" | "held" | "sold";
export type LiveSessionStatus = "queued" | "active" | "completed";

/** GET /api/live/current · /api/live/next 공통 페이로드. */
export interface LiveRoundSummary {
  roundId: number;
  opensAt: string;
  closesAt: string;
  eventId: number;
  status: LiveRoundStatus;
  totalSeats: number;
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

/** GET /api/live/sessions/:sessionId/queue. */
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

export interface LiveHold {
  seatLabel: string;
  expiresAt: string;
}

/** POST /api/live/sessions/:sessionId/confirm. ticketId 는 회원 && rankNumber<=10 만. */
export interface LiveConfirmResult {
  rankNumber: number;
  elapsedMs: number;
  ticketId: number | null;
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

/** 큐 순번 조회. ready=true 시 폴링 중단. 권장 주기 1초. */
export function getLiveQueue(sessionId: string) {
  return apiFetch<LiveQueueState>(ROUTES.live.session(sessionId).queue);
}

/** 좌석 배치 조회. 첫 진입 + 2초 폴링 갱신. */
export function getLiveSeats(sessionId: string) {
  return apiFetch<LiveSeatMap>(ROUTES.live.session(sessionId).seats);
}

/** 좌석 hold. 재호출 시 기존 hold 자동 해제. TTL 30초. */
export function holdSeat(sessionId: string, seatLabel: string) {
  return apiFetch<LiveHold>(ROUTES.live.session(sessionId).hold, {
    method: "POST",
    body: { seatLabel },
  });
}

/** 좌석 확정. clientElapsedMs 없음 (서버 계산). 회원 TOP10 만 ticketId 발급. */
export function confirmSeat(sessionId: string, seatLabel: string) {
  return apiFetch<LiveConfirmResult>(ROUTES.live.session(sessionId).confirm, {
    method: "POST",
    body: { seatLabel },
  });
}
