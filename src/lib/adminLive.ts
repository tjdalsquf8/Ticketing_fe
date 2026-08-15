import { apiFetch, ROUTES } from "./api";

export type LiveRoundStatus = "scheduled" | "open" | "closed" | "cancelled";

export interface LiveConfig {
  defaultEventId: number;
  defaultSeatLabels: string[];
  /**
   * 매일 00시 cron이 24개 회차를 생성할 때 제외할 시간대 (0~23).
   * 예: [3, 4, 5] → 03·04·05시 회차 생성 스킵.
   * 다음 날 00시 cron부터 적용. 오늘 이미 생성된 회차는 변경 없음.
   */
  excludedHours?: number[];
  updatedBy: number;
  updatedAt: string;
}

export interface LiveRound {
  id: number;
  opensAt: string;
  closesAt: string;
  eventId: number;
  status: LiveRoundStatus;
  createdAt: string;
  participantCount: number;
}

export interface LiveRoundDetail {
  round: {
    id: number;
    opensAt: string;
    closesAt: string;
    eventId: number;
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

/** 공연 배치(defaultEventId + defaultSeatLabels)만 저장. 스케줄과 독립. */
export function putLiveEventConfig(body: {
  defaultEventId: number;
  defaultSeatLabels: string[];
}) {
  return apiFetch<LiveConfig>(ROUTES.admin.liveConfigEvent, {
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
