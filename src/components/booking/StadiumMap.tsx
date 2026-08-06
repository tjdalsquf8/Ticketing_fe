'use client';

import type { VenueConfig, Zone } from '@/types/ticketing';

/* ─────────────────────────────────────────────────────────
   StadiumMap — 잠실형 아레나 좌석배치도 (오버뷰)
   각 블록(101/102/... 및 1구역/2구역/...)이 개별 클릭 가능한 zone.
   클릭 → onSelectZone(zoneId) → 해당 zone의 SeatGrid로 진입.
   ───────────────────────────────────────────────────────── */

function fmtPrice(n: number) {
  return n.toLocaleString('ko-KR') + '원';
}

// zone.id 첫 자리로 스탠딩 그룹 판정 (1XX=A, 2XX=B, 3XX=C, 4XX=D)
function standingGroup(zoneId: string): 'A' | 'B' | 'C' | 'D' | null {
  if (!/^[1-4]\d\d$/.test(zoneId)) return null;
  const first = zoneId[0];
  if (first === '1') return 'A';
  if (first === '2') return 'B';
  if (first === '3') return 'C';
  if (first === '4') return 'D';
  return null;
}

interface Props {
  venue: VenueConfig;
  onSelectZone: (zoneId: string) => void;
}

/** 스탠딩 블록 하나 — 클릭하면 zone 진입. 참고 이미지처럼 flat 텍스트 행 (배경은 부모 카드 색). */
function StandingBlockButton({
  zone,
  color,
  onSelectZone,
}: {
  zone: Zone;
  color: string;
  onSelectZone: (zoneId: string) => void;
}) {
  // 각 섹션(A/B/C/D)마다 입장번호 1부터 새로 시작. 01~06 또는 01~04.
  const blockNum = Number(zone.id.slice(1));
  const start = (blockNum - 1) * 1000 + 1;
  const end = blockNum * 1000;
  return (
    <button
      onClick={() => onSelectZone(zone.id)}
      className="w-full flex items-center gap-2 px-1 py-0.5 rounded text-left transition-colors hover:bg-white/40"
    >
      <span className="font-black text-base min-w-[36px]" style={{ color }}>
        {zone.id}
      </span>
      <span className="text-xs text-[#1F2937]">
        입장번호 <span className="font-mono-tabular">{start.toLocaleString()}~{end.toLocaleString()}</span>
      </span>
    </button>
  );
}

/** 스탠딩 그룹 카드 (A/B/C/D) — 안에 클릭 가능한 블록들 */
function StandingGroupCard({
  groupLabel,
  color,
  bg,
  zones,
  onSelectZone,
}: {
  groupLabel: string; // "스탠딩 A (Standing A)"
  color: string;
  bg: string;
  zones: Zone[];
  onSelectZone: (zoneId: string) => void;
}) {
  return (
    <div
      className="rounded-lg p-3 space-y-1.5"
      style={{ background: bg, border: `1px solid ${color}` }}
    >
      <p className="text-sm font-black mb-1" style={{ color }}>
        {groupLabel}
      </p>
      {zones.map((z) => (
        <StandingBlockButton key={z.id} zone={z} color={color} onSelectZone={onSelectZone} />
      ))}
    </div>
  );
}

/** 2층 구역 하나 — 클릭하면 zone 진입 */
function SecondFloorBlockButton({
  zone,
  color,
  bg,
  onSelectZone,
}: {
  zone: Zone;
  color: string;
  bg: string;
  onSelectZone: (zoneId: string) => void;
}) {
  const numMatch = zone.name.match(/(\d+)/);
  const num = numMatch ? numMatch[1].padStart(3, '0') : '';
  return (
    <button
      onClick={() => onSelectZone(zone.id)}
      className="flex flex-col items-center justify-center px-3 py-2 rounded transition-all min-w-[60px] hover:brightness-95 hover:shadow-sm"
      style={{ background: bg, border: `2px solid ${color}`, color }}
    >
      <span className="text-xs font-bold">{zone.name}</span>
      <span className="text-[10px] font-mono-tabular opacity-80">{num}</span>
    </button>
  );
}

