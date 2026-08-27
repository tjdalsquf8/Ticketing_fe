import { apiFetch, apiFetchWithMeta, ROUTES } from "./api";
import type { AdminStats } from "./stats";

/* ─────────────────────────────────────────────
   Events API — GET/POST/DELETE 세트
   ─ md/API_docs.md §"이벤트 · 캘린더 · 사전 신청" 기반
   ─ 응답은 카멜케이스 (VENUE_CONTRACT.md §3)
   ───────────────────────────────────────────── */

export type EventStatus = "scheduled" | "open" | "closed" | "cancelled";
export type EventCategory =
  | "concert"
  | "musical"
  | "sports"
  | "theater"
  | "festival";

export type RegistrationStatus =
  | "pending"
  | "entered"
  | "ticketed"
  | "missed"
  | "no_show"
  | "cancelled"
  | "refunded";

export interface EventListItem {
  eventId: number;
  title: string;
  category: EventCategory;
  venueId: string;
  opensAt: string;
  closesAt: string;
  status: EventStatus;
  entryFeePoints: number;
  prize: string;
  posterColor: string;
  posterInitial: string;
  registrationDeadline: string;
  registeredCount: number;
  totalSeats: number;
  /**
   * Soft delete 마킹 시각. null 이면 정상 노출.
   * BE 크론(매일 KST 00시)이 status ∈ {closed, cancelled} 대상에 세팅.
   * 공개 조회 응답에서는 hidden 인 이벤트가 애초에 제외되므로 이 필드는 항상 null.
   * 관리자 응답에서는 실제 값이 들어올 수 있다.
   */
  hiddenAt?: string | null;
}

export interface EventDetail extends EventListItem {
  myRegistration: MyRegistrationSummary | null;
}

export interface MyRegistrationSummary {
  registrationId: number;
  status: RegistrationStatus;
  pointsPaid?: number;
  refundPoints?: number;
  createdAt?: string;
}

export interface Registration {
  registrationId: number;
  eventId: number;
  userId?: number;
  status: RegistrationStatus;
  pointsPaid: number;
  refundPoints?: number;
  createdAt: string;
}

export interface MyEventRegistration extends Registration {
  event: {
    eventId: number;
    title: string;
    opensAt: string;
    venueId: string;
    posterColor: string;
    posterInitial?: string;
    category?: EventCategory;
    status?: EventStatus;
  };
}

export interface ListMeta {
  totalCount: number;
  page: number;
  limit: number;
}

export interface CalendarDay {
  date: string;
  events: Array<{
    eventId: number;
    title: string;
    prize: string;
    category: EventCategory;
    opensAt: string;
    status: EventStatus;
  }>;
}

export interface Calendar {
  ym: string;
  days: CalendarDay[];
}

export interface EventSession {
  sessionId: string;
  registrationId: number;
  eventId: number;
  status: "active" | "queued";
  queuePosition: number | null;
  startedAt: string;
}

const EVENTS_BASE = ROUTES.events;

function qs(params: Record<string, string | number | undefined>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}

/** GET /api/events — 이벤트 목록. type='live' 제외됨. */
export function listEvents(params: {
  status?: EventStatus;
  category?: EventCategory;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
} = {}) {
  return apiFetchWithMeta<EventListItem[], ListMeta>(
    `${EVENTS_BASE}${qs(params)}`,
  );
}

/** GET /api/events/calendar?ym=YYYY-MM — 월간 캘린더. Cache-Control 5분. */
export function getEventsCalendar(ym: string) {
  return apiFetch<Calendar>(`${EVENTS_BASE}/calendar${qs({ ym })}`);
}

/** GET /api/events/nearest — 신청 CTA 활성 판정용. 없으면 null. */
export function getNearestEvent() {
  return apiFetch<EventListItem | null>(`${EVENTS_BASE}/nearest`);
}

/** 최근 종료 이벤트 랭킹 1건. */
export interface LatestEventRankingEntry {
  rank: number;
  nickname: string;
  seatLabel: string;
  elapsedMs: number;
  ticketedAt: string;
}

/**
 * BE `/api/events/rankings/latest` 응답의 event 필드.
 * 공개 조회 전용이라 EventListItem 과 필드 셋이 다르므로 독립 타입으로 정의.
 * (myRegistration 등 회원 컨텍스트 필드가 없고, venueName 이 서버에서 함께 내려옴.)
 */
export interface LatestEventInfo {
  eventId: number;
  title: string;
  venueName: string;
  venueId: string;
  opensAt: string;
  closesAt: string;
  status: EventStatus;
  posterColor: string;
  posterInitial: string;
  prize: string;
  entryFeePoints: number;
  registeredCount: number;
  totalSeats: number;
  hiddenAt?: string | null;
}

