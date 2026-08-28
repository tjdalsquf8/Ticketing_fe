'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { safeHexColor, safeImageUrl } from '@/lib/safe';

/* ──────────────────────────────────────────
   TicketingDetailLayout
   ─ 3개 모드(practice / live / event)의 상세 페이지 공용 레이아웃
   ─ practice 페이지의 좌우 2단(포스터+정보 · 캘린더+회차+CTA) 구조를 그대로 사용
   ─ 모드별 텍스트·포스터·CTA 동작만 props 로 스위칭
   ────────────────────────────────────────── */

export type TicketingMode = 'practice' | 'live' | 'event';

export interface TicketingSession {
  id: string;
  label: string;
  opensAt: string; // ISO
  totalSeats: number;
}

export interface TicketingDetailLayoutProps {
  mode: TicketingMode;
  /** 최상단 라벨. 미지정 시 모드별 기본값 사용. */
  modeLabel?: string;
  /** 큰 제목 */
  title: string;
  /** 장소 부제 */
  venueName: string;
  /** 카테고리. 있으면 좌상단 배지 노출. */
  category?: string;

  /** 포스터 이미지 URL. 없으면 posterInitial + posterColor 폴백. */
  posterImage?: string;
  posterInitial?: string;
  posterColor?: string;

  /** 좌측 정보표 로우. */
  infoRows: Array<{ label: string; value: React.ReactNode }>;

  /** 우측 관람일 캘린더 활성 날짜(YYYY-MM-DD KST). 없으면 캘린더 카드 숨김. */
  availableDates?: string[];

  /** 우측 회차 픽커 목록. */
  sessions?: TicketingSession[];
  /** 선택된 회차 id (controlled). */
  selectedSessionId?: string;
  onSelectSession?: (id: string) => void;

  /** 예매 버튼 라벨. 미지정 시 모드별 기본값. */
  ctaLabel?: string;
  /** 예매 가능 여부. false → disable */
  canBook: boolean;
  /** disable 사유 문구. 버튼 아래 표시. */
  disabledReason?: string;
  /** 예매 클릭 핸들러. canBook=true 일 때만 호출됨. */
  onBook: () => void;
  /** 예매 진행 중 표시(옵션). */
  pending?: boolean;

  /** 하단 참여 규칙 리스트. */
  rules: string[];

  /** 뒤로가기 링크/라벨. onBack 있으면 버튼, 없으면 Link(backHref). */
  backHref?: string;
  backLabel?: string;
  onBack?: () => void;

  /** 우측 상단 참여비 뱃지 (event 전용). */
  entryFeeLabel?: string;

  /** CTA 아래 추가 노트(예: 로그인 안내). */
  ctaFootnote?: React.ReactNode;
}

/* ── 상수/유틸 ──────────────────────────────── */

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

const DEFAULT_MODE_LABEL: Record<TicketingMode, string> = {
  practice: '연습 모드 · 무료 체험',
  live: '실시간 · 매시 정각 오픈',
  event: '유료 이벤트 · 사전 신청',
};

const DEFAULT_CTA_LABEL: Record<TicketingMode, string> = {
  practice: '예매하기',
  live: '대기실 입장',
  event: '대기실 입장',
};

const MODE_POSTER_KICKER: Record<TicketingMode, string> = {
  practice: 'Ticket Rush · Practice',
  live: 'Ticket Rush · Live',
  event: 'Ticket Rush · Event',
};

