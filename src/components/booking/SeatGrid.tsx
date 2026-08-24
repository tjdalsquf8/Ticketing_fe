'use client';

import type { Zone, TierInfo, SelectedSeat } from '@/types/ticketing';
import type { LiveSeatStatus } from '@/lib/live';

/* ─────────────────────────────────────────────────────────
   SeatGrid — 구역 클릭 후 보여주는 상세 좌석 배치도
   연습/모의: bookedSeats(랜덤·미오픈) 사용.
   라이브   : seatStatusMap(available/held/sold) + myHoldSeatLabel 사용.
   ───────────────────────────────────────────────────────── */

const SEAT_PX = 15;
const GAP_PX  = 2;
const MAX_SELECT = 4;

function fmtPrice(n: number) { return n.toLocaleString('ko-KR') + '원'; }

interface Props {
  zone: Zone;
  tier: TierInfo;
  selected: Set<string>;
  bookedSeats: Set<string>;     // 선택 불가 좌석 (연습: 랜덤 예매완료 / 라이브 미리보기: 미오픈)
  onToggle: (seat: SelectedSeat) => void;
  maxSelect?: number;
  /** VenueConfig.layout 그대로 — 'auditorium'이면 곡선 스테이지·돔형 컨테이너·행별 arc offset 적용 */
  layout?: 'grid' | 'auditorium' | 'proscenium' | 'arena-ring' | 'baseball' | 'stadium-oval' | 'festival';
  /** bookedSeats의 표시 라벨. 기본 "예매 완료" / 라이브 미리보기에서는 "미오픈" 등으로 교체 */
  unavailableLabel?: string;
  /**
   * 라이브 모드 좌석 상태맵.
   * key = seatLabel(`${zoneId}-${rowLabel}-${col}`), value = 'available' | 'held' | 'sold'.
   * 지정된 좌석만 렌더 대상 (맵에 없는 좌석은 "미오픈"으로 취급).
   */
  seatStatusMap?: Map<string, LiveSeatStatus>;
  /** 라이브 모드에서 본인이 hold 한 좌석 라벨 (있으면 primary 강조). */
  myHoldSeatLabel?: string | null;
}

