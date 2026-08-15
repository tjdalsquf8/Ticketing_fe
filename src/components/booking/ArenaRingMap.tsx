'use client';

import type { VenueConfig } from '@/types/ticketing';

/* ─────────────────────────────────────────────────────────
   ArenaRingMap — 아레나 좌석배치도 (SVG 기반)
   대상 공연장: KSPO돔(원형 링), 인스파이어 아레나(오디토리엄 트랙) 등.
   각 zone.svgPath를 그려 실제 배치를 재현. layout='arena-ring'일 때 사용.

   venue.stageShape / consoleLabel 로 STAGE 모양·CONSOLE 라벨 옵션 제어.
   ───────────────────────────────────────────────────────── */

interface Props {
  venue: VenueConfig;
  onSelectZone: (zoneId: string) => void;
}

function fmtPrice(n: number) {
  return n.toLocaleString('ko-KR') + '원';
}

export default function ArenaRingMap({ venue, onSelectZone }: Props) {
  const viewBox = venue.svgViewBox ?? '0 0 800 700';
  // viewBox 반응형: 스테이지·라벨을 viewBox 크기에 맞춰 자동 배치.
  const [, , wStr, hStr] = viewBox.split(' ');
  const vbW = Number(wStr) || 800;
  const vbH = Number(hStr) || 700;

  const isTShape = venue.stageShape === 't-shape';

  // 사각형 STAGE (기본)
  const stageW = Math.min(280, vbW * 0.32);
  const stageH = 60;
  const stageX = (vbW - stageW) / 2;
  const stageY = Math.max(30, vbH * 0.06);
  const stageTextY = stageY + stageH * 0.62;

  // T자형 STAGE (인스파이어 아레나 등)
  // 상단 가로 사각형 + 하단 세로 돌출부(T-bar)
  const tHeadW = Math.min(360, vbW * 0.42);
  const tHeadH = 68;
  const tHeadX = (vbW - tHeadW) / 2;
  const tHeadY = 80;
  const tBarW = 90;
  const tBarH = 88;
  const tBarX = (vbW - tBarW) / 2;
  const tBarY = tHeadY + tHeadH;

  return (
    <div className="space-y-3">
      {/* 안내 */}
      <div className="rounded border border-border bg-bg-subtle px-3 py-2 text-sm text-text-secondary">
        ◆ 원하시는 구역을 선택해 주세요. 구역 클릭 후 좌석 그리드에서 개별 좌석을 지정합니다.
      </div>

      {/* 좌석배치도 카드 */}
      <div className="border-2 border-[#E5E7EB] bg-white overflow-hidden">
        <div className="p-6 space-y-4">
          <h2 className="text-center text-xl font-bold text-text">✱ {venue.name}</h2>

          {/* 등급 범례 */}
          <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-1.5 text-sm">
            {Object.entries(venue.tiers).map(([key, tier], i, arr) => (
              <span key={key} className="flex items-center gap-1.5">
                <span
                  className="px-2 py-0.5 font-bold rounded"
                  style={{ background: tier.bg, color: tier.color }}
                >
                  {tier.label}
                </span>
                <span className="text-text-secondary text-xs font-mono-tabular">
                  {fmtPrice(tier.price)}
                </span>
                {i < arr.length - 1 && <span className="text-text-tertiary mx-1">|</span>}
              </span>
            ))}
          </div>

          {/* SVG 좌석 맵 */}
          <div className="relative flex justify-center">
            <svg
              viewBox={viewBox}
              className="w-full max-w-[720px] h-auto"
              role="img"
              aria-label={`${venue.name} 좌석배치도`}
            >
              {/* STAGE */}
              {isTShape ? (
                <g>
                  {/* 상단 사각형 헤드 */}
                  <rect
                    x={tHeadX} y={tHeadY} width={tHeadW} height={tHeadH} rx="4"
                    fill="#1F2937" stroke="#111827" strokeWidth="1"
                  />
                  {/* 하단 T-bar 돌출부 */}
                  <rect
                    x={tBarX} y={tBarY} width={tBarW} height={tBarH} rx="3"
                    fill="#1F2937" stroke="#111827" strokeWidth="1"
                  />
                  <text
                    x={vbW / 2} y={tHeadY + tHeadH * 0.62}
                    textAnchor="middle"
                    fill="white" fontSize="26" fontWeight="800"
                    letterSpacing="0.4em"
                  >
                    STAGE
                  </text>
                  <text
                    x={vbW / 2} y={tBarY + tBarH * 0.62}
                    textAnchor="middle"
                    fill="white" fontSize="13" fontWeight="700"
                    letterSpacing="0.3em"
                  >
                    STAGE
                  </text>
                </g>
              ) : (
                <g>
                  <rect x={stageX} y={stageY} width={stageW} height={stageH} rx="3"
                        fill="#1F2937" stroke="#111827" strokeWidth="1" />
                  <text x={vbW / 2} y={stageTextY} textAnchor="middle"
                        fill="white" fontSize="22" fontWeight="800"
                        letterSpacing="0.5em">
                    STAGE
                  </text>
                </g>
              )}

              {/* 구역들 */}
              {venue.zones.map((zone) => {
                const tier = venue.tiers[zone.tier];
                if (!tier || !zone.svgPath) return null;

                const isZoneMode = zone.entryMode === 'zone';
                const nameFontSize = isZoneMode ? 28 : 18;
                const hasCapacity = typeof zone.capacity === 'number';

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
                      <>
                        <text
                          x={zone.labelPos.x}
                          y={hasCapacity ? zone.labelPos.y - 8 : zone.labelPos.y}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill={tier.color}
                          fontSize={nameFontSize}
                          fontWeight="700"
                          pointerEvents="none"
                        >
                          {zone.name}
                        </text>
                        {hasCapacity && (
                          <text
                            x={zone.labelPos.x}
                            y={zone.labelPos.y + 12}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill={tier.color}
                            fontSize="11"
                            fontWeight="600"
                            opacity="0.85"
                            pointerEvents="none"
                          >
                            {zone.capacity}석
                          </text>
                        )}
                      </>
                    )}
                  </g>
                );
              })}

              {/* CONSOLE 라벨 (하단 중앙) */}
              {venue.consoleLabel && (
                <g pointerEvents="none">
                  <rect
                    x={vbW / 2 - 70}
                    y={vbH - 90}
                    width={140}
                    height={38}
                    rx="4"
                    fill="#F1F5F9"
                    stroke="#94A3B8"
                    strokeDasharray="4 3"
                    strokeWidth="1.2"
                  />
                  <text
                    x={vbW / 2}
                    y={vbH - 66}
                    textAnchor="middle"
                    fill="#475569"
                    fontSize="14"
                    fontWeight="700"
                    letterSpacing="0.3em"
                  >
                    CONSOLE
                  </text>
                </g>
              )}
            </svg>
          </div>

          {/* 하단 안내 */}
          <div className="border border-[#FCA5A5] bg-[#FEF2F2] rounded p-3 text-xs text-[#B91C1C] leading-relaxed">
            <p>* 모든 구역은 클릭 후 좌석 그리드에서 개별 좌석을 지정합니다 (공평성 원칙).</p>
            <p>* 유리 난간·기둥 등 실 좌석 시야제한은 별도 안내 참고.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
