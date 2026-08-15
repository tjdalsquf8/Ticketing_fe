'use client';

import type { VenueConfig } from '@/types/ticketing';

/* ─────────────────────────────────────────────────────────
   StadiumOvalMap — 타원 트랙 스타디움 좌석배치도 (SVG 기반)
   대상 공연장: 잠실 종합운동장 주경기장 등 대형 육상 트랙 스타디움
   콘서트 세팅: 트랙 단측 엔드스테이지. 무대 반대편 스탠드 전체는 판매 안 함(시야제한).
   3층 원호(타원) 스탠드 + 그라운드 플로어 4구역(VIP·A·B·C) 구조.
   각 zone.svgPath를 그려 실제 배치를 재현. layout='stadium-oval'일 때 사용.
   ───────────────────────────────────────────────────────── */

interface Props {
  venue: VenueConfig;
  onSelectZone: (zoneId: string) => void;
}

function fmtPrice(n: number) {
  return n.toLocaleString('ko-KR') + '원';
}

export default function StadiumOvalMap({ venue, onSelectZone }: Props) {
  const viewBox = venue.svgViewBox ?? '0 0 900 940';
  const [, , wStr, hStr] = viewBox.split(' ');
  const vbW = Number(wStr) || 900;
  const vbH = Number(hStr) || 940;

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
            무대 반대편 스탠드는 시야 제한으로 판매하지 않습니다.
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
            {/* ── STAGE (상단, 트랙 단측) ── */}
            <g>
              <rect x={vbW / 2 - 140} y="40" width="280" height="60" rx="3"
                    fill="#1F2937" stroke="#111827" strokeWidth="1" />
              <text x={vbW / 2} y="78" textAnchor="middle"
                    fill="white" fontSize="22" fontWeight="800"
                    letterSpacing="0.5em">
                STAGE
              </text>
            </g>

            {/* ── 트랙 (참고용 배경, 좌석 없음) ── */}
            <g pointerEvents="none">
              {/* 외곽 트랙 (짙은 회색 바탕) */}
              <ellipse cx={vbW / 2} cy="500" rx="260" ry="150"
                       fill="#FDE68A" stroke="#F59E0B" strokeWidth="1.5" opacity="0.55" />
              {/* 내부 잔디 필드 */}
              <ellipse cx={vbW / 2} cy="500" rx="215" ry="115"
                       fill="#DCFCE7" stroke="#86EFAC" strokeWidth="1.5" />
              {/* 필드 센터 라인 */}
              <line x1={vbW / 2} y1="385" x2={vbW / 2} y2="615"
                    stroke="#86EFAC" strokeWidth="1" strokeDasharray="4 3" />
              {/* 필드 텍스트 */}
              <text x={vbW / 2} y="504" textAnchor="middle"
                    fill="#166534" fontSize="11" fontWeight="700"
                    letterSpacing="0.3em">
                FIELD
              </text>
            </g>

            {/* ── 구역들 ── */}
            {venue.zones.map((zone) => {
              const tier = venue.tiers[zone.tier];
              if (!tier || !zone.svgPath) return null;
              const fontSize = zone.entryMode === 'zone' ? 20 : 11;
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

            {/* ── 하단 층 라벨 ── */}
            <text x={vbW / 2} y={vbH - 20} textAnchor="middle"
                  fill="#6B7280" fontSize="13" fontWeight="700"
                  letterSpacing="0.3em">
              GROUND · 1F(로어) · 2F(미드) · 3F(어퍼)
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}