export interface LatestEventRankings {
  event: LatestEventInfo | null;
  rankings: LatestEventRankingEntry[];
}

/**
 * GET /api/events/rankings/latest?limit= — 가장 최근 종료된 이벤트의 참여자 랭킹.
 * 인증 불필요, 공개 조회. limit 기본 100, 최대 500.
 * BE Cache-Control: public, max-age=5. 폴링 시 10초 이상 권장.
 * event === null 이면 아직 종료된 이벤트가 하나도 없음.
 */
export function getLatestEventRankings(limit = 100) {
  return apiFetch<LatestEventRankings>(ROUTES.eventsRankingsLatest(limit));
}

/** GET /api/events/registrations/me — 내 신청 목록. 인증 필수. */
export function listMyEventRegistrations(params: {
  status?: RegistrationStatus;
  page?: number;
  limit?: number;
} = {}) {
  return apiFetchWithMeta<MyEventRegistration[], ListMeta>(
    `${EVENTS_BASE}/registrations/me${qs(params)}`,
  );
}

/** GET /api/events/:eventId — 이벤트 상세. 로그인 시 myRegistration 포함. */
export function getEvent(eventId: number | string) {
  return apiFetch<EventDetail>(`${EVENTS_BASE}/${eventId}`);
}

/** POST /api/events/:eventId/registrations — 사전 신청 (포인트 차감). */
export function registerForEvent(eventId: number | string) {
  return apiFetch<Registration>(
    `${EVENTS_BASE}/${eventId}/registrations`,
    { method: "POST" },
  );
}

/** DELETE /api/events/:eventId/registrations/me — 신청 취소·전액 환불. */
export function cancelEventRegistration(eventId: number | string) {
  return apiFetch<Registration>(
    `${EVENTS_BASE}/${eventId}/registrations/me`,
    { method: "DELETE" },
  );
}

/** POST /api/events/:eventId/sessions — 티켓팅 세션 시작. 사전 신청자만. */
export function startEventSession(eventId: number | string) {
  return apiFetch<EventSession>(
    `${EVENTS_BASE}/${eventId}/sessions`,
    { method: "POST" },
  );
}

// ── 이벤트 세션 하위: 큐/좌석/hold/confirm ──
// 라이브 세션과 URL 프리픽스만 다르고 스키마는 동일하므로
// 기존 LiveSession/LiveSeat 타입을 그대로 재활용.

const SESSIONS_BASE = `${EVENTS_BASE}/sessions`;

export function getEventSessionQueue(sessionId: string) {
  return apiFetch<{
    sessionId: string;
    status: "active" | "queued" | "completed";
    queuePosition: number | null;
    ready: boolean;
  }>(`${SESSIONS_BASE}/${sessionId}/queue`);
}

export function getEventSessionSeats(sessionId: string) {
  return apiFetch<{
    seats: Array<{ seatLabel: string; status: "available" | "held" | "sold" }>;
    myHold: { seatLabel: string; expiresAt: string } | null;
  }>(`${SESSIONS_BASE}/${sessionId}/seats`);
}

export function holdEventSeat(sessionId: string, seatLabel: string) {
  return apiFetch<{ seatLabel: string; expiresAt: string }>(
    `${SESSIONS_BASE}/${sessionId}/hold`,
    { method: "POST", body: { seatLabel } },
  );
}

/**
 * POST /api/events/sessions/:sessionId/confirm — 좌석 확정 → 티켓 발급.
 * confirmLiveSeat 와 동일한 방어적 normalize 적용 (snake_case 응답 흡수).
 */
