'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  cancelRound,
  createRoundNow,
  getAdminRoundStats,
  getRoundDetail,
  listRounds,
  runAdminLiveCron,
  type LiveCronJob,
  type LiveRound,
  type LiveRoundDetail,
  type LiveRoundStatus,
} from '@/lib/adminLive';
import { ApiError } from '@/lib/errors';
import StatsSummaryCard from '@/components/admin/StatsSummaryCard';

/* ──────────────────────────────────────────
   /admin/live — 실시간 회차 운영 콘솔
   ─ 하루 단위로 예정·진행·종료·취소 회차를 조회
   ─ 예정(scheduled) 회차는 "중지" 액션으로 취소
   ────────────────────────────────────────── */

type StatusFilter = 'all' | LiveRoundStatus;

const STATUS_META: Record<LiveRoundStatus, { text: string; cls: string }> = {
  scheduled: { text: '예정',   cls: 'badge-info'    },
  open:      { text: '진행 중', cls: 'badge-danger'  },
  closed:    { text: '종료',   cls: 'badge-neutral' },
  cancelled: { text: '중지됨', cls: 'badge-neutral' },
};

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all',       label: '전체' },
  { key: 'scheduled', label: '예정' },
  { key: 'open',      label: '진행 중' },
  { key: 'closed',    label: '종료' },
  { key: 'cancelled', label: '중지됨' },
];

function todayISO(): string {
  return new Date().toLocaleDateString('sv-SE');
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('sv-SE');
}

