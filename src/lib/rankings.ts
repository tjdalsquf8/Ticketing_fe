import { apiFetch, ROUTES } from "./api";

/* ─────────────────────────────────────────────
   rankings.ts — 클라이언트 컴포넌트용 랭킹 fetch
   /ranking/page.tsx(서버 컴포넌트, raw fetch)와 별개로,
   /live, /practice 페이지에 인라인으로 박는 랭킹 섹션용.
   ───────────────────────────────────────────── */

export type RankingMode = "practice" | "live";
export type RankingPeriod = "daily" | "weekly" | "monthly";

export interface RankEntry {
  rank: number;
  nickname: string;
  best_ms: number;
  is_verified: boolean;
}

function toFiniteNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function normalizeRankEntry(v: unknown): RankEntry | null {
  if (!v || typeof v !== "object") return null;
  const e = v as Record<string, unknown>;
  const rank = toFiniteNumber(e.rank);
  const best_ms = toFiniteNumber(e.best_ms);
  if (
    rank === null ||
    best_ms === null ||
    typeof e.nickname !== "string" ||
    typeof e.is_verified !== "boolean"
  ) return null;
  return { rank, nickname: e.nickname, best_ms, is_verified: e.is_verified };
}

interface RankingParams {
  mode: RankingMode;
  period: RankingPeriod;
  eventId?: number;
}

function buildQuery(params: RankingParams): string {
  const qs = new URLSearchParams({
    mode: params.mode,
    period: params.period,
    page: "1",
    size: "20",
  });
  if (params.eventId !== undefined) qs.set("eventId", String(params.eventId));
  return qs.toString();
}

/** 전체 랭킹. GET /rankings */
export async function getRankings(params: RankingParams): Promise<RankEntry[]> {
  const data = await apiFetch<unknown[]>(`${ROUTES.rankings}?${buildQuery(params)}`);
  if (!Array.isArray(data)) return [];
  return data.map(normalizeRankEntry).filter((e): e is RankEntry => e !== null);
}

/** 내 기록. GET /rankings/me */
export async function getMyRankings(params: RankingParams): Promise<RankEntry[]> {
  const data = await apiFetch<unknown[]>(`${ROUTES.rankings}/me?${buildQuery(params)}`);
  if (!Array.isArray(data)) return [];
  return data.map(normalizeRankEntry).filter((e): e is RankEntry => e !== null);
}
