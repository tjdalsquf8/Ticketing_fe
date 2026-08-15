'use client';

import { useMemo } from 'react';
import type { VenueConfig, Zone } from '@/types/ticketing';
import { parseLiveSeatLabel } from '@/data/live/seatLabels';

// SVG path d 속성은 정적 데이터(LIVE_EVENTS)에서 오지만, 향후 백엔드 응답으로
// 대체될 가능성에 대비해 화이트리스트 정규식으로 필터. 허용 문자: 좌표 명령·숫자·구분자.
const SAFE_SVG_PATH_RE = /^[MmLlHhVvCcSsQqTtAaZz0-9\s\.,\-]+$/;
function safeSvgPath(d: string | undefined): string | undefined {
  if (!d) return undefined;
  return SAFE_SVG_PATH_RE.test(d) ? d : undefined;
}

/* ──────────────────────────────────────────
   AdminVenuePreviewMap
   관리자 전용 read-only 좌석 배치도.
   deriveLiveSeatLabels로 뽑힌 라벨을 zone→row 단위로 집계해
   구역 전체를 쓰는지 일부만 쓰는지까지 명확히 표시.
   ────────────────────────────────────────── */

const HIGHLIGHT_COLOR = '#E85D00';  // primary orange
const HIGHLIGHT_FILL = '#FFEDD5';   // primary subtle
const DIM_STROKE = '#CBD5E1';
const DIM_FILL = '#F8FAFC';

interface Props {
  venue: VenueConfig;
  seatLabels: string[];
}

interface ZoneBreakdown {
  zone: Zone;
  totalSeats: number;               // 구역 전체 실제 좌석 수
  liveSeats: number;                // 라이브로 쓸 좌석 수
  fillRatio: number;                // 0~1
  rows: Array<{ label: string; count: number; total: number }>;
}

function zoneTotalSeats(zone: Zone): number {
  if (!zone.seatRows) return 0;
  return zone.seatRows.reduce((acc, r) => acc + r.seatCount, 0);
}