export async function confirmEventSeat(sessionId: string, seatLabel: string) {
  const raw = await apiFetch<Record<string, unknown>>(
    `${SESSIONS_BASE}/${sessionId}/confirm`,
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
    pickNumber(raw?.rankNumber, raw?.rank_number, raw?.rank) ?? 0;
  const elapsedMs =
    pickNumber(raw?.elapsedMs, raw?.elapsed_ms, raw?.elapsed) ?? 0;
  const ticketId = pickNumber(raw?.ticketId, raw?.ticket_id, raw?.ticketID);

  return { rankNumber, elapsedMs, ticketId };
}

/* ─────────────────────────────────────────────
   관리자 CRUD — /api/admin/events, /api/admin/event-series
   ─ 관리자 페이지 (/admin/events, /admin/events/new, /admin/events/[id]/edit)
   ───────────────────────────────────────────── */

// ROUTES.events 는 `${BASE_URL}/events` 형태. base URL만 추출해서 /admin 프리픽스 생성.
const ADMIN_BASE = ROUTES.events.slice(0, -"/events".length) + "/admin";

export interface AdminEvent extends EventListItem {}

export interface AdminVenue {
  venueId: string;
  name: string;
  layout: string;
  totalSeats: number;
  thumbnailUrl: string;
}

/** GET /api/admin/venues — 공연장 목록. 이벤트 생성 시 venueId 선택 목록에 사용. */
export function listAdminVenues() {
  return apiFetch<AdminVenue[]>(`${ADMIN_BASE}/venues`);
}

/** GET /api/admin/events — 관리자 이벤트 목록. cancelled 포함. */
export function listAdminEvents(params: {
  status?: EventStatus;
  category?: EventCategory;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
} = {}) {
  return apiFetchWithMeta<AdminEvent[], ListMeta>(
    `${ADMIN_BASE}/events${qs(params)}`,
  );
}

export interface AdminCreateEventBody {
  title: string;
  category: EventCategory;
  venueId: string;
  opensAt: string;
  durationMs?: number;
  entryFeePoints: number;
  prize: string;
  posterColor: string;
  posterInitial?: string;
}

/** POST /api/admin/events — 단발 이벤트 생성. */
export function adminCreateEvent(body: AdminCreateEventBody) {
  return apiFetch<AdminEvent>(`${ADMIN_BASE}/events`, {
    method: "POST",
    body: body as unknown as Record<string, unknown>,
  });
}

export interface AdminRecurrence {
  kind: "daily" | "weekly" | "monthly";
  startAt: string;
  weekdays?: number[];
}

export interface AdminCreateSeriesBody
  extends Omit<AdminCreateEventBody, "opensAt"> {
  recurrence: AdminRecurrence;
}

/** POST /api/admin/event-series — 반복 시리즈 생성. */
export function adminCreateEventSeries(body: AdminCreateSeriesBody) {
  return apiFetch<{ series: unknown; createdEvents: AdminEvent[] }>(
    `${ADMIN_BASE}/event-series`,
    { method: "POST", body: body as unknown as Record<string, unknown> },
  );
}

export type AdminUpdateEventBody = Partial<AdminCreateEventBody>;

/** PATCH /api/admin/events/:eventId — 상태별 수정 허용 필드 상이. */
export function adminUpdateEvent(
  eventId: number | string,
  body: AdminUpdateEventBody,
) {
  return apiFetch<AdminEvent>(`${ADMIN_BASE}/events/${eventId}`, {
    method: "PATCH",
    body: body as unknown as Record<string, unknown>,
  });
}

/** POST /api/admin/events/:eventId/cancel — 이벤트 취소 + 전원 자동 환불. */
export function adminCancelEvent(eventId: number | string, reason: string) {
  return apiFetch<AdminEvent>(`${ADMIN_BASE}/events/${eventId}/cancel`, {
    method: "POST",
    body: { reason },
  });
}

/** GET /api/admin/events/:eventId/registrations — 신청자 목록. */
export function listAdminEventRegistrations(
  eventId: number | string,
  params: { status?: RegistrationStatus; page?: number; limit?: number } = {},
) {
  return apiFetchWithMeta<
    Array<
      Registration & {
        user: { id: number; name: string; email: string };
      }
    >,
    ListMeta
  >(`${ADMIN_BASE}/events/${eventId}/registrations${qs(params)}`);
}

/** BE `/api/admin/events/:eventId/stats` 응답. */
export type AdminEventStats = AdminStats & { eventId: number };

/**
 * GET /api/admin/events/:eventId/stats — 이벤트 결과 통계 (관리자).
 * 관리자 목록 페이지에서 카드마다 호출 금지 → 이벤트 상세에서만 호출.
 * open 상태에서도 호출 가능하지만 noShow 는 종료 후에만 의미가 있다.
 */
export function getAdminEventStats(eventId: number | string) {
  return apiFetch<AdminEventStats>(
    `${ADMIN_BASE}/events/${eventId}/stats`,
  );
}

/**
 * POST /api/admin/events/cleanup — hidden 처리 즉시 실행.
 * 크론(매일 KST 00시)이 밀렸을 때 관리자 페이지에서 수동 트리거.
 * status ∈ {closed, cancelled} && hiddenAt IS NULL 대상을 즉시 처리한다.
 */
export function adminCleanupEvents() {
  return apiFetch<{ hiddenCount: number; durationMs: number }>(
    `${ADMIN_BASE}/events/cleanup`,
    { method: "POST" },
  );
}

/** POST /api/admin/event-series/:seriesId/cancel — 시리즈 전체(또는 이후) 취소. */
export function adminCancelEventSeries(
  seriesId: number | string,
  from?: string,
) {
  return apiFetch<null>(`${ADMIN_BASE}/event-series/${seriesId}/cancel`, {
    method: "POST",
    body: from ? { from } : {},
  });
}
