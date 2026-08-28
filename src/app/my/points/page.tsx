'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  listMyEventRegistrations,
  type MyEventRegistration,
} from '@/lib/events';
import { formatKstDateTime } from '@/lib/kst';

/* ──────────────────────────────────────────
   /my/points — 포인트 충전 · 잔액 · 사용 내역
   ─ 잔액: AuthContext.user.points (GET /users/me)
   ─ 충전: PG 연동 미제공 (BE 미구현)
   ─ 사용 내역: /api/events/registrations/me 응답의
     pointsPaid / refundPoints / status 를 조합해 렌더 (API_docs §158)
   ────────────────────────────────────────── */

const PRESETS = [5_000, 10_000, 30_000, 50_000];

interface PointEntry {
  key: string;
  at: string;
  kind: 'debit' | 'credit';
  amount: number;
  eventId: number;
  eventTitle: string;
  note: string;
}

// 신청 하나를 0~2개의 포인트 트랜잭션으로 펼침.
// pointsPaid → 항상 debit(사용), refundPoints > 0 → credit(환불) 추가.
function toPointEntries(reg: MyEventRegistration): PointEntry[] {
  // API 계약상 createdAt 존재하지만, 누락 케이스 대비해 event.opensAt 로 폴백.
  // 둘 다 없으면 정렬·포맷 불가능하므로 해당 신청은 스킵.
  const at = reg.createdAt || reg.event?.opensAt || '';
  if (!at) return [];

  const rows: PointEntry[] = [];
  if (reg.pointsPaid > 0) {
    rows.push({
      key: `paid-${reg.registrationId}`,
      at,
      kind: 'debit',
      amount: reg.pointsPaid,
      eventId: reg.eventId,
      eventTitle: reg.event.title,
      note: '참여 신청',
    });
  }
  if (typeof reg.refundPoints === 'number' && reg.refundPoints > 0) {
    rows.push({
      key: `refund-${reg.registrationId}`,
      at, // 환불 timestamp 별도 없음 — 신청 시각 재사용
      kind: 'credit',
      amount: reg.refundPoints,
      eventId: reg.eventId,
      eventTitle: reg.event.title,
      note: reg.status === 'cancelled' ? '신청 취소 환불' : '자동 환불',
    });
  }
  return rows;
}

