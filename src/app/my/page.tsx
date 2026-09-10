'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch, ROUTES } from '@/lib/api';
import {
  listMyEventRegistrations,
  type MyEventRegistration,
} from '@/lib/events';
import { formatKstDateTime } from '@/lib/kst';
import { useAuth } from '@/contexts/AuthContext';

interface UserProfile {
  id: number;
  email: string;
  name: string;
  created_at: string;
}

const REG_STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  pending: { text: '신청 완료', cls: 'badge-info' },
  entered: { text: '참여함', cls: 'badge-primary' },
  ticketed: { text: '당첨', cls: 'badge-success' },
  missed: { text: '미참여', cls: 'badge-neutral' },
  no_show: { text: '참여 실패', cls: 'badge-neutral' },
  cancelled: { text: '취소됨', cls: 'badge-neutral' },
  refunded: { text: '환불됨', cls: 'badge-neutral' },
};

export default function MyPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [profile, setProfile]   = useState<UserProfile | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<MyEventRegistration[] | null>(null);

  useEffect(() => {
    apiFetch<UserProfile>(ROUTES.users.me)
      .then(setProfile)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : '정보를 불러올 수 없습니다.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let alive = true;
    listMyEventRegistrations({ limit: 10 })
      .then(({ data }) => {
        if (!alive) return;
        setRegistrations(data);
      })
      .catch(() => {
        // 미로그인 등 조용히 무시. 빈 목록으로 표시.
        if (alive) setRegistrations([]);
      });
    return () => {
      alive = false;
    };
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
                <p className={isAdmin ? 'text-xs font-semibold text-primary' : 'text-xs text-text-secondary'}>
                  {isAdmin ? '관리자' : '일반 회원'}
                </p>
              </>
            )}
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

      {/* 이벤트 신청 이력 */}
      <section>
        <h2 className="text-sm font-semibold text-text mb-3">이벤트 신청 이력</h2>
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-subtle">
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">오픈</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">이벤트</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {registrations === null ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-text-secondary">
                    불러오는 중…
                  </td>
                </tr>
              ) : registrations.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-text-secondary">
                    신청한 이벤트가 없습니다.
                  </td>
                </tr>
              ) : (
                registrations.map((r) => {
                  const st = REG_STATUS_LABEL[r.status] ?? {
                    text: r.status,
                    cls: 'badge-neutral',
                  };
                  return (
                    <tr key={r.registrationId} className="hover:bg-bg-subtle transition-colors">
                      <td className="px-4 py-3 text-xs text-text-secondary font-mono-tabular whitespace-nowrap">
                        {formatKstDateTime(r.event.opensAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/event/${r.eventId}`}
                          className="font-medium text-text hover:text-primary transition-colors"
                        >
                          {r.event.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`badge ${st.cls}`}>{st.text}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
        </div>
      </section>

      {/* 획득 기프티콘 — 이벤트 TOP 3/럭키 좌석 당첨 시 즉시 지급 */}
      <section>
        <h2 className="text-sm font-semibold text-text mb-3">획득 기프티콘</h2>
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
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
        </div>
      </section>

    </div>
  );
}
