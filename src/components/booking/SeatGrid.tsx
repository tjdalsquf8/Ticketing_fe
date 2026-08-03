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
  bookedSeats: Set<string>;     // 랜덤 예매완료 좌석 (BookingFlow에서 주입)
  onToggle: (seat: SelectedSeat) => void;
  maxSelect?: number;
}

export default function SeatGrid({
  zone, tier, selected, bookedSeats, onToggle, maxSelect = MAX_SELECT,
}: Props) {
  /* ── 지정석 구역 ── */
  if (zone.type === 'seated' && zone.seatRows) {
    const maxCount = Math.max(...zone.seatRows.map(r => r.seatCount));

    return (
      <div className="space-y-3">
        <div className="rounded border border-border bg-bg-subtle px-3 py-2 text-sm text-text-secondary">
          ◆ <strong className="text-text">{zone.name}</strong> 구역의 좌석배치도입니다
        </div>

        <div className="border border-border rounded-lg bg-bg-surface p-5 overflow-x-auto">
          <div className="inline-block">
            {zone.seatRows.map(({ label, seatCount }) => {
              const padCols = Math.floor((maxCount - seatCount) / 2);

              return (
                <div key={label}
                     className="flex items-center"
                     style={{ gap: GAP_PX, marginBottom: GAP_PX }}>
                  {/* 행 라벨 */}
                  <span className="text-xs text-text-tertiary font-mono-tabular shrink-0"
                        style={{ width: 24, textAlign: 'right' }}>
                    {label}
                  </span>
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
                        title={taken ? '예매 완료' : `${label}열 ${col}번 — ${tier.label} ${fmtPrice(tier.price)}`}
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
                          borderRadius: 2,
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
                </div>
              );
            })}
          </div>
        </div>

        {/* 범례 */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-text-secondary">
          <div className="flex items-center gap-1.5">
            <span className="inline-block rounded"
                  style={{ width: 11, height: 11, background: tier.bg, border: `1px solid ${tier.color}` }} />
            선택 가능
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block rounded"
                  style={{ width: 11, height: 11, background: '#E85D00', border: '1px solid #C24E00' }} />
            선택됨
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block rounded"
                  style={{ width: 11, height: 11, background: '#E2E8F0', border: '1px solid #CBD5E1' }} />
            예매 완료
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
