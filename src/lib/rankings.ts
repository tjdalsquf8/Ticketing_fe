import { apiFetch, ROUTES } from "./api";

/* ─────────────────────────────────────────────
   rankings.ts — 클라이언트 컴포넌트용 랭킹 fetch
   /ranking/page.tsx(서버 컴포넌트, raw fetch)와 별개로,
   /live, /practice 페이지에 인라인으로 박는 랭킹 섹션용.
   ───────────────────────────────────────────── */

export type RankingMode = "practice" | "live";
export type RankingPeriod = "daily" | "weekly" | "monthly" | "all";

/**
 * 리더보드 한 행. `nickname` 은 **최고기록을 낸 시점의 스냅샷**이지 현재 닉네임이
 * 아니다 (개명으로 과거 순위를 소급 조작하는 사칭 차단). 응답에 식별자가 없어서
 * 목록에서 "내 행"을 골라낼 수는 없다 — 내 순위는 getMyBestRanking 으로 따로 받는다.
 */
export interface RankEntry {
  rank: number;
  nickname: string;
  best_ms: number;
  is_verified: boolean;
}

/**
 * 내 기록 한 행. 전부 본인 기록이므로 nickname 을 내려주지 않는다.
 * 집계가 아니라 시도 한 건이 한 행이라 `started_at`(시도 시각)이 같이 온다 —
 * 리더보드(getRankings)는 identity 별 집계라 이 필드가 없다.
 */
export interface MyRankEntry {
  rank: number;
  best_ms: number;
  is_verified: boolean;
  started_at: string | null;
}

function toFiniteNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function normalizeMyRankEntry(v: unknown): MyRankEntry | null {
  if (!v || typeof v !== "object") return null;
  const e = v as Record<string, unknown>;
  const rank = toFiniteNumber(e.rank);
  const best_ms = toFiniteNumber(e.best_ms);
  if (rank === null || best_ms === null || typeof e.is_verified !== "boolean") {
    return null;
  }
  return {
    rank,
    best_ms,
    is_verified: e.is_verified,
    started_at: typeof e.started_at === "string" ? e.started_at : null,
  };
}

function normalizeRankEntry(v: unknown): RankEntry | null {
  const base = normalizeMyRankEntry(v);
  if (base === null) return null;
  const nickname = (v as Record<string, unknown>).nickname;
  if (typeof nickname !== "string") return null;
  return { ...base, nickname };
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

/**
 * 내 기록. GET /rankings/me
 * 인증 불필요 — 게스트는 guest_uuid 쿠키로 식별된다. 식별 불가 시 빈 배열.
 */
export async function getMyRankings(params: RankingParams): Promise<MyRankEntry[]> {
  const data = await apiFetch<unknown[]>(`${ROUTES.rankings}/me?${buildQuery(params)}`);
  if (!Array.isArray(data)) return [];
  return data.map(normalizeMyRankEntry).filter((e): e is MyRankEntry => e !== null);
}

/**
 * 내 최고기록과 순위. GET /rankings/me/best
 * 리더보드는 상위 100명까지만 내려주므로, 그 밖의 순위를 하단에 고정 표시하려면
 * 이걸 따로 받아야 한다. rank 는 /rankings 목록의 순위와 일치한다.
 * 인증 불필요. 식별 불가하거나 완주 기록이 없으면 null.
 */
export async function getMyBestRanking(
  params: Omit<RankingParams, "page">,
): Promise<RankEntry | null> {
  const qs = new URLSearchParams({ mode: params.mode, period: params.period });
  if (params.eventId !== undefined) qs.set("eventId", String(params.eventId));
  const data = await apiFetch<unknown>(`${ROUTES.rankings}/me/best?${qs.toString()}`);
  return normalizeRankEntry(data);
}
