import { apiFetch, apiFetchWithMeta, ROUTES } from './api';
import type { ListMeta } from './events';

/* ─────────────────────────────────────────────
   정산(기프티콘) API — /api/admin/settlements/gifticons
   ─ 관리자 전용. AdminGuard가 인증/권한을 보장하므로 이 모듈은 신경 쓰지 않는다.
   ─ 유료 이벤트 TOP 3는 tickets 테이블에서 즉석 계산(rank<=3) — 별도 트리거/배치 없음.
   ─ "지급 완료" 이력만 DB에 저장. pending row는 애초에 DB에 없고, 목록 조회 시
     TOP3 계산 결과와 지급 이력을 합쳐서 내려온다.
   ───────────────────────────────────────────── */

export type GifticonSettlementStatus = 'pending' | 'issued';

export interface GifticonSettlement {
  id: string;
  eventId: number;
  eventTitle: string;
  endedAt: string;
  rank: number;
  userId: number;
  nickname: string;
  status: GifticonSettlementStatus;
  gifticonId: number | null;
  productName: string | null;
  faceValue: number | null;
  issuedAt: string | null;
}

function qs(params: Record<string, string | number | undefined>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : '';
}

/** GET /api/admin/settlements/gifticons — 유료 이벤트 TOP3 당첨자 + 지급 상태. */
export function listGifticonSettlements(params: {
  status?: GifticonSettlementStatus;
  eventId?: number;
  page?: number;
  size?: number;
} = {}) {
  return apiFetchWithMeta<GifticonSettlement[], ListMeta>(
    `${ROUTES.admin.settlementsGifticons}${qs(params)}`,
  );
}

/** POST /api/admin/settlements/gifticons/:id/issue — 재고 1건 배정 → 지급 완료 처리. */
export function issueGifticonSettlement(id: string, gifticonId: number) {
  return apiFetch<GifticonSettlement>(ROUTES.admin.settlementGifticonIssue(id), {
    method: 'POST',
    body: { gifticonId },
  });
}