export default function StadiumMap({ venue, onSelectZone }: Props) {
  // 스탠딩 블록 그룹별 분류
  const standingA = venue.zones.filter((z) => standingGroup(z.id) === 'A');
  const standingB = venue.zones.filter((z) => standingGroup(z.id) === 'B');
  const standingC = venue.zones.filter((z) => standingGroup(z.id) === 'C');
  const standingD = venue.zones.filter((z) => standingGroup(z.id) === 'D');
  const secondFloorZones = venue.zones.filter((z) => z.id.startsWith('2F-'));

  const stdABColor = venue.tiers.stdAB?.color ?? '#9333EA';
  const stdABBg = venue.tiers.stdAB?.bg ?? '#F3E8FF';
  const stdCDColor = venue.tiers.stdCD?.color ?? '#16A34A';
  const stdCDBg = venue.tiers.stdCD?.bg ?? '#DCFCE7';
  const s2fColor = venue.tiers.s2f?.color ?? '#2563EB';
  const s2fBg = venue.tiers.s2f?.bg ?? '#DBEAFE';

  // 2층: 8구역과 9구역 사이 출입구
  const firstHalf = secondFloorZones.slice(0, 8);
  const secondHalf = secondFloorZones.slice(8);

  const hasStanding = standingA.length + standingB.length + standingC.length + standingD.length > 0;

  return (
    <div className="space-y-3">
      {/* 안내 */}
      <div className="rounded border border-border bg-bg-subtle px-3 py-2 text-sm text-text-secondary">
        ◆ 원하시는 구역을 선택해 주세요. 클릭하면 해당 구역의 좌석을 선택할 수 있습니다.
      </div>

      {/* 좌석배치도 카드 */}
      <div className="border-2 border-[#E5E7EB] bg-white overflow-x-auto">
        <div className="min-w-[720px] p-6 space-y-4">
          <h2 className="text-center text-xl font-bold text-text">✱ 좌석배치도</h2>

          {/* 가격 범례 */}
          <div className="flex flex-wrap justify-center items-center gap-2 text-sm">
            <span className="px-2 py-0.5 font-bold rounded" style={{ background: stdABBg, color: stdABColor }}>
              Standing A &amp; B
            </span>
            <span className="text-text">: {fmtPrice(venue.tiers.stdAB?.price ?? 0)}</span>
            <span className="text-text-tertiary mx-2">|</span>
            <span className="px-2 py-0.5 font-bold rounded" style={{ background: stdCDBg, color: stdCDColor }}>
              Standing C &amp; D
            </span>
            <span className="text-text">: {fmtPrice(venue.tiers.stdCD?.price ?? 0)}</span>
            <span className="text-text-tertiary mx-2">|</span>
            <span className="px-2 py-0.5 font-bold rounded" style={{ background: s2fBg, color: s2fColor }}>
              2층 S석
            </span>
            <span className="text-text">: {fmtPrice(venue.tiers.s2f?.price ?? 0)}</span>
          </div>

          {/* 경고 박스 */}
          <div className="border border-[#FCA5A5] bg-[#FEF2F2] rounded p-3 text-xs text-[#B91C1C] leading-relaxed">
            <p>* Floor층 스탠딩석은 입장번호순으로 입장하오니 빠른번호를 선택하셔야 입장이 앞섭니다.</p>
            <p>스탠딩석은 A,B,C,D 구역으로만 구분이 됩니다.</p>
            <p>구역별 101 ~ 106 / 201 ~ 206 / 301 ~ 306 / 401 ~ 406 영역은 예매시 편의를 위해 구분한 것으로 실제로는 분리된 영역이 아닙니다.</p>
            <p className="mt-1 opacity-70">(Floor is standing section. Entrance based on sequential order.)</p>
          </div>

          {/* STAGE */}
          <div className="bg-gradient-to-r from-[#D1D5DB] via-[#9CA3AF] to-[#D1D5DB] py-3 text-center rounded-sm">
            <span className="text-2xl font-black text-white/60 tracking-[0.5em]">STAGE</span>
          </div>

          {/* Floor 스탠딩 (A/B/C/D) */}
          <div className="relative">
            {!hasStanding ? (
              <div className="py-8 text-center text-xs text-text-tertiary border border-dashed border-border rounded">
                스탠딩 블록 데이터가 없습니다. (하드 리프레시 필요)
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <StandingGroupCard groupLabel="스탠딩 A (Standing A)" color={stdABColor} bg={stdABBg} zones={standingA} onSelectZone={onSelectZone} />
                <StandingGroupCard groupLabel="스탠딩 B (Standing B)" color={stdABColor} bg={stdABBg} zones={standingB} onSelectZone={onSelectZone} />
                <StandingGroupCard groupLabel="스탠딩 C (Standing C)" color={stdCDColor} bg={stdCDBg} zones={standingC} onSelectZone={onSelectZone} />
                <StandingGroupCard groupLabel="스탠딩 D (Standing D)" color={stdCDColor} bg={stdCDBg} zones={standingD} onSelectZone={onSelectZone} />
              </div>
            )}
            <div className="absolute -left-2 -bottom-3 bg-[#111827] text-white px-3 py-0.5 rounded-full text-xs font-bold">
              Floor
            </div>
          </div>

          {/* 2층 구분선 */}
          <div className="pt-6 border-t border-dashed border-[#9CA3AF]" />
          <p className="text-xs text-[#B91C1C] text-center font-medium">
            * 2층 지정석은 예매시 선택한 좌석에서 관람합니다.{' '}
            <span className="opacity-70">(Second floor is reservation-only)</span>
          </p>

          {/* 2층 구역 행 */}
          <div className="relative">
            <div className="flex justify-center items-center gap-1.5 flex-wrap">
              {firstHalf.map((zone) => (
                <SecondFloorBlockButton key={zone.id} zone={zone} color={s2fColor} bg={s2fBg} onSelectZone={onSelectZone} />
              ))}
              {secondHalf.length > 0 && (
                <div className="flex flex-col items-center justify-center px-2 py-2 min-w-[60px]">
                  <span className="text-[10px] font-bold text-text-tertiary">출입구</span>
                  <span className="text-[10px] text-text-tertiary">(GATE)</span>
                </div>
              )}
              {secondHalf.map((zone) => (
                <SecondFloorBlockButton key={zone.id} zone={zone} color={s2fColor} bg={s2fBg} onSelectZone={onSelectZone} />
              ))}
            </div>
            <div className="absolute -left-2 -bottom-3 bg-[#111827] text-white px-3 py-0.5 rounded-full text-xs font-bold">
              2층
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