// 모든 시각 렌더는 서버·클라이언트·감사 로그가 어긋나지 않도록 명시적으로 KST 고정.
function formatKST(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDateHeadline(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${weekday})`;
}

// 응답이 비정상적으로 큰 경우 방어적 상한. 초과분은 UI에서 조용히 절단해
// 브라우저 프리즈를 막고, 실제 배열은 절대 원본 크기로 보관하지 않는다.
const MAX_RENDERABLE_SEAT_LABELS = 5000;
const MAX_RENDERABLE_TOP_ROWS = 100;

export default function AdminLiveClient() {
  const [date, setDate] = useState<string>(todayISO());
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [rounds, setRounds] = useState<LiveRound[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadTick, setReloadTick] = useState(0);
  const [detailFor, setDetailFor] = useState<number | null>(null);
  // 페이지 전체 busy 플래그 — 여러 회차를 동시에 취소하는 병렬 요청을 원천 차단.
  const [busy, setBusy] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<LiveRound | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    listRounds({ date })
      .then((data) => {
        if (!alive) return;
        setRounds(data);
        setError(null);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof ApiError ? e.message : '회차를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [date, reloadTick]);

  function reload() {
    setLoading(true);
    setReloadTick((n) => n + 1);
  }

  function requestCancel(round: LiveRound) {
    // FE 방어: 현재 목록에 있고 status==='scheduled'인 회차만 통과.
    // IDOR 시도(DevTools에서 임의 roundId 삽입)에 대한 최소 게이트.
    if (round.status !== 'scheduled') return;
    if (!rounds?.some((r) => r.id === round.id)) return;
    setCancelError(null);
    setCancelTarget(round);
  }

  async function confirmCancel(round: LiveRound) {
    setBusy(true);
    setCancelError(null);
    try {
      await cancelRound(round.id);
      setCancelTarget(null);
    } catch (e) {
      setCancelError(e instanceof ApiError ? e.message : '중지 요청 실패');
    } finally {
      setBusy(false);
      // 성공·실패 모두 서버 최신 상태로 재동기화 → 낙관적 UI와 실제 상태 어긋남 방지.
      reload();
    }
  }

  const summary = useMemo(() => {
    if (!rounds) return null;
    const acc = { scheduled: 0, open: 0, closed: 0, cancelled: 0 };
    for (const r of rounds) acc[r.status]++;
    return acc;
  }, [rounds]);

  const filtered = useMemo(() => {
    if (!rounds) return null;
    return filter === 'all' ? rounds : rounds.filter((r) => r.status === filter);
  }, [rounds, filter]);

  const isToday = date === todayISO();

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4">
        <header>
          <h1 className="text-2xl font-bold text-text">실시간 관리</h1>
          <p className="mt-1 text-sm text-text-secondary">
            매시 정각 자동 오픈되는 실시간 회차를 조회하고, 예정된 회차를 중지할 수 있습니다.
          </p>
        </header>
        <Link href="/admin/live/config" className="btn btn-neutral btn-sm shrink-0">
          공연 설정
        </Link>
      </div>

      {/* 테스트용 즉시 생성 — 정각까지 기다리지 않고 지금 라운드 열기. 테스트 끝나면 제거. */}
      <CreateNowPanel onCreated={() => reload()} />

      {/* 크론 관리 — 서버 다운타임 복구용 escape hatch */}
      <CronControlPanel
        onRoundsChanged={() => reload()}
      />

      {/* 일자 네비 */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setDate(shiftDate(date, -1))}
            className="btn btn-ghost btn-sm"
            aria-label="이전 날"
          >
            ‹
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-1.5 rounded-md border border-border bg-bg-surface text-text font-mono-tabular text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            type="button"
            onClick={() => setDate(shiftDate(date, 1))}
            className="btn btn-ghost btn-sm"
            aria-label="다음 날"
          >
            ›
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text truncate">
            {formatDateHeadline(date)}
            {isToday && <span className="ml-2 text-xs text-primary font-bold">오늘</span>}
          </p>
        </div>
        <div className="flex gap-1.5">
          {!isToday && (
            <button
              type="button"
              onClick={() => setDate(todayISO())}
              className="btn btn-neutral btn-sm"
            >
              오늘로
            </button>
          )}
          <button
            type="button"
            onClick={reload}
            className="btn btn-neutral btn-sm"
            disabled={loading}
          >
            {loading ? '불러오는 중…' : '새로고침'}
          </button>
        </div>
      </div>

      {/* 요약 카드 */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatCard label="예정"    value={summary.scheduled} tone="info" />
          <StatCard label="진행 중" value={summary.open}      tone="danger" />
          <StatCard label="종료"    value={summary.closed}    tone="neutral" />
          <StatCard label="중지됨"  value={summary.cancelled} tone="neutral" />
        </div>
      )}

      {/* 상태 필터 */}
      <div className="inline-flex flex-wrap rounded-lg border border-border bg-bg-subtle p-1 gap-0.5">
        {STATUS_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={[
              'shrink-0 whitespace-nowrap px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors',
              key === filter
                ? 'bg-bg-surface text-text shadow-xs border border-border'
                : 'text-text-secondary hover:text-text',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 리스트 */}
      {/*
        컬럼 폭 고정 전략:
        - table-fixed + <colgroup> 퍼센트 폭으로 테이블 전체를 항상 꽉 채움(빈 여백 없음)
        - 모든 컬럼 좌측 정렬 통일, 액션 버튼 그룹은 -ml-3로 버튼 내부 패딩만큼 당겨
          헤더 텍스트와 시작 x좌표를 맞춤
        - 최소 폭(min-w-[780px])을 밑도는 뷰포트에선 overflow-x-auto 로 가로 스크롤
      */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm table-fixed">
            <colgroup>
              <col style={{ width: '30%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '28%' }} />
            </colgroup>
            <thead>
              <tr className="border-b border-border bg-bg-subtle">
                <th className="text-left  px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap">시각</th>
                <th className="text-left  px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap">회차</th>
                <th className="text-left  px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap">상태</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap">참여</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary whitespace-nowrap">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {error ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-danger-text">{error}</td></tr>
              ) : loading && !rounds ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-text-tertiary">불러오는 중…</td></tr>
              ) : filtered && filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-text-secondary">
                  {rounds && rounds.length === 0 ? '해당 일자에 회차가 없습니다.' : '이 상태의 회차가 없습니다.'}
                </td></tr>
              ) : (
                filtered?.map((r) => {
                  const st = STATUS_META[r.status];
                  const cancelable = r.status === 'scheduled';
                  return (
                    <tr key={r.id} className={[
                      'transition-colors',
                      r.status === 'cancelled' ? 'bg-bg-subtle/40 text-text-tertiary' : 'hover:bg-bg-subtle',
                    ].join(' ')}>
                      <td className="px-4 py-3 font-mono-tabular text-sm whitespace-nowrap">
                        <span className="font-semibold text-text">{formatTime(r.opensAt)}</span>
                        <span className="text-text-tertiary text-xs"> – {formatTime(r.closesAt)}</span>
                      </td>
                      <td className="px-4 py-3 font-mono-tabular text-xs text-text-tertiary truncate">#{r.id}</td>
                      <td className="px-4 py-3 truncate"><span className={`badge ${st.cls}`}>{st.text}</span></td>
                      <td className="px-4 py-3 text-left font-mono-tabular text-text truncate">{r.participantCount}</td>
                      <td className="px-4 py-3 text-left whitespace-nowrap">
                        <div className="inline-flex gap-1.5 -ml-3">
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setDetailFor(r.id)}
                          >
                            상세
                          </button>
                          {cancelable && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm text-danger-text"
                              onClick={() => requestCancel(r)}
                              disabled={busy}
                            >
                              중지
                            </button>
                          )}
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

      <p className="text-[11px] text-text-tertiary">
        · 예정 상태의 회차만 중지할 수 있으며, 중지 후 재개는 불가합니다.
        · 참여 수는 예매 시작한 실제 유저(게스트 포함) 수입니다.
      </p>

      {detailFor !== null && (
        <RoundDetailDrawer
          roundId={detailFor}
          participantCount={rounds?.find((r) => r.id === detailFor)?.participantCount ?? 0}
          onClose={() => setDetailFor(null)}
        />
      )}

      {cancelTarget && (
        <CancelRoundModal
          round={cancelTarget}
          busy={busy}
          error={cancelError}
          onConfirm={() => confirmCancel(cancelTarget)}
          onClose={() => {
            if (busy) return;
            setCancelTarget(null);
            setCancelError(null);
          }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// 회차 중지 재확인 모달
// ─ 시각(HH:MM)을 타이핑해야 활성화되는 두 단계 확인 → 실수/자동화 클릭 방지
// ═══════════════════════════════════════════════════════

function CancelRoundModal({
  round,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  round: LiveRound;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const expected = formatTime(round.opensAt);
  const [typed, setTyped] = useState('');
  const canSubmit = typed.trim() === expected && !busy;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="회차 중지 확인"
    >
      <div
        className="w-full max-w-md bg-bg-surface rounded-2xl border border-border shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-border">
          <p className="text-[11px] font-semibold text-danger-text tracking-wider uppercase">
            되돌릴 수 없는 작업
          </p>
          <h3 className="mt-1 text-lg font-bold text-text">회차 중지 확인</h3>
        </div>

        <div className="p-5 space-y-4 text-sm">
          <div className="rounded-lg border border-border bg-bg-subtle p-3 space-y-1">
            <div className="flex justify-between">
              <span className="text-text-tertiary text-xs">회차</span>
              <span className="font-mono-tabular text-text">#{round.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-tertiary text-xs">시각</span>
              <span className="font-mono-tabular font-semibold text-text">{expected}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-tertiary text-xs">참여</span>
              <span className="font-mono-tabular text-text">{round.participantCount}명</span>
            </div>
          </div>

          <p className="text-text-secondary">
            중지 후에는 재개할 수 없습니다. 확인을 위해 회차 시각{' '}
            <code className="px-1.5 py-0.5 rounded bg-bg-subtle font-mono-tabular text-text">
              {expected}
            </code>
            를 그대로 입력해 주세요.
          </p>

          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={expected}
            disabled={busy}
            autoFocus
            className="w-full px-3 py-2 rounded-md border border-border bg-bg-surface text-text font-mono-tabular text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
          />

          {error && <p className="text-xs text-danger-text">{error}</p>}
        </div>

        <div className="p-5 pt-0 flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-neutral btn-sm"
            onClick={onClose}
            disabled={busy}
          >
            취소
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={onConfirm}
            disabled={!canSubmit}
          >
            {busy ? '중지 중…' : '회차 중지'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: 'info' | 'danger' | 'neutral' }) {
  const toneCls =
    tone === 'info'   ? 'text-info-text'
    : tone === 'danger' ? 'text-danger-text'
    : 'text-text-secondary';
  return (
    <div className="card p-3">
      <p className="text-[11px] font-semibold text-text-tertiary tracking-wide">{label}</p>
      <p className={`mt-1 text-2xl font-bold font-mono-tabular ${toneCls}`}>{value}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// 회차 상세 drawer
// ═══════════════════════════════════════════════════════

function RoundDetailDrawer({
  roundId,
  participantCount,
  onClose,
}: {
  roundId: number;
  /** 참여수는 상세 응답에 없으므로 리스트 행에서 스냅샷으로 넘겨 렌더. */
  participantCount: number;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<LiveRoundDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getRoundDetail(roundId)
      .then((d) => { if (alive) setDetail(d); })
      .catch((e) => { if (alive) setError(e instanceof ApiError ? e.message : '상세 조회 실패'); });
    return () => { alive = false; };
  }, [roundId]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-2xl max-h-[85vh] overflow-y-auto bg-bg-surface rounded-t-2xl sm:rounded-2xl border border-border shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-bg-surface">
          <div>
            <p className="text-[11px] font-semibold text-text-tertiary tracking-wider uppercase">라이브 회차 상세</p>
            <h2 className="text-lg font-bold text-text font-mono-tabular">#{roundId}</h2>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">닫기</button>
        </div>

        <div className="p-5 space-y-5">
          {error ? (
            <p className="text-sm text-danger-text">{error}</p>
          ) : !detail ? (
            <p className="text-sm text-text-tertiary">불러오는 중…</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoRow k="상태"   v={STATUS_META[detail.round.status].text} />
                <InfoRow k="회차"   v={`#${detail.round.id}`} />
                <InfoRow k="오픈"   v={formatKST(detail.round.opensAt)} />
                <InfoRow k="종료"   v={formatKST(detail.round.closesAt)} />
              </div>

              {/* 결과 통계 — 라이브는 무료라 매출 필드 렌더 skip */}
              <StatsSummaryCard
                title={`회차 #${roundId}`}
                loader={() => getAdminRoundStats(roundId)}
                showRevenue={false}
              />

              <div>
                {(() => {
                  const total = detail.round.seatLabels.length;
                  const clamped = total > MAX_RENDERABLE_SEAT_LABELS;
                  return (
                    <>
                      <p className="text-xs font-semibold text-text-secondary mb-1.5">
                        좌석 라벨 ({total.toLocaleString()})
                        {clamped && (
                          <span className="ml-2 text-[11px] font-normal text-warning-text">
                            응답이 비정상적으로 큽니다 · 처음 {MAX_RENDERABLE_SEAT_LABELS.toLocaleString()}건만 렌더
                          </span>
                        )}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {total === 0 ? (
                          <span className="text-xs text-text-tertiary">없음</span>
                        ) : detail.round.seatLabels.slice(0, 40).map((s) => (
                          <span key={s} className="px-2 py-0.5 rounded-md bg-bg-subtle border border-border text-[11px] font-mono-tabular text-text-secondary">{s}</span>
                        ))}
                        {total > 40 && (
                          <span className="text-[11px] text-text-tertiary self-center">+{(Math.min(total, MAX_RENDERABLE_SEAT_LABELS) - 40).toLocaleString()}</span>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <MiniStat label="판매완료" value={detail.seatsSummary.sold} />
                <MiniStat label="참여수"   value={participantCount} />
              </div>

              <div>
                <p className="text-xs font-semibold text-text-secondary mb-2">
                  {detail.round.status === 'closed' ? '최종 TOP 10' : '실시간 TOP 10'}
                </p>
                {detail.top10.length === 0 ? (
                  <p className="text-xs text-text-tertiary">아직 완료된 세션이 없습니다.</p>
                ) : (
                  <ol className="card divide-y divide-border overflow-hidden">
                    {detail.top10.slice(0, MAX_RENDERABLE_TOP_ROWS).map((row) => (
                      <li key={row.rank} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                        <span className="w-6 text-center font-mono-tabular font-semibold text-text-secondary">{row.rank}</span>
                        <span className="flex-1 truncate">
                          <span className="font-medium text-text">{row.nickname}</span>
                          {!row.isMember && <span className="ml-1.5 text-[10px] text-text-tertiary">(게스트)</span>}
                        </span>
                        <span className="text-xs text-text-secondary font-mono-tabular">{row.seatLabel}</span>
                        <span className="font-mono-tabular font-bold text-text w-16 text-right">
                          {(row.elapsedMs / 1000).toFixed(3)}s
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <p className="text-[11px] text-text-tertiary">{k}</p>
      <p className="text-sm text-text font-medium">{v}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-bg-subtle p-2.5 text-center">
      <p className="text-[10px] font-semibold text-text-tertiary tracking-wide">{label}</p>
      <p className="mt-0.5 text-lg font-bold font-mono-tabular text-text">{value}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// 테스트용 즉시 생성 패널 (임시)
// ─ 매시 정각 대기 없이 지금 시각 기준으로 라운드를 즉시 open.
// ─ 테스트 끝나면 이 컴포넌트 + adminLive.ts의 createRoundNow 제거 대상.
// ═══════════════════════════════════════════════════════

function CreateNowPanel({ onCreated }: { onCreated: () => void }) {
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  async function handleCreate() {
    setBusy(true);
    setToast(null);
    try {
      const round = await createRoundNow();
      setToast({
        tone: 'success',
        text: `#${round.id} 생성 완료 · ${formatTime(round.opensAt)} ~ ${formatTime(round.closesAt)}`,
      });
      onCreated();
    } catch (e) {
      setToast({
        tone: 'danger',
        text: e instanceof ApiError ? e.message : '라운드 생성 실패',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-5 space-y-3 border-warning-border bg-warning-bg/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-text">테스트용 즉시 생성</h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            매시 정각까지 기다리지 않고 지금 시각 기준으로 라운드를 바로 엽니다. 테스트 전용, 실서비스에서 쓰지 마세요.
          </p>
        </div>
        {toast && (
          <div
            role="status"
            aria-live="polite"
            className={[
              'shrink-0 max-w-xs text-xs font-medium rounded-md px-3 py-2 border',
              toast.tone === 'success'
                ? 'bg-success-bg text-success-text border-success-border'
                : 'bg-danger-bg text-danger-text border-danger-border',
            ].join(' ')}
          >
            {toast.text}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => void handleCreate()}
        disabled={busy}
        className="btn btn-sm btn-outline"
      >
        {busy ? '생성 중…' : '지금 만들기'}
      </button>
    </section>
  );
}

// ═══════════════════════════════════════════════════════
// 크론 수동 실행 패널
// ─ 서버 다운타임 동안 놓친 KST 00시 회차 pre-create 백필 (ensure),
//   회차 상태 전이(scheduled → open → closed) 즉시 실행 (transition) 용 escape hatch.
// ─ 실행 성공 시 회차 목록 자동 리페치.
// ═══════════════════════════════════════════════════════

type CronJobMeta = {
  key: LiveCronJob;
  label: string;
  desc: string;
};

const CRON_JOBS: CronJobMeta[] = [
  { key: 'ensure',     label: '회차 생성 (ensure)',     desc: '누락된 회차를 pre-create. 다운타임 백필용.' },
  { key: 'transition', label: '상태 전이 (transition)', desc: 'scheduled → open → closed 전이 강제.'      },
];

type ToastState = { tone: 'success' | 'danger'; text: string } | null;

function CronControlPanel({ onRoundsChanged }: { onRoundsChanged: () => void }) {
  const [running, setRunning] = useState<LiveCronJob | null>(null);
  const [fromMidnight, setFromMidnight] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  // toast 자동 소멸 (3.5s) — 여러 번 눌러도 최신 toast 만 살아있음.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  async function execute(meta: CronJobMeta) {
    setRunning(meta.key);
    setToast(null);
    try {
      const result = await runAdminLiveCron(
        meta.key,
        meta.key === 'ensure' ? { fromMidnight } : undefined,
      );
      const suffix = meta.key === 'ensure' && result.fromMidnight ? ' · 00시부터 백필' : '';
      setToast({
        tone: 'success',
        text: `${meta.key} 완료 · ${result.durationMs}ms${suffix}`,
      });
      onRoundsChanged();
    } catch (e) {
      setToast({
        tone: 'danger',
        text: e instanceof ApiError ? e.message : `${meta.key} 실행 실패`,
      });
    } finally {
      setRunning(null);
    }
  }

  return (
    <section className="card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-text">크론 관리</h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            서버 다운타임 이후 회차 백필 · 상태 전이 강제 실행용. 평상시에는 사용하지 마세요.
          </p>
        </div>
        {toast && (
          <div
            role="status"
            aria-live="polite"
            className={[
              'shrink-0 max-w-xs text-xs font-medium rounded-md px-3 py-2 border',
              toast.tone === 'success'
                ? 'bg-success-bg text-success-text border-success-border'
                : 'bg-danger-bg text-danger-text border-danger-border',
            ].join(' ')}
          >
            {toast.text}
          </div>
        )}
      </div>

      {/* ensure 전용 옵션 — 오늘 00시부터 백필할지 여부 */}
      <label className="flex items-center gap-2 text-xs text-text-secondary select-none">
        <input
          type="checkbox"
          checked={fromMidnight}
          onChange={(e) => setFromMidnight(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-border accent-[color:var(--color-primary)]"
        />
        <span>
          <strong className="text-text">ensure</strong> 실행 시 KST 오늘 00시부터 백필
          <span className="text-text-tertiary"> (체크 해제 시 다음 정각부터)</span>
        </span>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {CRON_JOBS.map((meta) => {
          const busyThis = running === meta.key;
          const anyBusy = running !== null;
          return (
            <div
              key={meta.key}
              className="rounded-lg border border-border bg-bg-subtle p-3 flex flex-col gap-2"
            >
              <p className="text-xs font-semibold text-text">{meta.label}</p>
              <p className="text-[11px] text-text-tertiary flex-1">{meta.desc}</p>
              <button
                type="button"
                onClick={() => void execute(meta)}
                disabled={anyBusy}
                className="btn btn-sm btn-outline w-full"
              >
                {busyThis ? '실행 중…' : '실행'}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
