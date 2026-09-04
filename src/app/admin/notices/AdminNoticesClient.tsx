'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createNotice,
  deleteNotice,
  listAdminNotices,
  updateNotice,
  type CreateNoticeBody,
  type NoticeDetail,
  type NoticeKind,
} from '@/lib/notices';
import type { ListMeta } from '@/lib/events';
import { formatKstDateTime } from '@/lib/kst';
import { ApiError } from '@/lib/errors';

/* ──────────────────────────────────────────
   /admin/notices — 공지사항 관리
   ─ GET/POST/PATCH/DELETE /api/admin/notices — draft 상태 없음, 등록 즉시 공개
   ────────────────────────────────────────── */

const KIND_LABEL: Record<NoticeKind, { text: string; cls: string }> = {
  notice: { text: '공지', cls: 'badge-info' },
  update: { text: '업데이트', cls: 'badge-success' },
  fix: { text: '수정', cls: 'badge-neutral' },
};

const PAGE_LIMIT = 20;

type ModalTarget = 'create' | NoticeDetail | null;

export default function AdminNoticesClient() {
  const [page, setPage] = useState(1);
  const [notices, setNotices] = useState<NoticeDetail[]>([]);
  const [meta, setMeta] = useState<ListMeta | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalTarget, setModalTarget] = useState<ModalTarget>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, meta: m } = await listAdminNotices({ page, limit: PAGE_LIMIT });
      setNotices(data);
      setMeta(m ?? null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '공지 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (n: NoticeDetail) => {
    if (!confirm(`"${n.title}" 공지를 삭제할까요? 되돌릴 수 없습니다.`)) return;
    setDeletingId(n.id);
    try {
      await deleteNotice(n.id);
      await load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : '삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = meta ? Math.max(1, Math.ceil(meta.totalCount / meta.limit)) : 1;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text">공지사항</h1>
          <p className="mt-1 text-sm text-text-secondary">
            홈 화면 “공지 · 업데이트” 카드에 노출됩니다. 등록 즉시 공개돼요.
          </p>
        </div>
        <button type="button" onClick={() => setModalTarget('create')} className="btn btn-solid">
          + 공지 등록
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-danger-border bg-danger-bg px-4 py-3 flex items-center justify-between gap-3"
        >
          <p className="text-sm text-danger-text">{error}</p>
          <button type="button" onClick={load} className="btn btn-outline btn-sm">
            다시 시도
          </button>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-subtle">
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap">ID</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap">종류</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">제목</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap">등록일</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-text-secondary">
                  불러오는 중…
                </td>
              </tr>
            ) : notices.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-16 text-center">
                  <div className="space-y-1">
                    <p className="text-base font-bold text-text">등록된 공지가 없어요</p>
                    <p className="text-sm text-text-secondary">공지를 등록해서 홈 화면에 노출해 보세요.</p>
                  </div>
                </td>
              </tr>
            ) : (
              notices.map((n) => {
                const k = KIND_LABEL[n.kind];
                return (
                  <tr key={n.id} className="hover:bg-bg-subtle transition-colors">
                    <td className="px-4 py-3 text-left text-xs text-text-tertiary font-mono-tabular">{n.id}</td>
                    <td className="px-4 py-3 text-left whitespace-nowrap">
                      <span className={`badge ${k.cls}`}>{k.text}</span>
                    </td>
                    <td className="px-4 py-3 text-left">
                      <p className="font-medium text-text">{n.title}</p>
                      {n.content && (
                        <p className="text-xs text-text-tertiary mt-0.5 truncate max-w-md">{n.content}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-left text-xs text-text-secondary font-mono-tabular whitespace-nowrap">
                      {formatKstDateTime(n.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-left whitespace-nowrap">
                      <div className="inline-flex gap-1.5 -ml-3">
                        <button
                          type="button"
                          onClick={() => setModalTarget(n)}
                          className="btn btn-ghost btn-sm"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(n)}
                          disabled={deletingId === n.id}
                          className="btn btn-ghost btn-sm text-danger-text disabled:opacity-50"
                        >
                          {deletingId === n.id ? '삭제 중…' : '삭제'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>

      {meta && meta.totalCount > 0 && (
        <div className="flex items-center justify-between text-sm text-text-secondary">
          <p>
            총 <span className="font-mono-tabular text-text">{meta.totalCount.toLocaleString()}</span>건
          </p>
          <div className="inline-flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn btn-outline btn-sm disabled:opacity-50"
            >
              이전
            </button>
            <span className="px-2 py-1.5 font-mono-tabular text-text-secondary">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="btn btn-outline btn-sm disabled:opacity-50"
            >
              다음
            </button>
          </div>
        </div>
      )}

      <NoticeFormModal
        key={modalTarget === 'create' ? 'create' : modalTarget === null ? 'closed' : modalTarget.id}
        target={modalTarget}
        onClose={() => setModalTarget(null)}
        onSaved={() => {
          setModalTarget(null);
          load();
        }}
      />
    </div>
  );
}

/* ── 등록/수정 모달 ─────────────────────────────────────
   target === 'create' → 등록, NoticeDetail → 수정, null → 닫힘. */

function NoticeFormModal({
  target,
  onClose,
  onSaved,
}: {
  target: ModalTarget;
  onClose: () => void;
  onSaved: () => void;
}) {
  const open = target !== null;
  const editing = target !== null && target !== 'create' ? target : null;

  const [kind, setKind] = useState<NoticeKind>(editing?.kind ?? 'notice');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [content, setContent] = useState(editing?.content ?? '');

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const firstFieldRef = useRef<HTMLSelectElement>(null);

  const isValid = title.trim().length > 0 && title.trim().length <= 120;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending) onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, pending, onClose]);

  useEffect(() => {
    if (!open) return;
    firstFieldRef.current?.focus();
  }, [open]);

  if (!open) return null;

  async function handleSubmit() {
    if (!isValid || pending) return;
    setPending(true);
    setError(null);
    try {
      const body: CreateNoticeBody = {
        kind,
        title: title.trim(),
        content: content.trim() || undefined,
      };
      if (editing) {
        await updateNotice(editing.id, body);
      } else {
        await createNotice(body);
      }
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 gcm-backdrop"
      onClick={pending ? undefined : onClose}
      role="dialog"
      aria-modal="true"
      aria-label={editing ? '공지 수정' : '공지 등록'}
    >
      <style>{`
        @keyframes nfmBackdropIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes nfmCardIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .gcm-backdrop { animation: nfmBackdropIn 150ms ease-out both; }
        .gcm-card { animation: nfmCardIn 200ms ease-out both; }
      `}</style>
      <div
        className="w-full max-w-lg bg-bg-surface rounded-2xl border border-border shadow-lg gcm-card max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-border">
          <p className="text-[11px] font-semibold text-primary tracking-wider uppercase">
            {editing ? '공지 수정' : '신규 공지'}
          </p>
          <h3 className="mt-1 text-lg font-bold text-text">
            {editing ? '공지 수정' : '공지 등록'}
          </h3>
        </div>

        <div className="p-5 space-y-4 text-sm">
          <div className="space-y-1.5">
            <label htmlFor="nf-kind" className="block text-xs font-semibold text-text-secondary">
              종류 <span className="text-danger-text">*</span>
            </label>
            <select
              id="nf-kind"
              ref={firstFieldRef}
              value={kind}
              onChange={(e) => setKind(e.target.value as NoticeKind)}
              disabled={pending}
              className="w-full px-3 py-2 rounded-md border border-border bg-bg-surface text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            >
              <option value="notice">공지</option>
              <option value="update">업데이트</option>
              <option value="fix">수정</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="nf-title" className="block text-xs font-semibold text-text-secondary">
              제목 <span className="text-danger-text">*</span>
            </label>
            <input
              id="nf-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 홈 화면 개편 — 서비스 소개·공지 섹션 신설"
              maxLength={120}
              disabled={pending}
              className="w-full px-3 py-2 rounded-md border border-border bg-bg-surface text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="nf-content" className="block text-xs font-semibold text-text-secondary">
              내용 (선택)
            </label>
            <textarea
              id="nf-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="공지 상세 내용을 입력하세요"
              rows={6}
              disabled={pending}
              className="w-full px-3 py-2 rounded-md border border-border bg-bg-surface text-text text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 resize-y"
            />
            <p className="text-[11px] text-text-tertiary">
              공지 클릭 시 이 내용이 상세페이지에 표시됩니다.
            </p>
          </div>

          {error && (
            <p
              role="alert"
              className="text-xs text-danger-text bg-danger-bg border border-danger-border rounded-md px-3 py-2"
            >
              {error}
            </p>
          )}
        </div>

        <div className="p-5 pt-0 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="btn btn-neutral flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || pending}
            className="btn btn-solid flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? '저장 중…' : editing ? '수정 완료' : '등록'}
          </button>
        </div>
      </div>
    </div>
  );
}
