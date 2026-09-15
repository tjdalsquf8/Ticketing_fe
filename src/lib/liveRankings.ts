import { apiFetchEnvelope, ROUTES } from "./api";
import type { LiveRoundStatus } from "./live";

/* ─────────────────────────────────────────────
   liveRankings.ts — 실시간 "회차 단위" 랭킹
   GET /api/live/rounds/:roundId/rankings

   rankings.ts(누적 최고기록 랭킹)와 별개다. 누적 쪽 RankEntry.best_ms 는
   기간 내 최고기록이고 nickname 은 그 기록을 낸 시점의 스냅샷이지만,
   여기 elapsed_ms 는 "그 회차에서의 소요 시간", nickname 은 "그 회차에서 쓴 이름"
   이라 개명해도 표시가 어긋나지 않는다.
   ───────────────────────────────────────────── */

/** 회차 랭킹 한 행. 동률은 등수를 공유한다(1, 1, 3). */
export interface RoundRankEntry {
  rank: number;
  nickname: string;
  /** 예매하기 클릭 ~ 예매 완료까지(대기열 대기 시간 포함) 서버가 계산한 소요 시간. */
  elapsed_ms: number;
  is_verified: boolean;
  seat_label: string | null;
}

export interface RoundRankingsPage {
  rows: RoundRankEntry[];
  /** 페이지 밖이어도 항상 채워지는 내 순위. 미완주/식별 불가면 null. */
  me: RoundRankEntry | null;
  totalCount: number;
  roundStatus: LiveRoundStatus | null;
}

/** 회차 랭킹 페이지 크기. 서버 허용 범위 1~100. */
export const ROUND_RANKING_PAGE_SIZE = 20;

function toFiniteNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/**
 * snake_case / camelCase 양쪽을 흡수한다. 같은 live 네임스페이스 안에서도
 * 기존 응답은 camelCase(`elapsedMs`), 이 엔드포인트 스펙은 snake_case(`elapsed_ms`)라
 * 표기가 갈려 있어 한쪽만 믿으면 조용히 빈 랭킹이 된다.
 */
function normalizeRoundRankEntry(v: unknown): RoundRankEntry | null {
  if (!v || typeof v !== "object") return null;
  const e = v as Record<string, unknown>;

  const rank = toFiniteNumber(e.rank);
  const elapsed = toFiniteNumber(e.elapsed_ms ?? e.elapsedMs);
  const nickname = e.nickname;
  if (rank === null || elapsed === null || typeof nickname !== "string") {
    return null;
  }

  const verified = e.is_verified ?? e.isVerified;
  const seat = e.seat_label ?? e.seatLabel;

  return {
    rank,
    nickname,
    elapsed_ms: elapsed,
    is_verified: verified === true,
    seat_label: typeof seat === "string" ? seat : null,
  };
}

const ROUND_STATUSES: LiveRoundStatus[] = [
  "scheduled",
  "open",
  "closed",
  "cancelled",
];

function normalizeRoundStatus(v: unknown): LiveRoundStatus | null {
  return ROUND_STATUSES.find((s) => s === v) ?? null;
}

/**
 * 회차 랭킹 한 페이지. `period` 파라미터는 없다 — 회차 자체가 시간 범위다.
 *
 * 게스트 식별이 httpOnly `guest_uuid` 쿠키뿐이라 `me` 를 받으려면 쿠키가 실려야
 * 하는데, 공용 fetch 가 이미 `credentials: "include"` 로 보낸다.
 */
export async function getRoundRankings(
  roundId: number | string,
  page = 1,
  size = ROUND_RANKING_PAGE_SIZE,
): Promise<RoundRankingsPage> {
  const qs = new URLSearchParams({ page: String(page), size: String(size) });
  const envelope = await apiFetchEnvelope<unknown[]>(
    `${ROUTES.live.roundRankings(roundId)}?${qs.toString()}`,
  );

  const rows = Array.isArray(envelope.data)
    ? envelope.data
        .map(normalizeRoundRankEntry)
        .filter((e): e is RoundRankEntry => e !== null)
    : [];

  // `me` 는 봉투 최상위 키 스펙이지만 meta 안으로 들어와도 받아준다.
  const meta = (envelope.meta ?? {}) as Record<string, unknown>;
  const me = normalizeRoundRankEntry(envelope.me ?? meta.me);

  return {
    rows,
    me,
    totalCount: toFiniteNumber(meta.totalCount) ?? rows.length,
    roundStatus: normalizeRoundStatus(meta.roundStatus),
  };
}

/**
 * 다음 페이지를 더 불러와도 되는지. 누적 랭킹(`/rankings`)과 달리 100위 상한도,
 * 상한 초과 page 를 마지막 페이지로 clamp 해 되돌려주는 동작도 없다.
 * 그래도 clamp 재발 시 같은 행이 무한 append 되지 않도록 totalCount 로도 막는다.
 */
export function hasMoreRoundRankings(
  page: number,
  rowsInPage: number,
  totalCount: number,
  size = ROUND_RANKING_PAGE_SIZE,
): boolean {
  if (rowsInPage < size) return false;
  return page * size < totalCount;
}
