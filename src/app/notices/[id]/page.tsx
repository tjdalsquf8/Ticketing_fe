'use client';

import { useCallback, useEffect, useState, use } from 'react';
import Link from 'next/link';
import { getNotice, type NoticeDetail, type NoticeKind } from '@/lib/notices';
import { formatKstDateTime } from '@/lib/kst';
import { ApiError } from '@/lib/errors';

/* ──────────────────────────────────────────
   /notices/[id] — 공지 상세
   ─ GET /api/notices/:id (공개)
   ────────────────────────────────────────── */

const KIND_LABEL: Record<NoticeKind, { text: string; cls: string }> = {
  notice: { text: '공지', cls: 'bg-primary-subtle text-primary' },
  update: { text: '업데이트', cls: 'bg-info-bg text-info-text' },
  fix: { text: '수정', cls: 'bg-bg-subtle text-text-secondary' },
};

export default function NoticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [notice, setNotice] = useState<NoticeDetail | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getNotice(id);
      setNotice(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '공지를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-4">
        <div className="h-6 w-24 bg-bg-subtle rounded animate-pulse" />
        <div className="h-8 w-2/3 bg-bg-subtle rounded animate-pulse" />
        <div className="h-4 w-full bg-bg-subtle rounded animate-pulse" />
      </div>
    );
  }

  if (error || !notice) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="card p-8 text-center space-y-3">
          <p className="text-sm text-danger-text">
            {error ?? '공지를 찾을 수 없습니다.'}
          </p>
          <Link href="/" className="btn btn-outline btn-sm">
            홈으로
          </Link>
        </div>
      </div>
    );
  }

  const badge = KIND_LABEL[notice.kind];

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <Link href="/" className="text-xs text-text-tertiary hover:text-text-secondary">
        ← 홈으로
      </Link>

      <header className="space-y-3">
        <span
          className={[
            'inline-block text-[11px] font-semibold px-2 py-0.5 rounded',
            badge.cls,
          ].join(' ')}
        >
          {badge.text}
        </span>
        <h1 className="text-2xl font-bold text-text">{notice.title}</h1>
        <p className="text-xs text-text-tertiary font-mono-tabular">
          {formatKstDateTime(notice.createdAt)}
        </p>
      </header>

      <div className="card p-6">
        {notice.content ? (
          <p className="text-sm text-text whitespace-pre-wrap leading-relaxed">
            {notice.content}
          </p>
        ) : (
          <p className="text-sm text-text-tertiary">내용이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
