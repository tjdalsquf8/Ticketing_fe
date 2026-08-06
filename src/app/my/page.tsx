'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, ROUTES } from '@/lib/api';

interface UserProfile {
  id: number;
  email: string;
  name: string;
  created_at: string;
}

const TICKET_COUNT = 0;
const NEXT_REWARD  = 10;

export default function MyPage() {
  const [profile, setProfile]   = useState<UserProfile | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    apiFetch<UserProfile>(ROUTES.users.me)
      .then(setProfile)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : '정보를 불러올 수 없습니다.'))
      .finally(() => setLoading(false));
  }, []);

  const progress = Math.min((TICKET_COUNT / NEXT_REWARD) * 100, 100);
  const displayName = profile?.name ?? '—';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">

      {/* 프로필 요약 */}
      <div className="card p-6 space-y-4">
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

        {/* 티켓 적립 진행도 */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">리워드까지 남은 티켓</span>
            <span className="font-semibold text-text font-mono-tabular">
              {TICKET_COUNT} / {NEXT_REWARD}매
            </span>
          </div>
          <div className="h-2 rounded-full bg-bg-subtle border border-border overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-text-tertiary">
            {NEXT_REWARD - TICKET_COUNT}매 더 모으면 기프티콘으로 교환 가능해요.
          </p>
        </div>

        <Link href="/rewards" className="btn btn-outline btn-sm w-full sm:w-auto">
          리워드 스토어 가기
        </Link>
      </div>

      {/* 티켓함 */}
      <section>
        <h2 className="text-sm font-semibold text-text mb-3">
          티켓함 <span className="text-text-tertiary font-normal">({TICKET_COUNT}매)</span>
        </h2>
        <div className="card p-6 text-center text-sm text-text-secondary">
          아직 티켓이 없습니다. 실전 이벤트에 참여해보세요.
        </div>
      </section>

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

      {/* 교환 내역 */}
      <section>
        <h2 className="text-sm font-semibold text-text mb-3">리워드 교환 내역</h2>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-subtle">
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">날짜</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">리워드</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary">사용 티켓</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-text-secondary">
                  교환 내역이 없습니다.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
