'use client';

import type { Zone, TierInfo, SelectedSeat } from '@/types/ticketing';

/* ─────────────────────────────────────────────────────────
   SeatGrid — 구역 클릭 후 보여주는 상세 좌석 배치도
   결정적 패턴으로 "이미 예매됨" 좌석 생성 (실제 구현 시 API 대체)
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
}

export default function SeatGrid({
  zone, tier, selected, bookedSeats, onToggle, maxSelect = MAX_SELECT, layout,
  unavailableLabel = '예매 완료',
}: Props) {
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
                    const taken = bookedSeats.has(id);
                    const sel  = selected.has(id);
                    const canAdd = selected.size < maxSelect;

                    let bg, border, cursor: string;
                    if (sel)   { bg = '#E85D00'; border = '#C24E00'; cursor = 'pointer'; }
                    else if (taken) { bg = '#E2E8F0'; border = '#CBD5E1'; cursor = 'not-allowed'; }
                    else       { bg = tier.bg;    border = tier.color; cursor = canAdd ? 'pointer' : 'not-allowed'; }

                    return (
                      <button
                        key={id}
                        title={taken ? unavailableLabel : `${label}열 ${col}번 — ${tier.label} ${fmtPrice(tier.price)}`}
                        disabled={taken}
                        onClick={() => {
                          if (taken) return;
                          if (!sel && !canAdd) return;
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
                          flexShrink: 0,
                          transform: sel ? 'scale(1.15)' : 'scale(1)',
                          transition: 'transform 80ms',
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
            선택됨
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block"
                  style={{ width: 11, height: 11, borderRadius: isAuditorium ? '50%' : 2, background: '#E2E8F0', border: '1px solid #CBD5E1' }} />
            {unavailableLabel}
          </div>
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