/** availableDates 중 첫 번째 날짜의 년-월을 캘린더 기준으로. 없으면 오늘. */
function pickBaseYm(availableDates?: string[]): { year: number; month: number } {
  if (availableDates && availableDates.length > 0) {
    const [y, m] = availableDates[0].split('-').map(Number);
    return { year: y, month: m };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** 해당 년월의 첫날 요일(0=일)과 총 일수. KST 기준(로컬 Date 사용, 데모용). */
function getMonthGrid(year: number, month: number): {
  firstWeekday: number;
  daysInMonth: number;
} {
  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  return { firstWeekday: first.getDay(), daysInMonth };
}

/* ── 컴포넌트 ──────────────────────────────── */

export default function TicketingDetailLayout(props: TicketingDetailLayoutProps) {
  const {
    mode,
    modeLabel = DEFAULT_MODE_LABEL[mode],
    title,
    venueName,
    category,
    posterImage,
    posterInitial,
    posterColor,
    infoRows,
    availableDates,
    sessions,
    selectedSessionId,
    onSelectSession,
    ctaLabel = DEFAULT_CTA_LABEL[mode],
    canBook,
    disabledReason,
    onBook,
    pending = false,
    rules,
    backHref = '/event',
    backLabel = '← 다른 이벤트 선택',
    onBack,
    entryFeeLabel,
    ctaFootnote,
  } = props;

  const availableDatesSet = useMemo(
    () => new Set(availableDates ?? []),
    [availableDates],
  );
  const { year, month } = useMemo(
    () => pickBaseYm(availableDates),
    [availableDates],
  );
  const { firstWeekday, daysInMonth } = useMemo(
    () => getMonthGrid(year, month),
    [year, month],
  );

  // 달력 셀 배열
  const calendarWeeks = useMemo<(number | null)[][]>(() => {
    const cells: (number | null)[] = [
      ...Array(firstWeekday).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    const rem = cells.length % 7;
    if (rem !== 0) cells.push(...Array(7 - rem).fill(null));
    const weeks: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }
    return weeks;
  }, [firstWeekday, daysInMonth]);

  const showCalendar = (availableDates ?? []).length > 0;
  const showSessions = (sessions ?? []).length > 0;

  const monthYmLabel = `${year}.${String(month).padStart(2, '0')}`;

  return (
    <div className="bg-bg-page min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 뒤로가기 */}
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="btn btn-neutral btn-sm mb-4"
          >
            {backLabel}
          </button>
        ) : (
          <Link href={backHref} className="btn btn-neutral btn-sm mb-4 inline-flex">
            {backLabel}
          </Link>
        )}

        {/* 제목 영역 */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            {category && (
              <span className="badge badge-primary">{category}</span>
            )}
            <p className="text-xs font-semibold tracking-[0.2em] text-text-secondary uppercase">
              {modeLabel}
            </p>
            <h1 className="text-2xl font-bold text-text leading-tight">
              {title}
            </h1>
            <p className="text-sm text-text-secondary">{venueName}</p>
          </div>
          {entryFeeLabel && (
            <span className="badge badge-warning shrink-0">{entryFeeLabel}</span>
          )}
        </div>

        {/* 메인 그리드: 좌측(포스터) + 중앙(정보표) + 우측(사이드바) */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-8 mt-6 items-start">

          {/* ── 1. 좌측: 포스터 ── */}
          <div className="flex flex-col gap-4">
            <PosterCard
              mode={mode}
              title={title}
              venueName={venueName}
              posterImage={posterImage}
              posterInitial={posterInitial}
              posterColor={posterColor}
            />
          </div>

          {/* ── 2. 중앙: 정보표 ── */}
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {infoRows.map((row, idx) => (
                  <tr key={`${row.label}-${idx}`}>
                    <th
                      scope="row"
                      className="px-5 py-4 text-left align-top w-24 text-xs font-semibold text-text-secondary bg-bg-subtle whitespace-nowrap"
                    >
                      {row.label}
                    </th>
                    <td className="px-5 py-4 text-text leading-relaxed">
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── 3. 우측: sticky 사이드바 ── */}
          <div className="lg:sticky lg:top-6 space-y-4">

            {/* 캘린더 카드 */}
            {showCalendar && (
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="w-6 h-6" />
                  <span className="text-sm font-semibold text-text">
                    {monthYmLabel}
                  </span>
                  <span className="w-6 h-6" />
                </div>
                <p className="text-xs font-semibold text-text-secondary mb-2">
                  관람일
                </p>
                <div className="grid grid-cols-7 mb-1">
                  {WEEKDAY_LABELS.map((day, idx) => (
                    <div
                      key={day}
                      className={[
                        'text-center text-xs font-semibold py-1',
                        idx === 0 ? 'text-red-500' : 'text-text-secondary',
                      ].join(' ')}
                    >
                      {day}
                    </div>
                  ))}
                </div>
                <div className="space-y-0.5">
                  {calendarWeeks.map((week, wi) => (
                    <div key={wi} className="grid grid-cols-7">
                      {week.map((day, di) => {
                        const ymd =
                          day !== null
                            ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                            : null;
                        const active =
                          ymd !== null && availableDatesSet.has(ymd);
                        const isSunday = di === 0;
                        return (
                          <div
                            key={di}
                            className="flex items-center justify-center py-0.5"
                          >
                            {day !== null ? (
                              <span
                                aria-label={`${month}월 ${day}일${active ? ' 관람 가능' : ''}`}
                                className={[
                                  'w-7 h-7 text-xs font-medium rounded-full transition-colors flex items-center justify-center',
                                  active
                                    ? 'bg-blue-600 text-white font-semibold'
                                    : isSunday
                                    ? 'text-red-500 opacity-60'
                                    : 'text-text-tertiary opacity-60',
                                ].join(' ')}
                              >
                                {day}
                              </span>
                            ) : (
                              <span className="w-7 h-7" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 회차 선택 카드 */}
            {showSessions && (
              <div className="card p-4 space-y-3">
                <p className="text-xs font-semibold text-text-secondary">회차</p>
                <div className="flex flex-wrap gap-2">
                  {sessions!.map((s) => {
                    const active = s.id === selectedSessionId;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => onSelectSession?.(s.id)}
                        aria-pressed={active}
                        className={[
                          'btn btn-sm flex-1 min-w-[6rem] transition-colors',
                          active
                            ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                            : 'btn-neutral',
                        ].join(' ')}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>

                {/* 좌석 총계 (단건 회차는 총 좌석 강조) */}
                {sessions!.length === 1 && (
                  <div className="pt-1 border-t border-border">
                    <p className="text-xs text-text-tertiary mb-1.5">좌석 규모</p>
                    <p className="text-sm text-text">
                      총{' '}
                      <span className="font-semibold text-text font-mono-tabular">
                        {sessions![0].totalSeats.toLocaleString()}
                      </span>
                      석
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 예매하기 CTA */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  if (!canBook || pending) return;
                  onBook();
                }}
                disabled={!canBook || pending}
                className="w-full py-3.5 rounded-lg bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white text-sm font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {pending ? '진입 중...' : ctaLabel}
              </button>
              {!canBook && disabledReason && (
                <p className="text-xs text-text-secondary text-center font-mono-tabular">
                  {disabledReason}
                </p>
              )}
              {ctaFootnote && (
                <div className="text-[11px] text-text-tertiary text-center">
                  {ctaFootnote}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 하단 참여 규칙 */}
        {rules.length > 0 && (
          <div className="card p-5 mt-6 bg-bg-subtle">
            <h3 className="text-sm font-semibold text-text mb-2">참여 규칙</h3>
            <ul className="text-xs text-text-secondary space-y-1 list-disc list-inside">
              {rules.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 서브 컴포넌트 ──────────────────────────── */

interface PosterCardProps {
  mode: TicketingMode;
  title: string;
  venueName: string;
  posterImage?: string;
  posterInitial?: string;
  posterColor?: string;
}

function PosterCard({
  mode,
  title,
  venueName,
  posterImage,
  posterInitial,
  posterColor,
}: PosterCardProps) {
  const kicker = MODE_POSTER_KICKER[mode];
  const safeColor = safeHexColor(posterColor);
  const safeImage = safeImageUrl(posterImage);
  return (
    <div
      className="relative w-full rounded-xl overflow-hidden"
      style={{
        aspectRatio: '3/4',
        background: safeColor,
      }}
      aria-label="공연 포스터"
    >
      {safeImage ? (
        <Image
          src={safeImage}
          alt={title}
          fill
          className="object-cover"
          sizes="280px"
          priority
        />
      ) : posterInitial ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-6xl font-black text-white/90 tracking-tight select-none">
            {posterInitial}
          </span>
        </div>
      ) : null}
      <div
        className="absolute inset-x-0 bottom-0 h-2/3 z-10 pointer-events-none"
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.85) 20%, transparent)',
        }}
      />
      <div className="absolute inset-0 z-20 p-5 flex flex-col justify-between">
        <p
          className="text-[9px] font-bold tracking-[0.3em] uppercase text-white/70"
        >
          {kicker}
        </p>
        <div>
          <p className="text-white font-black text-base leading-tight drop-shadow line-clamp-3">
            {title}
          </p>
          <p className="text-white/50 text-xs mt-2 truncate">{venueName}</p>
        </div>
      </div>
    </div>
  );
}
