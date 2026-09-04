import { apiFetch, apiFetchWithMeta, ROUTES } from './api';
import type { ListMeta } from './events';

/* ─────────────────────────────────────────────
   공지사항 API — /api/notices (공개), /api/admin/notices (관리자 CRUD)
   ─ md/plan.md §"공지사항 API" 기반. draft 상태 없음 — 생성 즉시 공개.
   ─ 클릭 시 항상 자체 상세페이지(/notices/:id)로 이동 — 외부 링크 입력 없음.
   ───────────────────────────────────────────── */

export type NoticeKind = 'notice' | 'update' | 'fix';

export interface Notice {
  id: number;
  kind: NoticeKind;
  title: string;
  createdAt: string;
}

export interface NoticeDetail extends Notice {
  content: string | null;
}

export interface CreateNoticeBody {
  kind: NoticeKind;
  title: string;
  content?: string;
}

export interface UpdateNoticeBody {
  kind?: NoticeKind;
  title?: string;
  content?: string;
}

/** GET /api/notices — 공개 목록, createdAt DESC. */
export function listNotices(limit = 20) {
  return apiFetch<Notice[]>(ROUTES.notices(limit));
}

/** GET /api/notices/:id — 공개 상세, content 포함. */
export function getNotice(id: number | string) {
  return apiFetch<NoticeDetail>(ROUTES.noticeDetail(id));
}

/** GET /api/admin/notices — 관리자 목록(content 포함), page/limit 페이지네이션. */
export function listAdminNotices(params: { page?: number; limit?: number } = {}) {
  const usp = new URLSearchParams();
  if (params.page) usp.set('page', String(params.page));
  if (params.limit) usp.set('limit', String(params.limit));
  const qs = usp.toString();
  return apiFetchWithMeta<NoticeDetail[], ListMeta>(
    `${ROUTES.admin.notices}${qs ? `?${qs}` : ''}`,
  );
}

/** POST /api/admin/notices */
export function createNotice(body: CreateNoticeBody) {
  return apiFetch<NoticeDetail>(ROUTES.admin.notices, {
    method: 'POST',
    body: body as unknown as Record<string, unknown>,
  });
}

/** PATCH /api/admin/notices/:id */
export function updateNotice(id: number | string, body: UpdateNoticeBody) {
  return apiFetch<NoticeDetail>(ROUTES.admin.noticeDetail(id), {
    method: 'PATCH',
    body: body as unknown as Record<string, unknown>,
  });
}

/** DELETE /api/admin/notices/:id */
export function deleteNotice(id: number | string) {
  return apiFetch<null>(ROUTES.admin.noticeDetail(id), { method: 'DELETE' });
}