export default function PointsPage() {
  const { user, isLoading } = useAuth();
  const [regs, setRegs] = useState<MyEventRegistration[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const balance = user?.points;
  const hasBalance = typeof balance === 'number';

  useEffect(() => {
    if (!user) {
      setRegs([]);
      return;
    }
    let alive = true;
    listMyEventRegistrations({ limit: 100 })
      .then(({ data }) => {
        if (alive) setRegs(data);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setHistoryError(
          e instanceof Error ? e.message : '사용 내역을 불러올 수 없습니다.',
        );
        setRegs([]);
      });
    return () => {
      alive = false;
    };
  }, [user]);

  const entries = useMemo<PointEntry[]>(() => {
    if (!regs) return [];
    const rows = regs.flatMap(toPointEntries);
    rows.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
    return rows;
  }, [regs]);

  const totalSpent = useMemo(
    () =>
      entries
        .filter((e) => e.kind === 'debit')
        .reduce((sum, e) => sum + e.amount, 0),
    [entries],
  );
  const totalRefunded = useMemo(
    () =>
      entries
        .filter((e) => e.kind === 'credit')
        .reduce((sum, e) => sum + e.amount, 0),
    [entries],
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-text">포인트 충전</h1>
        <p className="text-sm text-text-secondary">유료 이벤트 참여비로 사용됩니다.</p>
      </header>

      {/* 잔액 카드 */}
      <div className="card p-6 sm:p-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-text-secondary">보유 포인트</p>
          <p className="mt-1 font-mono-tabular">
            {isLoading ? (
              <span className="inline-block h-9 w-24 bg-bg-subtle rounded animate-pulse" />
            ) : (
              <>
                <strong className="text-3xl sm:text-4xl text-text">
                  {hasBalance ? balance.toLocaleString() : '-'}
                </strong>
                <span className="text-lg text-text-secondary ml-1">P</span>
              </>
            )}
          </p>
          {!isLoading && !hasBalance && user && (
            <p className="mt-2 text-[11px] text-text-tertiary">
              잔액 조회 API 준비 중입니다.
            </p>
          )}
          {!isLoading && !user && (
            <p className="mt-2 text-[11px] text-text-tertiary">
              로그인 후 이용해 주세요.
            </p>
          )}
        </div>
        <Link href="#recharge" className="btn btn-solid btn-lg shrink-0">
          충전하기
        </Link>
      </div>

      {/* 충전 프리셋 */}
      <section id="recharge" className="space-y-4">
        <h2 className="text-sm font-semibold text-text">충전 금액 선택</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PRESETS.map((amt) => (
            <button
              key={amt}
              type="button"
              disabled
              className="card p-4 text-center hover:border-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              title="결제 연동 준비 중"
            >
              <p className="text-lg font-bold text-text font-mono-tabular">
                {amt.toLocaleString()}
                <span className="text-xs text-text-secondary ml-0.5">원</span>
              </p>
              <p className="text-[11px] text-text-tertiary mt-0.5 font-mono-tabular">
                +{amt.toLocaleString()}P
              </p>
            </button>
          ))}
        </div>

        {/* 직접 입력 */}
        <div className="card p-5 space-y-3">
          <label className="text-xs font-semibold text-text-secondary">직접 입력 (1,000원 단위)</label>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              placeholder="예: 20,000"
              disabled
              className="flex-1 px-3 py-2 rounded-md border border-border bg-bg-surface text-text focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-bg-subtle disabled:cursor-not-allowed"
            />
            <button type="button" disabled className="btn btn-solid shrink-0 disabled:opacity-60 disabled:cursor-not-allowed">
              결제하기
            </button>
          </div>
          <p className="text-[11px] text-text-tertiary">
            결제 연동 준비 중입니다. 최소 1,000원부터 1,000원 단위로 충전 가능합니다.
          </p>
        </div>
      </section>

      {/* 사용 내역 */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-text">최근 내역</h2>
          {regs !== null && entries.length > 0 && (
            <p className="text-xs text-text-tertiary font-mono-tabular">
              사용 {totalSpent.toLocaleString()}P · 환불{' '}
              {totalRefunded.toLocaleString()}P
            </p>
          )}
        </div>
        <div className="card overflow-hidden">
          {!user ? (
            <div className="px-4 py-12 text-center text-sm text-text-secondary">
              로그인 후 이용해 주세요.
            </div>
          ) : regs === null ? (
            <div className="px-4 py-12 text-center text-sm text-text-secondary">
              불러오는 중…
            </div>
          ) : historyError ? (
            <div className="px-4 py-12 text-center text-sm text-danger-text">
              {historyError}
            </div>
          ) : entries.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-text-secondary">
              아직 사용·환불 내역이 없습니다.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-subtle">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap">
                    일시
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary">
                    이벤트
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap">
                    구분
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap">
                    변동
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((e) => (
                  <tr
                    key={e.key}
                    className="hover:bg-bg-subtle transition-colors"
                  >
                    <td className="px-4 py-3 text-xs text-text-secondary font-mono-tabular whitespace-nowrap">
                      {formatKstDateTime(e.at)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/event/${e.eventId}`}
                        className="font-medium text-text hover:text-primary transition-colors"
                      >
                        {e.eventTitle}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary whitespace-nowrap">
                      {e.note}
                    </td>
                    <td
                      className={[
                        'px-4 py-3 text-right font-mono-tabular font-semibold whitespace-nowrap',
                        e.kind === 'debit'
                          ? 'text-danger-text'
                          : 'text-success-text',
                      ].join(' ')}
                    >
                      {e.kind === 'debit' ? '−' : '+'}
                      {e.amount.toLocaleString()}P
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="text-[11px] text-text-tertiary">
          충전 내역은 결제 연동 후 표시됩니다.
        </p>
      </section>
    </div>
  );
}
