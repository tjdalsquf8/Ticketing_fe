'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { listNotices, type Notice, type NoticeKind } from '@/lib/notices';
import { toKstDate } from '@/lib/kst';
import { ApiError } from '@/lib/errors';

/* ──────────────────────────────────────────
   HomeAnnouncements — 공지·업데이트 리스트 카드
   ─ GET /api/notices?limit=10
   ────────────────────────────────────────── */

const KIND_LABEL: Record<NoticeKind, { text: string; cls: string }> = {
  notice: { text: '공지', cls: 'bg-primary-subtle text-primary' },
  update: { text: '업데이트', cls: 'bg-info-bg text-info-text' },
  fix: { text: '수정', cls: 'bg-bg-subtle text-text-secondary' },
};

/** ISO → "MM.DD" (KST 달력 기준) */
function formatMonthDay(iso: string): string {
  return toKstDate(iso).slice(5).replace('-', '.');
}

export default function HomeAnnouncements() {
  const [items, setItems] = useState<Notice[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listNotices(10);
      setItems(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '공지를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="space-y-3">
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
          <h2 className="text-sm font-bold text-text">공지 · 업데이트</h2>
          <Link
            href="/"
            aria-disabled
            className="text-xs text-text-tertiary hover:text-text-secondary"
            title="공지 페이지 준비 중"
          >
            전체보기
          </Link>
        </div>

        {isLoading ? (
          <div className="px-4 py-10 text-center text-sm text-text-secondary">
            불러오는 중…
          </div>
        ) : error ? (
          <div className="px-4 py-8 flex items-center justify-between gap-3">
            <p className="text-sm text-danger-text">{error}</p>
            <button type="button" onClick={load} className="btn btn-outline btn-sm shrink-0">
              다시 시도
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-text-secondary">
            등록된 공지가 없어요
          </div>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {items.map((n) => {
              const badge = KIND_LABEL[n.kind];
              const row = (
                <div className="px-4 py-2.5 flex items-center gap-3 hover:bg-bg-subtle transition-colors">
                  <span
                    className={[
                      'shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded',
                      badge.cls,
                    ].join(' ')}
                  >
                    {badge.text}
                  </span>
                  <p className="flex-1 text-sm text-text truncate">{n.title}</p>
                  <span className="shrink-0 text-xs text-text-tertiary font-mono-tabular">
                    {formatMonthDay(n.createdAt)}
                  </span>
                </div>
              );
              return (
                <li key={n.id}>
                  <Link href={`/notices/${n.id}`}>{row}</Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
