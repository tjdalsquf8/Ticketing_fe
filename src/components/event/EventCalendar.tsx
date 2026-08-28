'use client';

import { useMemo } from 'react';
import { getKstToday, getMonthMeta, shiftYm } from '@/lib/kst';

export interface CalendarEvent {
  id: string;
  title: string;
  prize: string;
  opensAtKstDate: string; // "YYYY-MM-DD" KST
  status: 'scheduled' | 'open' | 'closed' | 'cancelled';
}

interface EventCalendarProps {
  ym: string; // "YYYY-MM"
  events: CalendarEvent[];
  onChangeYm?: (ym: string) => void;
  onClickEvent?: (eventId: string) => void;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const STATUS_DOT: Record<CalendarEvent['status'], string> = {
  scheduled: 'bg-primary',
  open: 'bg-danger-text',
  closed: 'bg-text-tertiary',
  cancelled: 'bg-text-tertiary',
};

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + '…';
}

export default function EventCalendar({
  ym,
  events,
  onChangeYm,
  onClickEvent,
}: EventCalendarProps) {
  const { year, month, firstWeekday, daysInMonth } = useMemo(() => getMonthMeta(ym), [ym]);
  const today = getKstToday();

  // 이벤트를 날짜별로 group
  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const list = map.get(ev.opensAtKstDate) ?? [];
      list.push(ev);
      map.set(ev.opensAtKstDate, list);
    }
    return map;
  }, [events]);

  // 6주 × 7일 = 42셀
  const cells: Array<{
    key: string;
    dateStr: string | null; // "YYYY-MM-DD"
    dayNum: number;
    inMonth: boolean;
  }> = [];

  // 앞쪽 이전달 채움
  const prevYm = shiftYm(ym, -1);
  const { daysInMonth: prevDays } = getMonthMeta(prevYm);
  for (let i = firstWeekday - 1; i >= 0; i -= 1) {
    const d = prevDays - i;
    const [py, pm] = prevYm.split('-').map(Number);
    const dateStr = `${py}-${String(pm).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ key: `prev-${d}`, dateStr, dayNum: d, inMonth: false });
  }

  // 이번 달
  for (let d = 1; d <= daysInMonth; d += 1) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ key: `cur-${d}`, dateStr, dayNum: d, inMonth: true });
  }

  // 뒤쪽 다음달 채움
  const nextYm = shiftYm(ym, +1);
  const [ny, nm] = nextYm.split('-').map(Number);
  let nextDay = 1;
  while (cells.length < 42) {
    const dateStr = `${ny}-${String(nm).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`;
    cells.push({ key: `next-${nextDay}`, dateStr, dayNum: nextDay, inMonth: false });
    nextDay += 1;
  }

  const goPrev = () => onChangeYm?.(shiftYm(ym, -1));
  const goNext = () => onChangeYm?.(shiftYm(ym, +1));

  return (
    <section className="card p-4 sm:p-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={goPrev}
          aria-label="이전 달"
          className="btn btn-ghost btn-sm"
        >
          <span aria-hidden>‹</span>
        </button>
        <h2 className="text-base sm:text-lg font-bold text-text font-mono-tabular">
          {year}년 {month}월
        </h2>
        <button
          type="button"
          onClick={goNext}
          aria-label="다음 달"
          className="btn btn-ghost btn-sm"
        >
          <span aria-hidden>›</span>
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={[
              'text-center text-[11px] sm:text-xs font-semibold py-1.5',
              i === 0 ? 'text-danger-text' : i === 6 ? 'text-info-text' : 'text-text-secondary',
            ].join(' ')}
          >
            {w}
          </div>
        ))}
      </div>

      {/* 6주 그리드 */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border border-border">
        {cells.map((cell, idx) => {
          const dayEvents = cell.dateStr ? (byDate.get(cell.dateStr) ?? []) : [];
          const isToday = cell.dateStr === today;
          const weekday = idx % 7;

          return (
            <div
              key={cell.key}
              className={[
                'bg-bg-surface min-h-[68px] sm:min-h-[92px] p-1 sm:p-1.5 flex flex-col gap-0.5',
                !cell.inMonth ? 'bg-bg-subtle/60' : '',
                isToday ? 'ring-2 ring-inset ring-primary bg-primary-subtle' : '',
              ].join(' ')}
            >
              {/* 날짜 숫자 (우상단) */}
              <div className="flex justify-end">
                <span
                  className={[
                    'text-[10px] sm:text-xs font-semibold font-mono-tabular',
                    !cell.inMonth
                      ? 'text-text-tertiary'
                      : weekday === 0
                        ? 'text-danger-text'
                        : weekday === 6
                          ? 'text-info-text'
                          : 'text-text-secondary',
                    isToday ? 'text-primary' : '',
                  ].join(' ')}
                >
                  {cell.dayNum}
                </span>
              </div>

              {/* 이벤트 */}
              {dayEvents.length > 0 && (
                <div className="flex flex-col gap-0.5 min-w-0">
                  {(() => {
                    const first = dayEvents[0];
                    const isStrike = first.status === 'cancelled';
                    return (
                      <button
                        key={first.id}
                        type="button"
                        onClick={() => onClickEvent?.(first.id)}
                        className={[
                          'group text-left rounded px-1 py-0.5 hover:bg-bg-subtle transition-colors',
                          'min-w-0',
                        ].join(' ')}
                      >
                        <div className="flex items-center gap-1 min-w-0">
                          <span
                            className={[
                              'inline-block w-1.5 h-1.5 rounded-full shrink-0',
                              STATUS_DOT[first.status],
                            ].join(' ')}
                            aria-hidden
                          />
                          <span
                            className={[
                              'text-[10px] sm:text-[11px] font-semibold text-text truncate',
                              isStrike ? 'line-through text-text-tertiary' : '',
                            ].join(' ')}
                          >
                            {truncate(first.title, 12)}
                          </span>
                        </div>
                        <p
                          className={[
                            'hidden sm:block text-[10px] text-text-secondary truncate pl-2.5',
                            isStrike ? 'line-through text-text-tertiary' : '',
                          ].join(' ')}
                        >
                          {truncate(first.prize, 14)}
                        </p>
                      </button>
                    );
                  })()}

                  {dayEvents.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onClickEvent?.(dayEvents[1].id)}
                      className="text-[10px] font-semibold text-primary text-left px-1 hover:underline"
                    >
                      +{dayEvents.length - 1}개
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 범례 */}
      <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-text-secondary">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-primary" aria-hidden /> 예정
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-danger-text" aria-hidden /> 진행 중
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-text-tertiary" aria-hidden /> 종료
        </span>
      </div>
    </section>
  );
}
