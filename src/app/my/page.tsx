'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch, ROUTES } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface UserProfile {
  id: number;
  email: string;
  name: string;
  created_at: string;
}

// 백엔드 연동 전까지 정적 mock
const TICKET_COUNT = 0;
const LEADERBOARD_RANK: number | null = null;

export default function MyPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [profile, setProfile]   = useState<UserProfile | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    apiFetch<UserProfile>(ROUTES.users.me)
      .then(setProfile)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : '정보를 불러올 수 없습니다.'))
      .finally(() => setLoading(false));
  }, []);

  const displayName = profile?.name ?? '—';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">

      {/* 프로필 요약 */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-bg-subtle border border-border flex items-center justify-center text-sm font-bold text-text-secondary">
            {isLoading ? '…' : displayName[0] ?? '?'}
          </div>
          <div>
            {isLoading ? (
              <div className="h-4 w-24 bg-bg-subtle rounded animate-pulse" />
            ) : error ? (
              <p className="text-sm text-red-500">{error}</p>
            ) : (
              <>
                <p className="font-semibold text-text">{displayName}</p>
                <p className="text-xs text-text-secondary">일반 회원</p>
              </>
            )}
          </div>
        </div>

        {/* 통계 스탯 — 누적 티켓 / 리더보드 순위 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-bg-subtle px-4 py-3">
            <p className="text-xs text-text-secondary">누적 티켓</p>
            <p className="mt-1 font-mono-tabular">
              <strong className="text-2xl text-text">{TICKET_COUNT}</strong>
              <span className="text-sm text-text-tertiary ml-1">매</span>
            </p>
          </div>
          <div className="rounded-lg border border-border bg-bg-subtle px-4 py-3">
            <p className="text-xs text-text-secondary">리더보드 순위</p>
            <p className="mt-1 font-mono-tabular">
              {LEADERBOARD_RANK !== null ? (
                <>
                  <strong className="text-2xl text-text">{LEADERBOARD_RANK}</strong>
                  <span className="text-sm text-text-tertiary ml-1">위</span>
                </>
              ) : (
                <span className="text-sm text-text-tertiary">아직 순위 없음</span>
              )}
            </p>
          </div>
        </div>

        {/* 관리자 진입 — role=admin 전용. UI 은닉이며 최종 인가는 백엔드 requireAdmin이 담당. */}
        {isAdmin && (
          <Link
            href="/admin"
            className="mt-1 flex items-center justify-between rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
          >
            <span>관리자 페이지</span>
            <span aria-hidden className="text-lg leading-none">›</span>
          </Link>
        )}
      </div>

      {/* 참여 이력 */}
      <section>
        <h2 className="text-sm font-semibold text-text mb-3">참여 이력</h2>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-subtle">
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">날짜</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">이벤트</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary">결과</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary">소요 시간</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-text-secondary">
                  참여 이력이 없습니다.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 획득 기프티콘 — 이벤트 TOP 3/럭키 좌석 당첨 시 즉시 지급 */}
      <section>
        <h2 className="text-sm font-semibold text-text mb-3">획득 기프티콘</h2>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-subtle">
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">날짜</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">이벤트</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">상품</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-text-secondary">
                  아직 획득한 기프티콘이 없습니다.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
