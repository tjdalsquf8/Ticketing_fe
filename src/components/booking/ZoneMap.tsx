'use client';

import type { VenueConfig } from '@/types/ticketing';

/* ─────────────────────────────────────────────────────────
   ZoneMap — 좌석도 전체보기
   구역 블록을 클릭하면 해당 구역 상세 좌석 선택으로 전환
   ───────────────────────────────────────────────────────── */

interface Props {
  venue: VenueConfig;
  onSelectZone: (zoneId: string) => void;
}

export default function ZoneMap({ venue, onSelectZone }: Props) {
  return (
    <div className="space-y-2">
      {/* 안내 문구 */}
      <div className="border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-sm text-[#6B7280]">
        ◆ 원하시는 영역을 선택해주세요. 공연장에서 위치를 클릭하거나, 오른쪽의 좌석을 선택해주세요.
      </div>

      {/* 구역 맵 */}
      <div className="border border-[#E5E7EB] bg-white p-6 overflow-x-auto">
        <div className="min-w-[560px]">
          {venue.mapGrid.map((row, ri) => (
            <div key={ri}
                 className="flex gap-2 justify-center"
                 style={{ marginBottom: ri < venue.mapGrid.length - 1 ? 8 : 0 }}>
              {row.map((cell, ci) => {
                const span = cell.colSpan ?? 1;

                if (cell.type === 'empty') {
                  return <div key={ci} style={{ flex: span }} />;
                }

                if (cell.type === 'stage') {
                  return (
                    <div
                      key={ci}
                      style={{ flex: span }}
                      className="rounded border border-[#D1D5DB] bg-[#F3F4F6] text-center py-2 mb-1"
                    >
                      <span className="text-xs font-bold text-[#6B7280] tracking-[0.3em] uppercase">
                        STAGE
                      </span>
                    </div>
                  );
                }

                if (cell.type === 'label') {
                  return (
                    <div
                      key={ci}
                      style={{ flex: span }}
                      className="rounded border border-[#E5E7EB] bg-[#F9FAFB] text-center py-1.5"
                    >
                      <span className="text-xs text-[#9CA3AF]">{cell.text}</span>
                    </div>
                  );
                }

                if (cell.type === 'zone') {
                  const zone = venue.zones.find(z => z.id === cell.zoneId);
                  if (!zone) return <div key={ci} style={{ flex: span }} />;
                  const tier  = venue.tiers[zone.tier];

                  return (
                    <button
                      key={ci}
                      style={{
                        flex: span,
                        background: tier.bg,
                      }}
                      onClick={() => onSelectZone(zone.id)}
                      className="rounded py-4 flex flex-col items-center justify-center hover:brightness-95 transition-all min-h-[64px]"
                    >
                      <span className="text-xl font-bold" style={{ color: tier.color }}>
                        {zone.name}
                      </span>
                    </button>
                  );
                }

                return null;
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
