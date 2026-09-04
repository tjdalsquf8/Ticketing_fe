'use client';

import type { VenueConfig, SelectedSeat } from '@/types/ticketing';

/* ─────────────────────────────────────────────────────────
   SelectionPanel — 우측 고정 패널 (인터파크 스타일)
   ───────────────────────────────────────────────────────── */

const fmtPrice = (n: number) => n.toLocaleString('ko-KR') + '원';

interface Props {
  venue: VenueConfig;
  selected: SelectedSeat[];
  activeZoneId: string | null;          // null = 전체 보기 상태
  onViewAll:    () => void;             // 좌석도 전체보기
  onRemove:     (seatId: string) => void;
  onReset:      () => void;
  onComplete:   () => void;
  onBack:       () => void;
  mode?:        'practice' | 'live';
  elapsedMs?:   number;
}

export default function SelectionPanel({
  venue, selected,
  onViewAll, onRemove, onReset, onComplete, onBack,
  mode = 'live',
}: Props) {
  const totalPrice = selected.reduce((sum, s) => sum + (venue.tiers[s.tier]?.price ?? 0), 0);

  return (
    <aside className="w-full sm:w-56 shrink-0 space-y-2">

      {/* 좌석도 전체보기 */}
      <button
        onClick={onViewAll}
        className="w-full px-3 py-3 text-sm font-semibold text-white text-left transition-opacity hover:opacity-90"
        style={{ backgroundColor: '#C82028' }}
      >
        <p>≪ 좌석도 전체보기</p>
        <p className="text-xs font-normal mt-0.5 opacity-80">원하시는 좌석위치를 선택하세요</p>
      </button>


      {/* 좌석등급 / 잔여석 */}
      <div className="card p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-text">좌석등급 / 잔여석</p>
          <button className="text-xs text-primary hover:underline">가격 전체보기 ›</button>
        </div>
        <div className="space-y-1.5">
          {Object.entries(venue.tiers).map(([key, t]) => (
            <div key={key} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-sm"
                      style={{ background: t.color }} />
                <span className="text-text">{t.label}</span>
              </div>
              <span className="text-text-secondary font-mono-tabular">{fmtPrice(t.price)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 선택좌석 */}
      <div className="card p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-text">선택좌석</p>
          <p className="text-xs font-semibold" style={{ color: '#C82028' }}>총 {selected.length}석 선택되었습니다.</p>
        </div>

        {/* 헤더 */}
        <div className="grid grid-cols-2 border-b border-border pb-1">
          <span className="text-xs text-text-secondary">좌석등급</span>
          <span className="text-xs text-text-secondary">좌석번호</span>
        </div>

        {/* 선택 목록 */}
        <div className="min-h-16 space-y-1">
          {selected.length === 0 ? (
            <p className="text-xs text-text-tertiary py-3 text-center">좌석을 선택해주세요</p>
          ) : (
            selected.map(s => {
              const t = venue.tiers[s.tier];
              return (
                <div key={s.id} className="grid grid-cols-2 items-center gap-1">
                  <span className="text-xs font-medium text-text truncate" style={{ color: t?.color }}>
                    {t?.label ?? s.tier}
                  </span>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs text-text truncate">{s.label}</span>
                    <button
                      onClick={() => onRemove(s.id)}
                      className="text-text-tertiary hover:text-danger-text text-xs shrink-0"
                    >✕</button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 총 금액 */}
        {selected.length > 0 && (
          <div className="border-t border-border pt-2 flex justify-between text-xs">
            <span className="text-text-secondary">합계</span>
            <span className="font-bold text-text">{fmtPrice(totalPrice)}</span>
          </div>
        )}
      </div>

      {/* 좌석선택완료 */}
      <button
        onClick={onComplete}
        disabled={selected.length === 0}
        className="w-full py-3.5 flex items-center justify-between px-4 font-bold text-sm text-white rounded transition-opacity disabled:opacity-40"
        style={{ backgroundColor: '#C82028' }}
      >
        <span>{mode === 'practice' ? '예매하기' : '좌석선택완료'}</span>
        <span>›</span>
      </button>

      {/* 보조 버튼 */}
      <div className="flex gap-2">
        <button onClick={onBack}  className="btn btn-neutral btn-sm flex-1 text-xs">‹ 이전단계</button>
        <button onClick={onReset} className="btn btn-neutral btn-sm flex-1 text-xs">↺ 좌석 다시 선택</button>
      </div>
      <button className="w-full text-xs text-text-tertiary hover:text-text text-center">
        ⚠ 좌석 선택시 유의사항
      </button>
    </aside>
  );
}
