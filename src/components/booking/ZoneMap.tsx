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
  const isAuditorium = venue.layout === 'auditorium';

  // 스타디움 돔 형태: 위쪽은 반타원, 아래는 살짝 라운드. border-radius 축약 문법.
  const auditoriumShape = isAuditorium
    ? {
        borderRadius: '50% 50% 14px 14px / 30% 30% 14px 14px',
      }
    : undefined;

  return (
    <div className="space-y-2">
      {/* 안내 문구 */}
      <div className="border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-sm text-[#6B7280]">
        ◆ 원하시는 영역을 선택해주세요. 공연장에서 위치를 클릭하거나, 오른쪽의 좌석을 선택해주세요.
      </div>

      {/* 구역 맵 */}
      <div
        className={[
          'overflow-x-auto',
          isAuditorium
            ? 'border-2 border-[#94A3B8] bg-gradient-to-b from-[#F1F5F9] to-white px-8 pt-4 pb-8'
            : 'border border-[#E5E7EB] bg-white p-6',
        ].join(' ')}
        style={auditoriumShape}
      >
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
                  if (isAuditorium) {
                    // 곡선 STAGE 아크 — 위로 볼록한 호
                    return (
                      <div key={ci} style={{ flex: span }} className="relative pb-2">
                        <svg
                          viewBox="0 0 400 40"
                          preserveAspectRatio="none"
                          className="w-full h-8"
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
                        <span className="absolute inset-x-0 top-2 text-center text-xs font-bold text-[#475569] tracking-[0.35em] uppercase">
                          STAGE
                        </span>
                      </div>
                    );
                  }
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
                      className={[
                        'py-4 flex flex-col items-center justify-center hover:brightness-95 transition-all min-h-[64px]',
                        isAuditorium ? 'rounded-lg border border-[#CBD5E1]' : 'rounded',
                      ].join(' ')}
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