export default function SeatGrid({
  zone, tier, selected, bookedSeats, onToggle, maxSelect = MAX_SELECT, layout,
  unavailableLabel = '예매 완료',
  seatStatusMap, myHoldSeatLabel,
}: Props) {
  const isLive = !!seatStatusMap;
  const isAuditorium = layout === 'auditorium';

  /* ── 지정석 구역 ── */
  if (zone.type === 'seated' && zone.seatRows) {
    const maxCount = Math.max(...zone.seatRows.map(r => r.seatCount));
    // 뒷줄일수록 조금 더 아래로 밀린 arc 효과 (앞줄은 STAGE 쪽으로 살짝 볼록)
    const rowCount = zone.seatRows.length;
    // Auditorium: 존 위치에 따라 좌석 정렬. A(1XX)/C(3XX)는 좌측, B(2XX)/D(4XX)는 우측, 2F는 중앙.
    const seatAlign: 'left' | 'right' | 'center' = isAuditorium
      ? zone.id.startsWith('2F-')
        ? 'center'
        : zone.id[0] === '2' || zone.id[0] === '4'
          ? 'right'
          : 'left'
      : 'left';

    return (
      <div className="space-y-3">
        <div className="rounded border border-border bg-bg-subtle px-3 py-2 text-sm text-text-secondary">
          ◆ <strong className="text-text">{zone.name}</strong> 구역의 좌석배치도입니다
        </div>

        <div
          className={[
            'overflow-x-auto',
            isAuditorium
              ? 'border-2 border-[#94A3B8] bg-gradient-to-b from-[#F1F5F9] to-white px-6 pt-3 pb-6'
              : 'border border-border rounded-lg bg-bg-surface p-5',
          ].join(' ')}
          style={
            isAuditorium
              ? { borderRadius: '50% 50% 14px 14px / 22% 22% 14px 14px' }
              : undefined
          }
        >
          {/* Auditorium 모드: 곡선 STAGE 아크 */}
          {isAuditorium && (
            <div className="relative pb-3">
              <svg
                viewBox="0 0 400 40"
                preserveAspectRatio="none"
                className="w-full h-7"
                aria-hidden="true"
              >
                <path
                  d="M 20 38 Q 200 -8 380 38"
                  fill="none"
                  stroke="#64748B"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-x-0 top-1 text-center text-[11px] font-bold text-[#475569] tracking-[0.35em] uppercase">
                STAGE
              </span>
            </div>
          )}

          <div
            className={[
              'w-full flex',
              seatAlign === 'right' ? 'justify-end' : seatAlign === 'center' ? 'justify-center' : 'justify-start',
            ].join(' ')}
          >
          <div className="inline-block">
            {zone.seatRows.map(({ label, seatCount }, rowIdx) => {
              const padCols = Math.floor((maxCount - seatCount) / 2);
              // Auditorium: 앞줄(rowIdx=0)이 살짝 위로 볼록, 뒷줄로 갈수록 평평해짐
              // rowIdx가 커질수록 offset이 줄어 스테이지에서 멀어지는 착시 감소
              const arcOffset = isAuditorium
                ? -Math.round((1 - rowIdx / Math.max(rowCount - 1, 1)) * 4)
                : 0;

              // 우측 정렬(B/D) 시 열 라벨을 오른쪽으로. 그 외는 왼쪽.
              const labelOnRight = seatAlign === 'right';

              return (
                <div key={label}
                     className="flex items-center"
                     style={{
                       gap: GAP_PX,
                       marginBottom: GAP_PX,
                       transform: arcOffset ? `translateY(${arcOffset}px)` : undefined,
                     }}>
                  {/* 좌측 정렬용 행 라벨 */}
                  {!labelOnRight && (
                    <span className="text-xs text-text-tertiary font-mono-tabular shrink-0"
                          style={{ width: 24, textAlign: 'right' }}>
                      {label}
                    </span>
                  )}
                  {/* 왼쪽 여백 */}
                  <div style={{ width: padCols * (SEAT_PX + GAP_PX), flexShrink: 0 }} />
                  {/* 좌석 */}
                  {Array.from({ length: seatCount }, (_, i) => {
                    const col  = i + 1;
                    const id   = `${zone.id}-${label}-${col}`;
                    const sel  = selected.has(id);
                    const canAdd = selected.size < maxSelect;

                    // 라이브 모드: 서버 status 로 상태 결정. myHold 좌석은 primary 강조.
                    // 연습/모의: 기존 bookedSeats 흐름 유지.
                    const liveStatus: LiveSeatStatus | 'unopened' | null = isLive
                      ? (seatStatusMap!.get(id) ?? 'unopened')
                      : null;
                    const isMyHold = isLive && myHoldSeatLabel === id;
                    const takenLegacy = !isLive && bookedSeats.has(id);
                    const disabled = isLive
                      ? (liveStatus === 'sold' || liveStatus === 'unopened' || (liveStatus === 'held' && !isMyHold))
                      : takenLegacy;

                    let bg: string, border: string, cursor: string, opacity = 1;
                    if (isLive) {
                      if (isMyHold) {
                        bg = '#E85D00'; border = '#C24E00'; cursor = 'pointer';
                      } else if (liveStatus === 'sold') {
                        bg = '#1E293B'; border = '#0F172A'; cursor = 'not-allowed'; opacity = 0.55;
                      } else if (liveStatus === 'held') {
                        bg = '#CBD5E1'; border = '#94A3B8'; cursor = 'not-allowed'; opacity = 0.55;
                      } else if (liveStatus === 'unopened') {
                        bg = '#F1F5F9'; border = '#E2E8F0'; cursor = 'not-allowed'; opacity = 0.35;
                      } else {
                        // available
                        bg = tier.bg; border = tier.color; cursor = 'pointer';
                      }
                      // 라이브에서는 selected 배열도 반영 (SelectionPanel 총액 등)
                      if (sel && !isMyHold) {
                        bg = '#E85D00'; border = '#C24E00';
                      }
                    } else {
                      if (sel)   { bg = '#E85D00'; border = '#C24E00'; cursor = 'pointer'; }
                      else if (takenLegacy) { bg = '#E2E8F0'; border = '#CBD5E1'; cursor = 'not-allowed'; }
                      else       { bg = tier.bg;    border = tier.color; cursor = canAdd ? 'pointer' : 'not-allowed'; }
                    }

                    const title = isLive
                      ? (liveStatus === 'sold' ? '예매 완료된 좌석'
                        : liveStatus === 'held' ? (isMyHold ? '내가 선점한 좌석' : '다른 사용자가 선점 중')
                        : liveStatus === 'unopened' ? '미오픈'
                        : `${label}열 ${col}번 — ${tier.label} ${fmtPrice(tier.price)}`)
                      : (takenLegacy ? unavailableLabel : `${label}열 ${col}번 — ${tier.label} ${fmtPrice(tier.price)}`);

                    const highlight = isMyHold || sel;

                    return (
                      <button
                        key={id}
                        title={title}
                        disabled={disabled}
                        onClick={() => {
                          if (disabled) return;
                          if (!isLive && !sel && !canAdd) return;
                          onToggle({
                            id, zoneId: zone.id, zoneName: zone.name,
                            tier: zone.tier,
                            label: `${label}열 ${col}번`,
                          });
                        }}
                        style={{
                          width: SEAT_PX, height: SEAT_PX,
                          borderRadius: isAuditorium ? '50%' : 2,
                          border: `1px solid ${border}`,
                          background: bg,
                          cursor,
                          opacity,
                          flexShrink: 0,
                          transform: highlight ? 'scale(1.15)' : 'scale(1)',
                          transition: 'transform 80ms',
                          outline: isMyHold ? '2px solid #E85D00' : 'none',
                          outlineOffset: isMyHold ? 1 : 0,
                        }}
                      />
                    );
                  })}
                  {/* 우측 정렬용 행 라벨 (B/D) */}
                  {labelOnRight && (
                    <span className="text-xs text-text-tertiary font-mono-tabular shrink-0"
                          style={{ width: 24, textAlign: 'left' }}>
                      {label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          </div>
        </div>

        {/* 범례 */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-text-secondary">
          <div className="flex items-center gap-1.5">
            <span className="inline-block"
                  style={{ width: 11, height: 11, borderRadius: isAuditorium ? '50%' : 2, background: tier.bg, border: `1px solid ${tier.color}` }} />
            선택 가능
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block"
                  style={{ width: 11, height: 11, borderRadius: isAuditorium ? '50%' : 2, background: '#E85D00', border: '1px solid #C24E00' }} />
            {isLive ? '내 선점' : '선택됨'}
          </div>
          {isLive ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="inline-block"
                      style={{ width: 11, height: 11, borderRadius: isAuditorium ? '50%' : 2, background: '#CBD5E1', border: '1px solid #94A3B8', opacity: 0.7 }} />
                타 사용자 선점
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block"
                      style={{ width: 11, height: 11, borderRadius: isAuditorium ? '50%' : 2, background: '#1E293B', border: '1px solid #0F172A', opacity: 0.7 }} />
                예매 완료
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block"
                      style={{ width: 11, height: 11, borderRadius: isAuditorium ? '50%' : 2, background: '#F1F5F9', border: '1px solid #E2E8F0', opacity: 0.5 }} />
                미오픈
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="inline-block"
                    style={{ width: 11, height: 11, borderRadius: isAuditorium ? '50%' : 2, background: '#E2E8F0', border: '1px solid #CBD5E1' }} />
              {unavailableLabel}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── 스탠딩 구역 ── */
  if (zone.type === 'standing' && zone.standingBlocks) {
    return (
      <div className="space-y-3">
        <div className="rounded border border-border bg-bg-subtle px-3 py-2 text-sm text-text-secondary">
          ◆ <strong className="text-text">{zone.name}</strong> 구역의 좌석배치도입니다
        </div>
        <div className="border border-border rounded-lg bg-bg-surface p-5">
          <p className="text-xs text-text-secondary mb-4">
            * 스탠딩 구역은 입장 번호순 입장입니다. 빠른 번호로 예매해 주세요.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {zone.standingBlocks.map(block => {
              const id = `${zone.id}-${block.blockId}`;
              const sel = selected.has(id);
              return (
                <button
                  key={id}
                  onClick={() => {
                    if (!sel && selected.size >= maxSelect) return;
                    onToggle({
                      id, zoneId: zone.id, zoneName: zone.name,
                      tier: zone.tier,
                      label: `${block.blockId} ${block.rangeLabel}`,
                    });
                  }}
                  style={{
                    background: sel ? tier.color : tier.bg,
                    border: `2px solid ${tier.color}`,
                    color: sel ? '#fff' : tier.color,
                  }}
                  className="rounded-lg px-4 py-3 text-left transition-all hover:brightness-95"
                >
                  <p className="font-bold text-sm">{block.blockId}</p>
                  <p className="text-xs mt-0.5">{block.rangeLabel}</p>
                  <p className="text-xs mt-1 opacity-80">
                    잔여 {block.available.toLocaleString()} / {block.total.toLocaleString()}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