export default function AdminVenuePreviewMap({ venue, seatLabels }: Props) {
  const viewBox = venue.svgViewBox ?? '0 0 800 700';

  // 라벨 파싱 → zone → row 단위로 집계
  const breakdown = useMemo<ZoneBreakdown[]>(() => {
    // zoneId → rowLabel → count
    const acc = new Map<string, Map<string, number>>();
    for (const label of seatLabels) {
      const parsed = parseLiveSeatLabel(label);
      if (!parsed) continue;
      if (!acc.has(parsed.zoneId)) acc.set(parsed.zoneId, new Map());
      const rowMap = acc.get(parsed.zoneId)!;
      rowMap.set(parsed.rowLabel, (rowMap.get(parsed.rowLabel) ?? 0) + 1);
    }

    const out: ZoneBreakdown[] = [];
    for (const [zoneId, rowMap] of acc) {
      const zone = venue.zones.find((z) => z.id === zoneId);
      if (!zone) continue;
      const total = zoneTotalSeats(zone);
      const rows = Array.from(rowMap.entries()).map(([label, count]) => {
        const rowDef = zone.seatRows?.find((r) => r.label === label);
        return { label, count, total: rowDef?.seatCount ?? 0 };
      });
      const liveSeats = rows.reduce((s, r) => s + r.count, 0);
      out.push({
        zone,
        totalSeats: total,
        liveSeats,
        fillRatio: total > 0 ? liveSeats / total : 0,
        rows,
      });
    }
    return out;
  }, [venue, seatLabels]);

  const zoneIdToBreakdown = useMemo(() => {
    const m = new Map<string, ZoneBreakdown>();
    for (const b of breakdown) m.set(b.zone.id, b);
    return m;
  }, [breakdown]);

  return (
    <div className="space-y-4">
      {/* 요약 */}
      <div className="rounded-md border border-primary-border bg-primary-subtle px-3 py-2.5">
        <p className="text-xs text-text-secondary">
          라이브 회차당 오픈 좌석은 총 <strong className="text-primary font-mono-tabular">{seatLabels.length}석</strong>이며,
          <strong className="text-text"> 모든 seated 구역</strong>에 균등하게 배치됩니다. 각 구역의 앞줄부터 일부만 사용됩니다.
        </p>
      </div>

      {/* 범례 */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-3 rounded-sm border"
            style={{ background: HIGHLIGHT_FILL, borderColor: HIGHLIGHT_COLOR }}
          />
          <span className="text-text-secondary">라이브 사용 구역</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-3 rounded-sm border"
            style={{ background: DIM_FILL, borderColor: DIM_STROKE }}
          />
          <span className="text-text-tertiary">미사용</span>
        </span>
        <span className="text-text-tertiary text-[11px]">
          · 구역 채도 = 그 구역 안에서 몇 % 사용하는지
        </span>
      </div>

      {/* SVG 배치도 */}
      <div className="rounded-lg border border-border bg-white p-4">
        <svg
          viewBox={viewBox}
          className="w-full h-auto"
          role="img"
          aria-label={`${venue.name} 좌석 미리보기`}
        >
          {venue.layout === 'arena-ring' && (
            <g>
              <rect x="270" y="45" width="260" height="60" rx="3" fill="#1F2937" />
              <text
                x="400" y="83" textAnchor="middle"
                fill="white" fontSize="22" fontWeight="800" letterSpacing="0.5em"
              >
                STAGE
              </text>
            </g>
          )}

          {venue.zones.map((zone) => {
            const path = safeSvgPath(zone.svgPath);
            if (!path) return null;
            const b = zoneIdToBreakdown.get(zone.id);
            const highlighted = !!b;
            // 채우기 opacity = fillRatio (최소 0.35로 보여지긴 하게)
            const fillOpacity = highlighted ? Math.max(0.35, b.fillRatio) : 1;
            return (
              <g key={zone.id}>
                <path
                  d={path}
                  fill={highlighted ? HIGHLIGHT_FILL : DIM_FILL}
                  fillOpacity={fillOpacity}
                  stroke={highlighted ? HIGHLIGHT_COLOR : DIM_STROKE}
                  strokeWidth={highlighted ? 1.5 : 1}
                />
                {zone.labelPos && (
                  <text
                    x={zone.labelPos.x}
                    y={zone.labelPos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={highlighted ? HIGHLIGHT_COLOR : '#94A3B8'}
                    fontSize={zone.entryMode === 'zone' ? 20 : 11}
                    fontWeight="700"
                  >
                    {zone.name}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* 구역·행별 상세 */}
      <div>
        <p className="text-xs font-semibold text-text-secondary mb-2">
          오픈 좌석 배치 상세
        </p>
        {breakdown.length === 0 ? (
          <p className="text-xs text-text-tertiary">
            venue에서 좌석 라벨을 파싱할 수 있는 구역이 없습니다.
          </p>
        ) : (
          <ul className="space-y-2">
            {breakdown.map((b) => (
              <li key={b.zone.id} className="rounded-md border border-border bg-bg-subtle p-3">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-text">{b.zone.name} 구역</span>
                    <span className="ml-1.5 text-[11px] text-text-tertiary">({b.zone.tier})</span>
                  </div>
                  <span className="text-xs font-mono-tabular shrink-0">
                    <strong className="text-primary">{b.liveSeats}</strong>
                    <span className="text-text-tertiary"> / {b.totalSeats}석</span>
                    <span className="ml-1 text-text-tertiary">
                      ({Math.round(b.fillRatio * 100)}%)
                    </span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {b.rows.map((r) => {
                    const full = r.count === r.total;
                    return (
                      <span
                        key={r.label}
                        className={[
                          'px-2 py-0.5 rounded-md text-[11px] font-mono-tabular border',
                          full
                            ? 'bg-primary-subtle border-primary-border text-primary'
                            : 'bg-bg-surface border-border text-text-secondary',
                        ].join(' ')}
                        title={full ? '해당 열 전체 사용' : '해당 열 일부 사용'}
                      >
                        {r.label}열 {r.count}/{r.total}
                      </span>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
