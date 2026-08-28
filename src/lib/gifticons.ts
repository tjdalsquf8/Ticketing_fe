import { apiFetch, apiFetchWithMeta, ROUTES } from './api';
import type { ListMeta } from './events';

/* ─────────────────────────────────────────────
   기프티콘 재고 API — /api/admin/gifticons
   ─ 관리자 전용. AdminGuard가 인증/권한을 보장하므로 이 모듈은 신경 쓰지 않는다.
   ─ 전량 바코드만 취급(PIN/URL 미지원). category는 고정 5종.
   ───────────────────────────────────────────── */

export type GifticonStatus = 'available' | 'issued' | 'redeemed' | 'expired';
export type GifticonCategory = 'coffee' | 'food' | 'convenience' | 'beauty' | 'etc';

export interface Gifticon {
  id: string;
  category: GifticonCategory;
  productName: string;
  faceValue: number;
  codeMasked: string;
  status: GifticonStatus;
  createdAt: string;
}

export interface GifticonDetail extends Omit<Gifticon, 'codeMasked'> {
  code: string;
}

export interface GifticonsSummary {
  total: number;
  available: number;
  issued: number;
  redeemed: number;
  expired: number;
}

export interface CreateGifticonBody {
  category: GifticonCategory;
  productName: string;
  faceValue: number;
  code: string;
}

export interface UpdateGifticonBody {
  productName?: string;
  faceValue?: number;
  code?: string;
}

const ADMIN_GIFTICONS_BASE = ROUTES.admin.gifticons;

function qs(params: Record<string, string | number | undefined>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : '';
}

/** GET /api/admin/gifticons — 재고 목록. category/status/q 필터, page/limit 페이지네이션. */
export function listGifticons(params: {
  category?: GifticonCategory;
  status?: GifticonStatus;
  q?: string;
  page?: number;
  limit?: number;
} = {}) {
  return apiFetchWithMeta<Gifticon[], ListMeta>(
    `${ADMIN_GIFTICONS_BASE}${qs(params)}`,
  );
}

/** GET /api/admin/gifticons/summary — 상태별 재고 집계. */
export function getGifticonsSummary() {
  return apiFetch<GifticonsSummary>(ROUTES.admin.gifticonsSummary);
}

/** GET /api/admin/gifticons/:id — 상세 조회. 코드 원본은 이 호출에서만 내려온다. */
export function getGifticonDetail(id: number | string) {
  return apiFetch<GifticonDetail>(ROUTES.admin.gifticonDetail(id));
}

/** POST /api/admin/gifticons — 재고 1건 등록. status는 항상 available로 시작. */
export function createGifticon(body: CreateGifticonBody) {
  return apiFetch<Gifticon>(ADMIN_GIFTICONS_BASE, {
    method: 'POST',
    body: body as unknown as Record<string, unknown>,
  });
}

/** PATCH /api/admin/gifticons/:id — available 상태 재고만 부분 수정. */
export function updateGifticon(id: number | string, body: UpdateGifticonBody) {
  return apiFetch<Gifticon>(ROUTES.admin.gifticonDetail(id), {
    method: 'PATCH',
    body: body as unknown as Record<string, unknown>,
  });
}

/** DELETE /api/admin/gifticons/:id — available 상태 재고만 삭제 가능. */
export function deleteGifticon(id: number | string) {
  return apiFetch<null>(ROUTES.admin.gifticonDetail(id), { method: 'DELETE' });
}
