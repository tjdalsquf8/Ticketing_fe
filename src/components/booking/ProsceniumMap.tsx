'use client';

import type { VenueConfig } from '@/types/ticketing';

/* ─────────────────────────────────────────────────────────
   ProsceniumMap — 프로시니엄 뮤지컬 극장 좌석배치도 (SVG 기반)
   대상 공연장: 블루스퀘어 대극장, 세종문화회관 대극장, YES24 라이브홀 등
   구조: 프로시니엄 아치(무대 액자형) + 오케스트라 피트(옵션) + 1층 오케스트라 + 2·3층 발코니 + 좌우 박스석
   무대는 상단 정면 엔드스테이지. 관객이 무대를 마주보는 구도.
   ───────────────────────────────────────────────────────── */

interface Props {
  venue: VenueConfig;
  onSelectZone: (zoneId: string) => void;
}

function fmtPrice(n: number) {
  return n.toLocaleString('ko-KR') + '원';
}

export default function ProsceniumMap({ venue, onSelectZone }: Props) {
  const viewBox = venue.svgViewBox ?? '0 0 900 940';
  const [, , wStr] = viewBox.split(' ');
  const vbW = Number(wStr) || 900;

  return (
    <div className="space-y-2">
      {/* 상단 안내 + 등급 범례 */}
      <div className="rounded border border-border bg-bg-subtle px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="text-xs text-text-secondary shrink-0">
          ◆ 구역 선택 후 개별 좌석을 지정합니다 (공평성 원칙)
        </span>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {Object.entries(venue.tiers).map(([key, tier]) => (
            <span key={key} className="flex items-center gap-1">
              <span
                className="px-1.5 py-0.5 text-[11px] font-bold rounded"
                style={{ background: tier.bg, color: tier.color }}
              >
                {tier.label}
              </span>
              <span className="text-[11px] text-text-secondary font-mono-tabular">
                {fmtPrice(tier.price)}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* 좌석배치도 카드 */}
      <div className="border border-[#E5E7EB] bg-white rounded">
        <div className="px-4 py-2 flex items-center justify-between border-b border-[#E5E7EB]">
          <h2 className="text-sm font-bold text-text">✱ {venue.name}</h2>
          <span className="text-[11px] text-text-tertiary">
            프로시니엄 엔드스테이지 · 3층 1~3열 안전바, 최측면 사이트라인 제한 가능
          </span>
        </div>

        <div className="relative flex justify-center p-3">
          <svg
            viewBox={viewBox}
            className="w-full max-w-[720px] h-auto max-h-[calc(100vh-220px)]"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label={`${venue.name} 좌석배치도`}
          >
            {/* ── 프로시니엄 아치 + STAGE ── */}
            <g pointerEvents="none">
              {/* 아치 외곽 (짙은 프레임) */}
              <rect x={vbW / 2 - 220} y="30" width="440" height="145" rx="14"
                    fill="#0F172A" />
              {/* 아치 안쪽 (스테이지) */}
              <rect x={vbW / 2 - 200} y="48" width="400" height="115" rx="6"
                    fill="#1F2937" stroke="#111827" strokeWidth="1" />
              <text x={vbW / 2} y="112" textAnchor="middle"
                    fill="white" fontSize="24" fontWeight="800"
                    letterSpacing="0.5em">
                STAGE
              </text>
              {/* 아치 상단 곡선 데코 */}
              <path
                d={`M ${vbW / 2 - 200} 48 Q ${vbW / 2} 20 ${vbW / 2 + 200} 48`}
                fill="none" stroke="#334155" strokeWidth="1.5" opacity="0.6"
              />
            </g>

            {/* ── 오케스트라 피트 (얕은 곡선 밴드) ── */}
            <g pointerEvents="none">
              <path
                d={`M ${vbW / 2 - 200} 180 Q ${vbW / 2} 210 ${vbW / 2 + 200} 180 L ${vbW / 2 + 200} 200 Q ${vbW / 2} 230 ${vbW / 2 - 200} 200 Z`}
                fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1"
              />
              <text x={vbW / 2} y="204" textAnchor="middle"
                    fill="#78350F" fontSize="10" fontWeight="700"
                    letterSpacing="0.25em">
                ORCHESTRA PIT
              </text>
            </g>

            {/* ── 구역들 ── */}
            {venue.zones.map((zone) => {
              const tier = venue.tiers[zone.tier];
              if (!tier || !zone.svgPath) return null;
              const fontSize = zone.entryMode === 'zone' ? 22 : 12;
              return (
                <g
                  key={zone.id}
                  onClick={() => onSelectZone(zone.id)}
                  style={{ cursor: 'pointer' }}
                  className="group"
                >
                  <path
                    d={zone.svgPath}
                    fill={tier.bg}
                    stroke={tier.color}
                    strokeWidth="1.5"
                    className="transition-all group-hover:brightness-90"
                  />
                  {zone.labelPos && (
                    <text
                      x={zone.labelPos.x}
                      y={zone.labelPos.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={tier.color}
                      fontSize={fontSize}
                      fontWeight="700"
                      pointerEvents="none"
                    >
                      {zone.name}
                    </text>
                  )}
                </g>
              );
            })}

            {/* ── 층 분리 점선 (좌측 라벨) ── */}
            <g pointerEvents="none" fill="#9CA3AF">
              <text x="55" y="360" fontSize="12" fontWeight="700" letterSpacing="0.2em">1F</text>
              <text x="55" y="570" fontSize="12" fontWeight="700" letterSpacing="0.2em">2F</text>
              <text x="55" y="780" fontSize="12" fontWeight="700" letterSpacing="0.2em">3F</text>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
