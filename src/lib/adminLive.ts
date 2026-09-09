import { apiFetch, ROUTES } from "./api";
import type { AdminStats } from "./stats";

export type LiveRoundStatus = "scheduled" | "open" | "closed" | "cancelled";

export interface LiveConfig {
  /**
   * 라이브 라운드에 배치될 공연장의 백엔드 정수 PK (venues.id).
   * BE 리팩터: 기존 defaultEventId (이벤트 기반) → defaultVenueId (공연장 기반).
   * PUT /admin/live/config/venue 로 저장하며, 라운드 pre-create 시 스냅샷 복사됨.
   * 주의: public 라이브 응답의 round.venueId 는 slug 문자열이라 타입이 다르다.
   */
  defaultVenueId: number;
  defaultSeatLabels: string[];
  /**
   * 매일 00시 cron이 24개 회차를 생성할 때 제외할 시간대 (0~23).
   * 예: [3, 4, 5] → 03·04·05시 회차 생성 스킵.
   * 다음 날 00시 cron부터 적용. 오늘 이미 생성된 회차는 변경 없음.
   */
  excludedHours?: number[];
  /** 초기 세팅 전에는 null 가능. */
  updatedBy: number | null;
  updatedAt: string;
}

export interface LiveRound {
  id: number;
  opensAt: string;
  closesAt: string;
  status: LiveRoundStatus;
  createdAt: string;
  participantCount: number;
}

export interface LiveRoundDetail {
  round: {
    id: number;
    opensAt: string;
    closesAt: string;
    seatLabels: string[];
    status: LiveRoundStatus;
    createdAt: string;
  };
  waitingCount: number;
  seatsSummary: { available: number; held: number; sold: number };
  top10: Array<{
    rank: number;
    sessionId: string;
    nickname: string;
    seatLabel: string;
    elapsedMs: number;
    isMember: boolean;
  }>;
}

// ── Config ─────────────────────────────────────────────

export function getLiveConfig() {
  return apiFetch<LiveConfig | null>(ROUTES.admin.liveConfig);
}

/** 공연장 배치(defaultVenueId + defaultSeatLabels)만 저장. 스케줄과 독립. */
export function putLiveVenueConfig(body: {
  defaultVenueId: number;
  defaultSeatLabels: string[];
}) {
  return apiFetch<LiveConfig>(ROUTES.admin.liveConfigVenue, {
    method: "PUT",
    body,
  });
}

/** 회차 제외 시간대(excludedHours)만 저장. 공연 배치와 독립. */
export function putLiveScheduleConfig(body: {
  excludedHours: number[];
}) {
  return apiFetch<LiveConfig>(ROUTES.admin.liveConfigSchedule, {
    method: "PUT",
    body,
  });
}

// ── Rounds ─────────────────────────────────────────────

export function listRounds(params: {
  date?: string;
  from?: string;
  to?: string;
}) {
  const qs = new URLSearchParams();
  if (params.date) qs.set("date", params.date);
  else {
    if (params.from) qs.set("from", params.from);
    if (params.to) qs.set("to", params.to);
  }
  const url = qs.toString()
    ? `${ROUTES.admin.liveRounds}?${qs}`
    : ROUTES.admin.liveRounds;
  return apiFetch<LiveRound[]>(url);
}

export function getRoundDetail(roundId: number) {
  return apiFetch<LiveRoundDetail>(ROUTES.admin.liveRoundDetail(roundId));
}

export function cancelRound(roundId: number) {
  return apiFetch<LiveRound>(ROUTES.admin.liveRoundCancel(roundId), {
    method: "PATCH",
  });
}

/** BE `/api/admin/live/rounds/:roundId/stats` 응답. */
export type AdminRoundStats = AdminStats & { roundId: number };

/**
 * GET /api/admin/live/rounds/:roundId/stats — 라이브 라운드 결과 통계 (관리자).
 * 응답 shape 은 이벤트 stats 와 동일 (eventId → roundId 만 다름).
 * netRevenue 는 라이브가 무료이므로 항상 0. UI 는 매출 필드 렌더 skip.
 */
export function getAdminRoundStats(roundId: number | string) {
  return apiFetch<AdminRoundStats>(ROUTES.admin.liveRoundStats(roundId));
}

// ── Cron 수동 실행 ─────────────────────────────────────
//
// 서버 다운타임 동안 놓친 KST 00시 크론(회차 pre-create) 을 백필하거나,
// 상태 전이(scheduled → open → closed) 를 즉시 강제 실행하기 위한 관리자 툴.
// 실서비스에서 자주 쓰면 안 되고, 스케줄러 장애 복구용 escape hatch.

export type LiveCronJob =
  | 'ensure'      // 회차 pre-create (fromMidnight=true 면 KST 오늘 00시부터 백필)
  | 'transition'; // scheduled → open → closed 상태 전이

export interface LiveCronRunResult {
  job: LiveCronJob;
  /** ensure 응답에만 포함. 다른 job 은 서버가 생략. */
  fromMidnight?: boolean;
  durationMs: number;
}

/**
 * POST /api/admin/live/cron/run — 관리자 전용, 스케줄러 job 즉시 실행.
 * `fromMidnight` 는 job === 'ensure' 일 때만 서버가 해석. 다른 job 은 무시.
 */
export function runAdminLiveCron(
  job: LiveCronJob,
  opts?: { fromMidnight?: boolean },
) {
  const body: Record<string, unknown> = { job };
  if (job === 'ensure' && opts?.fromMidnight) body.fromMidnight = true;
  return apiFetch<LiveCronRunResult>(ROUTES.admin.liveCronRun, {
    method: 'POST',
    body,
  });
}

// ── 테스트용 즉시 생성 (임시) ─────────────────────────
//
// 매시 정각까지 기다리지 않고 지금 시각 기준으로 라운드를 바로 여는 테스트 escape hatch.
// 테스트 끝나면 이 함수 + FE 버튼 제거 대상.

/** POST /api/admin/live/rounds/create-now — 지금 시각 기준 라운드 즉시 생성(테스트용). */
export function createRoundNow() {
  return apiFetch<LiveRound>(ROUTES.admin.liveRoundCreateNow, {
    method: 'POST',
  });
}
