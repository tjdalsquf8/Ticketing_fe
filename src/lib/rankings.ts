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
  page?: number;
}

function buildQuery(params: RankingParams): string {
  const qs = new URLSearchParams({
    mode: params.mode,
    period: params.period,
    page: String(params.page ?? 1),
    size: String(RANKING_PAGE_SIZE),
  });
  if (params.eventId !== undefined) qs.set("eventId", String(params.eventId));
  return qs.toString();
}

/** 무한스크롤 시 고정 페이지 크기 (백엔드 스펙: size=20 고정). */
export const RANKING_PAGE_SIZE = 20;
/** 서버가 유지하는 랭킹 상한. size=20 기준 page 5(=100번째)가 마지막 페이지. */
const RANKING_MAX_PAGE = 5;

/**
 * 다음 페이지를 더 불러와도 되는지 판단.
 * 서버는 page가 마지막 페이지(5)를 넘어가도 에러 없이 마지막 페이지 결과를
 * 그대로 다시 내려준다(조용히 clamp) — meta.totalCount(DB 전체 인원수, 100
 * 초과 가능)로 종료 조건을 잡으면 이 clamp된 페이지가 중복으로 append된다.
 * 그래서 종료 조건은 반드시 "요청한 page가 상한(5)에 도달" 또는 "이번 페이지가
 * 꽉 찬 20개보다 적게 옴(마지막 페이지)" 둘 중 하나로만 판단한다.
 */
export function hasMoreRankings(page: number, rowsInPage: number): boolean {
  if (page >= RANKING_MAX_PAGE) return false;
  return rowsInPage === RANKING_PAGE_SIZE;
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
