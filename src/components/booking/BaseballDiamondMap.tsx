'use client';

import type { VenueConfig } from '@/types/ticketing';

/* ─────────────────────────────────────────────────────────
   BaseballDiamondMap — 야구장 다이아몬드형 좌석배치도 (SVG 기반)
   대상 공연장: 고척스카이돔, 잠실야구장, SSG랜더스필드 등
   콘서트 세팅 기준: 무대는 외야(상단, 센터필드) 방향, 관객은 홈 뒤편(하단)에서 관람.
   각 zone.svgPath를 그려 실제 배치를 재현. layout='baseball'일 때 사용.

   진입 시 전체 좌석이 한 화면에 보이도록 헤더/범례를 압축하고,
   SVG는 viewport 높이에 맞춰 최대 크기가 제한된다(공평성 UX).
   ───────────────────────────────────────────────────────── */

interface Props {
  venue: VenueConfig;
  onSelectZone: (zoneId: string) => void;
}

function fmtPrice(n: number) {
  return n.toLocaleString('ko-KR') + '원';
}

export default function BaseballDiamondMap({ venue, onSelectZone }: Props) {
  const viewBox = venue.svgViewBox ?? '0 0 900 820';

  return (
    <div className="space-y-2">
      {/* 상단 안내 + 등급 범례 (한 줄로 압축) */}
      <div className="rounded border border-border bg-bg-subtle px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="text-xs text-text-secondary shrink-0">
          ◆ 구역 선택 후 개별 좌석을 지정합니다
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
            무대 뒤편(외야 상단) 좌석은 시야 제한으로 판매하지 않습니다.
          </span>
        </div>

        {/* SVG 좌석 맵 — viewport 높이에 맞춰 축소, 진입 시 전체가 보이도록 max-h 제한 */}
        <div className="relative flex justify-center p-3">
          <svg
            viewBox={viewBox}
            className="w-full max-w-[720px] h-auto max-h-[calc(100vh-220px)]"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label={`${venue.name} 좌석배치도`}
          >
            {/* ── STAGE (상단, 외야 방향) ── */}
            <g>
              <rect x="320" y="40" width="260" height="60" rx="3"
                    fill="#1F2937" stroke="#111827" strokeWidth="1" />
              <text x="450" y="78" textAnchor="middle"
                    fill="white" fontSize="22" fontWeight="800"
                    letterSpacing="0.5em">
                STAGE
              </text>
            </g>

            {/* ── 다이아몬드 필드(참고용 배경) ──
                홈(하단 안쪽) · 1루(우측) · 2루(상단·무대 앞) · 3루(좌측) */}
            <g pointerEvents="none">
              {/* 잔디 부채꼴 (외야 아크) */}
              <path
                d="M 450 460 L 685 460 A 235 235 0 0 0 215 460 Z"
                fill="#DCFCE7"
                stroke="#86EFAC"
                strokeWidth="1.5"
              />
              {/* 내야 다이아몬드 */}
              <polygon
                points="450,460 570,340 450,220 330,340"
                fill="#F5DEB3"
                stroke="#B8860B"
                strokeWidth="1.5"
              />
              {/* 파울 라인 */}
              <line x1="450" y1="460" x2="685" y2="460" stroke="#B8860B" strokeWidth="1" strokeDasharray="4 3" />
              <line x1="450" y1="460" x2="215" y2="460" stroke="#B8860B" strokeWidth="1" strokeDasharray="4 3" />
              {/* 베이스 마커 */}
              <circle cx="450" cy="460" r="5" fill="#FFFFFF" stroke="#B8860B" strokeWidth="1.5" />
              <circle cx="570" cy="340" r="5" fill="#FFFFFF" stroke="#B8860B" strokeWidth="1.5" />
              <circle cx="450" cy="220" r="5" fill="#FFFFFF" stroke="#B8860B" strokeWidth="1.5" />
              <circle cx="330" cy="340" r="5" fill="#FFFFFF" stroke="#B8860B" strokeWidth="1.5" />
              {/* 베이스 라벨 */}
              <text x="450" y="478" textAnchor="middle" fill="#78350F" fontSize="10" fontWeight="700">H</text>
              <text x="588" y="344" textAnchor="middle" fill="#78350F" fontSize="10" fontWeight="700">1B</text>
              <text x="450" y="212" textAnchor="middle" fill="#78350F" fontSize="10" fontWeight="700">2B</text>
              <text x="312" y="344" textAnchor="middle" fill="#78350F" fontSize="10" fontWeight="700">3B</text>
            </g>

            {/* ── 구역들 ── */}
            {venue.zones.map((zone) => {
              const tier = venue.tiers[zone.tier];
              if (!tier || !zone.svgPath) return null;

              const isZoneMode = zone.entryMode === 'zone';
              const fontSize = isZoneMode ? 22 : 11;

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

            {/* ── 층 라벨: 1F / 2F / 3F ── */}
            <text x="80" y="500" textAnchor="middle"
                  fill="#9CA3AF" fontSize="13" fontWeight="700">
              3F
            </text>
            <text x="820" y="500" textAnchor="middle"
                  fill="#9CA3AF" fontSize="13" fontWeight="700">
              3F
            </text>
            <text x="450" y="925" textAnchor="middle"
                  fill="#6B7280" fontSize="14" fontWeight="700"
                  letterSpacing="0.3em">
              1F · 2F · 3F 지정석 (홈베이스 뒤편)
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}
