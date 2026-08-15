'use client';

import type { VenueConfig } from '@/types/ticketing';

/* ─────────────────────────────────────────────────────────
   FestivalMap — 야외 오픈필드 페스티벌 좌석배치도 (SVG 기반)
   대상 공연장: 한강 페스티벌 필드 등 야외 다중 스테이지 페스티벌.
   구조:
     - 메인 스테이지 (상단) + 서브 스테이지 (좌·우) 최대 3개
     - 각 스테이지 앞 VIP / GOLDEN CIRCLE / GA 스탠딩 존 (펜스 분리)
     - 후방 피크닉 존 (돗자리) — VIP 캐노피 라운지 옵션
   각 zone.svgPath를 그려 실제 존 배치를 재현. layout='festival'일 때 사용.

   ⚠ 공평성 원칙(2026-08-13): 모든 zone은 entryMode='seat'로 통일.
   스탠딩/피크닉 존도 대표 열·석 부여 → 구역 클릭 후 좌석 그리드에서 개별 선택.
   ───────────────────────────────────────────────────────── */

interface Props {
  venue: VenueConfig;
  onSelectZone: (zoneId: string) => void;
}

function fmtPrice(n: number) {
  return n.toLocaleString('ko-KR') + '원';
}

export default function FestivalMap({ venue, onSelectZone }: Props) {
  const viewBox = venue.svgViewBox ?? '0 0 960 780';
  const [, , wStr, hStr] = viewBox.split(' ');
  const vbW = Number(wStr) || 960;
  const vbH = Number(hStr) || 780;

  return (
    <div className="space-y-2">
      {/* 상단 안내 + 등급 범례 */}
      <div className="rounded border border-border bg-bg-subtle px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="text-xs text-text-secondary shrink-0">
          ◆ 야외 페스티벌 · 존 선택 후 개별 자리를 지정합니다 (공평성 원칙)
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
            야외 오픈필드 · 우천 시 진행 여부 별도 공지 · VIP 라운지·캐노피 F&amp;B 포함
          </span>
        </div>

        <div className="relative flex justify-center p-3">
          <svg
            viewBox={viewBox}
            className="w-full max-w-[860px] h-auto max-h-[calc(100vh-220px)]"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label={`${venue.name} 좌석배치도`}
          >
            {/* ── 필드 배경 (잔디톤) ── */}
            <g pointerEvents="none">
              <rect
                x="10" y="10"
                width={vbW - 20} height={vbH - 20}
                rx="18"
                fill="#F0FDF4"
                stroke="#86EFAC"
                strokeWidth="1.5"
              />
              {/* 텍스처 도트 (가벼운 잔디 표현, 시각적 노이즈 최소) */}
              <g fill="#BBF7D0" opacity="0.6">
                <circle cx="80"        cy={vbH - 60}  r="3" />
                <circle cx="180"       cy={vbH - 40}  r="2.5" />
                <circle cx={vbW - 90}  cy={vbH - 55}  r="3" />
                <circle cx={vbW - 180} cy={vbH - 45}  r="2.5" />
                <circle cx="60"        cy={vbH / 2}   r="2" />
                <circle cx={vbW - 60}  cy={vbH / 2}   r="2" />
              </g>
            </g>

            {/* ── 메인 스테이지 (상단 중앙) ── */}
            <g pointerEvents="none">
              {/* 스테이지 프레임 */}
              <rect x={vbW / 2 - 240} y="40" width="480" height="90" rx="8"
                    fill="#0F172A" />
              <rect x={vbW / 2 - 225} y="52" width="450" height="66" rx="4"
                    fill="#1F2937" />
              <text x={vbW / 2} y="90" textAnchor="middle"
                    fill="white" fontSize="20" fontWeight="800"
                    letterSpacing="0.5em">
                MAIN STAGE
              </text>
              {/* 텐트 지붕 삼각 실루엣 */}
              <path
                d={`M ${vbW / 2 - 240} 40 L ${vbW / 2} 12 L ${vbW / 2 + 240} 40 Z`}
                fill="#334155"
                opacity="0.85"
              />
            </g>

            {/* ── 서브 스테이지 (좌·우 하단) ── */}
            <g pointerEvents="none">
              {/* 좌 서브 */}
              <rect x="60" y={vbH - 190} width="150" height="55" rx="6"
                    fill="#1E293B" />
              <text x="135" y={vbH - 156} textAnchor="middle"
                    fill="white" fontSize="12" fontWeight="700"
                    letterSpacing="0.25em">
                SUB STAGE A
              </text>
              {/* 우 서브 */}
              <rect x={vbW - 210} y={vbH - 190} width="150" height="55" rx="6"
                    fill="#1E293B" />
              <text x={vbW - 135} y={vbH - 156} textAnchor="middle"
                    fill="white" fontSize="12" fontWeight="700"
                    letterSpacing="0.25em">
                SUB STAGE B
              </text>
            </g>

            {/* ── 구역들 ── */}
            {venue.zones.map((zone) => {
              const tier = venue.tiers[zone.tier];
              if (!tier || !zone.svgPath) return null;
              const fontSize = zone.entryMode === 'zone' ? 22 : 13;
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

            {/* ── 방향 라벨 (좌측 세로 안내) ── */}
            <g pointerEvents="none" fill="#64748B" fontWeight="700" letterSpacing="0.2em">
              <text x="30" y="180" fontSize="11">STAGE</text>
              <text x="30" y={vbH / 2} fontSize="11">FIELD</text>
              <text x="30" y={vbH - 60} fontSize="11">GATE</text>
            </g>

            {/* ── 관객 게이트 (하단 중앙) ── */}
            <g pointerEvents="none">
              <rect x={vbW / 2 - 60} y={vbH - 45} width="120" height="26" rx="4"
                    fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1" />
              <text x={vbW / 2} y={vbH - 27} textAnchor="middle"
                    fill="#334155" fontSize="11" fontWeight="700"
                    letterSpacing="0.25em">
                MAIN GATE
              </text>
            </g>
          </svg>
        </div>

        {/* 하단 안내 */}
        <div className="border-t border-[#E5E7EB] bg-[#FEF2F2] px-4 py-2 text-[11px] text-[#B91C1C] leading-relaxed">
          <p>* 야외 페스티벌은 기상·안전 상황에 따라 존별 진입 시각이 달라질 수 있습니다.</p>
          <p>* 모든 존은 클릭 후 좌석 그리드에서 개별 자리를 지정합니다 (공평성 원칙).</p>
        </div>
      </div>
    </div>
  );
}
